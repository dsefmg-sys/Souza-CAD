'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Check, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { numGlebas: number; municipio: string; fuso: number }) => void;
}

const MUNICIPIOS_PADRAO = [
  { nome: 'Espera Feliz-MG', fuso: 23 },
  { nome: 'Caiana-MG', fuso: 23 },
  { nome: 'Caparaó-MG', fuso: 23 },
  { nome: 'Alto Caparaó-MG', fuso: 23 },
  { nome: 'Dores do Rio Preto-ES', fuso: 23 },
  { nome: 'Guaçuí-ES', fuso: 24 },
  { nome: 'Ibitirama-ES', fuso: 24 },
  { nome: 'Carangola-MG', fuso: 23 },
  { nome: 'Divino-MG', fuso: 23 },
  { nome: 'Tombos-MG', fuso: 23 },
  { nome: 'Manhumirim-MG', fuso: 23 },
  { nome: 'Manhuaçu-MG', fuso: 23 },
  { nome: 'Fervedouro-MG', fuso: 23 },
];

export default function ModalImport({ isOpen, onClose, onConfirm }: Props) {
  const [municipio, setMunicipio] = useState('Espera Feliz-MG');
  const [fuso, setFuso] = useState(23);
  const [numGlebas, setNumGlebas] = useState(1);

  useEffect(() => {
    const found = MUNICIPIOS_PADRAO.find(
      (m) => m.nome.toLowerCase() === municipio.toLowerCase()
    );
    if (found) {
      setFuso(found.fuso);
    }
  }, [municipio]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({ numGlebas, municipio, fuso });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md bg-background/95 backdrop-blur-md border border-border shadow-2xl p-6 rounded-lg text-foreground">
        <DialogHeader className="border-b pb-2">
          <DialogTitle className="text-lg font-bold">Importar Arquivo TXT</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Defina as opções geográficas e o número de parcelas para processar as coordenadas corretamente.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label htmlFor="import-municipio" className="text-xs font-semibold">Município do Imóvel</Label>
            <select
              id="import-municipio"
              value={municipio}
              onChange={(e) => setMunicipio(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {MUNICIPIOS_PADRAO.map((m) => (
                <option key={m.nome} value={m.nome}>
                  {m.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="import-fuso" className="text-xs font-semibold">Fuso UTM (Zona)</Label>
              <select
                id="import-fuso"
                value={fuso}
                onChange={(e) => setFuso(Number(e.target.value))}
                className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value={22}>Fuso 22 (51° W)</option>
                <option value={23}>Fuso 23 (45° W)</option>
                <option value={24}>Fuso 24 (39° W)</option>
                <option value={25}>Fuso 25 (33° W)</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="import-glebas" className="text-xs font-semibold">Nº de Parcelas / Glebas</Label>
              <Input
                id="import-glebas"
                type="number"
                min={1}
                value={numGlebas}
                onChange={(e) => setNumGlebas(Math.max(1, Number(e.target.value) || 1))}
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="p-2.5 rounded bg-muted/40 text-[11px] leading-tight text-muted-foreground border flex items-start gap-1.5">
            <Info className="size-4 text-primary shrink-0 mt-0.5" />
            <span>A seleção do município ajuda a refinar a detecção automática do fuso UTM base para a conversão correta de coordenadas planorretangulares.</span>
          </div>

          <footer className="flex items-center justify-between border-t pt-4 mt-2">
            <span className="text-[10px] text-muted-foreground">Pressione <kbd className="font-bold">ESC</kbd> para fechar</span>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose} className="font-semibold">
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="bg-primary text-primary-foreground font-semibold gap-1">
                <Check className="size-4" /> Avançar
              </Button>
            </div>
          </footer>
        </form>
      </DialogContent>
    </Dialog>
  );
}
