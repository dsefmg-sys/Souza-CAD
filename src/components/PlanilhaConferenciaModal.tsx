'use client';

import { useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, Download, Wand2, CheckCircle2 } from 'lucide-react';
import type { ImovelData, TecnicoData, Confrontante, ResultadoCalculo, ImovelCad } from '@/lib/topo/types';
import { linhasConferencia } from '@/lib/export/sigefOds';
import { valoresEfetivos } from '@/lib/topo/conferencia';
import { numBR } from '@/lib/topo/geometry';
import { lerTxtECalcularCorrecoes } from '@/lib/topo/correcaoPrecisao';
import { RelatorioCorrecaoPrecisao } from './RelatorioCorrecaoPrecisao';
import type { CorrecaoPrecisao } from '@/lib/topo/vertices';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  imovel: ImovelData;
  res: ResultadoCalculo | null;
  confrontantes: Confrontante[];
  confrontantePorLado: Record<number, string>;
  tecnico: TecnicoData | null;
  onBaixar: () => void;
  imoveisCadastrados?: ImovelCad[];
  /** Recebe o array de vértices já com as correções aplicadas (E/N/Z + lat/lon re-derivados). */
  onAplicarCorrecoes: (verticesAtualizados: ResultadoCalculo['vertices']) => void;
}

