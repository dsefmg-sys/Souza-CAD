'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Info, Upload, Download, Trash2, Eye, FileText, Search } from 'lucide-react';
import { listarArquivos, salvarArquivo, excluirArquivo, type ArquivoProjeto } from '@/lib/store/arquivosProjeto';
import { numBR } from '@/lib/topo/geometry';
import type { ImovelData, TecnicoData } from '@/lib/topo/types';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projetoId: string | null;
  nome: string;
  imovel: ImovelData;
  tecnico: TecnicoData | null;
  areaHa: number;
  perimetro: number;
  numVertices: number;
  numConfrontantes: number;
  numGlebas: number;
}

function tamanhoBR(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export default function ProjetoInfoModal({ open, onOpenChange, projetoId, nome, imovel, tecnico, areaHa, perimetro, numVertices, numConfrontantes, numGlebas }: Props) {
  const [arquivos, setArquivos] = useState<ArquivoProjeto[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [rotuloUpload, setRotuloUpload] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function recarregar() {
    if (!projetoId) { setArquivos([]); return; }
    setCarregando(true);
    try { setArquivos(await listarArquivos(projetoId)); } catch { setArquivos([]); }
    finally { setCarregando(false); }
  }
  useEffect(() => { if (open) recarregar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [open, projetoId]);

  async function subir(files: FileList | null) {
    if (!files || !projetoId) return;
    for (const f of Array.from(files)) await salvarArquivo(projetoId, f, rotuloUpload);
    setRotuloUpload('');
    recarregar();
  }
  function abrirRiDigital() {
    window.open('https://www.ridigital.org.br/Acesso.aspx', '_blank', 'noopener,noreferrer');
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
    if (!window.confirm(`Remover o arquivo "${a.nome}"?`)) return;
    await excluirArquivo(a.id); recarregar();
  }

  const det: [string, string][] = [
    ['Projeto', nome || '—'],
    [imovel.tipoImovel === 'urbano' ? 'Lote/Imóvel' : 'Imóvel', imovel.denominacao || '—'],
    ['Proprietário', imovel.proprietario || '—'],
    ['CPF/CNPJ', imovel.cpfProprietario || '—'],
    ['Matrícula', imovel.matricula || '—'],
    ['Cartório (CNS)', imovel.cns || '—'],
    ['Código INCRA', imovel.codigoImovelIncra || '—'],
    ['Município', imovel.municipio || '—'],
    ['TRT', imovel.numeroTrt || tecnico?.art || '—'],
    ['Responsável técnico', tecnico?.nome || '—'],
    ['Área SGL', `${numBR(areaHa, 4)} ha`],
    ['Perímetro', `${numBR(perimetro)} m`],
    ['Vértices', String(numVertices)],
    ['Confrontantes', String(numConfrontantes)],
    ['Glebas', String(numGlebas)],
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Info className="size-5 text-primary" /> Informações do projeto</DialogTitle>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-auto md:grid-cols-2">
          {/* detalhes */}
          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">Dados</div>
            <div className="divide-y rounded border">
              {det.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-2 px-2 py-1 text-xs">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="truncate text-right font-medium">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* arquivos */}
          <div className="flex flex-col">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase text-muted-foreground">Arquivos do projeto</span>
              <Button size="sm" variant="outline" className="h-7" onClick={abrirRiDigital} title="Abre o RI Digital (ridigital.org.br) para buscar o espelho da matrícula"><Search className="size-3.5" /> Buscar espelho</Button>
            </div>
            <div className="mb-2 flex items-center gap-1.5">
              <input
                className="h-7 flex-1 rounded border bg-background px-2 text-xs"
                placeholder="Rótulo do anexo (ex.: Espelho — Proprietário, Espelho — Confrontante José)"
                value={rotuloUpload}
                onChange={(e) => setRotuloUpload(e.target.value)}
              />
              <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => { subir(e.target.files); e.currentTarget.value = ''; }} />
              <Button size="sm" variant="outline" className="h-7 shrink-0" disabled={!projetoId} onClick={() => fileRef.current?.click()}><Upload className="size-3.5" /> Anexar</Button>
            </div>
            {!projetoId ? (
              <div className="rounded border border-dashed p-3 text-center text-xs text-muted-foreground">Salve o projeto primeiro para anexar arquivos.</div>
            ) : carregando ? (
              <div className="p-3 text-center text-xs text-muted-foreground">Carregando…</div>
            ) : arquivos.length === 0 ? (
              <div className="rounded border border-dashed p-3 text-center text-xs text-muted-foreground">Nenhum arquivo anexado. Use Anexar para subir espelhos, PDFs, fotos…</div>
            ) : (
              <div className="min-h-0 flex-1 space-y-1 overflow-auto">
                {arquivos.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 rounded border p-1.5 text-xs">
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{a.nome}</div>
                      <div className="text-[10px] text-muted-foreground">{a.rotulo ? `${a.rotulo} · ` : ''}{tamanhoBR(a.tamanho)}</div>
                    </div>
                    <button className="rounded p-1 hover:bg-muted" title="Visualizar" onClick={() => ver(a)}><Eye className="size-4" /></button>
                    <button className="rounded p-1 hover:bg-muted" title="Baixar" onClick={() => baixar(a)}><Download className="size-4" /></button>
                    <button className="rounded p-1 text-destructive hover:bg-destructive hover:text-white" title="Remover" onClick={() => apagar(a)}><Trash2 className="size-4" /></button>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-2 text-[10px] text-muted-foreground">Os arquivos ficam guardados neste navegador, ligados ao projeto. A leitura automática por IA virá numa próxima etapa.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
