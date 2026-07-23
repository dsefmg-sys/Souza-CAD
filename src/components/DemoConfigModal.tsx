'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Sparkles, Building2, Layers, MapPin, Video, ShieldCheck, FilePlus } from 'lucide-react';

interface DemoConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmar: (opts: { numImoveis: number; numGlebas: number; tipoGleba: 'rural' | 'loteamento' }) => void;
  onMascararProjetoAtual?: () => void;
}

export default function DemoConfigModal({ open, onOpenChange, onConfirmar, onMascararProjetoAtual }: DemoConfigModalProps) {
  const [modoDemo, setModoDemo] = useState<'novo' | 'mascarar'>('novo');
  const [numImoveis, setNumImoveis] = useState(1);
  const [numGlebas, setNumGlebas] = useState(3);
  const [tipoGleba, setTipoGleba] = useState<'rural' | 'loteamento'>('rural');

  const handleConfirmar = () => {
    if (modoDemo === 'mascarar' && onMascararProjetoAtual) {
      onMascararProjetoAtual();
      onOpenChange(false);
      return;
    }
    onConfirmar({
      numImoveis: Math.max(1, Math.min(10, numImoveis)),
      numGlebas: Math.max(1, Math.min(100, numGlebas)),
      tipoGleba,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 rounded-xl bg-background shadow-2xl border border-border">
        <DialogHeader className="border-b pb-3 mb-3">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
            <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-600 dark:text-amber-400">
              <Sparkles className="size-5" />
            </div>
            Opções de Demonstração &amp; Gravação
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Seletor de Modo */}
          <div className="grid grid-cols-2 gap-2 bg-muted/40 p-1 rounded-lg border">
            <button
              type="button"
              onClick={() => setModoDemo('novo')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-bold transition-all ${
                modoDemo === 'novo'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FilePlus className="size-3.5" /> Projeto do Zero
            </button>
            <button
              type="button"
              onClick={() => setModoDemo('mascarar')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-bold transition-all ${
                modoDemo === 'mascarar'
                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Video className="size-3.5 text-amber-500" /> Usar Projeto Atual
            </button>
          </div>

          {modoDemo === 'novo' ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Gera um novo projeto fictício completo para simulações, testes de desempenho e demonstração das ferramentas.
              </p>

              {/* Tipo de Imóvel */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Tipo de Projeto</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={tipoGleba === 'rural' ? 'default' : 'outline'}
                    className={`h-9 text-xs font-semibold justify-start px-3 gap-2 ${
                      tipoGleba === 'rural' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''
                    }`}
                    onClick={() => setTipoGleba('rural')}
                  >
                    <MapPin className="size-4 shrink-0" />
                    Rural (1 a 100 ha)
                  </Button>
                  <Button
                    type="button"
                    variant={tipoGleba === 'loteamento' ? 'default' : 'outline'}
                    className={`h-9 text-xs font-semibold justify-start px-3 gap-2 ${
                      tipoGleba === 'loteamento' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''
                    }`}
                    onClick={() => setTipoGleba('loteamento')}
                  >
                    <Building2 className="size-4 shrink-0" />
                    Loteamento (~200 m²)
                  </Button>
                </div>
              </div>

              {/* Quantidade de Imóveis */}
              <div className="space-y-1">
                <Label htmlFor="input-num-imoveis" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Building2 className="size-3.5 text-muted-foreground" />
                  Quantidade de Imóveis (Quadras)
                </Label>
                <Input
                  id="input-num-imoveis"
                  type="number"
                  min={1}
                  max={10}
                  value={numImoveis}
                  onChange={(e) => setNumImoveis(parseInt(e.target.value) || 1)}
                  className="h-8 text-xs font-medium"
                />
              </div>

              {/* Quantidade de Glebas */}
              <div className="space-y-1">
                <Label htmlFor="input-num-glebas" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Layers className="size-3.5 text-muted-foreground" />
                  {tipoGleba === 'loteamento' ? 'Lotes por Imóvel (Quadra)' : 'Glebas por Imóvel'}
                </Label>
                <Input
                  id="input-num-glebas"
                  type="number"
                  min={1}
                  max={50}
                  value={numGlebas}
                  onChange={(e) => setNumGlebas(parseInt(e.target.value) || 1)}
                  className="h-8 text-xs font-medium"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs">
              <div className="flex items-center gap-1.5 font-black text-amber-700 dark:text-amber-300 text-sm">
                <Video className="size-4 text-amber-500" />
                <span>Modo Gravação de Vídeos &amp; Aulas</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Utiliza a **geometria real do projeto atualmente aberto** (vértices, polígonos, altitudes e desenhos CAD), mas **substitui todos os dados pessoais** (nomes, CPFs, RGs, cartórios e matrículas) por dados fictícios.
              </p>
              <div className="p-2 bg-background/80 rounded border space-y-1 text-[11px]">
                <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="size-4 shrink-0" />
                  <span>Proteção Contra Sobrescrevimento</span>
                </div>
                <p className="text-muted-foreground">
                  Cria uma cópia independente com o nome <strong className="text-foreground">COPIA DADOS FICTICIOS - [Nome do Projeto]</strong>. Ao salvar, seu projeto original permanece **100% intacto**.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 pt-3 border-t border-border flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-8 text-xs font-bold">
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirmar}
            className="h-8 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
          >
            <Sparkles className="size-3.5" />
            {modoDemo === 'mascarar' ? 'Criar Cópia Fictícia para Vídeo' : 'Gerar Demo'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
