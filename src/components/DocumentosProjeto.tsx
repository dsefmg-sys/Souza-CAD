'use client';

import { useEffect, useRef, useState } from 'react';
import { Upload, Download, Trash2, Eye, FileText, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { listarArquivosPorDono, salvarArquivo, excluirArquivo, type ArquivoProjeto } from '@/lib/store/arquivosProjeto';
import { confirmar } from '@/lib/ui/dialogos';

/**
 * Centro de documentos de um DONO (o imóvel/proprietário, ou um confrontante específico). Anexa,
 * lista, visualiza, baixa, exclui e dispara a extração por IA de cada documento. Fica dentro das
 * abas do painel Dados — o lugar do documento já diz a quem ele pertence.
 */
const TIPOS_DOC = ['Certidão de matrícula', 'Escritura', 'CNH / RG', 'CPF', 'Comprovante', 'Foto', 'Outro'];

function tamanhoBR(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export default function DocumentosProjeto({
  projetoId, dono, confrontanteId, titulo, onExtrair,
}: {
  projetoId: string | null;
  dono: 'imovel' | 'confrontante';
  confrontanteId?: string;
  titulo?: string;
  /** Abre a extração por IA já carregando este arquivo, mirando o dono desta seção. */
  onExtrair?: (arquivo: ArquivoProjeto) => void;
}) {
  const [arquivos, setArquivos] = useState<ArquivoProjeto[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [tipoDoc, setTipoDoc] = useState(TIPOS_DOC[0]);
  const fileRef = useRef<HTMLInputElement>(null);

  async function recarregar() {
    if (!projetoId) { setArquivos([]); return; }
    setCarregando(true);
    try { setArquivos(await listarArquivosPorDono(projetoId, dono, confrontanteId)); } catch { setArquivos([]); }
    finally { setCarregando(false); }
  }
  useEffect(() => { recarregar();   }, [projetoId, dono, confrontanteId]);

  async function subir(files: FileList | null) {
    if (!files || !projetoId) return;
    for (const f of Array.from(files)) await salvarArquivo(projetoId, f, { dono, confrontanteId, tipoDoc });
    recarregar();
  }
  function baixar(a: ArquivoProjeto) {
    const url = URL.createObjectURL(a.blob);
    const el = document.createElement('a'); el.href = url; el.download = a.nome; el.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  function ver(a: ArquivoProjeto) {
    const url = URL.createObjectURL(a.blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  async function apagar(a: ArquivoProjeto) {
    if (!(await confirmar({ titulo: 'Remover documento', mensagem: `Remover o documento "${a.nome}"?`, okLabel: 'Remover', perigo: true }))) return;
    await excluirArquivo(a.id); recarregar();
  }

  return (
    <div className="space-y-1.5 rounded-lg border bg-muted/20 p-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{titulo ?? 'Documentos'}</span>
        {arquivos.length > 0 && <span className="text-[10px] text-muted-foreground">{arquivos.length}</span>}
      </div>

      {!projetoId ? (
        <div className="rounded-sm border border-dashed p-2 text-center text-[11px] text-muted-foreground">Salve o projeto para anexar documentos.</div>
      ) : (
        <>
          <div className="flex items-center gap-1.5">
            <select className="h-7 min-w-0 flex-1 rounded-sm border bg-background px-1 text-[11px]" value={tipoDoc} onChange={(e) => setTipoDoc(e.target.value)} title="Tipo do documento">
              {TIPOS_DOC.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input ref={fileRef} type="file" multiple className="hidden" accept=".pdf,image/*" onChange={(e) => { subir(e.target.files); e.currentTarget.value = ''; }} />
            <Button size="sm" variant="outline" className="h-7 shrink-0 gap-1 px-2 text-[11px]" onClick={() => fileRef.current?.click()}><Upload className="size-3.5" /> Anexar</Button>
          </div>

          {carregando ? (
            <div className="p-2 text-center text-[11px] text-muted-foreground">Carregando…</div>
          ) : arquivos.length === 0 ? (
            <div className="rounded-sm border border-dashed p-2 text-center text-[11px] text-muted-foreground">Nenhum documento. Escolha o tipo e clique em Anexar.</div>
          ) : (
            <div className="space-y-1">
              {arquivos.map((a) => (
                <div key={a.id} className="flex items-center gap-1.5 rounded-sm border bg-background p-1.5 text-[11px]">
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{a.nome}</div>
                    <div className="text-[10px] text-muted-foreground">{a.tipoDoc ? `${a.tipoDoc} · ` : ''}{tamanhoBR(a.tamanho)}</div>
                  </div>
                  {onExtrair && (
                    <button className="rounded-sm p-1 text-violet-600 hover:bg-violet-500/10 dark:text-violet-400" title="Extrair dados com IA" aria-label={`Extrair dados de ${a.nome}`} onClick={() => onExtrair(a)}><Sparkles className="size-4" /></button>
                  )}
                  <button className="rounded-sm p-1 hover:bg-muted" title="Visualizar" aria-label={`Visualizar ${a.nome}`} onClick={() => ver(a)}><Eye className="size-4" /></button>
                  <button className="rounded-sm p-1 hover:bg-muted" title="Baixar" aria-label={`Baixar ${a.nome}`} onClick={() => baixar(a)}><Download className="size-4" /></button>
                  <button className="rounded-sm p-1 text-destructive hover:bg-destructive hover:text-white" title="Remover" aria-label={`Remover ${a.nome}`} onClick={() => apagar(a)}><Trash2 className="size-4" /></button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
