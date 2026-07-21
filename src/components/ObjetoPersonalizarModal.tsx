import React, { useState } from 'react';
import { Palette, X, RefreshCw, Copy, Plus, Minus, Trash2, BookUser } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Z_CLASSES } from '@/lib/ui/zlayers';
import type { ObjetoDesenho, PlantaConfig, EscritorioData, ImovelData } from '@/lib/topo/types';

type ItemTextoOverride = { texto?: string; escala?: number; negrito?: boolean; dx?: number; dy?: number; larguraChars?: number; fundoBranco?: boolean };

interface ObjetoPersonalizarModalProps {
  objPersonalizarId: string | null;
  setObjPersonalizarId: (id: string | null) => void;
  setObjetoSelId: (id: string | null) => void;
  objetos: ObjetoDesenho[];
  setObjetos: React.Dispatch<React.SetStateAction<ObjetoDesenho[]>>;
  editarObjetoSel: (attrs: Partial<ObjetoDesenho>) => void;
  apagarObjetoSel: () => void;
  plantaConfig: PlantaConfig;
  setPlantaConfig: React.Dispatch<React.SetStateAction<PlantaConfig>>;
  patchTextoPlanta: (id: string, patch: ItemTextoOverride) => void;
  nomeProjeto: string;
  escritorio: EscritorioData | null;
  gerarSituacaoPlanta: () => void;
  aviso: (msg: string) => void;
  copiaBuffer: ObjetoDesenho | null;
  setCopiaBuffer: (obj: ObjetoDesenho | null) => void;
  onRemoverPrint3D?: () => void;
  imovel?: ImovelData;
  setImovel?: React.Dispatch<React.SetStateAction<ImovelData>>;
  onAbrirDadosGleba?: (id?: string) => void;
}

