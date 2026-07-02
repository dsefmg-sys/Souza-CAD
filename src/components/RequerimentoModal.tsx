'use client';

import { useEffect, useState } from 'react';
import { saveAs } from 'file-saver';
import { FileSignature, UserPlus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ImovelData, TecnicoData, PessoaQualificada, ProprietarioCad } from '@/lib/topo/types';
import { gerarRequerimentoDocx, type TipoAtoRequerimento } from '@/lib/export/requerimento';
import { numBR } from '@/lib/topo/geometry';
import { carregarPreferencias } from '@/lib/store/preferencias';

const OPCOES_ATO: { valor: TipoAtoRequerimento; rotulo: string; explicacao: string }[] = [
  {
    valor: 'venda', rotulo: 'Compra e venda',
    explicacao: 'O imóvel está sendo vendido e o comprador (requerente) pede a retificação da área já em nome dele. Precisa do CPF/RG de quem vende e de quem compra.',
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
  onChangePessoas: (req: PessoaQualificada, trans: PessoaQualificada) => void;
  sugProp: ProprietarioCad[];
  onBaixar?: () => void;
}

const CAMPOS: { k: keyof PessoaQualificada; label: string; wide?: boolean }[] = [
  { k: 'nome', label: 'Nome', wide: true },
  { k: 'rg', label: 'RG' },
  { k: 'cpf', label: 'CPF' },
  { k: 'nacionalidade', label: 'Nacionalidade' },
  { k: 'naturalidade', label: 'Naturalidade' },
  { k: 'dataNascimento', label: 'Data de Nascimento' },
  { k: 'profissao', label: 'Profissão' },
  { k: 'estadoCivil', label: 'Estado Civil' },
  { k: 'filiacao', label: 'Filiação', wide: true },
  { k: 'conjugeNome', label: 'Cônjuge' },
  { k: 'conjugeCpf', label: 'CPF do cônjuge' },
  { k: 'endereco', label: 'Residente e domiciliado em', wide: true },
  { k: 'cidadeUf', label: 'Cidade/UF' },
  { k: 'cep', label: 'CEP' },
];

function Bloco({ titulo, pessoa, onChange, sugProp }: { titulo: string; pessoa: PessoaQualificada; onChange: (p: PessoaQualificada) => void; sugProp: ProprietarioCad[] }) {
  function setNome(v: string) {
    const m = sugProp.find((s) => s.nome === v);
    onChange(m ? { ...pessoa, ...m, nome: v } as PessoaQualificada : { ...pessoa, nome: v });
  }
  return (
    <div className="space-y-2">
      {titulo && <h3 className="text-sm font-semibold">{titulo}</h3>}
      <div className="grid grid-cols-2 gap-2">
        {CAMPOS.map((c) => (
          <div key={c.k} className={`space-y-1 ${c.wide ? 'col-span-2' : ''}`}>
            <Label>{c.label}</Label>
            {c.k === 'nome'
              ? <Input list="lista-pessoas" value={pessoa.nome} onChange={(e) => setNome(e.target.value)} />
              : <Input value={pessoa[c.k]} onChange={(e) => onChange({ ...pessoa, [c.k]: e.target.value })} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function transVazio(imovel: ImovelData): PessoaQualificada {
  return { ...PESSOA_VAZIA, nome: imovel.proprietario, cpf: imovel.cpfProprietario, cidadeUf: imovel.municipio || '' };
}

export default function RequerimentoModal({ open, onOpenChange, imovel, onChangeImovel, tecnico, areaRealHa, requerente, transmitente, onChangePessoas, sugProp, onBaixar }: Props) {
  const [req, setReq] = useState<PessoaQualificada>(requerente ?? PESSOA_VAZIA);
  const [trans, setTrans] = useState<PessoaQualificada>(transmitente ?? transVazio(imovel));
  const [tipoAto, setTipoAto] = useState<TipoAtoRequerimento>('venda');
  const [partesAdicionais, setPartesAdicionais] = useState<PessoaQualificada[]>([]);
  const [msg, setMsg] = useState('');
  const [mostrarDicas, setMostrarDicas] = useState(true);
  const permiteVariasPartes = tipoAto === 'doacao' || tipoAto === 'unificacao';

  useEffect(() => { setMostrarDicas(carregarPreferencias().mostrarDicasEducativas); }, []);

  function addParte() { setPartesAdicionais((ps) => [...ps, { ...PESSOA_VAZIA }]); }
  function setParte(i: number, p: PessoaQualificada) { setPartesAdicionais((ps) => ps.map((x, k) => (k === i ? p : x))); }
  function rmParte(i: number) { setPartesAdicionais((ps) => ps.filter((_, k) => k !== i)); }

  const rotulos = {
    venda: { req: 'Requerente (adquirente / comprador)', trans: 'Proprietário registral (transmitente / vendedor)' },
    doacao: { req: 'Requerente (donatário)', trans: 'Doador (proprietário registral)' },
    unificacao: { req: 'Requerente (proprietário)', trans: 'Coproprietário / cônjuge (se houver)' },
    desmembramento: { req: 'Requerente (proprietário)', trans: 'Coproprietário / cônjuge (se houver)' },
  }[tipoAto];

  useEffect(() => {
    if (open) {
      setReq(requerente ?? PESSOA_VAZIA);
      setTrans(transmitente ?? transVazio(imovel));
      setPartesAdicionais([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function gerar() {
    if (!tecnico) { setMsg('Configure o técnico primeiro.'); return; }
    if (!req.nome?.trim() || !trans.nome?.trim()) { setMsg('Preencha o nome do requerente e do transmitente.'); return; }
    if (!req.cpf?.trim() || !trans.cpf?.trim()) { setMsg('Preencha o CPF/CNPJ do requerente e do transmitente.'); return; }
    onChangePessoas(req, trans);
    const blob = await gerarRequerimentoDocx({ imovel, tecnico, requerente: req, transmitente: trans, areaRealHa, dataExtenso: dataExtensoHoje(), tipoAto, partesAdicionais });
    saveAs(blob, `Requerimento - ${imovel.denominacao || 'imovel'}.docx`);
    onBaixar?.();
    setMsg('Requerimento gerado.');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Requerimento ao cartório (retificação de área)</DialogTitle>
        </DialogHeader>
        <datalist id="lista-pessoas">{sugProp.map((p) => <option key={p.id} value={p.nome} />)}</datalist>

        <div className="space-y-1">
          <Label>Tipo de ato</Label>
          <div className="flex flex-wrap gap-1.5">
            {OPCOES_ATO.map((o) => (
              <Button key={o.valor} type="button" size="sm" variant={tipoAto === o.valor ? 'default' : 'outline'} onClick={() => setTipoAto(o.valor)}>
                {o.rotulo}
              </Button>
            ))}
          </div>
          {mostrarDicas && (
            <p className="rounded border border-dashed bg-muted/30 p-2 text-xs text-muted-foreground">
              {OPCOES_ATO.find((o) => o.valor === tipoAto)?.explicacao}
            </p>
          )}
          {tipoAto !== 'venda' && (
            <p className="text-[11px] text-amber-500">
              Texto ainda não conferido com um modelo real de cartório para este tipo de ato — revise a redação jurídica antes de protocolar.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 rounded border bg-muted/30 p-3 text-sm">
          <div><b>Imóvel:</b> {imovel.denominacao || '—'} · Matrícula {imovel.matricula || '—'}</div>
          <div><b>Área real (levantada):</b> {numBR(areaRealHa, 4)} ha</div>
          <div className="space-y-1">
            <Label>Área anterior na matrícula (ha)</Label>
            <Input type="number" step="0.0001" value={imovel.areaAnterior ?? ''} onChange={(e) => onChangeImovel({ ...imovel, areaAnterior: e.target.value ? Number(e.target.value) : undefined })} />
          </div>
          <div className="space-y-1">
            <Label>Valor do imóvel (R$)</Label>
            <Input type="number" step="0.01" value={imovel.valorImovel ?? ''} onChange={(e) => onChangeImovel({ ...imovel, valorImovel: e.target.value ? Number(e.target.value) : undefined })} />
          </div>
        </div>

        <Bloco titulo={rotulos.req} pessoa={req} onChange={setReq} sugProp={sugProp} />
        <Bloco titulo={rotulos.trans} pessoa={trans} onChange={setTrans} sugProp={sugProp} />

        {permiteVariasPartes && (
          <div className="space-y-3 rounded border border-dashed p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Partes adicionais (mais de um donatário/coproprietário)</span>
              <Button type="button" size="sm" variant="outline" onClick={addParte}><UserPlus className="size-3.5" /> Adicionar parte</Button>
            </div>
            {partesAdicionais.map((p, i) => (
              <div key={i} className="space-y-1 rounded border p-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Parte adicional {i + 1}</span>
                  <Button type="button" size="sm" variant="ghost" className="h-6 px-1" onClick={() => rmParte(i)}><Trash2 className="size-3.5 text-destructive" /></Button>
                </div>
                <Bloco titulo="" pessoa={p} onChange={(np) => setParte(i, np)} sugProp={sugProp} />
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 border-t pt-3">
          <Button onClick={gerar}><FileSignature /> Gerar requerimento (.docx)</Button>
          {msg && <span className="text-sm text-primary">{msg}</span>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
function dataExtensoHoje(d = new Date()): string {
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}
