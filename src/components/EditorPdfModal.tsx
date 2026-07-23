'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  FileText, Download, Minimize2, Layers, Scissors, Sparkles, RefreshCw, CheckCircle2,
  Trash2, RotateCw, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, FilePlus, Eye, GripVertical
} from 'lucide-react';
import {
  compressPdf, unirPdfs, extrairPaginasPdf, gerarMiniaturasPdf, reorganizarPdf,
  type CompressPdfResult, type MiniaturaPagina
} from '@/lib/pdfCompress';
import { saveAs } from 'file-saver';

interface Props {
  aberto: boolean;
  onFechar: () => void;
  onExtrairComIA?: (file: File) => void;
  onMinimizar?: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function EditorPdfModal({ aberto, onFechar, onExtrairComIA, onMinimizar }: Props) {
  const [aba, setAba] = useState<'comprimir' | 'organizar' | 'unir' | 'extrair'>('comprimir');
  const [progressoMsg, setProgressoMsg] = useState('');
  const [processando, setProcessando] = useState(false);

  // ─── ABA 1: COMPRIMIR ───
  const [preset, setPreset] = useState<'media' | 'alta' | 'maxima_compressao'>('media');
  const [arquivoOriginal, setArquivoOriginal] = useState<File | null>(null);
  const [resultadoCompressao, setResultadoCompressao] = useState<CompressPdfResult | null>(null);
  const [arquivoComprimidoBlob, setArquivoComprimidoBlob] = useState<Blob | null>(null);

  // ─── ABA 2: ORGANIZAR ───
  const [arquivoOrganizar, setArquivoOrganizar] = useState<File | null>(null);
  const [miniaturas, setMiniaturas] = useState<MiniaturaPagina[]>([]);
  const [pdfOrganizadoBlob, setPdfOrganizadoBlob] = useState<Blob | null>(null);

  // ─── ABA 3: UNIR ───
  const [arquivosUnir, setArquivosUnir] = useState<File[]>([]);
  const [pdfUnificadoBlob, setPdfUnificadoBlob] = useState<Blob | null>(null);

  // ─── ABA 4: EXTRAIR ───
  const [arquivoExtrair, setArquivoExtrair] = useState<File | null>(null);
  const [paginasTexto, setPaginasTexto] = useState('1, 2-3');
  const [pdfExtraidoBlob, setPdfExtraidoBlob] = useState<Blob | null>(null);

  // Limpa estados ao fechar
  useEffect(() => {
    if (!aberto) {
      setProgressoMsg('');
      setProcessando(false);
    }
  }, [aberto]);

  // Handler de Compressão
  async function handleComprimir(file: File) {
    setArquivoOriginal(file);
    setProcessando(true);
    setProgressoMsg('Iniciando otimização...');
    setResultadoCompressao(null);
    setArquivoComprimidoBlob(null);

    try {
      const res = await compressPdf(file, {
        presetQuality: preset,
        onProgress: (m) => setProgressoMsg(m),
      });
      setResultadoCompressao(res);
      const blob = new Blob([res.bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      setArquivoComprimidoBlob(blob);
    } catch (err: unknown) {
      console.error(err);
      alert((err as Error).message || 'Erro ao otimizar o PDF.');
    } finally {
      setProcessando(false);
      setProgressoMsg('');
    }
  }

  // Handler de Organização (Carregar Miniaturas)
  async function handleCarregarParaOrganizar(file: File) {
    setArquivoOrganizar(file);
    setProcessando(true);
    setProgressoMsg('Gerando visualização de páginas...');
    setPdfOrganizadoBlob(null);

    try {
      const min = await gerarMiniaturasPdf(file, (m) => setProgressoMsg(m));
      setMiniaturas(min);
    } catch (err: unknown) {
      console.error(err);
      alert('Erro ao carregar páginas do PDF.');
    } finally {
      setProcessando(false);
      setProgressoMsg('');
    }
  }

  // Girar Página
  function girarPagina(idx: number) {
    setMiniaturas((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, rotacao: (item.rotacao + 90) % 360 } : item))
    );
  }

  // Mover Página para Cima/Esquerda
  function moverPaginaParaEsquerda(idx: number) {
    if (idx === 0) return;
    setMiniaturas((prev) => {
      const copy = [...prev];
      const temp = copy[idx - 1];
      copy[idx - 1] = copy[idx];
      copy[idx] = temp;
      return copy;
    });
  }

  // Mover Página para Baixo/Direita
  function moverPaginaParaDireita(idx: number) {
    setMiniaturas((prev) => {
      if (idx >= prev.length - 1) return prev;
      const copy = [...prev];
      const temp = copy[idx + 1];
      copy[idx + 1] = copy[idx];
      copy[idx] = temp;
      return copy;
    });
  }

  // Excluir Página
  function excluirPagina(idx: number) {
    setMiniaturas((prev) => prev.filter((_, i) => i !== idx));
  }

  // Salvar PDF Reorganizado
  async function handleSalvarOrganizado() {
    if (!arquivoOrganizar || miniaturas.length === 0) return;
    setProcessando(true);
    setProgressoMsg('Construindo novo PDF reorganizado...');

    try {
      const ordem = miniaturas.map((m) => ({ indexOriginal: m.index, rotacao: m.rotacao }));
      const bytes = await reorganizarPdf(arquivoOrganizar, ordem, (m) => setProgressoMsg(m));
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      setPdfOrganizadoBlob(blob);
    } catch (err: unknown) {
      console.error(err);
      alert('Erro ao salvar PDF reorganizado.');
    } finally {
      setProcessando(false);
      setProgressoMsg('');
    }
  }

  // Unir PDFs
  async function handleUnirPdfs() {
    if (arquivosUnir.length < 2) return;
    setProcessando(true);
    setProgressoMsg('Unindo documentos...');
    setPdfUnificadoBlob(null);

    try {
      const resBytes = await unirPdfs(arquivosUnir, (m) => setProgressoMsg(m));
      const blob = new Blob([resBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      setPdfUnificadoBlob(blob);
    } catch (err: unknown) {
      console.error(err);
      alert('Erro ao unir documentos PDF.');
    } finally {
      setProcessando(false);
      setProgressoMsg('');
    }
  }

  // Extrair Páginas
  async function handleExtrairPaginas() {
    if (!arquivoExtrair || !paginasTexto.trim()) return;
    setProcessando(true);
    setProgressoMsg('Extraindo páginas...');
    setPdfExtraidoBlob(null);

    try {
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
    const f = new File([arquivoComprimidoBlob], `otimizado_${arquivoOriginal.name}`, { type: 'application/pdf' });
    onFechar();
    onExtrairComIA(f);
  }

  return (
    <Dialog open={aberto} onOpenChange={(open) => { if (!open) onFechar(); }}>
      <DialogContent onMinimize={onMinimizar} className="max-w-6xl w-[95vw] h-[85vh] max-h-[750px] bg-zinc-950 text-zinc-100 border border-zinc-800 shadow-2xl p-0 overflow-hidden font-sans flex flex-col">
        {/* Cabeçalho Fixo */}
        <DialogHeader className="px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/80 backdrop-blur-xl flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/20">
              <FileText className="size-5 text-zinc-950" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                Editor de PDF <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full uppercase font-extrabold tracking-wider">Ferramenta Integrada</span>
              </DialogTitle>
              <p className="text-xs text-zinc-400">
                Otimize o tamanho de matrículas, reordene páginas, gire escaneamentos e una documentos sem sair do sistema
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Corpo com Barra Lateral de Guias e Estágio Principal */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Navegação Esquerda */}
          <div className="w-64 border-r border-zinc-800/80 bg-zinc-900/40 p-4 space-y-2 shrink-0 flex flex-col justify-between">
            <div className="space-y-1.5">
              {[
                { id: 'comprimir', label: 'Reduzir Peso', desc: 'Ideal para SIGEF, Cartório e IA', icone: <Minimize2 className="size-4" /> },
                { id: 'organizar', label: 'Organizar Páginas', desc: 'Reordenar, girar e excluir', icone: <Eye className="size-4" /> },
                { id: 'unir', label: 'Juntar PDFs', desc: 'Unir certidões em 1 arquivo', icone: <Layers className="size-4" /> },
                { id: 'extrair', label: 'Extrair Páginas', desc: 'Separar folhas específicas', icone: <Scissors className="size-4" /> },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAba(item.id as any)}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl transition-all text-left border ${
                    aba === item.id
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-white shadow-lg shadow-emerald-950/30'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${aba === item.id ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-800 text-zinc-300'}`}>
                    {item.icone}
                  </div>
                  <div>
                    <div className="text-xs font-bold">{item.label}</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5 leading-tight">{item.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Aviso de Privacidade 100% Local */}
            <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl text-[11px] text-zinc-400 space-y-1">
              <div className="font-bold text-zinc-200 flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-400" /> Processamento Seguro
              </div>
              <p className="text-[10px] text-zinc-500">Seus documentos são processados no seu navegador com total privacidade.</p>
            </div>
          </div>

          {/* Área Principal de Trabalho */}
          <div className="flex-1 p-6 overflow-y-auto bg-zinc-950/80 flex flex-col justify-between">
            {/* ─── ABA 1: REDUZIR PESO (COMPRESSÃO PRÁTICA) ─── */}
            {aba === 'comprimir' && (
              <div className="space-y-6 max-w-2xl mx-auto w-full py-2">
                <div>
                  <h3 className="text-sm font-extrabold text-white">Escolha o objetivo da otimização:</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Selecione o perfil que melhor atende à sua necessidade atual.</p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'media', titulo: 'Padrão Cartório / SIGEF', detalhe: 'Equilibrado. Ideal para anexar em portais sem exceder limite em MB.', cor: 'border-emerald-500/40 bg-emerald-950/30 text-emerald-400' },
                    { id: 'alta', titulo: 'Alta Nitidez', detalhe: 'Preserva máxima legibilidade de carimbos e assinaturas pequenas.', cor: 'border-blue-500/40 bg-blue-950/30 text-blue-400' },
                    { id: 'maxima_compressao', titulo: 'Super Leve (Economia)', detalhe: 'Redução máxima de peso. Ideal para enviar à IA ou e-mail.', cor: 'border-purple-500/40 bg-purple-950/30 text-purple-400' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPreset(p.id as any)}
                      className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        preset === p.id ? `${p.cor} shadow-md` : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-white">{p.titulo}</div>
                        <div className="text-[11px] text-zinc-400 mt-1.5 leading-snug">{p.detalhe}</div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Seleção do Arquivo */}
                <label className="flex flex-col items-center justify-center w-full h-44 border-2 border-dashed border-zinc-800 hover:border-emerald-500/50 rounded-2xl bg-zinc-900/30 hover:bg-zinc-900/60 cursor-pointer transition-all">
                  <div className="flex flex-col items-center justify-center">
                    <FileText className="size-10 text-emerald-400 mb-2" />
                    <p className="text-sm font-bold text-white">Clique para selecionar o PDF para comprimir</p>
                    <p className="text-xs text-zinc-500 mt-1">Matrículas, certidões ou plantas em PDF</p>
                  </div>
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => { if (e.target.files?.[0]) handleComprimir(e.target.files[0]); }}
                    disabled={processando}
                  />
                </label>

                {processando && (
                  <div className="flex items-center gap-3 bg-emerald-950/40 border border-emerald-800/40 p-4 rounded-xl text-emerald-400 font-bold text-xs animate-pulse">
                    <RefreshCw className="size-4 animate-spin shrink-0" />
                    <span>{progressoMsg}</span>
                  </div>
                )}

                {/* Resultado */}
                {resultadoCompressao && (
                  <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                        <CheckCircle2 className="size-4" /> PDF Otimizado com Sucesso!
                      </span>
                      <span className="text-xs font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full">
                        {resultadoCompressao.percentualEconomia}% menor
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 bg-zinc-950 p-3.5 rounded-xl border border-zinc-850">
                      <div>
                        <span className="text-[10px] text-zinc-500 font-extrabold uppercase">Tamanho Anterior</span>
                        <p className="text-base font-black text-zinc-300">{formatBytes(resultadoCompressao.initialBytes)}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 font-extrabold uppercase">Tamanho Otimizado</span>
                        <p className="text-base font-black text-emerald-400">{formatBytes(resultadoCompressao.finalBytes)}</p>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-1">
                      {arquivoComprimidoBlob && (
                        <Button
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-10 text-xs gap-2"
                          onClick={() => baixarBlob(arquivoComprimidoBlob, `otimizado_${arquivoOriginal?.name || 'documento.pdf'}`)}
                        >
                          <Download className="size-4" /> Baixar PDF Otimizado
                        </Button>
                      )}

                      {onExtrairComIA && arquivoComprimidoBlob && (
                        <Button
                          variant="outline"
                          className="border-emerald-500/40 bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-400 font-bold h-10 text-xs gap-2"
                          onClick={enviarComprimidoParaIA}
                        >
                          <Sparkles className="size-4" /> Processar com IA
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─── ABA 2: ORGANIZAR & REORDENAR PÁGINAS VISUALMENTE ─── */}
            {aba === 'organizar' && (
              <div className="space-y-4 flex flex-col h-full">
                {!arquivoOrganizar ? (
                  <label className="flex flex-col items-center justify-center w-full h-full border-2 border-dashed border-zinc-800 hover:border-emerald-500/50 rounded-2xl bg-zinc-900/30 hover:bg-zinc-900/60 cursor-pointer transition-all">
                    <div className="flex flex-col items-center justify-center">
                      <Eye className="size-12 text-emerald-400 mb-3" />
                      <p className="text-sm font-bold text-white">Carregar PDF para Organizar Páginas</p>
                      <p className="text-xs text-zinc-500 mt-1">Visualize miniaturas, gire folhas viradas e remova páginas em branco</p>
                    </div>
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={(e) => { if (e.target.files?.[0]) handleCarregarParaOrganizar(e.target.files[0]); }}
                    />
                  </label>
                ) : (
                  <div className="flex flex-col h-full justify-between space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                      <div>
                        <span className="text-xs font-bold text-white">{arquivoOrganizar.name}</span>
                        <span className="text-xs text-zinc-500 ml-2">({miniaturas.length} páginas)</span>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => { setArquivoOrganizar(null); setMiniaturas([]); }} className="text-xs h-8">
                        Trocar Arquivo
                      </Button>
                    </div>

                    {/* Grid de Miniaturas Visuais */}
                    <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-4 gap-4 max-h-[420px]">
                      {miniaturas.map((m, idx) => (
                        <div key={idx} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex flex-col justify-between space-y-2 relative group hover:border-emerald-500/50 transition-all">
                          <div className="flex items-center justify-between text-[11px] text-zinc-400 font-bold">
                            <span>Pág. {idx + 1}</span>
                            {m.rotacao > 0 && <span className="text-emerald-400 text-[10px]">{m.rotacao}°</span>}
                          </div>

                          {/* Prévia Visual */}
                          <div className="flex items-center justify-center bg-zinc-950 p-2 rounded-lg h-36 overflow-hidden border border-zinc-850">
                            <img
                              src={m.dataUrl}
                              alt={`Página ${m.numPagina}`}
                              style={{ transform: `rotate(${m.rotacao}deg)` }}
                              className="max-h-full max-w-full object-contain transition-transform duration-300"
                            />
                          </div>

                          {/* Barra de Ações Práticas */}
                          <div className="flex items-center justify-between gap-1 pt-1 border-t border-zinc-800/80">
                            <div className="flex gap-1">
                              <button
                                type="button"
                                title="Mover para esquerda"
                                disabled={idx === 0}
                                onClick={() => moverPaginaParaEsquerda(idx)}
                                className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30"
                              >
                                <ArrowLeft className="size-3.5" />
                              </button>
                              <button
                                type="button"
                                title="Mover para direita"
                                disabled={idx === miniaturas.length - 1}
                                onClick={() => moverPaginaParaDireita(idx)}
                                className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30"
                              >
                                <ArrowRight className="size-3.5" />
                              </button>
                              <button
                                type="button"
                                title="Girar 90°"
                                onClick={() => girarPagina(idx)}
                                className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-emerald-400"
                              >
                                <RotateCw className="size-3.5" />
                              </button>
                            </div>

                            <button
                              type="button"
                              title="Excluir página"
                              onClick={() => excluirPagina(idx)}
                              className="p-1 rounded bg-red-950/40 hover:bg-red-900/60 text-red-400"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Botão Finalizar */}
                    <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
                      <Button
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-10 text-xs gap-2 px-6"
                        onClick={handleSalvarOrganizado}
                        disabled={processando || miniaturas.length === 0}
                      >
                        <Download className="size-4" /> Salvar PDF Reorganizado
                      </Button>

                      {pdfOrganizadoBlob && (
                        <div className="flex items-center gap-3 bg-emerald-950/40 border border-emerald-800/40 px-3 py-1.5 rounded-xl text-emerald-400 text-xs font-bold">
                          <CheckCircle2 className="size-4" /> PDF pronto!
                          <Button size="sm" onClick={() => baixarBlob(pdfOrganizadoBlob, 'reorganizado.pdf')} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-7">
                            Baixar Agora
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─── ABA 3: JUNTAR (UNIR) PDFS ─── */}
            {aba === 'unir' && (
              <div className="space-y-5 max-w-2xl mx-auto w-full py-2">
                <div>
                  <h3 className="text-sm font-extrabold text-white">Unir múltiplos arquivos em um só PDF</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Adicione certidões, memoriais ou plantas e organize a ordem antes de juntar.</p>
                </div>

                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-zinc-800 hover:border-emerald-500/50 rounded-2xl bg-zinc-900/30 hover:bg-zinc-900/60 cursor-pointer transition-all">
                  <div className="flex flex-col items-center justify-center">
                    <FilePlus className="size-8 text-emerald-400 mb-1" />
                    <p className="text-xs font-bold text-white">Adicionar Arquivos PDF</p>
                  </div>
                  <input
                    type="file"
                    accept="application/pdf"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setArquivosUnir((prev) => [...prev, ...Array.from(e.target.files!)]);
                      }
                    }}
                  />
                </label>

                {arquivosUnir.length > 0 && (
                  <div className="space-y-3 bg-zinc-900/60 p-4 rounded-xl border border-zinc-800">
                    <span className="text-xs font-bold text-zinc-300">Arquivos na Fila ({arquivosUnir.length}):</span>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {arquivosUnir.map((f, i) => (
                        <div key={i} className="flex items-center justify-between bg-zinc-950 px-3 py-2 rounded-lg border border-zinc-850 text-xs">
                          <span className="truncate font-semibold text-white">{i + 1}. {f.name} ({formatBytes(f.size)})</span>
                          <button type="button" onClick={() => setArquivosUnir((prev) => prev.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-300 text-[11px] font-bold">
                            Remover
                          </button>
                        </div>
                      ))}
                    </div>

                    <Button
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-10 text-xs gap-2 mt-2"
                      onClick={handleUnirPdfs}
                      disabled={processando || arquivosUnir.length < 2}
                    >
                      <Layers className="size-4" /> Juntar os {arquivosUnir.length} PDFs em Um Só Arquivo
                    </Button>
                  </div>
                )}

                {pdfUnificadoBlob && (
                  <div className="p-4 bg-emerald-950/40 border border-emerald-800/40 rounded-xl flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-2"><CheckCircle2 className="size-4" /> PDFs Unificados com Sucesso!</span>
                    <Button size="sm" onClick={() => baixarBlob(pdfUnificadoBlob, 'unificado.pdf')} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 gap-1.5">
                      <Download className="size-4" /> Baixar PDF Unificado
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* ─── ABA 4: EXTRAIR PÁGINAS ─── */}
            {aba === 'extrair' && (
              <div className="space-y-5 max-w-2xl mx-auto w-full py-2">
                <div>
                  <h3 className="text-sm font-extrabold text-white">Extrair páginas específicas de um PDF</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Crie um novo documento contendo apenas as folhas selecionadas.</p>
                </div>

                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-zinc-800 hover:border-emerald-500/50 rounded-2xl bg-zinc-900/30 hover:bg-zinc-900/60 cursor-pointer transition-all">
                  <div className="flex flex-col items-center justify-center">
                    <Scissors className="size-8 text-emerald-400 mb-1" />
                    <p className="text-xs font-bold text-white">{arquivoExtrair ? arquivoExtrair.name : 'Selecionar Documento PDF'}</p>
                  </div>
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => { if (e.target.files?.[0]) setArquivoExtrair(e.target.files[0]); }}
                  />
                </label>

                {arquivoExtrair && (
                  <div className="space-y-4 bg-zinc-900/60 p-4 rounded-xl border border-zinc-800">
                    <div>
                      <Label className="text-xs font-bold text-zinc-300">Páginas para manter no novo PDF</Label>
                      <input
                        type="text"
                        value={paginasTexto}
                        onChange={(e) => setPaginasTexto(e.target.value)}
                        placeholder="Ex: 1, 3-5, 8"
                        className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 text-xs text-white focus:border-emerald-500 focus:outline-none mt-1.5"
                      />
                      <p className="text-[11px] text-zinc-500 mt-1">Exemplo: Digite `1, 3-5` para salvar apenas a folha 1 e o bloco das páginas 3 a 5.</p>
                    </div>

                    <Button
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-10 text-xs gap-2"
                      onClick={handleExtrairPaginas}
                      disabled={processando}
                    >
                      <Scissors className="size-4" /> Extrair e Gerar Novo PDF
                    </Button>
                  </div>
                )}

                {pdfExtraidoBlob && (
                  <div className="p-4 bg-emerald-950/40 border border-emerald-800/40 rounded-xl flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-2"><CheckCircle2 className="size-4" /> Páginas Extraídas com Sucesso!</span>
                    <Button size="sm" onClick={() => baixarBlob(pdfExtraidoBlob, 'paginas_extraidas.pdf')} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 gap-1.5">
                      <Download className="size-4" /> Baixar PDF
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