export function ObjetoPersonalizarModal({
  objPersonalizarId,
  setObjPersonalizarId,
  setObjetoSelId,
  objetos,
  setObjetos,
  editarObjetoSel,
  apagarObjetoSel,
  plantaConfig,
  setPlantaConfig,
  patchTextoPlanta,
  nomeProjeto,
  escritorio,
  gerarSituacaoPlanta,
  aviso,
  copiaBuffer,
  setCopiaBuffer,
  onRemoverPrint3D,
  imovel,
  setImovel,
  onAbrirDadosGleba,
}: ObjetoPersonalizarModalProps) {
  const [ajustarTodasGlebas, setAjustarTodasGlebas] = useState(true);

  if (!objPersonalizarId) return null;

  return (
    <div className={`no-print absolute top-[70px] right-4 ${Z_CLASSES.PANEL_OBJECT_PROPERTIES} w-80 max-h-[80vh] overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-background/95 p-4 shadow-2xl backdrop-blur animate-in slide-in-from-right-5 duration-200 text-xs`}>
      <div className="mb-3 flex items-center justify-between border-b pb-2">
        <h3 className="font-extrabold text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Palette className="size-3.5 text-amber-500" /> Propriedades do Elemento
        </h3>
        <button
          type="button"
          onClick={() => {
            setObjPersonalizarId(null);
            setObjetoSelId(null);
          }}
          className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      {(() => {
        if (objPersonalizarId === 'planta.centroInfo' || objPersonalizarId === 'planta:titulo_imovel' || objPersonalizarId.startsWith('gleba:')) {
          const idCentro = 'planta.centroInfo';
          const ovCentro = plantaConfig.textos?.[idCentro] || {};
          const escCentro = ovCentro.escala ?? plantaConfig.escalaTextoCentroGlebas ?? 1.0;
          const negCentro = ovCentro.negrito ?? false;
          const fundoBranco = ovCentro.fundoBranco ?? false;
          const largCentro = ovCentro.larguraChars ?? 0;

          const atualizarEscalaCentro = (novaEsc: number) => {
            patchTextoPlanta(idCentro, { escala: novaEsc });
            if (ajustarTodasGlebas) {
              setPlantaConfig((p) => ({ ...p, escalaTextoCentroGlebas: novaEsc }));
            }
          };

          return (
            <div className="space-y-4">
              <div className="font-bold text-foreground mb-1 text-sm border-b pb-1">Texto Central da Gleba</div>

              {/* Fundo Sólido Branco */}
              <label className="flex items-center gap-2 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={fundoBranco}
                  onChange={(e) => patchTextoPlanta(idCentro, { fundoBranco: e.target.checked })}
                  className="rounded border-zinc-300 text-primary focus:ring-primary size-4"
                />
                <span className="font-semibold text-foreground">Fundo sólido branco (sobrepõe curvas)</span>
              </label>

              {/* Negrito */}
              <label className="flex items-center gap-2 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={negCentro}
                  onChange={(e) => patchTextoPlanta(idCentro, { negrito: e.target.checked })}
                  className="rounded border-zinc-300 text-primary focus:ring-primary size-4"
                />
                <span className="font-semibold text-foreground">Texto em Negrito</span>
              </label>

              {/* Tamanho do Texto */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-semibold text-muted-foreground text-[10px] uppercase">
                  <span>Tamanho do Texto</span>
                  <span>{escCentro.toFixed(2)}x</span>
                </div>
                <div className="flex gap-1">
                  <button type="button" className="h-6 px-2 text-[10px] font-bold rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 cursor-pointer" onClick={() => atualizarEscalaCentro(Math.max(0.4, +(escCentro - 0.05).toFixed(2)))}>A−</button>
                  <button type="button" className="h-6 px-2 text-[10px] font-bold rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 cursor-pointer" onClick={() => atualizarEscalaCentro(Math.min(3.0, +(escCentro + 0.05).toFixed(2)))}>A+</button>
                  <button type="button" className="h-6 px-2 text-[10px] font-bold rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 cursor-pointer" onClick={() => atualizarEscalaCentro(1.0)}>Reset</button>
                </div>

                {/* Checkbox marcada por padrao: Ajustar de todas as glebas */}
                <label className="flex items-center gap-2 cursor-pointer pt-2 border-t mt-2">
                  <input
                    type="checkbox"
                    checked={ajustarTodasGlebas}
                    onChange={(e) => setAjustarTodasGlebas(e.target.checked)}
                    className="rounded border-zinc-300 text-primary focus:ring-primary size-4 cursor-pointer"
                  />
                  <span className="font-semibold text-xs text-foreground">Ajustar tamanho em todas as glebas</span>
                </label>
              </div>

              {/* Quebra de Linha (Largura em Chars) */}
              <div className="space-y-1">
                <div className="flex justify-between font-semibold text-muted-foreground text-[10px] uppercase">
                  <span>Limitar largura da linha</span>
                  <span>{largCentro > 0 ? `${largCentro} chars` : 'Sem limite'}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="120"
                  step="5"
                  value={largCentro}
                  onChange={(e) => patchTextoPlanta(idCentro, { larguraChars: Number(e.target.value) })}
                  className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              {/* Botao DADOS DA GLEBA */}
              {onAbrirDadosGleba && (
                <div className="pt-2 border-t">
                  <Button
                    type="button"
                    className="w-full h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 text-xs cursor-pointer shadow-sm"
                    onClick={() => {
                      setObjPersonalizarId(null);
                      setObjetoSelId(null);
                      onAbrirDadosGleba();
                    }}
                  >
                    <BookUser className="size-4" /> DADOS DA GLEBA (Configurações)
                  </Button>
                </div>
              )}
            </div>
          );
        }

        // Se for um elemento especial da planta
        if (objPersonalizarId.startsWith('planta:') || objPersonalizarId.startsWith('planta.')) {
          const tipoPlanta = objPersonalizarId.replace(/^planta[:.]/, '');

          if (tipoPlanta === 'situacao') {
            return (
              <div className="space-y-4">
                <div className="font-bold text-foreground mb-1 text-sm border-b pb-1">Planta de Situação</div>
                <label className="flex items-center gap-2 cursor-pointer py-1">
                  <input
                    type="checkbox"
                    checked={!!plantaConfig.situacaoEscondida || plantaConfig.mostrarSituacao === false}
                    onChange={(e) => setPlantaConfig((p: PlantaConfig) => ({ ...p, situacaoEscondida: e.target.checked, mostrarSituacao: !e.target.checked }))}
                    className="rounded border-zinc-300 text-primary focus:ring-primary size-4"
                  />
                  <span className="font-semibold text-foreground">Ocultar planta de situação</span>
                </label>

                <div className="space-y-1">
                  <div className="flex justify-between font-semibold text-muted-foreground text-[10px] uppercase">
                    <span>Escala da Situação</span>
                    <span>{plantaConfig.situacaoEscala ?? 1.0}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.1"
                    value={plantaConfig.situacaoEscala ?? 1.0}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setPlantaConfig((p: PlantaConfig) => ({ ...p, situacaoEscala: val }));
                    }}
                    className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                <Button
                  size="sm"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  onClick={() => {
                    aviso('Recapturando imagem de satélite da situação...');
                    gerarSituacaoPlanta();
                  }}
                >
                  <RefreshCw className="size-3.5 mr-1 animate-spin-slow" /> Recapturar Satélite
                </Button>
              </div>
            );
          }

          if (tipoPlanta === 'titulo') {
            const idTit = 'carimbo.titulo';
            const ovTit = plantaConfig.textos?.[idTit] || {};
            const txtTit = ovTit.texto || nomeProjeto;
            const escTit = ovTit.escala ?? 1.0;

            return (
              <div className="space-y-4">
                <div className="font-bold text-foreground mb-1 text-sm border-b pb-1">Título do Projeto</div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Texto do Título</Label>
                  <textarea
                    value={txtTit}
                    onChange={(e) => patchTextoPlanta(idTit, { texto: e.target.value })}
                    className="w-full rounded border bg-background p-2 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none min-h-[50px]"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between font-semibold text-muted-foreground text-[10px] uppercase">
                    <span>Tamanho do Texto</span>
                    <span>{escTit.toFixed(2)}x</span>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" className="h-6 px-2 text-[10px] font-bold rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors" onClick={() => patchTextoPlanta(idTit, { escala: Math.max(0.4, +(escTit - 0.05).toFixed(2)) })}>A−</button>
                    <button type="button" className="h-6 px-2 text-[10px] font-bold rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors" onClick={() => patchTextoPlanta(idTit, { escala: Math.min(3.0, +(escTit + 0.05).toFixed(2)) })}>A+</button>
                    <button type="button" className="h-6 px-2 text-[10px] font-bold rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors" onClick={() => patchTextoPlanta(idTit, { escala: 1.0 })}>Reset</button>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cor do Cabeçalho dos Boxes</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={plantaConfig.corCabecalho || '#cbd5e1'}
                      onChange={(e) => setPlantaConfig((p: PlantaConfig) => ({ ...p, corCabecalho: e.target.value }))}
                      className="size-6 cursor-pointer border-none bg-transparent"
                    />
                    <input
                      type="text"
                      value={plantaConfig.corCabecalho || '#cbd5e1'}
                      onChange={(e) => setPlantaConfig((p: PlantaConfig) => ({ ...p, corCabecalho: e.target.value }))}
                      className="h-7 w-24 rounded border bg-background px-2 text-[10px] font-mono"
                    />
                  </div>
                </div>
              </div>
            );
          }

          if (tipoPlanta === 'declaracoes') {
            const idProp = 'carimbo.declProprietario';
            const ovProp = plantaConfig.textos?.[idProp] || {};
            const txtProp = ovProp.texto || 'Atestamos, sob as penas da lei, serem verdadeiras todas as informações apresentadas nesta planta...';
            const escProp = ovProp.escala ?? 1.0;
            const largProp = ovProp.larguraChars ?? 68;

            return (
              <div className="space-y-4">
                <div className="font-bold text-foreground mb-1 text-sm border-b pb-1">Declaração do Proprietário</div>
                
                {imovel && setImovel && (
                  <div className="space-y-3 border-b pb-3 mb-3 border-dashed">
                    <div className="font-bold text-foreground text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400">Qualificação do Proprietário</div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nome (ou De Cujus)</Label>
                      <input
                        type="text"
                        value={imovel.proprietario || ''}
                        onChange={(e) => setImovel((im) => ({ ...im, proprietario: e.target.value }))}
                        className="h-8 w-full rounded border bg-background px-2 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">CPF/CNPJ</Label>
                        <input
                          type="text"
                          value={imovel.cpfProprietario || ''}
                          onChange={(e) => setImovel((im) => ({ ...im, cpfProprietario: e.target.value }))}
                          className="h-8 w-full rounded border bg-background px-2 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tipo</Label>
                        <select
                          value={imovel.tipoPessoa || 'Física'}
                          onChange={(e) => setImovel((im) => ({ ...im, tipoPessoa: e.target.value as 'Física' | 'Jurídica' | 'Espólio' }))}
                          className="h-8 w-full rounded border bg-background px-2 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                        >
                          <option value="Física">Física</option>
                          <option value="Jurídica">Jurídica</option>
                          <option value="Espólio">Espólio</option>
                        </select>
                      </div>
                    </div>

                    {imovel.tipoPessoa === 'Espólio' && (
                      <div className="space-y-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2 mt-2">
                        <div className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400">Dados do Inventariante</div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nome do Inventariante</Label>
                          <input
                            type="text"
                            value={imovel.inventarianteNome ?? ''}
                            onChange={(e) => setImovel((im) => ({ ...im, inventarianteNome: e.target.value }))}
                            className="h-8 w-full rounded border bg-background px-2 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">CPF</Label>
                            <input
                              type="text"
                              value={imovel.inventarianteCpf ?? ''}
                              onChange={(e) => setImovel((im) => ({ ...im, inventarianteCpf: e.target.value }))}
                              className="h-8 w-full rounded border bg-background px-2 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">RG</Label>
                            <input
                              type="text"
                              value={imovel.inventarianteRg ?? ''}
                              onChange={(e) => setImovel((im) => ({ ...im, inventarianteRg: e.target.value }))}
                              className="h-8 w-full rounded border bg-background px-2 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Estado Civil</Label>
                            <input
                              type="text"
                              value={imovel.inventarianteEstadoCivil ?? ''}
                              onChange={(e) => setImovel((im) => ({ ...im, inventarianteEstadoCivil: e.target.value }))}
                              className="h-8 w-full rounded border bg-background px-2 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nacionalidade</Label>
                            <input
                              type="text"
                              value={imovel.inventarianteNacionalidade ?? ''}
                              onChange={(e) => setImovel((im) => ({ ...im, inventarianteNacionalidade: e.target.value }))}
                              className="h-8 w-full rounded border bg-background px-2 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Conteúdo do Texto</Label>
                  <textarea
                    value={txtProp}
                    onChange={(e) => patchTextoPlanta(idProp, { texto: e.target.value })}
                    className="w-full rounded border bg-background p-2 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none min-h-[85px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <div className="flex justify-between font-semibold text-muted-foreground text-[10px] uppercase">
                      <span>Escala</span>
                      <span>{escProp.toFixed(2)}x</span>
                    </div>
                    <div className="flex gap-1">
                      <button type="button" className="h-6 px-1.5 text-[10px] font-bold rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors" onClick={() => patchTextoPlanta(idProp, { escala: Math.max(0.4, +(escProp - 0.05).toFixed(2)) })}>−</button>
                      <button type="button" className="h-6 px-1.5 text-[10px] font-bold rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors" onClick={() => patchTextoPlanta(idProp, { escala: Math.min(2.5, +(escProp + 0.05).toFixed(2)) })}>+</button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between font-semibold text-muted-foreground text-[10px] uppercase">
                      <span>Largura</span>
                      <span>{largProp} ch</span>
                    </div>
                    <div className="flex gap-1">
                      <button type="button" className="h-6 px-1.5 text-[10px] font-bold rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors" onClick={() => patchTextoPlanta(idProp, { larguraChars: Math.max(30, largProp - 4) })}>−</button>
                      <button type="button" className="h-6 px-1.5 text-[10px] font-bold rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors" onClick={() => patchTextoPlanta(idProp, { larguraChars: Math.min(120, largProp + 4) })}>+</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          if (tipoPlanta === 'laudo') {
            const idLaudo = 'carimbo.laudoTécnico';
            const ovLaudo = plantaConfig.textos?.[idLaudo] || {};
            const txtLaudo = ovLaudo.texto || '';
            const escLaudo = ovLaudo.escala ?? 1.0;
            const largLaudo = ovLaudo.larguraChars ?? 68;

            return (
              <div className="space-y-4">
                <div className="font-bold text-foreground mb-1 text-sm border-b pb-1">Laudo Técnico</div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Conteúdo do Texto</Label>
                  <textarea
                    value={txtLaudo}
                    onChange={(e) => patchTextoPlanta(idLaudo, { texto: e.target.value })}
                    className="w-full rounded border bg-background p-2 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none min-h-[85px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <div className="flex justify-between font-semibold text-muted-foreground text-[10px] uppercase">
                      <span>Escala</span>
                      <span>{escLaudo.toFixed(2)}x</span>
                    </div>
                    <div className="flex gap-1">
                      <button type="button" className="h-6 px-1.5 text-[10px] font-bold rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors" onClick={() => patchTextoPlanta(idLaudo, { escala: Math.max(0.4, +(escLaudo - 0.05).toFixed(2)) })}>−</button>
                      <button type="button" className="h-6 px-1.5 text-[10px] font-bold rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors" onClick={() => patchTextoPlanta(idLaudo, { escala: Math.min(2.5, +(escLaudo + 0.05).toFixed(2)) })}>+</button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between font-semibold text-muted-foreground text-[10px] uppercase">
                      <span>Largura</span>
                      <span>{largLaudo} ch</span>
                    </div>
                    <div className="flex gap-1">
                      <button type="button" className="h-6 px-1.5 text-[10px] font-bold rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors" onClick={() => patchTextoPlanta(idLaudo, { larguraChars: Math.max(30, largLaudo - 4) })}>−</button>
                      <button type="button" className="h-6 px-1.5 text-[10px] font-bold rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors" onClick={() => patchTextoPlanta(idLaudo, { larguraChars: Math.min(120, largLaudo + 4) })}>+</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          if (tipoPlanta === 'confrontantes' || tipoPlanta === 'assinaturaConfrontante' || tipoPlanta === 'declConfrontantes') {
            const idConf = 'carimbo.declConfrontantes';
            const ovConf = plantaConfig.textos?.[idConf] || {};
            const txtConf = ovConf.texto || '';
            const escConf = ovConf.escala ?? 1.0;
            const largConf = ovConf.larguraChars ?? 68;
            const mostrarAssinaturas = plantaConfig.mostrarAssinaturaConfrontantes !== false;

            return (
              <div className="space-y-4">
                <div className="font-bold text-foreground mb-1 text-sm border-b pb-1">Confrontantes e Assinaturas</div>

                {/* Ocultar / Mostrar caixas de assinatura */}
                <label className="flex items-center gap-2 cursor-pointer py-1.5 border-b pb-2">
                  <input
                    type="checkbox"
                    checked={mostrarAssinaturas}
                    onChange={(e) => setPlantaConfig((p: PlantaConfig) => ({ ...p, mostrarAssinaturaConfrontantes: e.target.checked }))}
                    className="rounded border-zinc-300 text-primary focus:ring-primary size-4"
                  />
                  <span className="font-bold text-foreground">Exibir caixas de assinatura dos confrontantes</span>
                </label>

                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Texto de Declaração</Label>
                  <textarea
                    value={txtConf}
                    onChange={(e) => patchTextoPlanta(idConf, { texto: e.target.value })}
                    className="w-full rounded border bg-background p-2 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none min-h-[50px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <div className="flex justify-between font-semibold text-muted-foreground text-[10px] uppercase">
                      <span>Tamanho do Texto / Caixas</span>
                      <span>{escConf.toFixed(2)}x</span>
                    </div>
                    <div className="flex gap-1">
                      <button type="button" className="h-6 px-2 text-[10px] font-bold rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors" onClick={() => patchTextoPlanta(idConf, { escala: Math.max(0.4, +(escConf - 0.05).toFixed(2)) })}>A−</button>
                      <button type="button" className="h-6 px-2 text-[10px] font-bold rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors" onClick={() => patchTextoPlanta(idConf, { escala: Math.min(2.5, +(escConf + 0.05).toFixed(2)) })}>A+</button>
                      <button type="button" className="h-6 px-2 text-[10px] font-bold rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors" onClick={() => patchTextoPlanta(idConf, { escala: 1.0 })}>Reset</button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between font-semibold text-muted-foreground text-[10px] uppercase">
                      <span>Largura Máxima</span>
                      <span>{largConf} ch</span>
                    </div>
                    <div className="flex gap-1">
                      <button type="button" className="h-6 px-1.5 text-[10px] font-bold rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors" onClick={() => patchTextoPlanta(idConf, { larguraChars: Math.max(30, largConf - 4) })}>−</button>
                      <button type="button" className="h-6 px-1.5 text-[10px] font-bold rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors" onClick={() => patchTextoPlanta(idConf, { larguraChars: Math.min(120, largConf + 4) })}>+</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          if (tipoPlanta === 'empresa') {
            const idBloco = 'esc.bloco';
            const ovBloco = plantaConfig.textos?.[idBloco] || {};
            const txtBloco = ovBloco.texto || `${escritorio?.ramo ?? ''}\n${escritorio?.endereco ?? ''}\nTel./WhatsApp: ${escritorio?.telefone ?? ''}`;
            const escBloco = ovBloco.escala ?? 1.0;

            const idLogo = 'esc.logo';
            const ovLogo = plantaConfig.textos?.[idLogo] || {};
            const escLogo = ovLogo.escala ?? 1.0;

            return (
              <div className="space-y-4">
                <div className="font-bold text-foreground mb-1 text-sm border-b pb-1">Dados da Empresa & Logo</div>

                <div className="space-y-1">
                  <div className="flex justify-between font-semibold text-muted-foreground text-[10px] uppercase">
                    <span>Escala da Logomarca</span>
                    <span>{escLogo.toFixed(2)}x</span>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" className="h-6 px-2 text-[10px] font-bold rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors" onClick={() => patchTextoPlanta(idLogo, { escala: Math.max(0.4, +(escLogo - 0.05).toFixed(2)) })}>A−</button>
                    <button type="button" className="h-6 px-2 text-[10px] font-bold rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors" onClick={() => patchTextoPlanta(idLogo, { escala: Math.min(2.5, +(escLogo + 0.05).toFixed(2)) })}>A+</button>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Texto de Contato / Endereço</Label>
                  <textarea
                    value={txtBloco}
                    onChange={(e) => patchTextoPlanta(idBloco, { texto: e.target.value })}
                    className="w-full rounded border bg-background p-2 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none min-h-[70px]"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between font-semibold text-muted-foreground text-[10px] uppercase">
                    <span>Tamanho Fonte Contatos</span>
                    <span>{escBloco.toFixed(2)}x</span>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" className="h-6 px-2 text-[10px] font-bold rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors" onClick={() => patchTextoPlanta(idBloco, { escala: Math.max(0.4, +(escBloco - 0.05).toFixed(2)) })}>A−</button>
                    <button type="button" className="h-6 px-2 text-[10px] font-bold rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors" onClick={() => patchTextoPlanta(idBloco, { escala: Math.min(2.5, +(escBloco + 0.05).toFixed(2)) })}>A+</button>
                  </div>
                </div>
              </div>
            );
          }

          if (tipoPlanta === 'sigef') {
            return (
              <div className="space-y-4">
                <div className="font-bold text-foreground mb-1 text-sm border-b pb-1">Confrontantes do SIGEF</div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cor do Polígono SIGEF</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={plantaConfig.sigefCor || '#3b82f6'}
                      onChange={(e) => setPlantaConfig((p: PlantaConfig) => ({ ...p, sigefCor: e.target.value }))}
                      className="size-6 cursor-pointer border-none bg-transparent"
                    />
                    <input
                      type="text"
                      value={plantaConfig.sigefCor || '#3b82f6'}
                      onChange={(e) => setPlantaConfig((p: PlantaConfig) => ({ ...p, sigefCor: e.target.value }))}
                      className="h-7 w-24 rounded border bg-background px-2 text-[10px] font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between font-semibold text-muted-foreground text-[10px] uppercase">
                    <span>Espessura da Borda</span>
                    <span>{(plantaConfig.sigefEspessura ?? 1.5).toFixed(1)} px</span>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" className="h-6 px-2 text-[10px] font-bold rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors" onClick={() => setPlantaConfig((p: PlantaConfig) => ({ ...p, sigefEspessura: Math.max(0.5, (p.sigefEspessura ?? 1.5) - 0.5) }))}>-</button>
                    <button type="button" className="h-6 px-2 text-[10px] font-bold rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors" onClick={() => setPlantaConfig((p: PlantaConfig) => ({ ...p, sigefEspessura: Math.min(8.0, (p.sigefEspessura ?? 1.5) + 0.5) }))}>+</button>
                  </div>
                </div>
              </div>
            );
          }

          if (tipoPlanta === 'rosa') {
            const idRosa = 'planta.rosaDosVentos';
            const ovRosa = plantaConfig.textos?.[idRosa];
            const escRosa = ovRosa?.escala ?? 1.0;
            return (
              <div className="space-y-4">
                <div className="font-bold text-foreground mb-1 text-sm border-b pb-1">Rosa dos Ventos</div>
                <label className="flex items-center gap-2 cursor-pointer py-1">
                  <input type="checkbox" checked={plantaConfig.mostrarNortes !== false}
                    onChange={(e) => setPlantaConfig((p: PlantaConfig) => ({ ...p, mostrarNortes: e.target.checked }))}
                    className="rounded border-zinc-300 text-primary focus:ring-primary size-4" />
                  <span className="font-semibold text-foreground">Mostrar rosa dos ventos</span>
                </label>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Formato / Estilo</Label>
                  <select value={plantaConfig.estiloRosa ?? 0}
                    onChange={(e) => setPlantaConfig((p: PlantaConfig) => ({ ...p, estiloRosa: Number(e.target.value) }))}
                    className="h-8 w-full rounded border bg-background px-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none">
                    <option value={0}>Clássica Dupla</option>
                    <option value={1}>Estrela de 4 Pontas</option>
                    <option value={2}>Seta Minimalista</option>
                    <option value={3}>Anel Graduado</option>
                    <option value={4}>Bússola Vintage</option>
                    <option value={5}>Militar / Aeronáutico</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between font-semibold text-muted-foreground text-[10px] uppercase">
                    <span>Tamanho</span><span>{escRosa.toFixed(2)}x</span>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" className="h-6 px-2 text-[10px] font-bold rounded bg-secondary text-secondary-foreground hover:bg-secondary/80" onClick={() => patchTextoPlanta(idRosa, { escala: Math.max(0.4, +(escRosa - 0.05).toFixed(2)) })}>A−</button>
                    <button type="button" className="h-6 px-2 text-[10px] font-bold rounded bg-secondary text-secondary-foreground hover:bg-secondary/80" onClick={() => patchTextoPlanta(idRosa, { escala: Math.min(3.0, +(escRosa + 0.05).toFixed(2)) })}>A+</button>
                    <button type="button" className="h-6 px-2 text-[10px] font-bold rounded bg-secondary text-secondary-foreground hover:bg-secondary/80" onClick={() => patchTextoPlanta(idRosa, { escala: 1.0 })}>Reset</button>
                  </div>
                </div>
              </div>
            );
          }

          if (tipoPlanta === 'escala') {
            const idEscala = 'planta.escalaGrafica';
            const ovEscala = plantaConfig.textos?.[idEscala];
            const escEscala = ovEscala?.escala ?? 1.0;
            return (
              <div className="space-y-4">
                <div className="font-bold text-foreground mb-1 text-sm border-b pb-1">Barra de Escalas</div>
                <label className="flex items-center gap-2 cursor-pointer py-1">
                  <input type="checkbox" checked={plantaConfig.mostrarEscalaGrafica !== false}
                    onChange={(e) => setPlantaConfig((p: PlantaConfig) => ({ ...p, mostrarEscalaGrafica: e.target.checked }))}
                    className="rounded border-zinc-300 text-primary focus:ring-primary size-4" />
                  <span className="font-semibold text-foreground">Mostrar barra de escala</span>
                </label>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Formato / Estilo</Label>
                  <select value={plantaConfig.estiloEscala ?? 0}
                    onChange={(e) => setPlantaConfig((p: PlantaConfig) => ({ ...p, estiloEscala: Number(e.target.value) }))}
                    className="h-8 w-full rounded border bg-background px-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none">
                    <option value={0}>Alternada (Preto/Branco)</option>
                    <option value={1}>Dupla Alternada</option>
                    <option value={2}>Linha com Tiques</option>
                    <option value={3}>Barra Sólida</option>
                    <option value={4}>Moderna Fina</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between font-semibold text-muted-foreground text-[10px] uppercase">
                    <span>Tamanho</span><span>{escEscala.toFixed(2)}x</span>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" className="h-6 px-2 text-[10px] font-bold rounded bg-secondary text-secondary-foreground hover:bg-secondary/80" onClick={() => patchTextoPlanta(idEscala, { escala: Math.max(0.4, +(escEscala - 0.05).toFixed(2)) })}>A−</button>
                    <button type="button" className="h-6 px-2 text-[10px] font-bold rounded bg-secondary text-secondary-foreground hover:bg-secondary/80" onClick={() => patchTextoPlanta(idEscala, { escala: Math.min(3.0, +(escEscala + 0.05).toFixed(2)) })}>A+</button>
                    <button type="button" className="h-6 px-2 text-[10px] font-bold rounded bg-secondary text-secondary-foreground hover:bg-secondary/80" onClick={() => patchTextoPlanta(idEscala, { escala: 1.0 })}>Reset</button>
                  </div>
                </div>
              </div>
            );
          }

          if (tipoPlanta.startsWith('poligono_sigef')) {
            return (
              <div className="space-y-4">
                <div className="font-bold text-foreground mb-1 text-sm border-b pb-1">Polígono SIGEF Importado</div>
                <label className="flex items-center gap-2 cursor-pointer py-1">
                  <input type="checkbox" checked={plantaConfig.sigefOcultar !== true}
                    onChange={(e) => setPlantaConfig((p: PlantaConfig) => ({ ...p, sigefOcultar: !e.target.checked }))}
                    className="rounded border-zinc-300 text-primary focus:ring-primary size-4" />
                  <span className="text-sm font-medium">Mostrar polígono na planta</span>
                </label>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cor</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={plantaConfig.sigefCor || '#0284c7'}
                      onChange={(e) => setPlantaConfig((p: PlantaConfig) => ({ ...p, sigefCor: e.target.value }))}
                      className="size-6 cursor-pointer border-none bg-transparent" />
                    <input type="text" value={plantaConfig.sigefCor || '#0284c7'}
                      onChange={(e) => setPlantaConfig((p: PlantaConfig) => ({ ...p, sigefCor: e.target.value }))}
                      className="h-7 w-24 rounded border bg-background px-2 text-[10px] font-mono" />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between font-semibold text-muted-foreground text-[10px] uppercase">
                    <span>Espessura da Borda</span><span>{(plantaConfig.sigefEspessura ?? 0.7).toFixed(1)} px</span>
                  </div>
                  <input type="range" min="0.3" max="4.0" step="0.1"
                    value={plantaConfig.sigefEspessura ?? 0.7}
                    onChange={(e) => setPlantaConfig((p: PlantaConfig) => ({ ...p, sigefEspessura: Number(e.target.value) }))}
                    className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-primary" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between font-semibold text-muted-foreground text-[10px] uppercase">
                    <span>Opacidade do Preenchimento</span><span>{((plantaConfig.sigefOpacidade ?? 0.045) * 100).toFixed(0)}%</span>
                  </div>
                  <input type="range" min="0" max="0.3" step="0.005"
                    value={plantaConfig.sigefOpacidade ?? 0.045}
                    onChange={(e) => setPlantaConfig((p: PlantaConfig) => ({ ...p, sigefOpacidade: Number(e.target.value) }))}
                    className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-primary" />
                </div>
              </div>
            );
          }
          if (tipoPlanta === 'grade') {
            return (
              <div className="space-y-4">
                <div className="font-bold text-foreground mb-1 text-sm border-b pb-1">Configurações da Grade UTM</div>

                {/* Mostrar / Ocultar Grade */}
                <label className="flex items-center gap-2 cursor-pointer py-1">
                  <input type="checkbox" checked={plantaConfig.mostrarGrade !== false}
                    onChange={(e) => setPlantaConfig((p: PlantaConfig) => ({ ...p, mostrarGrade: e.target.checked }))}
                    className="rounded border-zinc-300 text-primary focus:ring-primary size-4" />
                  <span className="text-sm font-medium">Mostrar grade de coordenadas UTM</span>
                </label>

                {/* Espaçamento */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Espaçamento das linhas</label>
                  <div className="flex gap-2 flex-wrap">
                    {[['auto', 'Automático'], ['fine', 'Fino (100m)'], ['medium', 'Médio (500m)'], ['coarse', 'Espaçado (1000m)']].map(([val, label]) => (
                      <button key={val} type="button"
                        onClick={() => setPlantaConfig((p: PlantaConfig) => ({ ...p, gradeEspacamento: val as PlantaConfig['gradeEspacamento'] }))}
                        className={`px-3 py-1 rounded-md text-xs font-bold border transition-colors ${(plantaConfig.gradeEspacamento ?? 'auto') === val ? 'bg-primary text-primary-foreground border-transparent' : 'bg-background hover:bg-muted border-border'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cor das linhas */}
                <div className="flex items-center gap-3">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground shrink-0">Cor das linhas</label>
                  <input type="color"
                    value={plantaConfig.gradeCorLinha ?? '#8a94a6'}
                    onChange={(e) => setPlantaConfig((p: PlantaConfig) => ({ ...p, gradeCorLinha: e.target.value }))}
                    className="h-7 w-10 rounded border border-border cursor-pointer" />
                  <button type="button" onClick={() => setPlantaConfig((p: PlantaConfig) => ({ ...p, gradeCorLinha: undefined }))}
                    className="text-xs text-muted-foreground hover:text-foreground underline">Padrão</button>
                </div>

                {/* Rótulos */}
                <label className="flex items-center gap-2 cursor-pointer py-1">
                  <input type="checkbox" checked={plantaConfig.gradeMostrarRotulos !== false}
                    onChange={(e) => setPlantaConfig((p: PlantaConfig) => ({ ...p, gradeMostrarRotulos: e.target.checked }))}
                    className="rounded border-zinc-300 text-primary focus:ring-primary size-4" />
                  <span className="text-sm font-medium">Mostrar rótulos de coordenadas (E/N)</span>
                </label>

                <p className="text-[10px] text-muted-foreground bg-muted/40 p-2 rounded-lg">
                  A grade UTM mostra as linhas de coordenadas projetadas do sistema geodésico (SIRGAS 2000) na prancha. Duplo clique em qualquer linha ou rótulo de grade para abrir estas configurações.
                </p>
              </div>
            );
          }
          if (tipoPlanta === 'print3d') {
            const id3D = 'planta.print3d';
            const ov3D = plantaConfig.textos?.[id3D] || {};
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const esc3D = (ov3D as any).escala ?? 1.0;
            const temTerrap = plantaConfig.print3dVolumeCorte != null || plantaConfig.print3dVolumeAterro != null;
            return (
              <div className="space-y-4">
                <div className="font-bold text-foreground mb-1 text-sm border-b pb-1">Modelo de Relevo 3D (MDR)</div>

                {/* Mostrar / Ocultar */}
                <label className="flex items-center gap-2 cursor-pointer py-1">
                  <input type="checkbox" checked={plantaConfig.mostrarPrint3D !== false}
                    onChange={(e) => setPlantaConfig((p: PlantaConfig) => ({ ...p, mostrarPrint3D: e.target.checked }))}
                    className="rounded border-zinc-300 text-primary focus:ring-primary size-4" />
                  <span className="font-semibold text-foreground">Mostrar na planta</span>
                </label>

                {/* Dados de terraplanagem — só se houver dados */}
                {temTerrap && (
                  <label className="flex items-center gap-2 cursor-pointer py-1">
                    <input type="checkbox" checked={plantaConfig.print3dMostrarTerraplanagem !== false}
                      onChange={(e) => setPlantaConfig((p: PlantaConfig) => ({ ...p, print3dMostrarTerraplanagem: e.target.checked }))}
                      className="rounded border-zinc-300 text-primary focus:ring-primary size-4" />
                    <span className="font-semibold text-foreground">Exibir dados de terraplanagem</span>
                  </label>
                )}

                {/* Resumo dos dados de terraplanagem */}
                {temTerrap && (
                  <div className="rounded-lg bg-muted/40 border border-border p-2.5 space-y-1 text-[11px]">
                    {plantaConfig.print3dZRef != null && (
                      <div className="flex justify-between"><span className="text-muted-foreground">Platô</span><span className="font-mono font-bold">{plantaConfig.print3dZRef.toFixed(2)} m</span></div>
                    )}
                    {plantaConfig.print3dVolumeCorte != null && (
                      <div className="flex justify-between"><span className="text-red-600 font-bold">Corte</span><span className="font-mono font-bold">{plantaConfig.print3dVolumeCorte.toFixed(1)} m³</span></div>
                    )}
                    {plantaConfig.print3dVolumeAterro != null && (
                      <div className="flex justify-between"><span className="text-blue-600 font-bold">Aterro</span><span className="font-mono font-bold">{plantaConfig.print3dVolumeAterro.toFixed(1)} m³</span></div>
                    )}
                  </div>
                )}

                {/* Ajuste de Tamanho do MDR com botões + e - */}
                <div className="space-y-2 rounded-lg border bg-muted/30 p-2.5">
                  <div className="flex justify-between font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">
                    <span>Tamanho do MDR</span>
                    <span className="font-mono font-bold text-foreground">{(esc3D * 100).toFixed(0)}% ({esc3D.toFixed(2)}x)</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="size-8 font-extrabold text-sm shrink-0"
                      onClick={() => patchTextoPlanta(id3D, { escala: Math.max(0.3, +(esc3D - 0.1).toFixed(2)) })}
                      title="Diminuir tamanho do MDR (−)"
                    >
                      <Minus className="size-4" />
                    </Button>

                    <input
                      type="range"
                      min="0.3"
                      max="3.0"
                      step="0.05"
                      value={esc3D}
                      onChange={(e) => patchTextoPlanta(id3D, { escala: +Number(e.target.value).toFixed(2) })}
                      className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-primary"
                    />

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="size-8 font-extrabold text-sm shrink-0"
                      onClick={() => patchTextoPlanta(id3D, { escala: Math.min(3.0, +(esc3D + 0.1).toFixed(2)) })}
                      title="Aumentar tamanho do MDR (+)"
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      className="text-[10px] text-muted-foreground hover:text-foreground underline font-semibold"
                      onClick={() => patchTextoPlanta(id3D, { escala: 1.0 })}
                    >
                      Redefinir para 100%
                    </button>
                  </div>
                </div>

                {/* Apagar MDR (Lata de Lixo) */}
                {onRemoverPrint3D && (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="w-full font-bold text-xs gap-1.5 shadow-sm mt-2"
                    onClick={() => {
                      onRemoverPrint3D();
                      setObjPersonalizarId(null);
                      setObjetoSelId(null);
                    }}
                  >
                    <Trash2 className="size-4" /> Apagar MDR da Planta
                  </Button>
                )}
              </div>
            );
          }

          return null;
        }

        // Caso contrário, é um objeto de desenho livre
        const obj = objetos.find((o) => o.id === objPersonalizarId);
        if (!obj) return <div className="text-xs text-muted-foreground py-4 text-center">Elemento não encontrado ou removido.</div>;

        return (
          <div className="space-y-4 text-xs text-left">
            {/* Copiar e colar para objetos de desenho */}
            <div className="flex gap-1.5 border-b pb-3">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 font-semibold text-[10px]"
                onClick={() => {
                  setCopiaBuffer({ ...obj, id: '' });
                  aviso('Elemento copiado para a área de transferência fictícia.');
                }}
              >
                <Copy className="size-3 mr-1 text-blue-500" /> Copiar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 font-semibold text-[10px]"
                disabled={!copiaBuffer}
                onClick={() => {
                  if (!copiaBuffer) return;
                  const novoId = `desenho_${Date.now()}`;
                  const offset = 20;
                  const novoObj = { ...copiaBuffer, id: novoId };
                  if (novoObj.tipo === 'texto' || novoObj.tipo === 'simbolo') {
                    novoObj.x = (novoObj.x ?? 0) + offset;
                    novoObj.y = (novoObj.y ?? 0) + offset;
                  } else if (novoObj.tipo === 'cota') {
                    novoObj.xA = (novoObj.xA ?? 0) + offset;
                    novoObj.yA = (novoObj.yA ?? 0) + offset;
                    novoObj.xB = (novoObj.xB ?? 0) + offset;
                    novoObj.yB = (novoObj.yB ?? 0) + offset;
                  } else if (novoObj.tipo === 'polilinha') {
                    novoObj.pontos = (novoObj.pontos ?? []).map((p) => ({ ...p, leste: p.leste + offset, norte: p.norte + offset }));
                  }
                  setObjetos((os) => [...os, novoObj]);
                  setObjetoSelId(novoId);
                  setObjPersonalizarId(novoId);
                  aviso('Elemento colado com sucesso.');
                }}
              >
                <Plus className="size-3 mr-1 text-emerald-500" /> Colar
              </Button>
            </div>

            {/* Cor do Elemento */}
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cor do Elemento</Label>
              <div className="flex flex-wrap gap-1 mb-2">
                {[
                  { nome: 'Azul', hex: '#2563eb' },
                  { nome: 'Verde', hex: '#16a34a' },
                  { nome: 'Vermelho', hex: '#dc2626' },
                  { nome: 'Dourado', hex: '#d97706' },
                  { nome: 'Roxo', hex: '#7c3aed' },
                  { nome: 'Cinza', hex: '#4b5563' },
                  { nome: 'Branco', hex: '#ffffff' },
                  { nome: 'Preto', hex: '#000000' }
                ].map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => editarObjetoSel({ cor: c.hex })}
                    title={c.nome}
                    className={`size-6 rounded-md border border-zinc-200 dark:border-zinc-800 transition ${
                      obj.cor === c.hex ? 'ring-2 ring-amber-500 ring-offset-1 dark:ring-offset-zinc-950' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground font-semibold">Personalizada:</span>
                <input
                  type="color"
                  value={obj.cor && obj.cor.startsWith('#') && obj.cor.length === 7 ? obj.cor : '#2563eb'}
                  onChange={(e) => editarObjetoSel({ cor: e.target.value })}
                  className="size-6 cursor-pointer border-none bg-transparent"
                />
                <input
                  type="text"
                  value={obj.cor ?? ''}
                  placeholder="#2563eb"
                  onChange={(e) => editarObjetoSel({ cor: e.target.value })}
                  className="h-7 w-24 rounded border bg-background px-2 text-[10px] font-mono"
                />
              </div>
            </div>

            {/* Campos específicos por Tipo de Objeto */}
            {obj.tipo === 'texto' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Conteúdo do Texto</Label>
                  <textarea
                    value={obj.texto ?? ''}
                    onChange={(e) => editarObjetoSel({ texto: e.target.value })}
                    className="w-full rounded border bg-background p-2 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none min-h-[60px]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tamanho da Fonte (pt)</Label>
                    <input
                      type="number"
                      min="4"
                      max="120"
                      value={obj.tamanho ?? 12}
                      onChange={(e) => editarObjetoSel({ tamanho: Number(e.target.value) })}
                      className="h-8 w-full rounded border bg-background px-2 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Alinhamento</Label>
                    <select
                      value={obj.alinhamento ?? 'left'}
                      onChange={(e) => editarObjetoSel({ alinhamento: e.target.value as 'left' | 'center' | 'right' })}
                      className="h-8 w-full rounded border bg-background px-2 text-xs text-foreground bg-popover"
                    >
                      <option value="left">Esquerda</option>
                      <option value="center">Centro</option>
                      <option value="right">Direita</option>
                    </select>
                  </div>
                </div>
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={!!obj.negrito}
                    onChange={(e) => editarObjetoSel({ negrito: e.target.checked })}
                    className="rounded text-amber-500 focus:ring-amber-500"
                  />
                  <span className="font-bold text-foreground">Texto em Negrito</span>
                </label>
              </div>
            )}

            {obj.tipo === 'cota' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tamanho do Offset (m)</Label>
                    <input
                      type="number"
                      step="0.5"
                      value={obj.tamanho ?? 5}
                      onChange={(e) => editarObjetoSel({ tamanho: Number(e.target.value) })}
                      className="h-8 w-full rounded border bg-background px-2 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Espessura da Cota</Label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      max="10"
                      value={obj.espessura ?? 1.2}
                      onChange={(e) => editarObjetoSel({ espessura: Number(e.target.value) })}
                      className="h-8 w-full rounded border bg-background px-2 text-xs"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tamanho da Fonte (pt)</Label>
                    <input
                      type="number"
                      min="4"
                      max="72"
                      value={obj.tamanhoFonte ?? 10}
                      onChange={(e) => editarObjetoSel({ tamanhoFonte: Number(e.target.value) })}
                      className="h-8 w-full rounded border bg-background px-2 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Posição do Texto</Label>
                    <select
                      value={obj.posicaoTexto ?? 'acima'}
                      onChange={(e) => editarObjetoSel({ posicaoTexto: e.target.value })}
                      className="h-8 w-full rounded border bg-background px-2 text-xs text-foreground bg-popover"
                    >
                      <option value="acima">Acima da Linha</option>
                      <option value="centro">No Centro</option>
                      <option value="abaixo">Abaixo da Linha</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {obj.tipo === 'polilinha' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Espessura (px)</Label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="20"
                      value={obj.espessura ?? 1.5}
                      onChange={(e) => editarObjetoSel({ espessura: Number(e.target.value) })}
                      className="h-8 w-full rounded border bg-background px-2 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Estilo da Linha</Label>
                    <select
                      value={obj.estiloLinha ?? (obj.tracejado ? 'tracejado' : 'solido')}
                      onChange={(e) => {
                        const val = e.target.value;
                        editarObjetoSel({
                          estiloLinha: val,
                          tracejado: val === 'tracejado'
                        });
                      }}
                      className="h-8 w-full rounded border bg-background px-2 text-xs text-foreground bg-popover"
                    >
                      <option value="solido">Sólido</option>
                      <option value="tracejado">Tracejado</option>
                      <option value="pontilhado">Pontilhado</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Preenchimento Polígono</Label>
                    <select
                      value={obj.preenchido ? 'sim' : 'nao'}
                      onChange={(e) => editarObjetoSel({ preenchido: e.target.value === 'sim' })}
                      className="h-8 w-full rounded border bg-background px-2 text-xs text-foreground bg-popover"
                    >
                      <option value="nao">Sem Preenchimento</option>
                      <option value="sim">Preenchido</option>
                    </select>
                  </div>
                  {obj.preenchido && (
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Estilo Achura</Label>
                      <select
                        value={obj.achura ?? 'nenhuma'}
                        onChange={(e) => editarObjetoSel({ achura: e.target.value })}
                        className="h-8 w-full rounded border bg-background px-2 text-xs text-foreground bg-popover"
                      >
                        <option value="nenhuma">Cor Sólida</option>
                        <option value="linhas">Linhas Paralelas</option>
                        <option value="cruzado">Linhas Cruzadas</option>
                        <option value="pontos">Pontos Dispersos</option>
                      </select>
                    </div>
                  )}
                </div>

                {obj.preenchido && (
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cor do Preenchimento</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={obj.corPreenchimento ?? obj.cor ?? '#2563eb'}
                        onChange={(e) => editarObjetoSel({ corPreenchimento: e.target.value })}
                        className="size-6 cursor-pointer border-none bg-transparent"
                      />
                      <input
                        type="text"
                        value={obj.corPreenchimento ?? ''}
                        placeholder="#2563eb"
                        onChange={(e) => editarObjetoSel({ corPreenchimento: e.target.value })}
                        className="h-7 w-full rounded border bg-background px-2 text-[10px] font-mono"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Categoria CAR (Ambiental)</Label>
                  <select
                    value={obj.carTema ?? ''}
                    onChange={(e) => editarObjetoSel({ carTema: (e.target.value || undefined) as 'app' | 'reservaLegal' | 'vegetacao' | 'usoConsolidado' | undefined })}
                    className="h-8 w-full rounded border bg-background px-2 text-xs text-foreground bg-popover"
                  >
                    <option value="">Nenhuma (Desenho Livre)</option>
                    <option value="app">Preservação Permanente (APP)</option>
                    <option value="reservaLegal">Reserva Legal</option>
                    <option value="vegetacao">Uso Alternativo do Solo / Vegetação</option>
                    <option value="usoConsolidado">Área de Uso Consolidado</option>
                  </select>
                </div>
              </div>
            )}

            {obj.tipo === 'simbolo' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tipo de Símbolo</Label>
                    <select
                      value={obj.simbolo ?? 'arvore'}
                      onChange={(e) => editarObjetoSel({ simbolo: e.target.value })}
                      className="h-8 w-full rounded border bg-background px-2 text-xs text-foreground bg-popover"
                    >
                      <option value="arvore">Árvore</option>
                      <option value="arbusto">Arbusto</option>
                      <option value="casa">Construção / Casa</option>
                      <option value="poste">Poste de Energia</option>
                      <option value="pedra">Afloramento de Pedra</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tamanho (px)</Label>
                    <input
                      type="number"
                      min="10"
                      max="200"
                      value={obj.tamanho ?? 30}
                      onChange={(e) => editarObjetoSel({ tamanho: Number(e.target.value) })}
                      className="h-8 w-full rounded border bg-background px-2 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Ações */}
            <div className="flex gap-2 pt-2 border-t mt-4">
              <Button
                variant="destructive"
                className="flex-1 font-bold text-xs"
                onClick={() => {
                  apagarObjetoSel();
                  setObjPersonalizarId(null);
                }}
              >
                <Trash2 className="size-3.5 mr-1" /> Excluir Elemento
              </Button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
