import React from 'react';
import { X, ShieldCheck, AlertTriangle, AlertCircle, HelpCircle } from 'lucide-react';
import { Vertex } from '../lib/topo/types';
import { analisarSobreposicoes, ResultadoConfrontacao } from '../lib/topo/confrontacaoCheck';

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
  if (!isOpen) return null;

  const resultados = analisarSobreposicoes(vertices, outrasGlebas);

  const temPerigo = resultados.some((r) => r.tipo === 'PERIGO');
  const temAlerta = resultados.some((r) => r.tipo === 'ALERTA');

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative flex flex-col w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl text-slate-100 overflow-hidden max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 bg-slate-950 px-6 py-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="size-6 text-indigo-400" />
            <h3 className="text-lg font-bold tracking-wide">Análise de Limites &amp; Sobreposição SIGEF</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 hover:bg-slate-800 transition-colors"
          >
            <X className="size-5 text-slate-400 hover:text-slate-100" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Resumo do Status */}
          {outrasGlebas.length === 0 ? (
            <div className="flex items-start gap-4 bg-slate-800/60 border border-slate-700 rounded-lg p-5">
              <HelpCircle className="size-8 text-amber-400 shrink-0" />
              <div>
                <h4 className="font-bold text-amber-300">Nenhum vizinho carregado</h4>
                <p className="text-sm text-slate-300 mt-1">
                  Não existem glebas vizinhas importadas ou dados de confrontação certificados do SIGEF carregados neste projeto. Para fazer a análise de sobreposição, certifique-se de carregar as parcelas vizinhas ou consultar o SIGEF.
                </p>
              </div>
            </div>
          ) : temPerigo ? (
            <div className="flex items-start gap-4 bg-red-950/40 border border-red-800/80 rounded-lg p-5">
              <AlertCircle className="size-8 text-red-400 shrink-0" />
              <div>
                <h4 className="font-bold text-red-300">SOBREPOSIÇÃO DETECTADA!</h4>
                <p className="text-sm text-slate-300 mt-1">
                  Detectamos cruzamentos de divisas ou invasões de perímetro com glebas confrontantes certificadas no SIGEF. Revise as geometrias para evitar recusa administrativa do INCRA.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-4 bg-emerald-950/40 border border-emerald-800/80 rounded-lg p-5">
              <ShieldCheck className="size-8 text-emerald-400 shrink-0" />
              <div>
                <h4 className="font-bold text-emerald-300">Limites Livres de Conflito!</h4>
                <p className="text-sm text-slate-300 mt-1">
                  Não foram detectadas invasões ou cruzamentos de linhas com as parcelas confrontantes carregadas no projeto.
                </p>
              </div>
            </div>
          )}

          {/* Lista de Resultados */}
          {resultados.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold tracking-wider text-slate-400 uppercase">Detalhamento por Parcela</h4>
              <div className="space-y-2">
                {resultados.map((res, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 border rounded-lg p-4 transition-all duration-200 ${
                      res.tipo === 'PERIGO'
                        ? 'bg-red-950/15 border-red-900/60 text-red-200'
                        : res.tipo === 'ALERTA'
                        ? 'bg-amber-950/15 border-amber-900/60 text-amber-200'
                        : 'bg-emerald-950/15 border-emerald-900/60 text-emerald-200'
                    }`}
                  >
                    <div className="shrink-0 mt-0.5">
                      {res.tipo === 'PERIGO' && <AlertCircle className="size-5 text-red-400" />}
                      {res.tipo === 'ALERTA' && <AlertTriangle className="size-5 text-amber-400" />}
                      {res.tipo === 'OK' && <ShieldCheck className="size-5 text-emerald-400" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold tracking-wide text-sm">{res.nomeVizinho}</span>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                            res.tipo === 'PERIGO'
                              ? 'bg-red-900/40 text-red-300 border border-red-800/50'
                              : res.tipo === 'ALERTA'
                              ? 'bg-amber-900/40 text-amber-300 border border-amber-800/50'
                              : 'bg-emerald-900/40 text-emerald-300 border border-emerald-800/50'
                          }`}
                        >
                          {res.tipo === 'PERIGO' ? 'Crítico' : res.tipo === 'ALERTA' ? 'Alerta' : 'OK'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">{res.detalhe}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-slate-700 bg-slate-950 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold rounded bg-slate-800 hover:bg-slate-700 active:bg-slate-650 text-slate-200 transition-colors"
          >
            Fechar Diagnóstico
          </button>
        </div>
      </div>
    </div>
  );
}