// Confere na tela os dados que vão para a planilha SIGEF (identificação + perímetro) ANTES de baixar.
// Só leitura: para mudar um valor, edite os campos do projeto (o app regenera a planilha correta).
export default function PlanilhaConferenciaModal({ open, onOpenChange, imovel, res, confrontantes, confrontantePorLado, tecnico, onBaixar, imoveisCadastrados, onAplicarCorrecoes }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [relatorio, setRelatorio] = useState<{
    nomeArquivo: string;
    correcoes: CorrecaoPrecisao[];
  } | null>(null);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const linhas = useMemo(() => {
    if (!res || !tecnico) return [];
    try { return linhasConferencia(res, confrontantes, confrontantePorLado, tecnico, imovel.cns || '', imoveisCadastrados); } catch { return []; }
  }, [res, confrontantes, confrontantePorLado, tecnico, imovel.cns, imoveisCadastrados]);
  const ef = res ? valoresEfetivos(res, imovel) : null;

  const idt: [string, string][] = [
    ['Proprietário(a)', imovel.proprietario || '—'],
    ['CPF/CNPJ', imovel.cpfProprietario || '—'],
    ['Denominação', imovel.denominacao || '—'],
    ['Código INCRA', imovel.codigoImovelIncra || '—'],
    ['Cartório (CNS)', imovel.cns || '—'],
    ['Matrícula', imovel.matricula || '—'],
    ['Município(s)', imovel.municipio || '—'],
    ['Área SGL', ef ? `${numBR(ef.areaHa, 4)} ha` : '—'],
    ['Perímetro', ef ? `${numBR(ef.perimetro)} m` : '—'],
  ];

  function abrirFilePicker() {
    setErro(null);
    setRelatorio(null);
    fileInputRef.current?.click();
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = ''; // permite reescolher o mesmo arquivo
    if (!f || !res) return;
    setProcessando(true);
    setErro(null);
    const resultado = await lerTxtECalcularCorrecoes(f, res.vertices);
    setProcessando(false);
    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    setRelatorio({ nomeArquivo: resultado.nomeArquivo, correcoes: resultado.correcoes });
  }

  function aplicar() {
    if (!relatorio || !res) return;
    // Reaplica TODAS as correções de uma vez (cada uma já carrega o valor correto em `depois`,
    // mantendo o original nas dimensões que o TXT não trazia ganho de precisão).
    const mapa = new Map(relatorio.correcoes.map((c) => [c.verticeId, c.depois]));
    const novos = res.vertices.map((v) => {
      const c = mapa.get(v.id);
      if (!c) return v;
      return { ...v, leste: c.leste, norte: c.norte, elevacao: c.elevacao };
    });
    onAplicarCorrecoes(novos);
    setRelatorio(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-5xl flex-col bg-background shadow-2xl p-6 rounded-xl overflow-hidden">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg font-black text-foreground">
            <FileSpreadsheet className="size-5.5 text-primary" /> Conferência da Planilha SIGEF
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">Confira as informações da planilha antes de baixar. Para corrigir qualquer dado, ajuste diretamente os campos do imóvel nas abas correspondentes.</p>

        {/* Metadados organizados em card colorido */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl border border-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-950/10 p-3.5 text-xs md:grid-cols-3">
          {idt.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2 border-b border-dashed border-border/50 py-1">
              <span className="text-muted-foreground font-semibold">{k}</span>
              <span className="truncate text-right font-semibold text-foreground" title={v}>{v}</span>
            </div>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-border/80 my-2">
          <table className="w-full text-[11px] font-mono">
            <thead className="sticky top-0 bg-muted/95 text-[10px] uppercase text-muted-foreground shadow-sm">
              <tr>
                <th className="px-2 py-2 text-left">Código</th>
                <th className="px-2 py-2 text-left">Longitude</th>
                <th className="px-2 py-2 text-left">Latitude</th>
                <th className="px-2 py-2 text-right">Alt.</th>
                <th className="px-2 py-2 text-center">Método</th>
                <th className="px-2 py-2 text-center">Limite</th>
                <th className="px-2 py-2 text-left">Confrontante</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {linhas.map((l, i) => (
                <tr key={i} className="hover:bg-muted/40 transition-colors">
                  <td className="px-2 py-1.5 font-bold text-foreground">{l.codigo}</td>
                  <td className="px-2 py-1.5">{l.longitude}</td>
                  <td className="px-2 py-1.5">{l.latitude}</td>
                  <td className="px-2 py-1.5 text-right">{l.altitude}</td>
                  <td className="px-2 py-1.5 text-center font-semibold text-sky-600 dark:text-sky-400">{l.metodo}</td>
                  <td className="px-2 py-1.5 text-center font-semibold text-amber-600 dark:text-amber-400">{l.tipoLimite}</td>
                  <td className="px-2 py-1.5 truncate max-w-[200px]" title={`${l.confrontante}${l.matricula ? ` · Matrícula ${l.matricula}` : ''}`}>{l.confrontante || '—'}{l.matricula ? ` · Mat. ${l.matricula}` : ''}</td>
                </tr>
              ))}
              {linhas.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-muted-foreground font-medium">Sem dados — importe pontos e defina os confrontantes.</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Relatório de correção de precisão — só aparece após o usuário escolher um TXT */}
        {relatorio && (
          <RelatorioCorrecaoPrecisao
            nomeArquivo={relatorio.nomeArquivo}
            correcoes={relatorio.correcoes}
          />
        )}

        {erro && (
          <div className="rounded-xl border border-red-500/40 bg-red-50/40 dark:bg-red-900/10 p-3 text-xs text-red-700 dark:text-red-400">
            {erro}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-3 border-t shrink-0">
          <span className="text-xs text-muted-foreground font-semibold">{linhas.length} vértice(s)</span>
          <div className="flex items-center gap-2">
            {relatorio && relatorio.correcoes.length > 0 && (
              <Button size="sm" variant="default" onClick={aplicar} className="bg-amber-600 hover:bg-amber-700 text-white font-bold h-9 shadow-sm px-4">
                <CheckCircle2 className="size-4" /> Aplicar {relatorio.correcoes.length} correções
              </Button>
            )}
            <Button
              size="sm"
              variant="default"
              disabled={processando || !res}
              onClick={abrirFilePicker}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9 shadow-sm px-4"
              title="Reimportar o TXT do GNSS para casar vértices por proximidade e corrigir a precisão das coordenadas"
            >
              <Wand2 className="size-4" /> {processando ? 'Lendo…' : 'Corrigir Precisão (TXT)'}
            </Button>
            <Button size="sm" disabled={!linhas.length} onClick={onBaixar} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 shadow-md hover:shadow-lg px-4">
              <Download className="size-4" /> Baixar Planilha (.ods)
            </Button>
          </div>
        </div>

        {/* File picker escondido — acionado pelo botão acima */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.csv,text/plain,text/csv"
          className="hidden"
          onChange={handleFile}
        />
      </DialogContent>
    </Dialog>
  );
}
