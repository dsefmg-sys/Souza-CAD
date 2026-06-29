'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { X, Check } from 'lucide-react';

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

  // Quando muda o município, sugere o fuso padrão correspondente
  useEffect(() => {
    const found = MUNICIPIOS_PADRAO.find(
      (m) => m.nome.toLowerCase() === municipio.toLowerCase()
    );
    if (found) {
      setFuso(found.fuso);
    }
  }, [municipio]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({ numGlebas, municipio, fuso });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full"
        >
          <X className="size-4" />
        </Button>

        <header className="mb-4">
          <h2 className="text-lg font-bold text-foreground">Importar Arquivo TXT</h2>
          <p className="text-xs text-muted-foreground">
            Defina as opções geográficas e o número de parcelas para processar as coordenadas corretamente.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Município */}
          <div className="space-y-1">
            <Label htmlFor="import-municipio">Município do Imóvel</Label>
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
            {/* Fuso UTM */}
            <div className="space-y-1">
              <Label htmlFor="import-fuso">Fuso UTM (Zona)</Label>
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

            {/* Número de Glebas */}
            <div className="space-y-1">
              <Label htmlFor="import-glebas">Nº de Glebas a Criar</Label>
              <Input
                id="import-glebas"
                type="number"
                min={1}
                value={numGlebas}
                onChange={(e) => setNumGlebas(Math.max(1, Number(e.target.value) || 1))}
                className="h-9"
              />
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground border-t pt-2 mt-2">
            ℹ️ A seleção do município correto ajusta o fuso UTM e a projeção de forma que o imóvel caia na localização correta do mapa.
          </p>

          <footer className="flex items-center justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="gap-1.5 font-semibold">
              <Check className="size-4" /> Importar Arquivo
            </Button>
          </footer>
        </form>
      </div>
    </div>
  );
}
