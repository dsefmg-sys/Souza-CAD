'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Wand2 } from 'lucide-react';
import type { ImovelData } from '@/lib/topo/types';

// Cola-se um texto (matrícula, escritura, etc.), a IA (Gemini, no servidor) extrai os campos do
// imóvel/proprietário, o usuário CONFERE e ajusta, e só então aplica ao projeto. Nada é gravado
// sem revisão — a IA erra, então ela sugere, o profissional decide.

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onAplicar: (parcial: Partial<ImovelData>) => void;
}

const CAMPOS: { chave: string; rotulo: string }[] = [
  { chave: 'denominacao', rotulo: 'Denominação do imóvel' },
  { chave: 'matricula', rotulo: 'Matrícula' },
  { chave: 'cns', rotulo: 'Cartório (CNS)' },
  { chave: 'codigoImovelIncra', rotulo: 'Código do imóvel (INCRA)' },
  { chave: 'proprietario', rotulo: 'Proprietário' },
  { chave: 'cpfProprietario', rotulo: 'CPF do proprietário' },
  { chave: 'conjugeProprietario', rotulo: 'Cônjuge' },
  { chave: 'cpfConjugeProprietario', rotulo: 'CPF do cônjuge' },
  { chave: 'municipio', rotulo: 'Município' },
  { chave: 'areaAnteriorHa', rotulo: 'Área anterior (ha)' },
];

export default function ExtrairIaModal({ open, onOpenChange, onAplicar }: Props) {
  const [texto, setTexto] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [campos, setCampos] = useState<Record<string, string> | null>(null);

  async function extrair() {
    setErro(''); setCarregando(true); setCampos(null);
    try {
      const r = await fetch('/api/ia/extrair-imovel', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texto }),
      });
      const j = await r.json();
      if (!r.ok) { setErro(j.erro || 'A IA não conseguiu processar.'); return; }
      const d = (j.dados ?? {}) as Record<string, string>;
      // garante que todos os campos existam para edição
      const base: Record<string, string> = {};
      for (const c of CAMPOS) base[c.chave] = (d[c.chave] ?? '').toString();
      setCampos(base);
    } catch (e) { setErro('Falha de rede ao chamar a IA: ' + ((e as Error).message || 'erro')); }
    finally { setCarregando(false); }
  }

  function aplicar() {
    if (!campos) return;
    const { areaAnteriorHa, ...resto } = campos;
    const parcial: Partial<ImovelData> = {};
    // só aplica o que não está vazio, pra não apagar dado já preenchido no projeto
    for (const [k, v] of Object.entries(resto)) if (v.trim()) (parcial as Record<string, string>)[k] = v.trim();
    const areaNum = parseFloat((areaAnteriorHa || '').replace(',', '.'));
    if (Number.isFinite(areaNum) && areaNum > 0) parcial.areaAnterior = areaNum;
    onAplicar(parcial);
    onOpenChange(false);
    setTexto(''); setCampos(null);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="size-5 text-violet-500" /> Extrair dados com IA</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          Cole o texto da matrícula, escritura ou documento. A IA sugere os campos do imóvel — <strong>confira tudo</strong> antes de aplicar, porque ela pode errar.
        </p>

        <textarea
          className="min-h-[120px] w-full rounded border bg-background p-2 text-sm"
          placeholder="Cole aqui o texto do documento…"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />

        <div className="flex items-center gap-2">
          <Button size="sm" disabled={carregando || texto.trim().length < 10} onClick={extrair} className="gap-1">
            <Wand2 className="size-4" /> {carregando ? 'Lendo…' : 'Extrair dados'}
          </Button>
          {erro && <span className="text-xs text-red-600 dark:text-red-400">{erro}</span>}
        </div>

        {campos && (
          <div className="min-h-0 flex-1 overflow-y-auto rounded border p-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {CAMPOS.map((c) => (
                <label key={c.chave} className="space-y-0.5 text-xs">
                  <span className="font-medium text-muted-foreground">{c.rotulo}</span>
                  <input className="w-full rounded border bg-background px-2 py-1 text-sm"
                    value={campos[c.chave] ?? ''} onChange={(e) => setCampos((p) => ({ ...(p ?? {}), [c.chave]: e.target.value }))} />
                </label>
              ))}
            </div>
            <div className="mt-3 flex justify-end">
              <Button size="sm" onClick={aplicar}>Aplicar ao projeto</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
