'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Database, Copy, Check } from 'lucide-react';
import { listarTodosPontos } from '@/lib/store/registro';
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
  const [carregando, setCarregando] = useState(false);
  const [busca, setBusca] = useState('');
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCarregando(true);
    listarTodosPontos().then(setPontos).catch(() => setPontos([])).finally(() => setCarregando(false));
  }, [open]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return pontos;
    return pontos.filter((p) => p.codigo.toLowerCase().includes(q) || (p.imovelId ?? '').toLowerCase().includes(q));
  }, [pontos, busca]);

  function copiarTsv() {
    const linhas = filtrados.map((p) => [p.codigo, p.tipo, p.leste.toFixed(3), p.norte.toFixed(3), p.zonaUtm + p.hemisferio, p.imovelId ?? '', dataBR(p.criadoEm)].join('\t'));
    const txt = ['Código\tTipo\tEste\tNorte\tFuso\tImóvel\tData', ...linhas].join('\n');
    navigator.clipboard?.writeText(txt).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 1500); }).catch(() => {});
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Database className="size-5 text-primary" /> Banco de pontos do credenciado</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <input
            className="h-8 flex-1 rounded border bg-background px-2 text-sm"
            placeholder="Buscar por código do ponto ou do imóvel…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <span className="shrink-0 text-xs text-muted-foreground">{filtrados.length} de {pontos.length}</span>
          <Button size="sm" variant="outline" className="h-8 gap-1 shrink-0" disabled={!filtrados.length} onClick={copiarTsv}>
            {copiado ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {copiado ? 'Copiado' : 'Copiar'}
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto rounded border">
          {carregando ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Carregando…</div>
          ) : filtrados.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">{pontos.length === 0 ? 'Nenhum ponto registrado ainda neste navegador.' : 'Nenhum ponto encontrado para essa busca.'}</div>
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
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">Este é o banco de códigos já usados por este credenciado — nenhum código aqui é reaproveitado em projetos futuros. Somente consulta; a exclusão não é permitida aqui para não quebrar a numeração.</p>
      </DialogContent>
    </Dialog>
  );
}
