'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Sparkles, Building2, Layers, MapPin } from 'lucide-react';

interface DemoConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmar: (opts: { numImoveis: number; numGlebas: number; tipoGleba: 'rural' | 'loteamento' }) => void;
}

export default function DemoConfigModal({ open, onOpenChange, onConfirmar }: DemoConfigModalProps) {
  const [numImoveis, setNumImoveis] = useState(1);
  const [numGlebas, setNumGlebas] = useState(3);
  const [tipoGleba, setTipoGleba] = useState<'rural' | 'loteamento'>('rural');

  const handleConfirmar = () => {
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
        <DialogHeader className="border-b pb-3 mb-4">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
            <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-600 dark:text-amber-400">
              <Sparkles className="size-5" />
            </div>
            Gerar Projeto de Demonstração
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Configure as características do projeto fictício a ser gerado para testes de desempenho, simulações e demonstração do sistema.
          </p>

          <div className="space-y-3">
            {/* Tipo de Imóvel */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Tipo de Projeto</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={tipoGleba === 'rural' ? 'default' : 'outline'}
                  className={`h-9 text-xs font-semibold justify-start px-3 gap-2 ${tipoGleba === 'rural' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}`}
                  onClick={() => setTipoGleba('rural')}
                >
                  <MapPin className="size-4 shrink-0" />
                  Rural (1 a 100 ha)
                </Button>
                <Button
                  type="button"
                  variant={tipoGleba === 'loteamento' ? 'default' : 'outline'}
                  className={`h-9 text-xs font-semibold justify-start px-3 gap-2 ${tipoGleba === 'loteamento' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}`}
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
              <span className="text-[9px] text-muted-foreground">Cada imóvel pode possuir múltiplos lotes ou glebas.</span>
            </div>

            {/* Quantidade de Glebas/Lotes por Imóvel */}
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
              <span className="text-[9px] text-muted-foreground">
                {tipoGleba === 'loteamento'
                  ? 'Gera lotes retangulares sequenciais simulando um loteamento.'
                  : 'Gera polígonos rurais adjacentes com limites compartilhados.'}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-border flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-8 text-xs font-bold"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirmar}
            className="h-8 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
          >
            <Sparkles className="size-3.5" />
            Gerar Demo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
