'use client';

import { useEffect, useState } from 'react';
import { saveAs } from 'file-saver';
import { FileSignature, UserPlus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ImovelData, TecnicoData, PessoaQualificada, ProprietarioCad, CorrecaoErrata } from '@/lib/topo/types';
import { gerarRequerimentoDocx, type TipoAtoRequerimento } from '@/lib/export/requerimento';
import { compatibilizarWord2007 } from '@/lib/export/compatWord2007';
import { numBR } from '@/lib/topo/geometry';
import { carregarPreferencias } from '@/lib/store/preferencias';
import { carregarPadroes } from '@/lib/store/padroes';

const OPCOES_ATO: { valor: TipoAtoRequerimento; rotulo: string; explicacao: string }[] = [
  {
    valor: 'venda', rotulo: 'Compra e venda',
    explicacao: 'O imóvel está sendo vendido e o comprador (requerente) pede a retificação da área já em nome dele. Precisa do CPF/RG de quem vende and de quem compra.',
  },
  {
    valor: 'doacao', rotulo: 'Doação',
    explicacao: 'O proprietário (doador) está doando o imóvel a alguém (donatário). O documento usa os termos "doador" e "donatário" em vez de vendedor/comprador.',
  },
  {
    valor: 'unificacao', rotulo: 'Unificação / remembramento',
    explicacao: 'Duas ou mais matrículas do mesmo dono estão sendo unidas numa só, depois do levantamento. Preencha as "matrículas de origem" para o cartório saber quais matrículas somem e viram uma.',
  },
  {
    valor: 'desmembramento', rotulo: 'Desmembramento',
    explicacao: 'Uma parte do imóvel está sendo separada para virar uma matrícula nova (o dono continua o mesmo dos dois pedaços). Costuma vir acompanhado da ferramenta de dividir gleba por área.',
  },
  {
    valor: 'usucapiao', rotulo: 'Usucapião',
    explicacao: 'O requerente (usucapiente) busca o reconhecimento da usucapião do imóvel. O documento usa os termos "usucapiente" e "titular registral / confrontante" e pede a instrução do reconhecimento da usucapião.',
  },
];

export const PESSOA_VAZIA: PessoaQualificada = {
  nome: '', rg: '', cpf: '', nacionalidade: 'Brasileira', naturalidade: '', dataNascimento: '',
  filiacao: '', profissao: '', estadoCivil: '', conjugeNome: '', conjugeRg: '', conjugeCpf: '',
  endereco: '', cidadeUf: '', cep: '',
};

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  imovel: ImovelData;
  onChangeImovel: (i: ImovelData) => void;
  tecnico: TecnicoData | null;
  areaRealHa: number;
  requerente?: PessoaQualificada;
  transmitente?: PessoaQualificada;
  tipoAto: TipoAtoRequerimento;
  partesAdicionais: PessoaQualificada[];
  onChangePessoas: (req: PessoaQualificada, trans: PessoaQualificada, tipoAto: TipoAtoRequerimento, partesAdicionais: PessoaQualificada[]) => void;
  sugProp: ProprietarioCad[];
  correcoes: CorrecaoErrata[];
  onBaixar?: () => void;
}

