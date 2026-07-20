'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  FileText, Download, Minimize2, Layers, Scissors, Sparkles, RefreshCw, CheckCircle2, AlertCircle, FilePlus
} from 'lucide-react';
import { compressPdf, unirPdfs, extrairPaginasPdf, type CompressPdfResult } from '@/lib/pdfCompress';
import { saveAs } from 'file-saver';

interface Props {
  aberto: boolean;
  onFechar: () => void;
  onExtrairComIA?: (file: File) => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function EditorPdfModal({ aberto, onFechar, onExtrairComIA }: Props) {
  const [aba, setAba] = useState<'comprimir' | 'unir' | 'extrair'>('comprimir');
  const [progressoMsg, setProgressoMsg] = useState('');
  const [processando, setProcessando] = useState(false);
  const [resultadoCompressao, setResultadoCompressao] = useState<CompressPdfResult | null>(null);
  const [arquivoOriginal, setArquivoOriginal] = useState<File | null>(null);
  const [arquivoComprimidoBlob, setArquivoComprimidoBlob] = useState<Blob | null>(null);

  // Qualidade selecionada
  const [qualidade, setQualidade] = useState<'alta' | 'media' | 'maxima_compressao'>('media');

  // Unir PDFs
  const [arquivosUnir, setArquivosUnir] = useState<File[]>([]);
  const [pdfUnificadoBlob, setPdfUnificadoBlob] = useState<Blob | null>(null);

  // Extrair Páginas
  const [arquivoExtrair, setArquivoExtrair] = useState<File | null>(null);
  const [paginasTexto, setPaginasTexto] = useState('1, 2-3');
  const [pdfExtraidoBlob, setPdfExtraidoBlob] = useState<Blob | null>(null);

  async function handleComprimir(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setArquivoOriginal(file);
    setProcessando(true);
    setProgressoMsg('Iniciando...');
    setResultadoCompressao(null);
    setArquivoComprimidoBlob(null);

    try {
      const res = await compressPdf(file, {
        presetQuality: qualidade,
        onProgress: (m) => setProgressoMsg(m),
      });
      setResultadoCompressao(res);
      const blob = new Blob([res.bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      setArquivoComprimidoBlob(blob);
    } catch (err: unknown) {
      console.error(err);
      alert((err as Error).message || 'Erro ao comprimir PDF.');
    } finally {
      setProcessando(false);
      setProgressoMsg('');
    }
  }

  async function handleUnirPdfs() {
    if (arquivosUnir.length < 2) return;
    setProcessando(true);
    setProgressoMsg('Unindo arquivos...');
    setPdfUnificadoBlob(null);

    try {
      const resBytes = await unirPdfs(arquivosUnir, (m) => setProgressoMsg(m));
      const blob = new Blob([resBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      setPdfUnificadoBlob(blob);
    } catch (err: unknown) {
      console.error(err);
      alert((err as Error).message || 'Erro ao unir PDFs.');
    } finally {
      setProcessando(false);
      setProgressoMsg('');
    }
  }

  async function handleExtrairPaginas() {
    if (!arquivoExtrair || !paginasTexto.trim()) return;
    setProcessando(true);
    setProgressoMsg('Extraindo páginas...');
    setPdfExtraidoBlob(null);

    try {
      // Parse de páginas ex: "1, 2-4, 6" -> indices [0, 1, 2, 3, 5]
      const partes = paginasTexto.split(',');
      const indices: number[] = [];
      for (const p of partes) {
        const item = p.trim();
        if (item.includes('-')) {
          const [ini, fim] = item.split('-').map((x) => parseInt(x.trim(), 10));
          if (!isNaN(ini) && !isNaN(fim)) {
            for (let i = Math.min(ini, fim); i <= Math.max(ini, fim); i++) {
              if (i > 0) indices.push(i - 1);
            }
          }
        } else {
          const val = parseInt(item, 10);
          if (!isNaN(val) && val > 0) indices.push(val - 1);
        }
      }

      if (indices.length === 0) throw new Error('Informe páginas válidas (ex: 1, 2-3).');

      const resBytes = await extrairPaginasPdf(arquivoExtrair, indices, (m) => setProgressoMsg(m));
      const blob = new Blob([resBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      setPdfExtraidoBlob(blob);
    } catch (err: unknown) {
      console.error(err);
      alert((err as Error).message || 'Erro ao extrair páginas.');
    } finally {
      setProcessando(false);
      setProgressoMsg('');
    }
  }

  function baixarBlob(blob: Blob, defaultName: string) {
    saveAs(blob, defaultName);
  }

  function enviarComprimidoParaIA() {
    if (!arquivoComprimidoBlob || !arquivoOriginal || !onExtrairComIA) return;
    const f = new File([arquivoComprimidoBlob], `comprimido_${arquivoOriginal.name}`, { type: 'application/pdf' });
    onFechar();
    onExtrairComIA(f);
  }

  return (
    <Dialog open={aberto} onOpenChange={(open) => { if (!open) onFechar(); }}>
      <DialogContent className="max-w-2xl bg-zinc-950 text-zinc-100 border border-zinc-800 shadow-2xl p-0 overflow-hidden font-sans">
        {/* Cabeçalho */}
        <DialogHeader className="px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur-xl flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/20">
              <FileText className="size-5 text-zinc-950" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                Editor de PDF <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md uppercase font-extrabold">Ferramenta</span>
              </DialogTitle>
              <p className="text-xs text-zinc-400">
                Comprima matrículas, una documentos e reduza o peso para SIGEF e IA sem sair do navegador
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Abas */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/30 px-6 pt-2 gap-2">
          {[
            { id: 'comprimir', label: 'Comprimir PDF', icone: <Minimize2 className="size-4" /> },
            { id: 'unir', label: 'Unir PDFs', icone: <Layers className="size-4" /> },
            { id: 'extrair', label: 'Extrair Páginas', icone: <Scissors className="size-4" /> },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setAba(item.id as any)}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-t-lg transition-colors border-t border-x ${
                aba === item.id
                  ? 'bg-zinc-950 text-emerald-400 border-zinc-800 border-b-zinc-950'
                  : 'text-zinc-400 hover:text-zinc-200 border-transparent hover:bg-zinc-900/50'
              }`}
            >
              {item.icone} {item.label}
            </button>
          ))}
        </div>

        {/* Corpo da Modal */}
        <div className="p-6 space-y-5">
          {/* ─── ABA 1: COMPRIMIR ─── */}
          {aba === 'comprimir' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-zinc-300">Nível de Otimização</Label>
                <div className="flex gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                  {[
                    { id: 'alta', label: 'Alta Qualidade (~140 DPI)' },
                    { id: 'media', label: 'Equilibrado (~100 DPI)' },
                    { id: 'maxima_compressao', label: 'Máxima Redução' },
                  ].map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setQualidade(q.id as any)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors ${
                        qualidade === q.id ? 'bg-emerald-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dropzone / Upload */}
              <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-zinc-800 rounded-xl bg-zinc-900/30 hover:bg-zinc-900/60 hover:border-emerald-500/50 cursor-pointer transition-all">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <FileText className="size-8 text-emerald-400 mb-2" />
                  <p className="text-xs font-bold text-zinc-200">Clique para selecionar o PDF da Matrícula ou Documento</p>
                  <p className="text-[10px] text-zinc-500 mt-1">Processamento 100% privado na sua própria máquina</p>
                </div>
                <input type="file" accept="application/pdf" className="hidden" onChange={handleComprimir} disabled={processando} />
              </label>

              {/* Status de Processamento */}
              {processando && (
                <div className="flex items-center gap-3 bg-emerald-950/40 border border-emerald-800/40 p-3.5 rounded-xl text-emerald-400 animate-pulse text-xs font-bold">
                  <RefreshCw className="size-4 animate-spin shrink-0" />
                  <span>{progressoMsg}</span>
                </div>
              )}

              {/* Resultado */}
              {resultadoCompressao && (
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="size-4" /> Compressão Concluída!
                    </span>
                    <span className="text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2.5 py-0.5 rounded-full">
                      {resultadoCompressao.percentualEconomia}% menor
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 bg-zinc-950 p-3 rounded-lg border border-zinc-850">
                    <div>
                      <span className="text-[10px] text-zinc-500 font-bold uppercase">Tamanho Original</span>
                      <p className="text-sm font-extrabold text-zinc-300">{formatBytes(resultadoCompressao.initialBytes)}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 font-bold uppercase">Tamanho Comprimido</span>
                      <p className="text-sm font-extrabold text-emerald-400">{formatBytes(resultadoCompressao.finalBytes)}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    {arquivoComprimidoBlob && (
                      <Button
                        size="sm"
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-9 text-xs gap-1.5"
                        onClick={() => baixarBlob(arquivoComprimidoBlob, `comprimido_${arquivoOriginal?.name || 'documento.pdf'}`)}
                      >
                        <Download className="size-4" /> Baixar PDF Otimizado
                      </Button>
                    )}

                    {onExtrairComIA && arquivoComprimidoBlob && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-emerald-500/40 bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-400 font-bold h-9 text-xs gap-1.5"
                        onClick={enviarComprimidoParaIA}
                      >
                        <Sparkles className="size-4" /> Enviar p/ IA (Economiza Fatura)
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── ABA 2: UNIR (MERGE) ─── */}
          {aba === 'unir' && (
            <div className="space-y-4">
              <Label className="text-xs font-bold text-zinc-300">Selecione 2 ou mais arquivos PDF para unificar</Label>

              <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-zinc-800 rounded-xl bg-zinc-900/30 hover:bg-zinc-900/60 hover:border-emerald-500/50 cursor-pointer transition-all">
                <div className="flex flex-col items-center justify-center">
                  <FilePlus className="size-7 text-emerald-400 mb-1" />
                  <p className="text-xs font-bold text-zinc-200">Adicionar PDFs para unir</p>
                </div>
                <input
                  type="file"
                  accept="application/pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      const novos = Array.from(e.target.files);
                      setArquivosUnir((prev) => [...prev, ...novos]);
                    }
                  }}
                />
              </label>

              {arquivosUnir.length > 0 && (
                <div className="space-y-2">
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {arquivosUnir.map((f, i) => (
                      <div key={i} className="flex items-center justify-between bg-zinc-900 px-3 py-2 rounded-lg border border-zinc-800 text-xs">
                        <span className="truncate font-semibold text-white">{i + 1}. {f.name} ({formatBytes(f.size)})</span>
                        <button type="button" onClick={() => setArquivosUnir((prev) => prev.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-300 text-[11px] font-bold">Remover</button>
                      </div>
                    ))}
                  </div>

                  <Button
                    size="sm"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-9 text-xs gap-1.5 mt-2"
                    onClick={handleUnirPdfs}
                    disabled={processando || arquivosUnir.length < 2}
                  >
                    <Layers className="size-4" /> Unir {arquivosUnir.length} PDFs em Um Só
                  </Button>
                </div>
              )}

              {pdfUnificadoBlob && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-800/40 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5"><CheckCircle2 className="size-4" /> PDF Unificado com sucesso!</span>
                  <Button size="sm" onClick={() => baixarBlob(pdfUnificadoBlob, 'unificado.pdf')} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-8 gap-1">
                    <Download className="size-3.5" /> Baixar PDF
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ─── ABA 3: EXTRAIR PÁGINAS ─── */}
          {aba === 'extrair' && (
            <div className="space-y-4">
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-zinc-800 rounded-xl bg-zinc-900/30 hover:bg-zinc-900/60 hover:border-emerald-500/50 cursor-pointer transition-all">
                <div className="flex flex-col items-center justify-center">
                  <Scissors className="size-6 text-emerald-400 mb-1" />
                  <p className="text-xs font-bold text-zinc-200">{arquivoExtrair ? arquivoExtrair.name : 'Selecionar PDF para extração de páginas'}</p>
                </div>
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setArquivoExtrair(e.target.files[0]);
                  }}
                />
              </label>

              {arquivoExtrair && (
                <div className="space-y-3 bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800">
                  <div>
                    <Label className="text-xs font-bold text-zinc-300">Páginas para extrair</Label>
                    <input
                      type="text"
                      value={paginasTexto}
                      onChange={(e) => setPaginasTexto(e.target.value)}
                      placeholder="Ex: 1, 3-5, 8"
                      className="w-full h-9 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-xs text-white focus:border-emerald-500 focus:outline-none mt-1"
                    />
                    <p className="text-[10px] text-zinc-500 mt-1">Exemplo: Digite `1, 3-5` para salvar apenas a primeira página e as páginas 3, 4 e 5.</p>
                  </div>

                  <Button
                    size="sm"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-9 text-xs gap-1.5"
                    onClick={handleExtrairPaginas}
                    disabled={processando}
                  >
                    <Scissors className="size-4" /> Extrair Páginas Selecionadas
                  </Button>
                </div>
              )}

              {pdfExtraidoBlob && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-800/40 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5"><CheckCircle2 className="size-4" /> Páginas extraídas com sucesso!</span>
                  <Button size="sm" onClick={() => baixarBlob(pdfExtraidoBlob, 'paginas_extraidas.pdf')} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-8 gap-1">
                    <Download className="size-3.5" /> Baixar Páginas
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
