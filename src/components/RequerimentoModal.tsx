'use client';

import { useEffect, useState } from 'react';
import { saveAs } from 'file-saver';
import { FileSignature, UserPlus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { confirmar, escolher, avisar } from '@/lib/ui/dialogos';
import { cpfOuCnpjValido, formatarCpfCnpj } from '@/lib/topo/validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ImovelData, TecnicoData, PessoaQualificada, ProprietarioCad, CorrecaoErrata, ProprietarioParte } from '@/lib/topo/types';
import type { TipoAtoRequerimento } from '@/lib/export/requerimento';
import { compatibilizarWord2007 } from '@/lib/export/compatWord2007';
import { numBR } from '@/lib/topo/geometry';
import { carregarPreferencias } from '@/lib/store/preferencias';
import { carregarPadroes } from '@/lib/store/padroes';
import NotaLegal from '@/components/NotaLegal';

const OPCOES_ATO: { valor: TipoAtoRequerimento; rotulo: string; explicacao: string }[] = [
  {
    valor: 'retificacao', rotulo: 'Retificação Simples',
    explicacao: 'Requerimento padrão feito pelo proprietário/possuidor para georreferenciamento e retificação de área. O cônjuge ou coproprietário é opcional.',
  },
  {
    valor: 'venda', rotulo: 'Compra e venda',
    explicacao: 'O imóvel está sendo vendido e o comprador (requerente) pede a retificação da área já em nome dele. Precisa do CPF/RG de quem vende and de quem compra.',
  },
  {
    valor: 'doacao', rotulo: 'Doação',
    explicacao: 'O proprietário (doador) está doando o imóvel a alguém (donatário). O documento usa os termos "doador" e "donatário" em vez de vendedor/comprador.',
  },
  {
    valor: 'unificacao', rotulo: 'Remembramento',
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

const CAMPOS: { k: keyof PessoaQualificada; label: string; span: string; importante?: boolean }[] = [
  { k: 'nome', label: 'Nome', span: 'col-span-6 md:col-span-4', importante: true },
  { k: 'rg', label: 'RG', span: 'col-span-3 md:col-span-1' },
  { k: 'cpf', label: 'CPF/CNPJ', span: 'col-span-3 md:col-span-1', importante: true },
  { k: 'nacionalidade', label: 'Nacionalidade', span: 'col-span-2' },
  { k: 'naturalidade', label: 'Naturalidade', span: 'col-span-2' },
  { k: 'dataNascimento', label: 'Data Nasc.', span: 'col-span-2' },
  { k: 'profissao', label: 'Profissão', span: 'col-span-3' },
  { k: 'estadoCivil', label: 'Estado Civil', span: 'col-span-3', importante: true },
  { k: 'conjugeNome', label: 'Cônjuge (se houver)', span: 'col-span-4' },
  { k: 'conjugeCpf', label: 'CPF Cônjuge', span: 'col-span-2' },
  { k: 'filiacao', label: 'Filiação (mãe / pai)', span: 'col-span-6' },
  { k: 'endereco', label: 'Residente e domiciliado(a) em (Endereço)', span: 'col-span-6', importante: true },
  { k: 'cidadeUf', label: 'Cidade/UF', span: 'col-span-4', importante: true },
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
        {CAMPOS.map((c) => {
          const isDoc = /cpf/i.test(c.k);
          const val = pessoa[c.k] || '';
          const formatado = isDoc ? formatarCpfCnpj(val) : val;

          const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const raw = e.target.value;
            onChange({ ...pessoa, [c.k]: isDoc ? formatarCpfCnpj(raw) : raw });
          };

          const handleBlur = async () => {
            if (isDoc && val) {
              const clean = val.replace(/\D/g, '');
              if (clean.length > 0 && !cpfOuCnpjValido(clean)) {
                await avisar({
                  titulo: 'Documento Inválido',
                  mensagem: `O ${c.label} informado ("${val}") é inválido. Por favor, digite um CPF ou CNPJ correto.`
                });
                onChange({ ...pessoa, [c.k]: '' });
              }
            }
          };

          return (
            <div key={c.k} className={`space-y-0.5 ${c.span}`}>
              <Label className={`text-[10px] font-semibold leading-none ${c.importante ? 'text-amber-600 dark:text-amber-400 font-extrabold' : 'text-muted-foreground'}`}>
                {c.label}{c.importante && ' *'}
              </Label>
              {c.k === 'nome'
                ? <Input list="lista-pessoas" value={pessoa.nome} onChange={(e) => setNome(e.target.value)} className="h-7 text-[11px]" />
                : <Input value={formatado} onChange={handleChange} onBlur={handleBlur} className="h-7 text-[11px]" />}
            </div>
          );
        })}
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
  // Partes adicionais = mais de uma pessoa do lado do REQUERENTE ou TRANSMITENTE (ex.: cônjuges, coproprietários).
  const permiteVariasPartes = localTipoAto === 'venda' || localTipoAto === 'doacao' || localTipoAto === 'unificacao' || localTipoAto === 'retificacao';
  const rotuloParteAdicional = localTipoAto === 'venda' ? 'comprador/vendedor' : localTipoAto === 'doacao' ? 'donatário/doador' : 'proprietário';

  useEffect(() => { setMostrarDicas(carregarPreferencias().mostrarDicasEducativas); }, []);

  function addParte() { setLocalPartesAdicionais((ps) => [...ps, { ...PESSOA_VAZIA, papel: 'requerente' }]); }
  function setParte(i: number, p: PessoaQualificada) { setLocalPartesAdicionais((ps) => ps.map((x, k) => (k === i ? p : x))); }
  function rmParte(i: number) { setLocalPartesAdicionais((ps) => ps.filter((_, k) => k !== i)); }

  const rotulos = {
    venda: { req: 'Requerente (adquirente / comprador)', trans: 'Proprietário registral (transmitente / vendedor)' },
    doacao: { req: 'Requerente (donatário)', trans: 'Doador (proprietário registral)' },
    unificacao: { req: 'Requerente (proprietário)', trans: 'Coproprietário / cônjuge (se houver)' },
    desmembramento: { req: 'Requerente (proprietário)', trans: 'Coproprietário / cônjuge (se houver)' },
    usucapiao: { req: 'Requerente (usucapiente)', trans: 'Titular registral / confrontante (se houver)' },
    retificacao: { req: 'Requerente (proprietário / possuidor)', trans: 'Cônjuge / Coproprietário (se houver - opcional)' },
  }[localTipoAto] ?? { req: 'Requerente', trans: 'Coproprietário (se houver)' };

  useEffect(() => {
    if (open) {
      setReq(requerente ?? PESSOA_VAZIA);
      setTrans(transmitente ?? transVazio(imovel));
      setLocalTipoAto(tipoAto || 'retificacao');
      
      let iniciais = partesAdicionais ?? [];
      if (iniciais.length === 0 && imovel.proprietariosAdicionais && imovel.proprietariosAdicionais.length > 0) {
        iniciais = imovel.proprietariosAdicionais.map((p) => ({
          ...PESSOA_VAZIA,
          nome: p.nome,
          cpf: p.cpf,
          conjugeNome: p.conjugeNome || '',
          conjugeCpf: p.conjugeCpf || '',
          papel: 'transmitente' as const
        }));
      }
      setLocalPartesAdicionais(iniciais);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleCloseRequest() {
    const mudouReq = JSON.stringify(req) !== JSON.stringify(requerente ?? PESSOA_VAZIA);
    const mudouTrans = JSON.stringify(trans) !== JSON.stringify(transmitente ?? transVazio(imovel));
    const mudouPartes = JSON.stringify(localPartesAdicionais) !== JSON.stringify(partesAdicionais ?? []);
    const mudouTipo = localTipoAto !== tipoAto;

    if (mudouReq || mudouTrans || mudouPartes || mudouTipo) {
      const ok = await confirmar({
        titulo: 'Fechar formulário',
        mensagem: 'Você preencheu dados no requerimento. Deseja realmente fechar e perder as informações digitadas?',
        okLabel: 'Descartar e fechar',
        perigo: true,
      });
      if (!ok) return;
    }
    onOpenChange(false);
  }

  async function gerar() {
    let dadosIncompletos = false;
    let msgFalta = '';

    if (!req.nome?.trim()) { msgFalta = 'Nome do requerente está em branco.'; dadosIncompletos = true; }
    else if (!req.cpf?.trim()) { msgFalta = 'CPF/CNPJ do requerente está em branco.'; dadosIncompletos = true; }
    
    const precisaTransmitente = localTipoAto !== 'retificacao' || !!trans.nome?.trim() || !!trans.cpf?.trim();
    if (!dadosIncompletos && precisaTransmitente) {
      if (!trans.nome?.trim()) { msgFalta = 'Nome do transmitente / cônjuge está em branco.'; dadosIncompletos = true; }
      else if (!trans.cpf?.trim()) { msgFalta = 'CPF/CNPJ do transmitente / cônjuge está em branco.'; dadosIncompletos = true; }
    }

    let permitirIncompleto = false;

    if (dadosIncompletos) {
      const opcao = await escolher({
        titulo: 'Faltam Dados Básicos',
        mensagem: `${msgFalta}\n\nDeseja voltar para preencher ou prefere gerar o documento com lacunas (os campos em branco serão marcados com a palavra "DADO AUSENTE" em vermelho)?`,
        opcoes: [
          { chave: 'gerar', label: 'Gerar com DADO AUSENTE', variant: 'destructive' },
        ],
        cancelLabel: 'Voltar e completar'
      });

      if (opcao === 'gerar') {
        permitirIncompleto = true;
      } else {
        return;
      }
    }

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
          correcoes: correcoes || [],
          permitirIncompleto
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
      setMsg(permitirIncompleto ? 'Requerimento gerado (incompleto).' : 'Requerimento gerado.');
    } catch (e: unknown) {
      console.error(e);
      setMsg((e as Error).message || 'Erro ao gerar requerimento.');
    }
  }


  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleCloseRequest(); else onOpenChange(val); }}>
      <DialogContent className="w-[95vw] max-w-[1400px] max-h-[95vh] flex flex-col p-6" onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="shrink-0">
          <DialogTitle>Requerimento ao cartório (retificação de área)</DialogTitle>
        </DialogHeader>
        <datalist id="lista-pessoas">{sugProp.map((p) => <option key={p.id} value={p.nome} />)}</datalist>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1 my-2">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
            {/* Coluna 1: Tipo de Ato e Dados do Imóvel */}
            <div className="space-y-4">
              {/* Tipo de Ato */}
              <div className="space-y-1.5 border rounded-lg bg-muted/10 p-3">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Tipo de ato</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {OPCOES_ATO.map((o) => (
                    <Button key={o.valor} type="button" size="sm" variant={localTipoAto === o.valor ? 'default' : 'outline'} onClick={() => setLocalTipoAto(o.valor)} className={`h-8 text-xs ${localTipoAto === o.valor ? '' : 'bg-background hover:bg-muted'}`}>
                      {o.rotulo}
                    </Button>
                  ))}
                </div>
                {mostrarDicas && (
                  <p className="rounded-lg border border-dashed border-amber-500/20 bg-amber-500/5 p-2.5 text-[10px] text-muted-foreground leading-relaxed">
                    <strong className="text-amber-700 dark:text-amber-400 font-bold block mb-0.5">O que implica este tipo de ato:</strong>
                    {OPCOES_ATO.find((o) => o.valor === localTipoAto)?.explicacao}
                  </p>
                )}
                <NotaLegal chave={localTipoAto === 'usucapiao' ? 'usucapiao' : 'requerimento'} />
                {localTipoAto !== 'venda' && localTipoAto !== 'retificacao' && (
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
                <div className="space-y-1 col-span-2">
                  <div>
                    <Label className="text-[10px] text-amber-600 dark:text-amber-400 font-extrabold flex items-center gap-1 leading-none">
                      Área anterior na matrícula (ha) *
                    </Label>
                    <span className="text-[9px] text-muted-foreground block leading-tight mt-0.5">Área antiga registrada no cartório, necessária para o cálculo da diferença de retificação.</span>
                  </div>
                  <Input type="number" step="0.0001" placeholder="ex.: 15,4320" value={imovel.areaAnterior ?? ''} onChange={(e) => onChangeImovel({ ...imovel, areaAnterior: e.target.value ? Number(e.target.value) : undefined })} className="h-7 text-[11px]" />
                </div>
                <div className="space-y-1 col-span-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground font-semibold block leading-none">Valor do imóvel para custas (R$)</Label>
                    <span className="text-[9px] text-muted-foreground block leading-tight mt-0.5">Opcional. Usado pelo oficial do registro para estipular a faixa de emolumentos cartoriais.</span>
                  </div>
                  <Input type="number" step="0.01" placeholder="ex.: 150000" value={imovel.valorImovel ?? ''} onChange={(e) => onChangeImovel({ ...imovel, valorImovel: e.target.value ? Number(e.target.value) : undefined })} className="h-7 text-[11px]" />
                </div>
                {localTipoAto === 'unificacao' && (
                  <div className="col-span-2 space-y-1">
                    <div>
                      <Label className="text-[10px] text-amber-600 dark:text-amber-400 font-extrabold flex items-center gap-1 leading-none">Matrículas de origem *</Label>
                      <span className="text-[9px] text-muted-foreground block leading-tight mt-0.5">Matrículas antigas que serão unificadas (separadas por vírgula).</span>
                    </div>
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
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block leading-none">Partes adicionais</span>
                  <span className="text-[9px] text-muted-foreground block leading-tight mt-1">Para conjugar mais proprietários/vendedores ou compradores no documento.</span>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={addParte} className="h-7 text-xs"><UserPlus className="size-3 mr-1" /> Adicionar pessoa</Button>
              </div>
              {localPartesAdicionais.map((p, i) => (
                <div key={i} className="space-y-1 rounded-lg border p-3 bg-background/50">
                  <div className="flex items-center justify-between border-b pb-1 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold text-foreground uppercase">Pessoa {i + 1} - papel:</span>
                      <select
                        value={p.papel || 'requerente'}
                        onChange={(e) => setParte(i, { ...p, papel: e.target.value as 'requerente' | 'transmitente' })}
                        className="h-6 rounded border bg-background px-1.5 text-[10px] font-semibold text-foreground focus:ring-1 focus:ring-primary"
                      >
                        <option value="requerente">
                          {localTipoAto === 'venda' ? 'Comprador / Requerente' : localTipoAto === 'doacao' ? 'Donatário' : 'Requerente / Proprietário'}
                        </option>
                        <option value="transmitente">
                          {localTipoAto === 'venda' ? 'Vendedor / Proprietário Registral' : localTipoAto === 'doacao' ? 'Doador' : 'Coproprietário / Cônjuge'}
                        </option>
                      </select>
                    </div>
                    <Button type="button" size="sm" variant="ghost" title="Remover esta parte" className="h-6 px-1 hover:bg-destructive/10" onClick={() => rmParte(i)}><Trash2 className="size-3.5 text-destructive" /></Button>
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
