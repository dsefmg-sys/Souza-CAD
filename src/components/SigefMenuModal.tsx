'use client';

import React from 'react';
import { Database, Phone, Ruler, Download, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface ColegaIdentificado {
  id: string;
  nome: string;
  credenciamento: string;
  telefone?: string;
}

export interface ParcelaCertificada {
  info?: { titulo?: string };
  anel: Array<[number, number]>;
}

interface SigefMenuModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colegasIdentificados: ColegaIdentificado[];
  parcelasCert: ParcelaCertificada[];
  mostrarCert: boolean;
  setMostrarCert: (val: boolean) => void;
  opacidadeCert: number;
  setOpacidadeCert: (val: number) => void;
  importarVizinhosAuto: () => Promise<void>;
  onImportarCsvVizinhos: () => void;
  onGerarVirtual: () => void;
  onCorrigirLatLon: () => void;
  onAbrirPlanilhaConf: () => void;
  onAbrirConferir: () => void;
}

export function SigefMenuModal({
  open,
  onOpenChange,
  colegasIdentificados,
  parcelasCert,
  mostrarCert,
  setMostrarCert,
  opacidadeCert,
  setOpacidadeCert,
  importarVizinhosAuto,
  onImportarCsvVizinhos,
  onGerarVirtual,
  onCorrigirLatLon,
  onAbrirPlanilhaConf,
  onAbrirConferir
}: SigefMenuModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl lg:max-w-6xl p-6 max-h-[90vh] overflow-y-auto rounded-2xl bg-background/95 backdrop-blur-xl border border-emerald-500/20 shadow-2xl">
        <DialogHeader className="border-b border-border/50 pb-3">
          <DialogTitle className="text-base font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            <Database className="size-5 text-emerald-500" /> Integração SIGEF / INCRA
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 mt-2">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Obtenha e importe os vértices e polígonos confrontantes oficiais do INCRA para casar com o seu projeto, garantindo conformidade jurídica, e nomes e dados corretos de confrontações.
          </p>

          {colegasIdentificados.length > 0 && (
            <div className="rounded-xl border border-emerald-600/30 bg-emerald-500/10 p-3.5 flex flex-col gap-2 shadow-xs">
              <div className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Phone className="size-4 text-emerald-500" /> Colegas com vértices certificados identificados nesta área:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-1">
                {colegasIdentificados.map((col) => (
                  <div key={col.id} className="text-xs bg-background/80 border border-emerald-500/20 p-2.5 rounded-xl flex flex-col gap-1 shadow-2xs">
                    <div className="font-bold flex items-center gap-1.5 text-foreground">
                      <span className="px-1.5 py-0.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-md text-[9px] font-black tracking-wider uppercase">
                        {col.credenciamento}
                      </span>
                      <span className="truncate">{col.nome}</span>
                    </div>
                    {col.telefone && (
                      <div className="text-[11px] text-muted-foreground">
                        Telefone: <span className="font-semibold text-foreground">{col.telefone}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground pt-1">Confrontantes e Vértices Oficiais</span>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 items-stretch">
            <div className="rounded-xl border border-border/70 bg-card p-3.5 flex flex-col justify-between gap-2 shadow-2xs hover:border-emerald-500/40 transition-all">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">1. Polígonos Vizinhos</span>
                  <Button
                    size="sm"
                    className="h-7 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => {
                      onOpenChange(false);
                      void importarVizinhosAuto();
                    }}
                  >
                    Buscar Online
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Busca automática online por região de todos os imóveis certificados que confrontam com o perímetro trabalhado.
                </p>
              </div>
              {parcelasCert.length > 0 && (
                <div className="mt-2 flex items-center justify-between gap-1.5 border border-dashed border-emerald-600/30 rounded-lg p-1.5 bg-background/50">
                  <label className="flex cursor-pointer items-center gap-1.5 text-[10.5px] font-bold text-foreground select-none">
                    <input type="checkbox" className="size-3.5 accent-emerald-600 rounded-sm" checked={mostrarCert} onChange={(e) => setMostrarCert(e.target.checked)} />
                    Mapa ({parcelasCert.length})
                  </label>
                  <div className="flex items-center gap-1">
                    <span className="text-[8.5px] uppercase text-muted-foreground font-semibold">Opac:</span>
                    <input type="range" min={0} max={0.5} step={0.02} value={opacidadeCert} disabled={!mostrarCert} onChange={(e) => setOpacidadeCert(Number(e.target.value))} className="w-16 accent-emerald-600 disabled:opacity-40" title="Opacidade do preenchimento das parcelas" />
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-3.5 flex flex-col justify-between gap-2 shadow-2xs hover:border-amber-500/60 transition-all">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-foreground">2. CSV dos Vértices</span>
                  <Button
                    size="sm"
                    className="h-7 text-[11px] font-bold shrink-0 bg-amber-500 hover:bg-amber-600 text-white border-transparent"
                    onClick={() => {
                      onOpenChange(false);
                      onImportarCsvVizinhos();
                    }}
                  >
                    Importar CSV
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Importa o <strong>CSV dos Vértices</strong> do imóvel vizinho certificado para encaixe perfeito no desenho.
                </p>
              </div>
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2 text-[10px] text-muted-foreground space-y-1">
                <span className="font-extrabold uppercase text-[8.5px] tracking-wider text-amber-700 dark:text-amber-400 block">Como obter o CSV:</span>
                <ol className="list-decimal pl-3 space-y-0.5 leading-tight">
                  <li>Clique no polígono vizinho no mapa.</li>
                  <li>Copie o <strong>Código INCRA</strong>.</li>
                  <li>Baixe o CSV no site do <strong>SIGEF</strong>.</li>
                </ol>
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-card p-3.5 flex flex-col justify-between gap-2 shadow-2xs hover:border-indigo-500/40 transition-all">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">3. Vértices Virtuais (V)</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px] font-bold border-indigo-500 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/20"
                    onClick={() => {
                      onOpenChange(false);
                      onGerarVirtual();
                    }}
                  >
                    Gerar Virtual
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Calcula e cria vértices virtuais (tipo V) para cantos inacessíveis (córregos, vãos ou divisas intangíveis).
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-3.5 flex flex-col justify-between gap-2 shadow-2xs hover:border-violet-500/50 transition-all">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">4. Corrigir com TXT</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px] font-bold border-violet-500 text-violet-600 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-950/20"
                    onClick={() => {
                      onOpenChange(false);
                      onAbrirPlanilhaConf();
                    }}
                  >
                    Abrir
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Restaura a precisão milimétrica dos vértices reimportando o TXT original do levantamento.
                </p>
              </div>
            </div>
          </div>

          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground border-t pt-3">Conciliar Medidas (Área e Perímetro)</span>
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex flex-col gap-2.5 shadow-xs">
            <div className="flex items-center gap-2">
              <Ruler className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="text-xs font-black uppercase tracking-wider text-foreground">Por que a área do SIGEF difere alguns m² do desenho?</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              O SIGEF recalcula a área (SGL) e o perímetro usando as próprias fórmulas geodésicas oficiais. Por segurança jurídica, <strong>sempre use a área e o perímetro oficiais do SIGEF</strong> nas peças técnicas finais: baixe a planilha SIGEF (.ods), envie para o site do SIGEF e cole os valores na janela <strong>&quot;Conferir&quot;</strong> (seção Reconciliação).
            </p>
            <div className="flex flex-wrap gap-2.5 pt-1">
              <Button
                size="sm"
                variant="outline"
                className="h-8 font-bold border-amber-600 text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/20"
                onClick={() => {
                  onOpenChange(false);
                  onAbrirPlanilhaConf();
                }}
              >
                <Download className="size-3.5" /> Baixar Planilha SIGEF (.ods)
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 font-bold"
                onClick={() => {
                  onOpenChange(false);
                  onAbrirConferir();
                }}
              >
                <Check className="size-3.5" /> Já tenho os valores oficiais
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
