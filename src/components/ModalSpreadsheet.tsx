'use client';

import { useState, useEffect, useRef } from 'react';
import type { Vertex, Contadores } from '@/lib/topo/types';
import { TIPOS_VERTICE, TIPOS_LIMITE, METODOS_POSICIONAMENTO } from '@/lib/topo/sigefVocab';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { X, Play, Wand2, CheckCircle2 } from 'lucide-react';
import { lerTxtECalcularCorrecoes } from '@/lib/topo/correcaoPrecisao';
import { aplicarCorrecoesPrecisao, type CorrecaoPrecisao } from '@/lib/topo/vertices';
import { RelatorioCorrecaoPrecisao } from './RelatorioCorrecaoPrecisao';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  vertices: Vertex[];
  onSave: (updated: Vertex[]) => void;
  contadorSugerido: Contadores | null;
  /** Necessário para re-derivar lat/lon quando o TXT atualiza E/N. */
  zona: number;
  hemisferio: 'N' | 'S';
}

export default function ModalSpreadsheet({ isOpen, onClose, vertices, onSave, contadorSugerido, zona, hemisferio }: Props) {
  const [localVertices, setLocalVertices] = useState<Vertex[]>([]);
  const [prefix, setPrefix] = useState('M-');
  const [startNum, setStartNum] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [relatorio, setRelatorio] = useState<{ nomeArquivo: string; correcoes: CorrecaoPrecisao[] } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);

  // Initialize prefix dynamically when opening the modal
  useEffect(() => {
    if (isOpen && contadorSugerido) {
      const activePref = contadorSugerido.prefixo || 'VER';
      const firstType = vertices[0]?.tipo || 'M';
      setPrefix(`${activePref}-${firstType}-`);
    }
  }, [isOpen, vertices, contadorSugerido]);

  // Auto suggest start number based on prefix type
  useEffect(() => {
    if (contadorSugerido) {
      const prefLower = prefix.trim().toLowerCase();
      if (prefLower.includes('-m-') || prefLower.endsWith('-m-') || prefLower.endsWith('-m')) {
        setStartNum(contadorSugerido.M + 1);
      } else if (prefLower.includes('-p-') || prefLower.endsWith('-p-') || prefLower.endsWith('-p')) {
        setStartNum(contadorSugerido.P + 1);
      } else if (prefLower.includes('-v-') || prefLower.endsWith('-v-') || prefLower.endsWith('-v')) {
        setStartNum(contadorSugerido.V + 1);
      }
    }
  }, [prefix, contadorSugerido]);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalVertices(JSON.parse(JSON.stringify(vertices)));
    }
  }, [isOpen, vertices]);

  if (!isOpen) return null;

  const handleChange = (id: string, field: keyof Vertex, value: Vertex[keyof Vertex]) => {
    setLocalVertices((curr) =>
      curr.map((v) => {
        if (v.id === id) {
          const updated = { ...v, [field]: value };
          // Se alterar leste/norte, recalcularíamos lat/lon se tivéssemos a função de conversão,
          // porém no spreadsheet geralmente mantemos coordenadas consistentes ou o usuário sabe o que faz.
          // Para ser útil e seguro, permitimos a edição dos valores numéricos.
          if (field === 'leste' || field === 'norte' || field === 'elevacao') {
            updated[field] = Number(value) || 0;
          }
          return updated;
        }
        return v;
      })
    );
  };

  const aplicarRenomeacaoLote = () => {
    let num = startNum;
    setLocalVertices((curr) =>
      curr.map((v) => {
        const numStr = String(num).padStart(4, '0');
        const codigoSigef = `${prefix}${numStr}`;
        num++;
        return { ...v, codigoSigef };
      })
    );
  };

  const handleSave = () => {
    onSave(localVertices);
    onClose();
  };

  function abrirFilePicker() {
    setErro(null);
    setRelatorio(null);
    fileInputRef.current?.click();
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = ''; // permite reescolher o mesmo arquivo
    if (!f) return;
    setProcessando(true);
    setErro(null);
    const resultado = await lerTxtECalcularCorrecoes(f, localVertices);
    setProcessando(false);
    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    setRelatorio({ nomeArquivo: resultado.nomeArquivo, correcoes: resultado.correcoes });
  }

  function aplicarCorrecoes() {
    if (!relatorio) return;
    const novos = aplicarCorrecoesPrecisao(localVertices, relatorio.correcoes, zona, hemisferio);
    setLocalVertices(novos);
    setRelatorio(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="flex h-[90vh] w-[95vw] max-w-6xl flex-col rounded-lg border border-border bg-background shadow-xl">
        {/* Header */}
        <header className="flex items-center justify-between border-b p-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Tabela de Vértices</h2>
            <p className="text-xs text-muted-foreground">Editor em modo planilha. Digite diretamente nas células para alterar valores.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={processando || localVertices.length === 0}
              onClick={abrirFilePicker}
              title="Reimportar o TXT do GNSS para casar vértices por proximidade e corrigir a precisão das coordenadas"
            >
              <Wand2 className="size-4" /> {processando ? 'Lendo…' : 'Corrigir precisão importando TXT novamente'}
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
              <X className="size-5" />
            </Button>
          </div>
        </header>

        {/* Batch Renaming Toolbar */}
        <div className="flex flex-col gap-2 border-b bg-muted/40 p-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="batch-prefix" className="font-semibold">Renomeador em lote:</Label>
              <Input
                id="batch-prefix"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                placeholder="Ex: M-"
                className="h-8 w-20 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="batch-start" className="font-semibold">Nº Inicial:</Label>
              <Input
                id="batch-start"
                type="number"
                value={startNum}
                onChange={(e) => setStartNum(Number(e.target.value) || 1)}
                className="h-8 w-20 text-xs"
              />
            </div>
            <Button type="button" size="sm" className="h-8 gap-1" onClick={aplicarRenomeacaoLote}>
              <Play className="size-3.5" /> Aplicar
            </Button>
            <p className="text-[10px] text-muted-foreground">
              Exemplo gerado: {prefix}{startNum}, {prefix}{startNum + 1}...
            </p>
          </div>
          {contadorSugerido && (
            <div className="text-[10px] text-muted-foreground border-t pt-1.5 flex gap-4">
              <span>Últimos números usados na nuvem (nunca repetir):</span>
              <span><b>M</b> (Marcos): <span className="font-semibold text-foreground">{contadorSugerido.M}</span></span>
              <span><b>P</b> (Pontos): <span className="font-semibold text-foreground">{contadorSugerido.P}</span></span>
              <span><b>V</b> (Virtuais): <span className="font-semibold text-foreground">{contadorSugerido.V}</span></span>
              <span className="text-primary font-semibold ml-auto">
                Sugestão automática aplicada ao alterar o prefixo!
              </span>
            </div>
          )}
        </div>

        {/* Relatório de correção de precisão — só aparece após o usuário escolher um TXT */}
        {(relatorio || erro) && (
          <div className="border-b p-3 space-y-2">
            {relatorio && (
              <RelatorioCorrecaoPrecisao nomeArquivo={relatorio.nomeArquivo} correcoes={relatorio.correcoes} />
            )}
            {erro && (
              <div className="rounded-sm border border-red-500/40 bg-red-50/40 dark:bg-red-900/10 p-2 text-xs text-red-700 dark:text-red-400">
                {erro}
              </div>
            )}
          </div>
        )}

        {/* Table Area */}
        <div className="flex-1 overflow-auto p-4">
          <div className="rounded-md border bg-card">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-muted text-muted-foreground border-b select-none font-semibold">
                <tr>
                  <th className="p-2 w-12 text-center border-r">#</th>
                  <th className="p-2 w-20 border-r">Tipo</th>
                  <th className="p-2 w-40 border-r">Código (SIGEF)</th>
                  <th className="p-2 w-32 border-r">Leste (E)</th>
                  <th className="p-2 w-32 border-r">Norte (N)</th>
                  <th className="p-2 w-24 border-r">Altitude (Z)</th>
                  <th className="p-2 w-24 border-r">Limite</th>
                  <th className="p-2 border-r">Método</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {localVertices.map((v, i) => (
                  <tr key={v.id} className="hover:bg-muted/50 transition-colors">
                    <td className="p-1 text-center font-mono font-bold border-r text-muted-foreground w-12">{i + 1}</td>
                    
                    {/* Tipo */}
                    <td className="p-1 border-r w-20">
                      <select
                        value={v.tipo}
                        onChange={(e) => handleChange(v.id, 'tipo', e.target.value)}
                        className="w-full bg-transparent p-1 outline-none focus:bg-background border border-transparent focus:border-input rounded-sm"
                      >
                        {TIPOS_VERTICE.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </td>

                    {/* Código (SIGEF) */}
                    <td className="p-1 border-r w-40">
                      <input
                        type="text"
                        value={v.codigoSigef || ''}
                        onChange={(e) => handleChange(v.id, 'codigoSigef', e.target.value)}
                        placeholder={v.nome}
                        className="w-full bg-transparent p-1 outline-none focus:bg-background border border-transparent focus:border-input rounded-sm font-mono"
                      />
                    </td>

                    {/* Leste */}
                    <td className="p-1 border-r w-32">
                      <input
                        type="number"
                        step="0.001"
                        value={v.leste}
                        onChange={(e) => handleChange(v.id, 'leste', e.target.value)}
                        className="w-full bg-transparent p-1 outline-none focus:bg-background border border-transparent focus:border-input rounded-sm font-mono text-right"
                      />
                    </td>

                    {/* Norte */}
                    <td className="p-1 border-r w-32">
                      <input
                        type="number"
                        step="0.001"
                        value={v.norte}
                        onChange={(e) => handleChange(v.id, 'norte', e.target.value)}
                        className="w-full bg-transparent p-1 outline-none focus:bg-background border border-transparent focus:border-input rounded-sm font-mono text-right"
                      />
                    </td>

                    {/* Altitude */}
                    <td className="p-1 border-r w-24">
                      <input
                        type="number"
                        step="0.01"
                        value={v.elevacao}
                        onChange={(e) => handleChange(v.id, 'elevacao', e.target.value)}
                        className="w-full bg-transparent p-1 outline-none focus:bg-background border border-transparent focus:border-input rounded-sm font-mono text-right"
                      />
                    </td>

                    {/* Limite */}
                    <td className="p-1 border-r w-24">
                      <select
                        value={v.tipoLimite || 'LA6'}
                        onChange={(e) => handleChange(v.id, 'tipoLimite', e.target.value)}
                        className="w-full bg-transparent p-1 outline-none focus:bg-background border border-transparent focus:border-input rounded-sm"
                      >
                        {TIPOS_LIMITE.map((tl) => (
                          <option key={tl} value={tl}>{tl}</option>
                        ))}
                      </select>
                    </td>

                    {/* Método */}
                    <td className="p-1 border-r">
                      <select
                        value={v.metodo || 'PG6'}
                        onChange={(e) => handleChange(v.id, 'metodo', e.target.value)}
                        className="w-full bg-transparent p-1 outline-none focus:bg-background border border-transparent focus:border-input rounded-sm"
                      >
                        {METODOS_POSICIONAMENTO.map((mp) => (
                          <option key={mp} value={mp}>{mp}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-end gap-2 border-t p-4">
          {relatorio && relatorio.correcoes.length > 0 && (
            <Button variant="default" onClick={aplicarCorrecoes}>
              <CheckCircle2 className="size-4" /> Aplicar {relatorio.correcoes.length} correções
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="default" onClick={handleSave}>Salvar Alterações</Button>
        </footer>

        {/* File picker escondido — acionado pelo botão "Corrigir precisão…" no header */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.csv,text/plain,text/csv"
          className="hidden"
          onChange={handleFile}
        />
      </div>
    </div>
  );
}
