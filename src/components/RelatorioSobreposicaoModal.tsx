import React from 'react';
import { ShieldCheck, AlertTriangle, AlertCircle, HelpCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Vertex } from '../lib/topo/types';
import { analisarSobreposicoes } from '../lib/topo/confrontacaoCheck';

interface RelatorioSobreposicaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  vertices: Vertex[];
  outrasGlebas: { nome: string; pts: { leste: number; norte: number }[] }[];
}

export default function RelatorioSobreposicaoModal({
  isOpen,
  onClose,
  vertices,
  outrasGlebas,
}: RelatorioSobreposicaoModalProps) {
  const resultados = analisarSobreposicoes(vertices, outrasGlebas);

  const temPerigo = resultados.some((r) => r.tipo === 'PERIGO');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl bg-background border shadow-2xl p-0 rounded-lg text-foreground flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <DialogHeader className="flex flex-row items-center gap-3 border-b px-6 py-4 bg-muted/30">
          <ShieldCheck className="size-6 text-indigo-500 shrink-0" />
          <DialogTitle className="text-lg font-bold tracking-wide">Análise de Limites &amp; Sobreposição SIGEF</DialogTitle>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Resumo do Status */}
          {outrasGlebas.length === 0 ? (
            <div className="flex items-start gap-4 bg-amber-500/10 border border-amber-500/30 rounded-lg p-5">
              <HelpCircle className="size-8 text-amber-500 shrink-0" />
              <div>
                <h4 className="font-bold text-amber-600 dark:text-amber-400">Nenhum vizinho carregado</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Não existem glebas vizinhas importadas ou dados de confrontação certificados do SIGEF carregados neste projeto. Para fazer a análise de sobreposição, certifique-se de carregar as parcelas vizinhas ou consultar o SIGEF.
                </p>
              </div>
            </div>
          ) : temPerigo ? (
            <div className="flex items-start gap-4 bg-destructive/10 border border-destructive/30 rounded-lg p-5">
              <AlertCircle className="size-8 text-destructive shrink-0" />
              <div>
                <h4 className="font-bold text-destructive">SOBREPOSIÇÃO DETECTADA!</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Detectamos cruzamentos de divisas ou invasões de perímetro com glebas confrontantes certificadas no SIGEF. Revise as geometrias para evitar recusa administrativa do INCRA.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-5">
              <ShieldCheck className="size-8 text-emerald-500 shrink-0" />
              <div>
                <h4 className="font-bold text-emerald-600 dark:text-emerald-400">Limites Livres de Conflito!</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Não foram detectadas invasões ou cruzamentos de linhas com as parcelas confrontantes carregadas no projeto.
                </p>
              </div>
            </div>
          )}

          {/* Lista de Resultados */}
          {resultados.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Detalhamento por Parcela</h4>
              <div className="space-y-2">
                {resultados.map((res, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 border rounded-lg p-4 transition-all duration-200 ${
                      res.tipo === 'PERIGO'
                        ? 'bg-destructive/5 border-destructive/20 text-destructive'
                        : res.tipo === 'ALERTA'
                        ? 'bg-amber-500/5 border-amber-500/20 text-amber-600 dark:text-amber-400'
                        : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    <div className="shrink-0 mt-0.5">
                      {res.tipo === 'PERIGO' && <AlertCircle className="size-5 text-destructive" />}
                      {res.tipo === 'ALERTA' && <AlertTriangle className="size-5 text-amber-500" />}
                      {res.tipo === 'OK' && <ShieldCheck className="size-5 text-emerald-500" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold tracking-wide text-sm text-foreground">{res.nomeVizinho}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                            res.tipo === 'PERIGO'
                              ? 'bg-destructive/25 text-destructive border border-destructive/30'
                              : res.tipo === 'ALERTA'
                              ? 'bg-amber-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                              : 'bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {res.tipo === 'PERIGO' ? 'Crítico' : res.tipo === 'ALERTA' ? 'Alerta' : 'OK'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{res.detalhe}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t px-6 py-4 bg-muted/30">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            Fechar Diagnóstico
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
