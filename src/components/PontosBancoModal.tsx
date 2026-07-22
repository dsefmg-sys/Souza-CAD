'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Database, Copy, Check, Trash2, Undo2, AlertTriangle } from 'lucide-react';
import {
  listarTodosPontos, listarLixeiraPontos, zerarBancoPontos, resgatarPonto, resgatarTodosPontos, excluirPonto,
  lerContadores, definirContadores
} from '@/lib/store/registro';
import { listarProjetos } from '@/lib/store/projects';
import type { PontoRegistro, TecnicoData } from '@/lib/topo/types';
import { Sliders, Settings, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { numBR } from '@/lib/topo/geometry';
import { confirmar } from '@/lib/ui/dialogos';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tecnico?: TecnicoData | null;
}

function dataBR(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export default function PontosBancoModal({ open, onOpenChange, tecnico }: Props) {
  const [pontos, setPontos] = useState<PontoRegistro[]>([]);
  
  // Controle de Sequenciamento e Contadores
  const [contadorM, setContadorM] = useState<number>(1);
  const [contadorP, setContadorP] = useState<number>(1);
  const [contadorV, setContadorV] = useState<number>(1);
  const [prefixoCredenciado, setPrefixoCredenciado] = useState<string>('COIN');
  const [mostrarAjusteContador, setMostrarAjusteContador] = useState(true);

  // Estados do Acompanhamento de Projetos
  const [intervalosProjetos, setIntervalosProjetos] = useState<{
    id: string;
    nome: string;
    minM: number | null; maxM: number | null;
    minP: number | null; maxP: number | null;
    minV: number | null; maxV: number | null;
  }[]>([]);
  const [analisandoProjetos, setAnalisandoProjetos] = useState(false);
  const [mostrarIntervalos, setMostrarIntervalos] = useState(false);

  async function carregarContadoresLocais() {
    const pref = tecnico?.credenciamentoIncra || 'COIN';
    setPrefixoCredenciado(pref);
    try {
      const c = await lerContadores(pref, tecnico || { nome: '', credenciamentoIncra: pref } as any);
      setContadorM(c.M);
      setContadorP(c.P);
      setContadorV(c.V);
    } catch (e) {
      console.warn('Erro ao carregar contadores no modal:', e);
    }
  }

  async function salvarContadorManual(tipo: 'M' | 'P' | 'V', valor: number) {
    const val = Math.max(1, Math.round(valor));
    let nextM = contadorM;
    let nextP = contadorP;
    let nextV = contadorV;
    
    if (tipo === 'M') { nextM = val; setContadorM(val); }
    if (tipo === 'P') { nextP = val; setContadorP(val); }
    if (tipo === 'V') { nextV = val; setContadorV(val); }
    
    try {
      await definirContadores({
        prefixo: prefixoCredenciado,
        M: nextM,
        P: nextP,
        V: nextV
      });
    } catch (e) {
      console.error('Erro ao definir contadores:', e);
    }
  }

  async function analisarProjetosDoHistorico() {
    setAnalisandoProjetos(true);
    try {
      const projs = await listarProjetos();
      const resultado: typeof intervalosProjetos = [];

      for (const p of projs) {
        let maxM: number | null = null; let minM: number | null = null;
        let maxP: number | null = null; let minP: number | null = null;
        let maxV: number | null = null; let minV: number | null = null;

        const processarVertice = (codigo: string) => {
          if (!codigo) return;
          const clean = codigo.trim().toUpperCase();
          const prefAtual = (prefixoCredenciado || 'COIN').trim().toUpperCase();
          
          // Captura prefixos de credenciado (3 a 6 caracteres alfaméricos) ou sem prefixo
          const match = clean.match(/^(?:([A-Z0-9]{3,6})-)?([MPV])-0*([1-9][0-9]*)$/i);
          if (match) {
            const prefEncontrado = match[1] ? match[1].toUpperCase() : null;
            const tipo = match[2].toUpperCase() as 'M' | 'P' | 'V';
            const num = parseInt(match[3], 10);
            
            // SE tiver um prefixo e ele for diferente do prefixo do credenciado atual, IGNORAR (é de outro agrimensor/SIGEF terceiro)
            if (prefEncontrado && prefEncontrado !== prefAtual) {
              return;
            }
            
            if (tipo === 'M') {
              if (maxM === null || num > maxM) maxM = num;
              if (minM === null || num < minM) minM = num;
            } else if (tipo === 'P') {
              if (maxP === null || num > maxP) maxP = num;
              if (minP === null || num < minP) minP = num;
            } else if (tipo === 'V') {
              if (maxV === null || num > maxV) maxV = num;
              if (minV === null || num < minV) minV = num;
            }
          }
        };

        if (p.vertices) {
          p.vertices.forEach(v => {
            if (v.codigoSigef) processarVertice(v.codigoSigef);
            if (v.nome) processarVertice(v.nome);
            if (v.codigoCampo) processarVertice(v.codigoCampo);
          });
        }

        if (p.glebas) {
          p.glebas.forEach(g => {
            if (g.vertices) {
              g.vertices.forEach(v => {
                if (v.codigoSigef) processarVertice(v.codigoSigef);
                if (v.nome) processarVertice(v.nome);
                if (v.codigoCampo) processarVertice(v.codigoCampo);
              });
            }
          });
        }

        if (minM !== null || minP !== null || minV !== null) {
          resultado.push({
            id: p.id,
            nome: p.nome || p.imovel?.denominacao || 'SEM NOME',
            minM, maxM,
            minP, maxP,
            minV, maxV
          });
        }
      }

      setIntervalosProjetos(resultado);
      setMostrarIntervalos(true);
    } catch (e) {
      console.error('Erro ao varrer histórico de projetos:', e);
    } finally {
      setAnalisandoProjetos(false);
    }
  }

  async function aplicarMaiorComoProximo() {
    let maiorM = 0;
    let maiorP = 0;
    let maiorV = 0;

    intervalosProjetos.forEach(item => {
      if (item.maxM && item.maxM > maiorM) maiorM = item.maxM;
      if (item.maxP && item.maxP > maiorP) maiorP = item.maxP;
      if (item.maxV && item.maxV > maiorV) maiorV = item.maxV;
    });

    const nextM = maiorM + 1;
    const nextP = maiorP + 1;
    const nextV = maiorV + 1;

    setContadorM(nextM);
    setContadorP(nextP);
    setContadorV(nextV);

    try {
      await definirContadores({
        prefixo: prefixoCredenciado,
        M: nextM,
        P: nextP,
        V: nextV
      });
      await confirmar({
        titulo: 'Contadores Atualizados',
        mensagem: `A sequência de próximos números livres foi ajustada:\n\n• Próximo M: M-${String(nextM).padStart(4, '0')}\n• Próximo P: P-${String(nextP).padStart(4, '0')}\n• Próximo V: V-${String(nextV).padStart(4, '0')}`,
        okLabel: 'Entendido'
      });
    } catch (e) {
      console.error('Erro ao salvar novos contadores:', e);
    }
  }
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

  useEffect(() => { 
    if (open) { 
      setAba('ativos'); 
      recarregar(); 
      carregarContadoresLocais();
      setMostrarIntervalos(false);
      setIntervalosProjetos([]);
    } 
  }, [open, tecnico]);

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
    if (!(await confirmar({ titulo: 'Zerar banco de pontos', mensagem: `ZERAR o banco de pontos?\n\nOs ${n} ponto(s) ativos vão para a LIXEIRA (não somem de vez — dá pra resgatar depois). Use isto ao trocar de credenciado ou liberar códigos de uma certificação cancelada.\n\nContinuar?`, okLabel: 'Zerar', perigo: true }))) return;
    await zerarBancoPontos();
    await recarregar();
    setAba('lixeira');
  }
  async function resgatar(codigo: string) { await resgatarPonto(codigo); await recarregar(); }
  async function excluir(codigo: string) { await excluirPonto(codigo); await recarregar(); }
  async function resgatarTodos() {
    if (!lixeira.length) return;
    if (!(await confirmar({ titulo: 'Resgatar todos', mensagem: `Resgatar todos os ${lixeira.length} ponto(s) da lixeira de volta pro banco ativo?`, okLabel: 'Resgatar todos' }))) return;
    await resgatarTodosPontos(); await recarregar(); setAba('ativos');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Database className="size-5 text-primary" /> Banco de pontos do credenciado</DialogTitle>
        </DialogHeader>

        {/* Central de Sequenciamento de Numeração de Pontos */}
        <div className="rounded-lg border bg-slate-950/20 dark:bg-muted/10 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
              <Sliders className="size-4 shrink-0" /> Configuração de Próximos Vértices (Sequencial)
            </h3>
            <span className="text-[10px] bg-slate-500/10 px-1.5 py-0.5 rounded border border-white/5 font-mono font-bold text-slate-400">
              Prefixo INCRA: {prefixoCredenciado}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Próximo Marco (M)</label>
              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold text-muted-foreground">M-</span>
                <input
                  type="number"
                  min={1}
                  value={contadorM}
                  onChange={(e) => salvarContadorManual('M', Number(e.target.value))}
                  className="h-7 w-full rounded border bg-background px-1.5 text-xs font-bold text-foreground"
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Próximo Ponto (P)</label>
              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold text-muted-foreground">P-</span>
                <input
                  type="number"
                  min={1}
                  value={contadorP}
                  onChange={(e) => salvarContadorManual('P', Number(e.target.value))}
                  className="h-7 w-full rounded border bg-background px-1.5 text-xs font-bold text-foreground"
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Próximo Virtual (V)</label>
              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold text-muted-foreground">V-</span>
                <input
                  type="number"
                  min={1}
                  value={contadorV}
                  onChange={(e) => salvarContadorManual('V', Number(e.target.value))}
                  className="h-7 w-full rounded border bg-background px-1.5 text-xs font-bold text-foreground"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-1 border-t border-white/5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2.5 gap-1 text-[10px] font-bold uppercase cursor-pointer"
              disabled={analisandoProjetos}
              onClick={analisarProjetosDoHistorico}
            >
              <RefreshCw className={`size-3 text-sky-500 ${analisandoProjetos ? 'animate-spin' : ''}`} />
              Mapear Menor e Maior Ponto por Projeto
            </Button>
            
            {mostrarIntervalos && intervalosProjetos.length > 0 && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-7 px-2.5 gap-1 text-[10px] font-bold uppercase bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 cursor-pointer"
                onClick={aplicarMaiorComoProximo}
              >
                <SlidersHorizontal className="size-3 text-amber-500" />
                Sincronizar com Maior Geral (+1)
              </Button>
            )}
          </div>

          {/* Lista de Acompanhamento de Projetos e Vértices Usados */}
          {mostrarIntervalos && (
            <div className="max-h-[160px] overflow-auto rounded border bg-black/25 dark:bg-muted/5 p-2 space-y-1.5">
              <div className="text-[10px] font-bold uppercase text-muted-foreground border-b pb-0.5 mb-1.5 flex justify-between">
                <span>Resumo de Vértices por Projeto</span>
                <button type="button" onClick={() => setMostrarIntervalos(false)} className="text-red-500 font-bold hover:underline">Fechar</button>
              </div>
              {intervalosProjetos.length === 0 ? (
                <div className="text-[10px] text-center text-muted-foreground py-2">Nenhum ponto sequencial padrão (M, P ou V) localizado nos projetos ativos.</div>
              ) : (
                <table className="w-full text-[10px] font-mono border-collapse">
                  <thead>
                    <tr className="text-muted-foreground border-b border-white/5 text-[9px] uppercase">
                      <th className="text-left py-0.5">Projeto</th>
                      <th className="text-center py-0.5">Marcos (M)</th>
                      <th className="text-center py-0.5">Pontos (P)</th>
                      <th className="text-center py-0.5">Virtuais (V)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {intervalosProjetos.map((p) => (
                      <tr key={p.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-1 font-bold text-slate-300 truncate max-w-[200px]">{p.nome}</td>
                        <td className="py-1 text-center font-semibold text-slate-400">
                          {p.minM !== null ? `M-${String(p.minM).padStart(4, '0')} a M-${String(p.maxM).padStart(4, '0')}` : '—'}
                        </td>
                        <td className="py-1 text-center font-semibold text-slate-400">
                          {p.minP !== null ? `P-${String(p.minP).padStart(4, '0')} a P-${String(p.maxP).padStart(4, '0')}` : '—'}
                        </td>
                        <td className="py-1 text-center font-semibold text-slate-400">
                          {p.minV !== null ? `V-${String(p.minV).padStart(4, '0')} a V-${String(p.maxV).padStart(4, '0')}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-0.5 text-sm">
          <button type="button" onClick={() => setAba('ativos')} className={`flex-1 rounded-md px-3 py-1 font-semibold ${aba === 'ativos' ? 'bg-background shadow' : 'text-muted-foreground'}`}>Ativos ({pontos.length})</button>
          <button type="button" onClick={() => setAba('lixeira')} className={`flex-1 rounded-md px-3 py-1 font-semibold ${aba === 'lixeira' ? 'bg-background shadow' : 'text-muted-foreground'}`}>Lixeira ({lixeira.length})</button>
        </div>

        <div className="flex items-center gap-2">
          <input
            className="h-8 flex-1 rounded-sm border bg-background px-2 text-sm"
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

        <div className="min-h-0 flex-1 overflow-auto rounded-sm border">
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
                        <button className="rounded-sm p-1 text-primary hover:bg-muted" title="Resgatar este ponto" aria-label={`Resgatar ${p.codigo}`} onClick={() => resgatar(p.codigo)}><Undo2 className="size-4" /></button>
                      </td>
                    ) : (
                      <td className="px-2 py-1 text-center">
                        <button className="rounded-sm p-1 text-destructive hover:bg-destructive hover:text-white" title="Excluir este vértice (vai para a lixeira, recuperável)" aria-label={`Excluir ${p.codigo}`} onClick={() => excluir(p.codigo)}><Trash2 className="size-4" /></button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {aba === 'ativos' ? (
          <div className="flex items-center justify-between gap-2 rounded-sm border border-red-600/30 bg-red-600/5 px-2 py-1.5">
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
