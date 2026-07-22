'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ListOrdered, Check, Sparkles } from 'lucide-react';
import { confirmar } from '@/lib/ui/dialogos';
import type { Vertex, TecnicoData, Confrontante } from '@/lib/topo/types';
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { corDivisa, REPRES_LABEL } from '@/lib/topo/sigefVocab';
import { lerContadores } from '@/lib/store/registro';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  vertices: Vertex[];
  onSalvarVertices: (novos: Vertex[]) => void;
  tecnico: TecnicoData | null;
  confrontantes?: Confrontante[];
  confrontantePorLado?: Record<number, string>;
}

// Auxiliar para re-enquadrar o mapa ou focar no vértice em edição
function MapaController({
  pontos,
  destaquePt
}: {
  pontos: [number, number][];
  destaquePt: [number, number] | null;
}) {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        map.invalidateSize();
        if (destaquePt) {
          map.panTo(destaquePt);
          if (map.getZoom() < 16) {
            map.setZoom(17);
          }
        } else if (pontos.length >= 2) {
          const bounds = L.latLngBounds(pontos);
          if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [35, 35] });
          }
        }
      } catch (err) {
        console.warn('Erro ao atualizar visualização do mapa:', err);
      }
    }, 150);
    return () => clearTimeout(t);
  }, [pontos, destaquePt, map]);

  return null;
}

