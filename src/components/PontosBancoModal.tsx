'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Database, Copy, Check, Trash2, Undo2, AlertTriangle } from 'lucide-react';
import {
  listarTodosPontos, listarLixeiraPontos, zerarBancoPontos, resgatarPonto, resgatarTodosPontos, excluirPonto,
} from '@/lib/store/registro';
import type { PontoRegistro } from '@/lib/topo/types';
import { numBR } from '@/lib/topo/geometry';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

function dataBR(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export default function PontosBancoModal({ open, onOpenChange }: Props) {
  const [pontos, setPontos] = useState<PontoRegistro[]>([]);
  const [lixeira, setLixeira] = useState<(PontoRegistro & { excluidoEm: number })[]>([]);
  const [aba, setAba] = useState<'ativos' | 'lixeira'>('ativos');
  const [carregando, setCarregando] = useState(false);
  const [busca, setBusca] = useState('');
  const [copiado, setCopiado] = useState(false);

  async function recarregar() {
    setCarregando(true);
    try {
      const [ativos, lix] = await Promise.all([listarTodosPontos(), listarLixeiraPontos()]);
      setPontos(ativos); setLixeira(lix);
    } catch { setPontos([]); setLixeira([]); }
    finally { setCarregando(false); }
  }

  useEffect(() => { if (open) { setAba('ativos'); recarregar(); } }, [open]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const base = aba === 'ativos' ? pontos : lixeira;
    if (!q) return base;
    return base.filter((p) => p.codigo.toLowerCase().includes(q) || (p.imovelId ?? '').toLowerCase().includes(q));
  }, [pontos, lixeira, aba, busca]);

  function copiarTsv() {
    const linhas = filtrados.map((p) => [p.codigo, p.tipo, p.leste.toFixed(3), p.norte.toFixed(3), p.zonaUtm + p.hemisferio, p.imovelId ?? '', dataBR(p.criadoEm)].join('\t'));
    const txt = ['Código\tTipo\tEste\tNorte\tFuso\tImóvel\tData', ...linhas].join('\n');
    navigator.clipboard?.writeText(txt).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 1500); }).catch(() => {});
  }

  async function zerar() {
    const n = pontos.length;
    if (!n) return;
    if (!window.confirm(`ZERAR o banco de pontos?\n\nOs ${n} ponto(s) ativos vão para a LIXEIRA (não somem de vez — dá pra resgatar depois). Use isto ao trocar de credenciado ou liberar códigos de uma certificação cancelada.\n\nContinuar?`)) return;
    await zerarBancoPontos();
    await recarregar();
    setAba('lixeira');
  }
  async function resgatar(codigo: string) { await resgatarPonto(codigo); await recarregar(); }
  async function excluir(codigo: string) { await excluirPonto(codigo); await recarregar(); }
  async function resgatarTodos() {
    if (!lixeira.length) return;
    if (!window.confirm(`Resgatar todos os ${lixeira.length} ponto(s) da lixeira de volta pro banco ativo?`)) return;
    await resgatarTodosPontos(); await recarregar(); setAba('ativos');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Database className="size-5 text-primary" /> Banco de pontos do credenciado</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-0.5 text-sm">
          <button type="button" onClick={() => setAba('ativos')} className={`flex-1 rounded-md px-3 py-1 font-semibold ${aba === 'ativos' ? 'bg-background shadow' : 'text-muted-foreground'}`}>Ativos ({pontos.length})</button>
          <button type="button" onClick={() => setAba('lixeira')} className={`flex-1 rounded-md px-3 py-1 font-semibold ${aba === 'lixeira' ? 'bg-background shadow' : 'text-muted-foreground'}`}>Lixeira ({lixeira.length})</button>
        </div>

        <div className="flex items-center gap-2">
          <input
            className="h-8 flex-1 rounded border bg-background px-2 text-sm"
            placeholder="Buscar por código do ponto ou do imóvel…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <span className="shrink-0 text-xs text-muted-foreground">{filtrados.length} de {aba === 'ativos' ? pontos.length : lixeira.length}</span>
          <Button size="sm" variant="outline" className="h-8 gap-1 shrink-0" disabled={!filtrados.length} onClick={copiarTsv}>
            {copiado ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {copiado ? 'Copiado' : 'Copiar'}
          </Button>
          {aba === 'lixeira' && lixeira.length > 0 && (
            <Button size="sm" variant="outline" className="h-8 gap-1 shrink-0" onClick={resgatarTodos}><Undo2 className="size-3.5" /> Resgatar todos</Button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-auto rounded border">
          {carregando ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Carregando…</div>
          ) : filtrados.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {aba === 'lixeira'
                ? 'A lixeira está vazia.'
                : pontos.length === 0 ? 'Nenhum ponto registrado ainda neste navegador.' : 'Nenhum ponto encontrado para essa busca.'}
            </div>
          ) : (
            <table className="w-full text-xs font-mono">
              <thead className="sticky top-0 bg-muted/60 text-[10px] uppercase text-muted-foreground">
                <tr>
                  <th className="px-2 py-1 text-left">Código</th>
                  <th className="px-2 py-1 text-left">Tipo</th>
                  <th className="px-2 py-1 text-right">Este</th>
                  <th className="px-2 py-1 text-right">Norte</th>
                  <th className="px-2 py-1 text-center">Fuso</th>
                  <th className="px-2 py-1 text-left">Imóvel</th>
                  <th className="px-2 py-1 text-right">Data</th>
                  {aba === 'lixeira' ? <th className="px-2 py-1 text-center">Resgatar</th> : <th className="px-2 py-1 text-center">Excluir</th>}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((p) => (
                  <tr key={p.codigo} className="border-t">
                    <td className="px-2 py-1 font-semibold">{p.codigo}</td>
                    <td className="px-2 py-1">{p.tipo}</td>
                    <td className="px-2 py-1 text-right">{numBR(p.leste, 3)}</td>
                    <td className="px-2 py-1 text-right">{numBR(p.norte, 3)}</td>
                    <td className="px-2 py-1 text-center">{p.zonaUtm}{p.hemisferio}</td>
                    <td className="px-2 py-1 truncate">{p.imovelId ?? '—'}</td>
                    <td className="px-2 py-1 text-right">{dataBR(p.criadoEm)}</td>
                    {aba === 'lixeira' ? (
                      <td className="px-2 py-1 text-center">
                        <button className="rounded p-1 text-primary hover:bg-muted" title="Resgatar este ponto" aria-label={`Resgatar ${p.codigo}`} onClick={() => resgatar(p.codigo)}><Undo2 className="size-4" /></button>
                      </td>
                    ) : (
                      <td className="px-2 py-1 text-center">
                        <button className="rounded p-1 text-destructive hover:bg-destructive hover:text-white" title="Excluir este vértice (vai para a lixeira, recuperável)" aria-label={`Excluir ${p.codigo}`} onClick={() => excluir(p.codigo)}><Trash2 className="size-4" /></button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {aba === 'ativos' ? (
          <div className="flex items-center justify-between gap-2 rounded border border-red-600/30 bg-red-600/5 px-2 py-1.5">
            <span className="flex items-center gap-1.5 text-[11px] text-red-700 dark:text-red-400"><AlertTriangle className="size-3.5 shrink-0" /> Zona de perigo: manda todos os pontos ativos pra lixeira (recuperável).</span>
            <Button size="sm" variant="outline" className="h-7 shrink-0 gap-1 border-red-600/40 text-red-700 hover:bg-red-600 hover:text-white dark:text-red-400" disabled={!pontos.length} onClick={zerar}><Trash2 className="size-3.5" /> Zerar banco</Button>
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground">Pontos na lixeira não são reaproveitados nem contam como usados. Resgate quando precisar deles de volta. Ao trocar de credenciado, o novo credenciado tem a sua própria numeração.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