const CAMPOS: { k: keyof PessoaQualificada; label: string; span: string }[] = [
  { k: 'nome', label: 'Nome', span: 'col-span-6 md:col-span-4' },
  { k: 'rg', label: 'RG', span: 'col-span-3 md:col-span-1' },
  { k: 'cpf', label: 'CPF/CNPJ', span: 'col-span-3 md:col-span-1' },
  { k: 'nacionalidade', label: 'Nacionalidade', span: 'col-span-2' },
  { k: 'naturalidade', label: 'Naturalidade', span: 'col-span-2' },
  { k: 'dataNascimento', label: 'Data Nasc.', span: 'col-span-2' },
  { k: 'profissao', label: 'Profissão', span: 'col-span-3' },
  { k: 'estadoCivil', label: 'Estado Civil', span: 'col-span-3' },
  { k: 'conjugeNome', label: 'Cônjuge (se houver)', span: 'col-span-4' },
  { k: 'conjugeCpf', label: 'CPF Cônjuge', span: 'col-span-2' },
  { k: 'filiacao', label: 'Filiação (mãe / pai)', span: 'col-span-6' },
  { k: 'endereco', label: 'Residente e domiciliado(a) em (Endereço)', span: 'col-span-6' },
  { k: 'cidadeUf', label: 'Cidade/UF', span: 'col-span-4' },
  { k: 'cep', label: 'CEP', span: 'col-span-2' },
];

