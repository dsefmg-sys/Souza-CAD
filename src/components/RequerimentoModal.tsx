'use client';

import { useEffect, useState } from 'react';
import { saveAs } from 'file-saver';
import { FileSignature, UserPlus, Trash2, Scale, Check, Download, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { confirmar, escolher, avisar } from '@/lib/ui/dialogos';
import { cpfOuCnpjValido, formatarCpfCnpj } from '@/lib/topo/validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ImovelData, TecnicoData, PessoaQualificada, ProprietarioCad, CorrecaoErrata, ProprietarioParte, Gleba } from '@/lib/topo/types';
import { gerarRequerimentoDocx, type TipoAtoRequerimento } from '@/lib/export/requerimento';
import { compatibilizarWord2007 } from '@/lib/export/compatWord2007';
import { numBR } from '@/lib/topo/geometry';
import { obterComarca } from '@/lib/topo/municipios';
import { carregarPreferencias } from '@/lib/store/preferencias';
import { carregarPadroes } from '@/lib/store/padroes';
import { perguntarTratamentoAusentes, type CampoFaltante } from '@/lib/export/confirmarAusentes';

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

const CONFIG_BOTOES_ATO: Record<
  TipoAtoRequerimento,
  { active: string; inactive: string }
> = {
  retificacao: {
    active: 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600',
    inactive: 'border-indigo-200/60 dark:border-indigo-900/40 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 bg-background'
  },
  venda: {
    active: 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600',
    inactive: 'border-emerald-200/60 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 bg-background'
  },
  doacao: {
    active: 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600',
    inactive: 'border-purple-200/60 dark:border-purple-900/40 text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/20 bg-background'
  },
  unificacao: {
    active: 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600',
    inactive: 'border-amber-200/60 dark:border-amber-900/40 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 bg-background'
  },
  desmembramento: {
    active: 'bg-cyan-600 hover:bg-cyan-700 text-white border-cyan-600',
    inactive: 'border-cyan-200/60 dark:border-cyan-900/40 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/20 bg-background'
  },
  usucapiao: {
    active: 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600',
    inactive: 'border-rose-200/60 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 bg-background'
  }
};


export const PESSOA_VAZIA: PessoaQualificada = {
  nome: '', rg: '', cpf: '', nacionalidade: 'Brasileira', naturalidade: '', dataNascimento: '',
  filiacao: '', profissao: '', estadoCivil: '', conjugeNome: '', conjugeRg: '', conjugeCpf: '',
  endereco: '', cidadeUf: '', cep: '', fracaoIdeal: '',
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
  tiposAtos?: TipoAtoRequerimento[];
  partesAdicionais: PessoaQualificada[];
  onChangePessoas: (
    req: PessoaQualificada,
    trans: PessoaQualificada,
    tipoAto: TipoAtoRequerimento,
    partesAdicionais: PessoaQualificada[],
    tiposAtos?: TipoAtoRequerimento[]
  ) => void;
  sugProp: ProprietarioCad[];
  correcoes: CorrecaoErrata[];
  onBaixar?: () => void;
  onBaixarPacoteZip?: (req: PessoaQualificada, trans: PessoaQualificada, tipoAto: TipoAtoRequerimento, partesAdicionais: PessoaQualificada[], tiposAtos?: TipoAtoRequerimento[]) => void;
  glebas?: Gleba[];
  glebaAtivaId?: string;
  onSalvarProjeto?: (overrides?: {
    requerente?: PessoaQualificada;
    transmitente?: PessoaQualificada;
    tipoAto?: TipoAtoRequerimento;
    partesAdicionais?: PessoaQualificada[];
  }) => Promise<void>;
}

const CAMPOS: { k: keyof PessoaQualificada; label: string; span: string; importante?: boolean }[] = [
  { k: 'nome', label: 'Nome', span: 'col-span-6 sm:col-span-4', importante: true },
  { k: 'rg', label: 'RG', span: 'col-span-6 sm:col-span-3 md:col-span-2' },
  { k: 'cpf', label: 'CPF/CNPJ', span: 'col-span-6 sm:col-span-3 md:col-span-2', importante: true },
  { k: 'nacionalidade', label: 'Nacionalidade', span: 'col-span-6 sm:col-span-2' },
  { k: 'naturalidade', label: 'Naturalidade', span: 'col-span-6 sm:col-span-2' },
  { k: 'dataNascimento', label: 'Data Nasc.', span: 'col-span-6 sm:col-span-2' },
  { k: 'profissao', label: 'Profissão', span: 'col-span-6 sm:col-span-3' },
  { k: 'estadoCivil', label: 'Estado Civil', span: 'col-span-6 sm:col-span-3', importante: true },
  { k: 'conjugeNome', label: 'Cônjuge (se houver)', span: 'col-span-6 sm:col-span-4' },
  { k: 'conjugeCpf', label: 'CPF Cônjuge', span: 'col-span-6 sm:col-span-2' },
  { k: 'filiacao', label: 'Filiação (mãe / pai)', span: 'col-span-6' },
  { k: 'endereco', label: 'Residente e domiciliado(a) em (Endereço)', span: 'col-span-6', importante: true },
  { k: 'cidadeUf', label: 'Cidade/UF', span: 'col-span-6 sm:col-span-4', importante: true },
  { k: 'cep', label: 'CEP', span: 'col-span-6 sm:col-span-2' },
];

const PLACEHOLDERS_QUALIFICACAO: Record<keyof PessoaQualificada, string> = {
  nome: 'ex.: João da Silva',
  rg: 'ex.: MG-12.345.678',
  cpf: '000.000.000-00',
  nacionalidade: 'ex.: Brasileira',
  naturalidade: 'ex.: Manhuaçu - MG',
  dataNascimento: 'dd/mm/aaaa',
  profissao: 'ex.: Produtor Rural',
  estadoCivil: 'Selecione...',
  conjugeNome: 'ex.: Maria da Silva',
  conjugeRg: 'ex.: MG-98.765.432',
  conjugeCpf: '000.000.000-00',
  filiacao: 'ex.: Mãe: Ana Maria da Silva / Pai: José da Silva',
  endereco: 'ex.: Córrego do Sossego, s/nº, Zona Rural',
  cidadeUf: 'ex.: Manhuaçu - MG',
  cep: '36900-000',
  papel: '',
  fracaoIdeal: 'ex.: 50',
};

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

          const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
              {c.k === 'estadoCivil' ? (
                <select
                  value={pessoa.estadoCivil || ''}
                  onChange={handleChange}
                  className="h-7 w-full rounded border bg-background px-1.5 text-[11px] font-medium text-foreground focus:ring-1 focus:ring-primary"
                >
                  <option value="">Selecione o Estado Civil...</option>
                  <option value="Solteiro(a)">Solteiro(a)</option>
                  <option value="Casado(a)">Casado(a)</option>
                  <option value="Casado(a) - Comunhão Parcial de Bens">Casado(a) - Comunhão Parcial</option>
                  <option value="Casado(a) - Comunhão Universal de Bens">Casado(a) - Comunhão Universal</option>
                  <option value="Casado(a) - Separação Total de Bens">Casado(a) - Separação Total</option>
                  <option value="Casado(a) - Participação Final nos Aquestos">Casado(a) - Participação nos Aquestos</option>
                  <option value="Divorciado(a)">Divorciado(a)</option>
                  <option value="Viúvo(a)">Viúvo(a)</option>
                  <option value="União Estável">União Estável</option>
                </select>
              ) : c.k === 'nome' ? (
                <Input
                  list="lista-pessoas"
                  value={pessoa.nome}
                  placeholder={PLACEHOLDERS_QUALIFICACAO.nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="h-7 text-[11px]"
                />
              ) : (
                <Input
                  value={formatado}
                  placeholder={PLACEHOLDERS_QUALIFICACAO[c.k] || ''}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`h-7 text-[11px] ${isDoc ? 'min-w-[140px] font-mono' : ''}`}
                />
              )}
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

export default function RequerimentoModal({ open, onOpenChange, imovel, onChangeImovel, tecnico, areaRealHa, requerente, transmitente, tipoAto, tiposAtos, partesAdicionais, onChangePessoas, sugProp, correcoes, onBaixar, onBaixarPacoteZip, glebas, glebaAtivaId, onSalvarProjeto }: Props) {
  const [req, setReq] = useState<PessoaQualificada>(requerente ?? PESSOA_VAZIA);
  const [trans, setTrans] = useState<PessoaQualificada>(transmitente ?? transVazio(imovel));
  const [glebasSelecionadas, setGlebasSelecionadas] = useState<Set<string>>(() => {
    if (glebas && glebas.length > 0) return new Set(glebas.map((g) => g.id));
    return new Set();
  });
  const [localTiposAtos, setLocalTiposAtos] = useState<TipoAtoRequerimento[]>(() => {
    if (tiposAtos && tiposAtos.length > 0) return tiposAtos;
    return [tipoAto || 'retificacao'];
  });
  const [localPartesAdicionais, setLocalPartesAdicionais] = useState<PessoaQualificada[]>(partesAdicionais);
  const [msg, setMsg] = useState('');
  const [mostrarDicas, setMostrarDicas] = useState(true);

  const localTipoAto = localTiposAtos.find((a) => a === 'venda' || a === 'doacao' || a === 'usucapiao') || localTiposAtos[0];
  // Permite partes adicionais em todos os tipos de ato (venda, doação, unificação, retificação, desmembramento, usucapião).
  const permiteVariasPartes = true;

  const requerentesLista = [req, ...localPartesAdicionais.filter((p) => p.papel === 'requerente')];
  const totalRequerentes = requerentesLista.length;

  const obterFracaoEfetiva = (p: PessoaQualificada, total: number) => {
    if (p.fracaoIdeal !== undefined && p.fracaoIdeal !== '') return p.fracaoIdeal;
    return total > 1 ? String(Math.round((100 / total) * 100) / 100) : '100';
  };

  const somaFracoes = requerentesLista.reduce((acc, r) => acc + (parseFloat(obterFracaoEfetiva(r, totalRequerentes)) || 0), 0);
  const somaIncorreta = totalRequerentes > 1 && Math.abs(somaFracoes - 100) > 0.01;

  useEffect(() => { setMostrarDicas(carregarPreferencias().mostrarDicasEducativas); }, []);

  function toggleAto(valor: TipoAtoRequerimento) {
    setLocalTiposAtos((prev) => {
      if (prev.includes(valor)) {
        if (prev.length === 1) return prev; // Não permite desmarcar o único ato restante
        return prev.filter((a) => a !== valor);
      } else {
        return [...prev, valor];
      }
    });
  }

  function addParte(papel: 'requerente' | 'transmitente' = 'requerente', pre?: Partial<PessoaQualificada>) {
    setLocalPartesAdicionais((ps) => [...ps, { ...PESSOA_VAZIA, papel, ...pre }]);
  }
  function setParte(i: number, p: PessoaQualificada) { setLocalPartesAdicionais((ps) => ps.map((x, k) => (k === i ? p : x))); }
  function rmParte(i: number) { setLocalPartesAdicionais((ps) => ps.filter((_, k) => k !== i)); }

  const rotulos = {
    venda: { req: 'Requerente (adquirente / comprador principal)', trans: 'Proprietário registral (transmitente / vendedor principal)' },
    doacao: { req: 'Requerente (donatário principal)', trans: 'Doador (proprietário registral principal)' },
    unificacao: { req: 'Requerente (proprietário principal)', trans: 'Coproprietário / cônjuge (se houver)' },
    desmembramento: { req: 'Requerente (proprietário principal)', trans: 'Coproprietário / cônjuge (se houver)' },
    usucapiao: { req: 'Requerente (usucapiente principal)', trans: 'Titular registral / confrontante (se houver)' },
    retificacao: { req: 'Requerente (proprietário / possuidor principal)', trans: 'Cônjuge / Coproprietário (se houver - opcional)' },
  }[localTipoAto] ?? { req: 'Requerente', trans: 'Coproprietário (se houver)' };

  useEffect(() => {
    if (open) {
      setReq(requerente ?? PESSOA_VAZIA);
      setTrans(transmitente ?? transVazio(imovel));
      const iniciaisAtos = (tiposAtos && tiposAtos.length > 0) ? tiposAtos : [tipoAto || 'retificacao'];
      setLocalTiposAtos(iniciaisAtos);
      
      let iniciais = partesAdicionais ?? [];
      if (iniciais.length === 0 && imovel.proprietariosAdicionais && imovel.proprietariosAdicionais.length > 0) {
        iniciais = imovel.proprietariosAdicionais.map((p) => ({
          ...PESSOA_VAZIA,
          nome: p.nome,
          cpf: p.cpf,
          conjugeNome: p.conjugeNome || '',
          conjugeCpf: p.conjugeCpf || '',
          papel: (localTipoAto === 'venda' ? 'requerente' : 'transmitente') as 'requerente' | 'transmitente'
        }));
      }
      setLocalPartesAdicionais(iniciais);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function salvarDadosLocalEServer(fechar = true) {
    setMsg('Salvando dados no projeto...');
    try {
      onChangePessoas(req, trans, localTipoAto, localPartesAdicionais, localTiposAtos);
      if (onSalvarProjeto) {
        await onSalvarProjeto({
          requerente: req,
          transmitente: trans,
          tipoAto: localTipoAto,
          partesAdicionais: localPartesAdicionais
        });
      }
      setMsg('Dados salvos com sucesso!');
      if (fechar) {
        onOpenChange(false);
      }
    } catch (e) {
      setMsg('Erro ao salvar.');
      await avisar({
        titulo: 'Erro ao Salvar',
        mensagem: 'Não foi possível salvar os dados no banco de dados do projeto: ' + ((e as Error).message || 'erro')
      });
    }
  }

  async function handleCloseRequest() {
    const mudouReq = JSON.stringify(req) !== JSON.stringify(requerente ?? PESSOA_VAZIA);
    const mudouTrans = JSON.stringify(trans) !== JSON.stringify(transmitente ?? transVazio(imovel));
    const mudouPartes = JSON.stringify(localPartesAdicionais) !== JSON.stringify(partesAdicionais ?? []);
    const atosRef = (tiposAtos && tiposAtos.length > 0) ? tiposAtos : [tipoAto || 'retificacao'];
    const mudouTipo = JSON.stringify(localTiposAtos) !== JSON.stringify(atosRef);

    if (mudouReq || mudouTrans || mudouPartes || mudouTipo) {
      const resp = await escolher({
        titulo: 'Salvar alterações?',
        mensagem: 'Você fez alterações no requerimento. Deseja salvá-las no projeto antes de fechar?',
        opcoes: [
          { chave: 'salvar', label: 'Salvar e Fechar', variant: 'default' },
          { chave: 'descartar', label: 'Descartar e Fechar', variant: 'destructive' },
        ],
        cancelLabel: 'Cancelar',
      });
      if (!resp) return;
      if (resp === 'salvar') {
        await salvarDadosLocalEServer(true);
        return;
      }
    }
    onOpenChange(false);
  }

  async function gerar() {
    const precisaTransmitente = localTipoAto !== 'retificacao' || !!trans.nome?.trim() || !!trans.cpf?.trim();
    const campos: CampoFaltante[] = [
      { label: 'Nome do Requerente', ausente: !req.nome?.trim() },
      { label: 'CPF do Requerente', ausente: !req.cpf?.trim() },
      { label: 'RG do Requerente', ausente: !req.rg?.trim() },
      { label: 'Profissão do Requerente', ausente: !req.profissao?.trim() },
      { label: 'Estado Civil do Requerente', ausente: !req.estadoCivil?.trim() },
      { label: 'Endereço do Requerente', ausente: !req.endereco?.trim() },
    ];

    if (precisaTransmitente) {
      campos.push({ label: 'Nome do Transmitente/Cônjuge', ausente: !trans.nome?.trim() });
      campos.push({ label: 'CPF do Transmitente/Cônjuge', ausente: !trans.cpf?.trim() });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resultado = await perguntarTratamentoAusentes(campos, (config) => escolher(config as any) as any);
    if (resultado === 'cancelar') return;

    const modoTratamentoAusente = resultado;
    const permitirIncompleto = modoTratamentoAusente === 'dado_ausente';

    onChangePessoas(req, trans, localTipoAto, localPartesAdicionais, localTiposAtos);
    const padroes = carregarPadroes();
    const comarca = obterComarca(imovel, padroes.comarcaPadrao);
    try {
      let blobBruto: Blob | null = null;
      try {
        const response = await fetch('/api/export/requerimento', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imovel, tecnico, requerente: req, transmitente: trans, areaRealHa,
            dataExtenso: dataExtensoHoje(), tipoAto: localTipoAto, tiposAtos: localTiposAtos,
            partesAdicionais: localPartesAdicionais, comarca, correcoes: correcoes || [],
            permitirIncompleto, modoTratamentoAusente
          })
        });
        if (response.ok) blobBruto = await response.blob();
      } catch { /* fallback local */ }

      if (!blobBruto) {
        blobBruto = await gerarRequerimentoDocx({
          imovel, tecnico: tecnico!, requerente: req, transmitente: trans, areaRealHa,
          dataExtenso: dataExtensoHoje(), tipoAto: localTipoAto, tiposAtos: localTiposAtos,
          partesAdicionais: localPartesAdicionais, comarca, correcoes: correcoes || [],
          permitirIncompleto, modoTratamentoAusente
        });
      }

      const requerimento = await compatibilizarWord2007(blobBruto);
      const nome = (imovel.denominacao || 'imovel').replace(/[^\w.-]+/g, '_');
      saveAs(requerimento, `Requerimento - ${nome}.docx`);
      onBaixar?.();
      setMsg(permitirIncompleto ? 'Requerimento gerado (incompleto).' : 'Requerimento gerado.');
    } catch (e: unknown) {
      console.error(e);
      setMsg((e as Error).message || 'Erro ao gerar requerimento.');
    }
  }


  const areaAnt = imovel.areaAnterior ?? 0;
  const temAreaAnt = imovel.areaAnterior != null && imovel.areaAnterior > 0;
  const diffHa = temAreaAnt ? areaRealHa - areaAnt : 0;
  const diffM2 = temAreaAnt ? Math.round(diffHa * 10000) : 0;
  const diffPct = temAreaAnt ? (diffHa / areaAnt) * 100 : 0;
  const temDivergencia = temAreaAnt && Math.abs(diffHa) > 0.0001;

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleCloseRequest(); else onOpenChange(val); }}>
      <DialogContent className="w-[96vw] sm:w-[92vw] max-w-[1240px] max-h-[92vh] sm:max-h-[88vh] flex flex-col p-3 sm:p-5 overflow-hidden shadow-2xl" onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 border-border/60">
          <DialogTitle className="flex items-center gap-2 text-xs sm:text-base font-black uppercase tracking-wider text-foreground">
            <FileSignature className="size-4 sm:size-5 text-emerald-600 dark:text-emerald-400 shrink-0" /> Requerimento ao cartório (retificação e atos cumulativos)
          </DialogTitle>
          <Button size="sm" className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-xs tracking-wider gap-1.5 shadow-md active:scale-98 shrink-0" onClick={gerar}>
            <Download className="size-4" /> Baixar Requerimento (.docx)
          </Button>
        </DialogHeader>
        <datalist id="lista-pessoas">{sugProp.map((p) => <option key={p.id} value={p.nome} />)}</datalist>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1 my-2">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
            {/* Coluna 1: Tipo de Ato e Dados do Imóvel */}
            <div className="space-y-4">
              {/* Tipo de Ato */}
              <div className="space-y-1.5 border rounded-lg bg-muted/10 p-3">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Tipo(s) de ato (Selecione 1 ou mais atos)
                  </Label>
                  <span className="text-[9px] font-semibold text-primary">
                    {localTiposAtos.length > 1 ? `${localTiposAtos.length} atos selecionados` : 'Ato único'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {OPCOES_ATO.map((o) => {
                    const cfg = CONFIG_BOTOES_ATO[o.valor];
                    const ativo = localTiposAtos.includes(o.valor);
                    return (
                      <Button
                        key={o.valor}
                        type="button"
                        size="sm"
                        onClick={() => toggleAto(o.valor)}
                        className={`h-8 text-xs font-bold transition-all shadow-sm flex items-center justify-between px-2 ${ativo ? cfg.active : cfg.inactive}`}
                      >
                        <span className="truncate">{o.rotulo}</span>
                        <span className={`ml-1 font-black ${ativo ? 'opacity-100' : 'opacity-30'}`}>
                          {ativo ? <Check className="size-3.5" /> : '+'}
                        </span>
                      </Button>
                    );
                  })}
                </div>

                {localTiposAtos.length > 1 && (
                  <div className="flex flex-wrap items-center gap-1 mt-2 p-2 rounded-lg bg-primary/10 border border-primary/20 text-[10px]">
                    <span className="font-bold text-primary mr-0.5">Atos acumulados:</span>
                    {localTiposAtos.map((ta) => {
                      const rot = OPCOES_ATO.find((x) => x.valor === ta)?.rotulo;
                      return (
                        <span key={ta} className="px-1.5 py-0.5 rounded font-extrabold bg-primary text-primary-foreground shadow-xs">
                          {rot}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Seletor de Glebas Incluídas no Requerimento */}
                {glebas && glebas.length > 1 && (
                  <div className="mt-3 space-y-1.5 border rounded-lg bg-indigo-500/5 border-indigo-500/20 p-2.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider block">
                        Glebas / Parcelas no Requerimento
                      </Label>
                      <span className="text-[9px] font-extrabold text-indigo-600 dark:text-indigo-400">
                        {glebasSelecionadas.size} de {glebas.length} selec.
                      </span>
                    </div>
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {glebas.map((g) => {
                        const sel = glebasSelecionadas.has(g.id);
                        return (
                          <label key={g.id} className="flex items-center justify-between p-1.5 rounded-md border border-border/40 hover:bg-muted/40 cursor-pointer text-xs select-none">
                            <div className="flex items-center gap-2 min-w-0">
                              <input
                                type="checkbox"
                                checked={sel}
                                onChange={() => {
                                  const next = new Set(glebasSelecionadas);
                                  if (next.has(g.id)) { if (next.size > 1) next.delete(g.id); }
                                  else next.add(g.id);
                                  setGlebasSelecionadas(next);
                                }}
                                className="size-3.5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                              <span className="font-bold text-foreground truncate text-[11px]">{g.denominacao}</span>
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                              {g.vertices?.length ?? 0} pts
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {mostrarDicas && (
                  <div className="space-y-1 rounded-lg border border-dashed border-amber-500/20 bg-amber-500/5 p-2.5 text-[10px] text-muted-foreground leading-relaxed">
                    <strong className="text-amber-700 dark:text-amber-400 font-bold block mb-0.5">O que implicam os atos selecionados:</strong>
                    {localTiposAtos.map((ta) => {
                      const item = OPCOES_ATO.find((o) => o.valor === ta);
                      return (
                        <p key={ta} className="text-[10px] leading-tight">
                          • <strong>{item?.rotulo}:</strong> {item?.explicacao}
                        </p>
                      );
                    })}
                  </div>
                )}
                <NotaLegal chave={localTiposAtos.includes('usucapiao') ? 'usucapiao' : 'requerimento'} />
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

                {/* Painel de Análise de Divergência Registral x Levantamento Real */}
                <div className={`col-span-2 rounded-lg border p-2.5 text-xs transition-all ${
                  temDivergencia
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200'
                    : temAreaAnt
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200'
                      : 'border-border bg-background/50 text-muted-foreground'
                }`}>
                  <div className="flex items-center justify-between font-bold text-[11px] mb-1">
                    <span className="flex items-center gap-1.5">
                      <Scale className="size-3.5" />
                      <span>Retificação e Divergência Métricas</span>
                    </span>
                    {temAreaAnt && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        temDivergencia
                          ? 'bg-amber-500 text-white dark:bg-amber-600'
                          : 'bg-emerald-600 text-white'
                      }`}>
                        {temDivergencia
                          ? `${diffPct >= 0 ? '+' : ''}${numBR(diffPct, 2)}% de divergência`
                          : 'Áreas Coincidentes'}
                      </span>
                    )}
                  </div>

                  {temAreaAnt ? (
                    <>
                      <div className="grid grid-cols-3 gap-2 text-[10px] my-1 font-mono border-t border-b border-black/10 dark:border-white/10 py-1">
                        <div>
                          <span className="text-muted-foreground block text-[9px] uppercase font-sans font-semibold">Área Registrada</span>
                          <span className="font-bold">{numBR(areaAnt, 4)} ha</span>
                          <span className="block text-[9px] opacity-75">({numBR(areaAnt * 10000, 0)} m²)</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[9px] uppercase font-sans font-semibold">Área Levada</span>
                          <span className="font-bold">{numBR(areaRealHa, 4)} ha</span>
                          <span className="block text-[9px] opacity-75">({numBR(areaRealHa * 10000, 0)} m²)</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[9px] uppercase font-sans font-semibold">Diferença</span>
                          <span className={`font-bold ${diffHa > 0 ? 'text-amber-600 dark:text-amber-400' : diffHa < 0 ? 'text-rose-600 dark:text-rose-400' : ''}`}>
                            {diffHa > 0 ? '+' : ''}{numBR(diffHa, 4)} ha
                          </span>
                          <span className="block text-[9px] opacity-75">({diffM2 > 0 ? '+' : ''}{numBR(diffM2, 0)} m²)</span>
                        </div>
                      </div>

                      <p className="text-[10px] leading-tight mt-1 opacity-90">
                        {temDivergencia ? (
                          <>
                            <strong>Aviso Registral:</strong> Divergência de <strong>{diffPct >= 0 ? '+' : ''}{numBR(diffPct, 2)}%</strong> ({diffHa > 0 ? 'aumento' : 'redução'} de {numBR(Math.abs(diffHa), 4)} ha). A justificativa legal de <strong>Retificação de Área (Art. 213, II da Lei 6.015/73)</strong> será inserida automaticamente na minuta deste requerimento.
                          </>
                        ) : (
                          <>A área apurada pelo georreferenciamento coincide exatamente com a área da matrícula constante no cartório.</>
                        )}
                      </p>
                    </>
                  ) : (
                    <p className="text-[10px] leading-tight opacity-75">
                      Preencha o campo <em>Área anterior na matrícula</em> acima para calcular a porcentagem exata de divergência e incluir a fundamentação de retificação no documento.
                    </p>
                  )}
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
            <div className="lg:col-span-1 space-y-3">
              <Bloco titulo={rotulos.req} pessoa={req} onChange={setReq} sugProp={sugProp} />
              {totalRequerentes > 1 && (
                <div className="flex items-center justify-between gap-2 bg-muted/20 border border-border/60 p-2 rounded-lg text-xs">
                  <span className="font-semibold text-muted-foreground text-[10px] uppercase">Fração Ideal no Condomínio (%):</span>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={req.fracaoIdeal !== undefined ? req.fracaoIdeal : obterFracaoEfetiva(req, totalRequerentes)}
                    onChange={(e) => setReq({ ...req, fracaoIdeal: e.target.value })}
                    className="h-7 w-20 text-[11px] font-bold text-center"
                  />
                </div>
              )}

              {/* Requerentes / Compradores Adicionais agrupados nesta coluna */}
              <div className="space-y-3 mt-3 border-t pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    {localTipoAto === 'venda' ? 'Compradores Adicionais' : 'Requerentes Adicionais'}
                  </span>
                  <span className="text-[9px] font-bold text-emerald-600">
                    {localPartesAdicionais.filter((p) => p.papel === 'requerente').length} adicionado(s)
                  </span>
                </div>
                
                {localPartesAdicionais.map((p, i) => {
                  if (p.papel !== 'requerente') return null;
                  return (
                    <div key={i} className="space-y-1.5 rounded-lg border border-emerald-500/20 p-2.5 bg-emerald-500/5 relative">
                      <div className="flex items-center justify-between border-b pb-1 mb-1.5">
                        <span className="text-[9px] font-black text-emerald-700 dark:text-emerald-400 uppercase">
                          {localTipoAto === 'venda' ? 'Comprador Adicional' : 'Requerente Adicional'}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          title="Remover esta parte"
                          className="h-5 px-1 hover:bg-destructive/10"
                          onClick={() => rmParte(i)}
                        >
                          <Trash2 className="size-3 text-destructive" />
                        </Button>
                      </div>
                      <Bloco titulo="" pessoa={p} onChange={(np) => setParte(i, np)} sugProp={sugProp} />
                      {totalRequerentes > 1 && (
                        <div className="flex items-center justify-between gap-2 bg-muted/20 border border-border/60 p-2 rounded-lg text-xs mt-1.5">
                          <span className="font-semibold text-muted-foreground text-[10px] uppercase">Fração (%):</span>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={p.fracaoIdeal !== undefined ? p.fracaoIdeal : obterFracaoEfetiva(p, totalRequerentes)}
                            onChange={(e) => setParte(i, { ...p, fracaoIdeal: e.target.value })}
                            className="h-7 w-20 text-[11px] font-bold text-center"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Botões de Ação na Coluna 2 */}
                <div className="flex items-center gap-1.5 mt-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => addParte('requerente')}
                    className="flex-1 h-7 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 gap-1 cursor-pointer"
                  >
                    <UserPlus className="size-3" />
                    + Adicionar
                  </Button>
                  {sugProp.length > 0 && (
                    <select
                      onChange={(e) => {
                        const id = e.target.value;
                        if (!id) return;
                        const p = sugProp.find((s) => s.id === id);
                        if (p) {
                          addParte('requerente', {
                            nome: p.nome, cpf: p.cpf, rg: p.rg || '', nacionalidade: p.nacionalidade || 'Brasileira',
                            naturalidade: p.naturalidade || '', dataNascimento: p.dataNascimento || '', profissao: p.profissao || '',
                            estadoCivil: p.estadoCivil || '', conjugeNome: p.conjugeNome || '', conjugeCpf: p.conjugeCpf || '',
                            filiacao: p.filiacao || '', endereco: p.endereco || '', cidadeUf: p.cidadeUf || '', cep: p.cep || '',
                          });
                        }
                        e.target.value = '';
                      }}
                      className="h-7 rounded border bg-background px-1.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/40 focus:ring-1 focus:ring-primary cursor-pointer w-[120px] max-w-[140px]"
                    >
                      <option value="">Puxar Cadastro...</option>
                      {sugProp.map((s) => (
                        <option key={s.id} value={s.id}>{s.nome}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* Coluna 3: Transmitente */}
            <div className="lg:col-span-1 space-y-3">
              <Bloco titulo={rotulos.trans} pessoa={trans} onChange={setTrans} sugProp={sugProp} />

              {/* Transmitentes / Vendedores Adicionais agrupados nesta coluna */}
              <div className="space-y-3 mt-3 border-t pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    {localTipoAto === 'venda' ? 'Vendedores Adicionais' : 'Transmitentes Adicionais'}
                  </span>
                  <span className="text-[9px] font-bold text-indigo-600">
                    {localPartesAdicionais.filter((p) => p.papel === 'transmitente').length} adicionado(s)
                  </span>
                </div>
                
                {localPartesAdicionais.map((p, i) => {
                  if (p.papel !== 'transmitente') return null;
                  return (
                    <div key={i} className="space-y-1.5 rounded-lg border border-indigo-500/20 p-2.5 bg-indigo-500/5 relative">
                      <div className="flex items-center justify-between border-b pb-1 mb-1.5">
                        <span className="text-[9px] font-black text-indigo-700 dark:text-indigo-400 uppercase">
                          {localTipoAto === 'venda' ? 'Vendedor Adicional' : 'Transmitente Adicional'}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          title="Remover esta parte"
                          className="h-5 px-1 hover:bg-destructive/10"
                          onClick={() => rmParte(i)}
                        >
                          <Trash2 className="size-3 text-destructive" />
                        </Button>
                      </div>
                      <Bloco titulo="" pessoa={p} onChange={(np) => setParte(i, np)} sugProp={sugProp} />
                    </div>
                  );
                })}

                {/* Botões de Ação na Coluna 3 */}
                <div className="flex items-center gap-1.5 mt-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => addParte('transmitente')}
                    className="flex-1 h-7 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 border-indigo-500/30 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 gap-1 cursor-pointer"
                  >
                    <UserPlus className="size-3" />
                    + Adicionar
                  </Button>
                  {sugProp.length > 0 && (
                    <select
                      onChange={(e) => {
                        const id = e.target.value;
                        if (!id) return;
                        const p = sugProp.find((s) => s.id === id);
                        if (p) {
                          addParte('transmitente', {
                            nome: p.nome, cpf: p.cpf, rg: p.rg || '', nacionalidade: p.nacionalidade || 'Brasileira',
                            naturalidade: p.naturalidade || '', dataNascimento: p.dataNascimento || '', profissao: p.profissao || '',
                            estadoCivil: p.estadoCivil || '', conjugeNome: p.conjugeNome || '', conjugeCpf: p.conjugeCpf || '',
                            filiacao: p.filiacao || '', endereco: p.endereco || '', cidadeUf: p.cidadeUf || '', cep: p.cep || '',
                          });
                        }
                        e.target.value = '';
                      }}
                      className="h-7 rounded border bg-background px-1.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 border-indigo-500/40 focus:ring-1 focus:ring-primary cursor-pointer w-[120px] max-w-[140px]"
                    >
                      <option value="">Puxar Cadastro...</option>
                      {sugProp.map((s) => (
                        <option key={s.id} value={s.id}>{s.nome}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>
          </div>

          {somaIncorreta && (
            <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 p-3 rounded-lg text-xs font-bold shadow-2xs">
              <AlertTriangle className="size-4 shrink-0" />
              <span>Atenção: A soma das frações ideais dos adquirentes é de {somaFracoes}%. O total deve somar exatamente 100%! Verifique os valores informados.</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 mt-auto shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-xs tracking-wider gap-1.5 shadow-md active:scale-98 cursor-pointer"
              onClick={() => salvarDadosLocalEServer(true)}
            >
              <Check className="size-4" /> Confirmar e Salvar no Projeto
            </Button>
            <Button size="sm" variant="outline" className="bg-emerald-600/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-600/20 font-black uppercase text-xs tracking-wider gap-1.5 shadow-sm cursor-pointer" onClick={gerar}>
              <Download className="size-4" /> Baixar Requerimento (.docx)
            </Button>
            {onBaixarPacoteZip && (
              <Button
                size="sm"
                variant="outline"
                className="border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 font-black uppercase text-xs tracking-wider gap-1.5 shadow-sm cursor-pointer"
                onClick={() => {
                  onChangePessoas(req, trans, localTipoAto, localPartesAdicionais, localTiposAtos);
                  onBaixarPacoteZip(req, trans, localTipoAto, localPartesAdicionais, localTiposAtos);
                }}
              >
                <Download className="size-4" /> Baixar Todas as Peças (.zip)
              </Button>
            )}
          </div>
          {msg && <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{msg}</span>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
function dataExtensoHoje(d = new Date()): string {
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}
