'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ListOrdered, Check, Sparkles } from 'lucide-react';
import type { Vertex, TecnicoData } from '@/lib/topo/types';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  vertices: Vertex[];
  onSalvarVertices: (novos: Vertex[]) => void;
  tecnico: TecnicoData | null;
}

export default function RenomearLoteModal({ open, onOpenChange, vertices, onSalvarVertices, tecnico }: Props) {
  const [prefixo, setPrefixo] = useState('');
  const [startM, setStartM] = useState(1);
  const [startP, setStartP] = useState(1);
  const [startV, setStartV] = useState(1);
  const [lista, setLista] = useState<{ id: string; nome: string; tipo: 'M' | 'P' | 'V'; codigoSigef: string }[]>([]);

  useEffect(() => {
    if (open) {
      setPrefixo(tecnico?.credenciamentoIncra || '');
      setLista(vertices.map(v => ({
        id: v.id,
        nome: v.nome,
        tipo: (v.tipo as 'M' | 'P' | 'V') || 'P',
        codigoSigef: v.codigoSigef || ''
      })));
    }
  }, [open, vertices, tecnico]);

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
    setLista(prev => prev.map(item => item.id === id ? { ...item, codigoSigef: novoCodigo } : item));
  };

  const handleSalvar = () => {
    const novosVertices = vertices.map(v => {
      const correspondente = lista.find(item => item.id === v.id);
      if (correspondente) {
        return {
          ...v,
          tipo: correspondente.tipo,
          codigoSigef: correspondente.codigoSigef.trim().toUpperCase(),
          isDivisa: correspondente.tipo === 'M' || v.isDivisa
        };
      }
      return v;
    });
    onSalvarVertices(novosVertices);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-5 rounded-2xl bg-background border border-border shadow-2xl overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/60">
          <DialogTitle className="text-base font-extrabold uppercase tracking-wide flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <ListOrdered className="size-5 text-indigo-500" />
            Renomeação de Vértices em Lote (SIGEF)
          </DialogTitle>
        </DialogHeader>

        {/* Painel superior de parametrização */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-muted/40 border border-border/60 text-xs my-2">
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase text-muted-foreground">Credenciamento INCRA</Label>
            <Input
              value={prefixo}
              onChange={(e) => setPrefixo(e.target.value)}
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
        <div className="flex items-center justify-between gap-3 text-xs p-2.5 rounded-lg border bg-indigo-500/5 border-indigo-500/10 my-1">
          <p className="text-[10.5px] text-muted-foreground leading-snug max-w-lg">
            Os vértices serão renomeados sequencialmente no <strong>sentido horário</strong>. Cada tipo de vértice segue sua própria numeração. Pressione <strong>Enter</strong> em um campo para ir para o próximo vértice.
          </p>
          <Button
            type="button"
            size="sm"
            onClick={handleAutopreencher}
            className="h-7 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shrink-0 flex items-center gap-1 text-[11px]"
          >
            <Sparkles className="size-3.5" /> Autopreencher Sequência
          </Button>
        </div>

        {/* Lista de Vértices */}
        <div className="flex-1 overflow-y-auto border rounded-xl my-2 p-1 bg-muted/10 scroll-fino">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead className="bg-muted sticky top-0 font-bold border-b text-[10px] uppercase text-muted-foreground z-10">
              <tr>
                <th className="p-2 text-center w-10">#</th>
                <th className="p-2 w-28">Vértice</th>
                <th className="p-2 w-36">Tipo</th>
                <th className="p-2">Código SIGEF</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((item, idx) => (
                <tr key={item.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                  <td className="p-2 text-center font-bold text-muted-foreground">{idx + 1}</td>
                  <td className="p-2 font-black text-foreground">{item.nome}</td>
                  <td className="p-2">
                    <select
                      value={item.tipo}
                      onChange={(e) => handleMudarTipo(item.id, e.target.value as 'M' | 'P' | 'V')}
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

        {/* Rodapé */}
        <div className="flex justify-between items-center pt-3 border-t border-border/60 bg-background mt-1">
          <span className="text-[10px] text-muted-foreground font-semibold">Preencha e salve para atualizar as peças técnicas.</span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} className="h-8 px-4 text-xs font-bold">
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