function Bloco({ titulo, pessoa, onChange, sugProp }: { titulo: string; pessoa: PessoaQualificada; onChange: (p: PessoaQualificada) => void; sugProp: ProprietarioCad[] }) {
  function setNome(v: string) {
    const m = sugProp.find((s) => s.nome === v);
    onChange(m ? { ...pessoa, ...m, nome: v } as PessoaQualificada : { ...pessoa, nome: v });
  }
  return (
    <div className="space-y-1.5 border rounded-lg bg-muted/10 p-2.5">
      {titulo && <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b pb-0.5 mb-1.5">{titulo}</h3>}
      <div className="grid grid-cols-6 gap-x-2 gap-y-1.5">
        {CAMPOS.map((c) => (
          <div key={c.k} className={`space-y-0.5 ${c.span}`}>
            <Label className="text-[10px] text-muted-foreground font-semibold leading-none">{c.label}</Label>
            {c.k === 'nome'
              ? <Input list="lista-pessoas" value={pessoa.nome} onChange={(e) => setNome(e.target.value)} className="h-7 text-[11px]" />
              : <Input value={pessoa[c.k]} onChange={(e) => onChange({ ...pessoa, [c.k]: e.target.value })} className="h-7 text-[11px]" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function transVazio(imovel: ImovelData): PessoaQualificada {
  return { ...PESSOA_VAZIA, nome: imovel.proprietario, cpf: imovel.cpfProprietario, cidadeUf: imovel.municipio || '' };
}

export default function RequerimentoModal({ open, onOpenChange, imovel, onChangeImovel, tecnico, areaRealHa, requerente, transmitente, tipoAto, partesAdicionais, onChangePessoas, sugProp, correcoes, onBaixar }: Props) {
  const [req, setReq] = useState<PessoaQualificada>(requerente ?? PESSOA_VAZIA);
  const [trans, setTrans] = useState<PessoaQualificada>(transmitente ?? transVazio(imovel));
  const [localTipoAto, setLocalTipoAto] = useState<TipoAtoRequerimento>(tipoAto);
  const [localPartesAdicionais, setLocalPartesAdicionais] = useState<PessoaQualificada[]>(partesAdicionais);
  const [msg, setMsg] = useState('');
  const [mostrarDicas, setMostrarDicas] = useState(true);
  const permiteVariasPartes = localTipoAto === 'doacao' || localTipoAto === 'unificacao';

  useEffect(() => { setMostrarDicas(carregarPreferencias().mostrarDicasEducativas); }, []);

  function addParte() { setLocalPartesAdicionais((ps) => [...ps, { ...PESSOA_VAZIA }]); }
  function setParte(i: number, p: PessoaQualificada) { setLocalPartesAdicionais((ps) => ps.map((x, k) => (k === i ? p : x))); }
  function rmParte(i: number) { setLocalPartesAdicionais((ps) => ps.filter((_, k) => k !== i)); }

  const rotulos = {
    venda: { req: 'Requerente (adquirente / comprador)', trans: 'Proprietário registral (transmitente / vendedor)' },
    doacao: { req: 'Requerente (donatário)', trans: 'Doador (proprietário registral)' },
    unificacao: { req: 'Requerente (proprietário)', trans: 'Coproprietário / cônjuge (se houver)' },
    desmembramento: { req: 'Requerente (proprietário)', trans: 'Coproprietário / cônjuge (se houver)' },
    usucapiao: { req: 'Requerente (usucapiente)', trans: 'Titular registral / confrontante (se houver)' },
  }[localTipoAto];

  useEffect(() => {
    if (open) {
      setReq(requerente ?? PESSOA_VAZIA);
      setTrans(transmitente ?? transVazio(imovel));
      setLocalTipoAto(tipoAto || 'venda');
      setLocalPartesAdicionais(partesAdicionais ?? []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function gerar() {
    if (!tecnico) { setMsg('Configure o técnico primeiro.'); return; }
    if (!req.nome?.trim() || !trans.nome?.trim()) { setMsg('Preencha o nome do requerente e do transmitente.'); return; }
    if (!req.cpf?.trim() || !trans.cpf?.trim()) { setMsg('Preencha o CPF/CNPJ do requerente e do transmitente.'); return; }
    onChangePessoas(req, trans, localTipoAto, localPartesAdicionais);
    const padroes = carregarPadroes();
    const comarca = padroes.comarcaPadrao || imovel.municipio || '—';
    try {
      const response = await fetch('/api/export/requerimento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imovel,
          tecnico,
          requerente: req,
          transmitente: trans,
          areaRealHa,
          dataExtenso: dataExtensoHoje(),
          tipoAto: localTipoAto,
          partesAdicionais: localPartesAdicionais,
          comarca,
          correcoes: correcoes || []
        })
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.erro || 'Falha ao gerar requerimento no servidor.');
      }
      const blobBruto = await response.blob();
      const blob = await compatibilizarWord2007(blobBruto);
      saveAs(blob, `Requerimento - ${imovel.denominacao || 'imovel'}.docx`);
      onBaixar?.();
      setMsg('Requerimento gerado.');
    } catch (e: any) {
      console.error(e);
      setMsg(e.message || 'Erro ao gerar requerimento.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[1400px] max-h-[95vh] flex flex-col p-6">
        <DialogHeader className="shrink-0">
          <DialogTitle>Requerimento ao cartório (retificação de área)</DialogTitle>
        </DialogHeader>
        <datalist id="lista-pessoas">{sugProp.map((p) => <option key={p.id} value={p.nome} />)}</datalist>

        {/* Área Central */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 my-2">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
            {/* Coluna 1: Tipo de Ato e Dados do Imóvel */}
            <div className="space-y-4">
              {/* Tipo de Ato */}
              <div className="space-y-1.5 border rounded-lg bg-muted/10 p-3">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Tipo de ato</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {OPCOES_ATO.map((o) => (
                    <Button key={o.valor} type="button" size="sm" variant={localTipoAto === o.valor ? 'default' : 'outline'} onClick={() => setLocalTipoAto(o.valor)} className={`h-8 text-xs ${localTipoAto === o.valor ? '' : 'bg-background hover:bg-muted'} ${o.valor === 'usucapiao' ? 'col-span-2' : ''}`}>
                      {o.rotulo}
                    </Button>
                  ))}
                </div>
                {mostrarDicas && (
                  <p className="rounded-sm border border-dashed bg-muted/30 p-2 text-[10px] text-muted-foreground leading-snug">
                    {OPCOES_ATO.find((o) => o.valor === localTipoAto)?.explicacao}
                  </p>
                )}
                {localTipoAto !== 'venda' && (
                  <p className="text-[10px] text-amber-500 font-semibold leading-snug">
                    Texto ainda não conferido com um modelo real de cartório para este tipo de ato — revise a redação jurídica antes de protocolar.
                  </p>
                )}
              </div>

              {/* Dados do Imóvel */}
              <div className="grid grid-cols-2 gap-2.5 rounded-lg border bg-muted/10 p-3 text-xs">
                <div className="col-span-2 border-b pb-1.5 mb-0.5">
                  <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider block">Imóvel</span>
                  <span className="font-semibold text-foreground text-[11px]">{imovel.denominacao || '—'} · Matrícula {imovel.matricula || '—'}</span>
                </div>
                <div>
                  <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider block">Área real</span>
                  <span className="font-semibold text-foreground text-[11px]">{numBR(areaRealHa, 4)} ha</span>
                </div>
                <div>
                  <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider block">Valor do imóvel</span>
                  <span className="font-semibold text-foreground text-[11px]">{imovel.valorImovel ? `R$ ${numBR(imovel.valorImovel, 2)}` : '—'}</span>
                </div>
                <div className="space-y-0.5 col-span-2">
                  <Label className="text-[10px] text-muted-foreground font-semibold">Área anterior na matrícula (ha)</Label>
                  <Input type="number" step="0.0001" value={imovel.areaAnterior ?? ''} onChange={(e) => onChangeImovel({ ...imovel, areaAnterior: e.target.value ? Number(e.target.value) : undefined })} className="h-7 text-[11px]" />
                </div>
                <div className="space-y-0.5 col-span-2">
                  <Label className="text-[10px] text-muted-foreground font-semibold">Valor para custas (R$)</Label>
                  <Input type="number" step="0.01" value={imovel.valorImovel ?? ''} onChange={(e) => onChangeImovel({ ...imovel, valorImovel: e.target.value ? Number(e.target.value) : undefined })} className="h-7 text-[11px]" />
                </div>
                {localTipoAto === 'unificacao' && (
                  <div className="col-span-2 space-y-0.5">
                    <Label className="text-[10px] text-muted-foreground font-semibold">Matrículas de origem (separadas por vírgula)</Label>
                    <Input
                      placeholder="ex.: 1234, 5678, 9012"
                      value={(imovel.matriculasOrigem ?? []).join(', ')}
                      onChange={(e) => onChangeImovel({ ...imovel, matriculasOrigem: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                      className="h-7 text-[11px]"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Coluna 2: Requerente */}
            <div className="lg:col-span-1">
              <Bloco titulo={rotulos.req} pessoa={req} onChange={setReq} sugProp={sugProp} />
            </div>

            {/* Coluna 3: Transmitente */}
            <div className="lg:col-span-1">
              <Bloco titulo={rotulos.trans} pessoa={trans} onChange={setTrans} sugProp={sugProp} />
            </div>
          </div>

          {/* Partes Adicionais */}
          {permiteVariasPartes && (
            <div className="space-y-3 rounded-lg border border-dashed p-3 bg-muted/5">
              <div className="flex items-center justify-between border-b pb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Partes adicionais (mais de um donatário/coproprietário)</span>
                <Button type="button" size="sm" variant="outline" onClick={addParte} className="h-7 text-xs"><UserPlus className="size-3 mr-1" /> Adicionar parte</Button>
              </div>
              {localPartesAdicionais.map((p, i) => (
                <div key={i} className="space-y-1 rounded-lg border p-3 bg-background/50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground">Parte adicional {i + 1}</span>
                    <Button type="button" size="sm" variant="ghost" className="h-6 px-1 hover:bg-destructive/10" onClick={() => rmParte(i)}><Trash2 className="size-3.5 text-destructive" /></Button>
                  </div>
                  <Bloco titulo="" pessoa={p} onChange={(np) => setParte(i, np)} sugProp={sugProp} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rodapé Fixo */}
        <div className="flex items-center justify-between border-t pt-3 mt-auto shrink-0">
          <Button onClick={gerar}><FileSignature /> Gerar requerimento (.docx)</Button>
          {msg && <span className="text-sm text-primary font-semibold">{msg}</span>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
function dataExtensoHoje(d = new Date()): string {
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}