export default function RenomearLoteModal({
  open,
  onOpenChange,
  vertices,
  onSalvarVertices,
  tecnico,
  confrontantes = [],
  confrontantePorLado = {}
}: Props) {
  const handleOpenChange = async (val: boolean) => {
    if (!val) {
      const alterado = lista.some(item => {
        const original = vertices.find(v => v.id === item.id);
        if (!original) return true;
        if (item.tipo !== original.tipo) return true;
        if (item.codigoSigef !== (original.codigoSigef || '')) return true;
        return false;
      });

      if (alterado) {
        const ok = await confirmar({
          titulo: 'Descartar Alterações',
          mensagem: 'Você realizou edições ou preenchimentos nesta lista. Deseja realmente fechar e perder essas alterações?',
          okLabel: 'Descartar e fechar',
          perigo: true,
        });
        if (!ok) return;
      }
      onOpenChange(false);
    } else {
      onOpenChange(true);
    }
  };
  const [prefixo, setPrefixo] = useState('');
  const [startM, setStartM] = useState(1);
  const [startP, setStartP] = useState(1);
  const [startV, setStartV] = useState(1);
  const [lista, setLista] = useState<{ id: string; nome: string; tipo: 'M' | 'P' | 'V'; codigoSigef: string }[]>([]);
  const [focoIdx, setFocoIdx] = useState<number | null>(null);

  // Inicializa a lista e o prefixo
  useEffect(() => {
    if (open) {
      const pref = (tecnico?.credenciamentoIncra || '').toUpperCase();
      setPrefixo(pref);
      setLista(vertices.map(v => ({
        id: v.id,
        nome: v.codigoSigef || v.nome,
        tipo: (v.tipo as 'M' | 'P' | 'V') || 'P',
        codigoSigef: (v.codigoSigef || '').toUpperCase()
      })));
    }
  }, [open, vertices, tecnico]);

  // Carrega os contadores com base no prefixo INCRA do banco de pontos
  useEffect(() => {
    if (open && prefixo.trim() && tecnico) {
      const pref = prefixo.trim().toUpperCase();
      lerContadores(pref, tecnico)
        .then(c => {
          if (c) {
            setStartM(c.M || 1);
            setStartP(c.P || 1);
            setStartV(c.V || 1);
          }
        })
        .catch(err => {
          console.warn('Erro ao carregar contadores do banco de pontos:', err);
        });
    }
  }, [open, prefixo, tecnico]);

  const handleAutopreencher = () => {
    let countM = startM;
    let countP = startP;
    let countV = startV;
    const pref = prefixo.trim().toUpperCase();

    const novaLista = lista.map(item => {
      let num = 0;
      if (item.tipo === 'M') {
        num = countM++;
      } else if (item.tipo === 'P') {
        num = countP++;
      } else {
        num = countV++;
      }
      const codigo = pref
        ? `${pref}-${item.tipo}-${String(num).padStart(4, '0')}`
        : `${item.tipo}-${String(num).padStart(4, '0')}`;
      
      return { ...item, codigoSigef: codigo };
    });
    setLista(novaLista);
  };

  const handleMudarTipo = (id: string, novoTipo: 'M' | 'P' | 'V') => {
    setLista(prev => prev.map(item => item.id === id ? { ...item, tipo: novoTipo } : item));
  };

  const handleMudarCodigo = (id: string, novoCodigo: string) => {
    setLista(prev => prev.map(item => item.id === id ? { ...item, codigoSigef: novoCodigo.toUpperCase() } : item));
  };

  const handleSalvar = () => {
    const novosVertices = vertices.map(v => {
      const correspondente = lista.find(item => item.id === v.id);
      if (correspondente) {
        const cod = correspondente.codigoSigef.trim().toUpperCase();
        return {
          ...v,
          tipo: correspondente.tipo,
          codigoSigef: cod,
          nome: cod,
          codigoCampo: cod,
          isDivisa: correspondente.tipo === 'M' || v.isDivisa
        };
      }
      return v;
    });
    onSalvarVertices(novosVertices);
    onOpenChange(false);
  };

  // Filtra vértices com coordenadas válidas para exibir no mapa
  const validos = vertices.filter(v => Number.isFinite(v.lat) && Number.isFinite(v.lon));
  const pontosLatLon = validos.map(v => [v.lat, v.lon] as [number, number]);
  const centro: [number, number] = pontosLatLon.length > 0 ? pontosLatLon[0] : [-20.6506, -41.9094];

  const destaquePt = focoIdx !== null && validos[focoIdx]
    ? [validos[focoIdx].lat, validos[focoIdx].lon] as [number, number]
    : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl lg:max-w-6xl w-[94vw] max-h-[92vh] flex flex-col p-5 rounded-2xl bg-background border border-border shadow-2xl overflow-hidden" onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/60">
          <DialogTitle className="text-base font-extrabold uppercase tracking-wide flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <ListOrdered className="size-5 text-indigo-500" />
            Renomeação de Vértices em Lote (SIGEF)
          </DialogTitle>
        </DialogHeader>

        {/* Layout Grid: Esquerda Tabela, Direita Mapa */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-hidden min-h-0 py-3">
          
          {/* Coluna Esquerda: Parâmetros e Tabela de Vértices */}
          <div className="flex flex-col overflow-hidden min-h-0">
            {/* Painel superior de parametrização */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-muted/40 border border-border/60 text-xs mb-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Credenciamento INCRA</Label>
                <Input
                  value={prefixo}
                  onChange={(e) => setPrefixo(e.target.value.toUpperCase())}
                  placeholder="Ex: COIN"
                  className="h-8 text-xs font-mono font-bold uppercase"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Início Marcos (M)</Label>
                <Input
                  type="number"
                  min={1}
                  value={startM}
                  onChange={(e) => setStartM(Math.max(1, Number(e.target.value) || 1))}
                  className="h-8 text-xs font-mono font-bold"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Início Pontos (P)</Label>
                <Input
                  type="number"
                  min={1}
                  value={startP}
                  onChange={(e) => setStartP(Math.max(1, Number(e.target.value) || 1))}
                  className="h-8 text-xs font-mono font-bold"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Início Virtuais (V)</Label>
                <Input
                  type="number"
                  min={1}
                  value={startV}
                  onChange={(e) => setStartV(Math.max(1, Number(e.target.value) || 1))}
                  className="h-8 text-xs font-mono font-bold"
                />
              </div>
            </div>

            {/* Instruções e Ação Automática */}
            <div className="flex items-center justify-between gap-3 text-xs p-2.5 rounded-lg border bg-indigo-500/5 border-indigo-500/10 mb-3">
              <p className="text-[10.5px] text-muted-foreground leading-snug max-w-[280px] lg:max-w-[340px]">
                Os vértices serão renomeados em <strong>sentido horário</strong>. Pressione <strong>Enter</strong> no código para ir para o próximo.
              </p>
              <Button
                type="button"
                size="sm"
                onClick={handleAutopreencher}
                className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shrink-0 flex items-center gap-1 text-[11px]"
              >
                <Sparkles className="size-3.5" /> Autopreencher
              </Button>
            </div>

            {/* Lista de Vértices */}
            <div className="flex-1 overflow-y-auto border rounded-xl p-1 bg-muted/10 scroll-fino min-h-0">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead className="bg-muted sticky top-0 font-bold border-b text-[10px] uppercase text-muted-foreground z-10">
                  <tr>
                    <th className="p-2 text-center w-10">#</th>
                    <th className="p-2 w-28">Vértice</th>
                    <th className="p-2 w-32">Tipo</th>
                    <th className="p-2">Código SIGEF</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((item, idx) => (
                    <tr
                      key={item.id}
                      className={`border-b last:border-0 hover:bg-muted/40 transition-colors ${focoIdx === idx ? 'bg-indigo-500/5 border-l-2 border-l-indigo-500' : ''}`}
                    >
                      <td className="p-2 text-center font-bold text-muted-foreground">{idx + 1}</td>
                      <td className="p-2 font-black text-foreground">{item.nome}</td>
                      <td className="p-2">
                        <select
                          value={item.tipo}
                          onChange={(e) => handleMudarTipo(item.id, e.target.value as 'M' | 'P' | 'V')}
                          onFocus={() => setFocoIdx(idx)}
                          className="h-7 rounded border bg-background px-2 text-xs font-bold focus:ring-1 focus:ring-primary focus:outline-none w-full"
                        >
                          <option value="P">Ponto (P)</option>
                          <option value="M">Marco (M)</option>
                          <option value="V">Virtual (V)</option>
                        </select>
                      </td>
                      <td className="p-2">
                        <Input
                          id={`input-renomear-${idx}`}
                          value={item.codigoSigef}
                          onChange={(e) => handleMudarCodigo(item.id, e.target.value)}
                          onFocus={() => setFocoIdx(idx)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const nextInput = document.getElementById(`input-renomear-${idx + 1}`);
                              if (nextInput) {
                                (nextInput as HTMLInputElement).focus();
                                (nextInput as HTMLInputElement).select();
                              }
                            }
                          }}
                          className="h-7 text-xs font-mono font-bold uppercase w-full bg-background"
                          placeholder="ex.: COIN-P-0001"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Coluna Direita: Prévia do Mapa Interativo */}
          <div className="flex flex-col h-full border border-border/80 rounded-xl overflow-hidden bg-slate-950 min-h-[300px] md:min-h-0 relative">
            <div className="absolute top-2.5 left-2.5 z-[1000] bg-slate-900/90 border border-slate-700/60 text-[10px] text-slate-300 font-bold px-2 py-1 rounded shadow-lg uppercase select-none pointer-events-none">
              Prévia do Perímetro, Divisas e Confrontantes
            </div>

            <MapContainer
              center={centro}
              zoom={15}
              maxZoom={22}
              scrollWheelZoom
              style={{ height: '100%', width: '100%', background: '#090d16' }}
            >
              <TileLayer
                attribution="Google Satélite"
                url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                maxZoom={22}
                maxNativeZoom={20}
                subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
              />

              {/* Linhas de divisas coloridas com tooltips de confrontantes */}
              {validos.length >= 2 && validos.map((v, i) => {
                const vProx = validos[(i + 1) % validos.length];
                const positions: [number, number][] = [
                  [v.lat, v.lon],
                  [vProx.lat, vProx.lon]
                ];
                
                const cor = corDivisa(v.representacao) || '#3b82f6';
                const dash = v.representacao === 'linha-ideal' ? '4 4' : undefined;
                
                // Mapeia confrontante por lado
                const indexLado = v.ordem ?? i;
                const confId = confrontantePorLado[indexLado];
                const conf = confrontantes.find(c => c.id === confId);
                const labelDivisa = REPRES_LABEL[v.representacao || 'linha-ideal'];
                const textTooltip = conf 
                  ? `${labelDivisa} · Confrontante: ${conf.nome}`
                  : `${labelDivisa} · Sem confrontante definido`;

                return (
                  <Polyline
                    key={`line-rename-${v.id}-${vProx.id}`}
                    positions={positions}
                    pathOptions={{ color: cor, weight: 3, dashArray: dash }}
                  >
                    <Tooltip sticky>{textTooltip}</Tooltip>
                  </Polyline>
                );
              })}

              {/* Vértices marcados */}
              {validos.map((v, idx) => {
                const isDestaque = focoIdx === idx;
                const correspondente = lista.find(item => item.id === v.id);
                const tipo = correspondente?.tipo || v.tipo || 'P';
                const codLabel = correspondente?.codigoSigef || v.codigoSigef || v.nome;

                // Verde para Marco, Azul para Ponto, Roxo para Virtual e Laranja para destaque
                const cor = isDestaque 
                  ? '#f59e0b' 
                  : tipo === 'M' 
                    ? '#10b981' 
                    : tipo === 'V' 
                      ? '#a855f7' 
                      : '#3b82f6';

                return (
                  <CircleMarker
                    key={`pt-rename-${v.id}`}
                    center={[v.lat, v.lon]}
                    radius={isDestaque ? 8 : 4.5}
                    pathOptions={{
                      color: cor,
                      fillColor: isDestaque ? '#fde047' : '#fff',
                      fillOpacity: 1,
                      weight: isDestaque ? 3 : 1.5
                    }}
                    eventHandlers={{
                      click: () => {
                        setFocoIdx(idx);
                        const input = document.getElementById(`input-renomear-${idx}`);
                        if (input) {
                          (input as HTMLInputElement).focus();
                          (input as HTMLInputElement).select();
                        }
                      }
                    }}
                  >
                    <Tooltip permanent={isDestaque} direction="top" offset={[0, -6]}>
                      <span className="font-bold text-[10px]">
                        {v.nome} {codLabel ? `(${codLabel})` : ''}
                      </span>
                    </Tooltip>
                  </CircleMarker>
                );
              })}

              <MapaController pontos={pontosLatLon} destaquePt={destaquePt} />
            </MapContainer>
          </div>

        </div>

        {/* Rodapé */}
        <div className="flex justify-between items-center pt-3 border-t border-border/60 bg-background mt-1">
          <span className="text-[10px] text-muted-foreground font-semibold">Preencha e salve para atualizar as peças técnicas.</span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)} className="h-8 px-4 text-xs font-bold">
              Cancelar
            </Button>
            <Button type="button" onClick={handleSalvar} className="h-8 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1">
              <Check className="size-3.5" /> Salvar Alterações
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
