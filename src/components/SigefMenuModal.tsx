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
      <DialogContent className="max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            <Database className="size-5" /> Integração SIGEF / INCRA
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 mt-2">
          <p className="text-xs text-muted-foreground leading-relaxed">
            O principal objetivo deste módulo é obter e importar os vértices e polígonos confrontantes oficiais do INCRA para casar com o seu projeto, garantindo conformidade jurídica, e nomes e dados corretos de confrontações.
          </p>

          {colegasIdentificados.length > 0 && (
            <div className="rounded-lg border border-emerald-600/20 bg-emerald-500/5 p-3 flex flex-col gap-1.5">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Phone className="size-3.5" /> Colegas com vértices certificados identificados nesta área:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                {colegasIdentificados.map((col) => (
                  <div key={col.id} className="text-xs bg-background border p-2 rounded flex flex-col gap-0.5 shadow-sm">
                    <div className="font-bold flex items-center gap-1.5 text-foreground">
                      <span className="px-1.5 py-px bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded text-[9px] font-black tracking-wider uppercase">
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

          <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Confrontantes e Vértices Oficiais</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">1. Importar Polígonos Vizinhos</span>
                <Button
                  size="sm"
                  className="h-8 font-bold"
                  onClick={() => {
                    onOpenChange(false);
                    void importarVizinhosAuto();
                  }}
                >
                  Buscar Online
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Busca automática online por região de todos os imóveis certificados que confrontam com o perímetro trabalhado, gerando os confrontantes automaticamente.
              </p>
              {parcelasCert.length > 0 && (
                <div className="mt-2 flex items-center justify-between gap-2 border border-dashed border-emerald-600/30 rounded-lg p-2 bg-background/50">
                  <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-bold text-foreground select-none">
                    <input type="checkbox" className="size-3.5 accent-emerald-600 rounded-sm" checked={mostrarCert} onChange={(e) => setMostrarCert(e.target.checked)} />
                    Exibir no Mapa ({parcelasCert.length})
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] uppercase text-muted-foreground font-semibold">Opacidade:</span>
                    <input type="range" min={0} max={0.5} step={0.02} value={opacidadeCert} disabled={!mostrarCert} onChange={(e) => setOpacidadeCert(Number(e.target.value))} className="w-20 accent-emerald-600 disabled:opacity-40" title="Opacidade do preenchimento das parcelas" />
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-foreground">2. Importar CSV dos Vértices de Imóveis Vizinhos Certificados</span>
                <Button
                  size="sm"
                  className="h-8 font-bold shrink-0 bg-amber-500 hover:bg-amber-600 text-white border-transparent"
                  onClick={() => {
                    onOpenChange(false);
                    onImportarCsvVizinhos();
                  }}
                >
                  Importar CSV
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Importa o <strong>CSV dos Vértices</strong> do imóvel vizinho certificado para servir como referência de encaixe no desenho, prevenindo vãos ou sobreposições de divisa.
              </p>
              <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-2 text-[10px] text-muted-foreground space-y-1 mt-1">
                <span className="font-extrabold uppercase text-[9px] tracking-wider text-amber-700 dark:text-amber-400 block">Como obter o CSV dos Vértices:</span>
                <ol className="list-decimal pl-4 space-y-1">
                  <li><strong>Feche esta tela</strong> e clique no polígono vizinho já importado no mapa (item 1 acima).</li>
                  <li>No painel que abrir, copie o <strong>Código INCRA</strong> do imóvel certificado.</li>
                  <li>Acesse o <strong>SIGEF/INCRA</strong>, pesquise pelo Código INCRA copiado.</li>
                  <li>Na página da parcela, baixe o <strong>CSV dos Vértices</strong>.</li>
                  <li>Volte aqui e clique em <strong>Importar CSV</strong> (botão amarelo acima).</li>
                </ol>
              </div>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">
                  3. Gerar Vértices Virtuais (V)
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 font-bold border-indigo-500 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20"
                  onClick={() => {
                    onOpenChange(false);
                    onGerarVirtual();
                  }}
                >
                  Gerar Virtual
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Calcula e cria vértices virtuais (tipo V) para cantos inacessíveis (como córregos, vãos ou limites intangíveis), por afastamento de alinhamento ou interseção de rumos.
              </p>
            </div>

            <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-3 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">4. Corrigir precisão reimportando TXT</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 font-bold border-violet-500 text-violet-600 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-950/20"
                  onClick={() => {
                    onOpenChange(false);
                    onAbrirPlanilhaConf();
                  }}
                >
                  Abrir
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Restaura a precisão milimétrica dos vértices reimportando o TXT original do levantamento. Compara cada vértice com o ponto do TXT mais próximo e atualiza as coordenadas.
              </p>
            </div>
          </div>

          <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground border-t pt-3">Conciliar Medidas (Área e Perímetro)</span>
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Ruler className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="text-xs font-bold text-foreground">Por que a área do SIGEF nunca bate 100% com a calculada aqui?</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              O SIGEF recalcula a área (SGL) e o perímetro usando as próprias fórmulas geodésicas e projeções oficiais — por isso o valor dele SEMPRE difere um pouco (alguns m²) do valor calculado por qualquer software de topografia, incluindo este. Essa diferença é normal e não indica erro no seu levantamento.
            </p>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Por segurança jurídica, o recomendado é <strong>sempre usar a área e o perímetro oficiais do SIGEF</strong> nas peças técnicas finais (memorial, planta, requerimento), não os calculados aqui. Pra isso: baixe a planilha SIGEF (.ods), envie pro site do SIGEF pra gerar o rascunho oficial, e depois cole os valores que ele devolver na janela <strong>&quot;Conferir&quot;</strong>, seção <strong>&quot;Reconciliação com o SIGEF&quot;</strong>.
            </p>
            <div className="flex flex-wrap gap-2 mt-1">
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
