'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, RefreshCw } from 'lucide-react';
import { listarPerfisUso, type PerfilUso } from '@/lib/store/perfilUso';
import { carregarConfigAssinatura, salvarConfigAssinatura, CONFIG_ASSINATURA_PADRAO, type ConfigAssinatura } from '@/lib/store/assinatura';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

function dataBR(ms?: number): string {
  if (!ms) return '—';
  const d = new Date(ms);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

// "Ativo" = usou o sistema (salvou projeto ou acessou) nos últimos 30 dias.
const DIAS_ATIVO = 30 * 24 * 60 * 60 * 1000;

export default function MasterPainelModal({ open, onOpenChange }: Props) {
  const [perfis, setPerfis] = useState<PerfilUso[]>([]);
  const [cfg, setCfg] = useState<ConfigAssinatura>(CONFIG_ASSINATURA_PADRAO);
  const [carregando, setCarregando] = useState(false);

  async function recarregar() {
    setCarregando(true);
    try {
      setPerfis(await listarPerfisUso());
      const c = await carregarConfigAssinatura();
      setCfg(c);
    } finally { setCarregando(false); }
  }

  async function alterarOcultarCobranca(val: boolean) {
    const novaCfg = { ...cfg, ocultarCobranca: val };
    setCfg(novaCfg);
    try { await salvarConfigAssinatura(novaCfg); } catch { /* ignore */ }
  }
  useEffect(() => { if (open) recarregar(); }, [open]);

  const agora = perfis.length ? Math.max(...perfis.map((p) => p.ultimoAcessoEm ?? 0), Date.now()) : Date.now();
  const ativos = useMemo(() => perfis.filter((p) => (agora - (p.ultimoAcessoEm ?? p.ultimoProjetoEm ?? 0)) < DIAS_ATIVO), [perfis, agora]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Crown className="size-5 text-amber-500" /> Painel do titular — uso do sistema</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="rounded bg-muted px-2 py-0.5"><strong>{perfis.length}</strong> contas</span>
          <span className="rounded bg-emerald-600/10 px-2 py-0.5 text-emerald-700 dark:text-emerald-400"><strong>{ativos.length}</strong> ativas (30 dias)</span>

          <label className="flex items-center gap-1.5 rounded border border-amber-600/35 bg-amber-600/10 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-300 cursor-pointer hover:bg-amber-600/20 transition-colors ml-2">
            <input
              type="checkbox"
              className="rounded text-amber-600 focus:ring-amber-500 size-3.5"
              checked={!!cfg.ocultarCobranca}
              onChange={(e) => alterarOcultarCobranca(e.target.checked)}
            />
            Ocultar planos e cobranças de usuários (testar sem custo)
          </label>

          <Button size="sm" variant="outline" className="ml-auto h-8 gap-1" onClick={recarregar} disabled={carregando}><RefreshCw className="size-3.5" /> Atualizar</Button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto rounded border">
          {carregando ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Carregando…</div>
          ) : perfis.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Nenhum perfil ainda — ou você não tem acesso de titular (verifique as regras do Firestore e o e-mail master).</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/70 text-[10px] uppercase text-muted-foreground">
                <tr>
                  <th className="px-2 py-1 text-left">Empresa</th>
                  <th className="px-2 py-1 text-left">Responsável técnico</th>
                  <th className="px-2 py-1 text-left">E-mail</th>
                  <th className="px-2 py-1 text-center">Projetos</th>
                  <th className="px-2 py-1 text-left">Último projeto</th>
                  <th className="px-2 py-1 text-center">Data</th>
                  <th className="px-2 py-1 text-center">Termos</th>
                  <th className="px-2 py-1 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {perfis.map((p) => {
                  const ativo = (agora - (p.ultimoAcessoEm ?? p.ultimoProjetoEm ?? 0)) < DIAS_ATIVO;
                  return (
                    <tr key={p.uid} className="border-t">
                      <td className="px-2 py-1 font-semibold">{p.empresaNome || '—'}</td>
                      <td className="px-2 py-1">{p.rtNome || '—'}{p.rtCft ? ` · ${p.rtCft}` : ''}</td>
                      <td className="px-2 py-1 text-muted-foreground">{p.email || '—'}</td>
                      <td className="px-2 py-1 text-center">{p.totalProjetos ?? 0}</td>
                      <td className="px-2 py-1 truncate">{p.ultimoProjetoNome || '—'}</td>
                      <td className="px-2 py-1 text-center">{dataBR(p.ultimoProjetoEm)}</td>
                      <td className="px-2 py-1 text-center">{p.termosVersao ? dataBR(p.termosAceitosEm) : 'não'}</td>
                      <td className="px-2 py-1 text-center">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${ativo ? 'bg-emerald-600/15 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>{ativo ? 'ativo' : 'inativo'}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">Só você (conta master) vê este painel. Os dados vêm de perfisUso no Firestore — cada conta grava o seu ao usar o sistema.</p>
      </DialogContent>
    </Dialog>
  );
}
