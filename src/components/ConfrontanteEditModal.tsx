'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import type { Confrontante, CondicaoConfrontante } from '@/lib/topo/types';
import { linhasRotuloConfrontante } from '@/lib/topo/rotuloConfrontante';
import { cpfOuCnpjValido, formatarCpfCnpj } from '@/lib/topo/validation';

interface Props {
  open: boolean;
  confrontante: Confrontante | null;
  onSalvar: (c: Confrontante) => void;
  onOpenChange: (o: boolean) => void;
}

function Campo({ label, value, onChange, ph, aviso }: { label: string; value: string; onChange: (v: string) => void; ph?: string; aviso?: string }) {
  const formatado = /cpf|cnpj/i.test(label) ? formatarCpfCnpj(value) : value;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    if (/cpf|cnpj/i.test(label)) {
      onChange(formatarCpfCnpj(rawVal));
    } else {
      onChange(rawVal);
    }
  };

  return (
    <label className="flex flex-col gap-0.5 text-xs">
      <span className="font-semibold text-muted-foreground">{label}</span>
      <input className="h-8 rounded-sm border bg-background px-2 text-sm" value={formatado} placeholder={ph} onChange={handleChange} />
      {aviso && <span className="mt-0.5 block font-medium text-amber-500">{aviso}</span>}
    </label>
  );
}

export default function ConfrontanteEditModal({ open, confrontante, onSalvar, onOpenChange }: Props) {
  const [c, setC] = useState<Confrontante | null>(confrontante);
  useEffect(() => { setC(confrontante); }, [confrontante]);
  if (!c) return null;

  const cond: CondicaoConfrontante = c.condicao ?? 'proprietario';
  const set = (patch: Partial<Confrontante>) => setC({ ...c, ...patch });
  const linhas = linhasRotuloConfrontante(c);

  const avisoDoc = (v: string) => (v?.trim() && !cpfOuCnpjValido(v) ? 'CPF/CNPJ inválido (dígitos verificadores incorretos).' : undefined);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Users className="size-5 text-primary" /> Editar confrontante</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">Edite os dados; a prévia mostra exatamente como o rótulo vai aparecer na planta.</p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* formulário */}
          <div className="space-y-2">
            <label className="flex flex-col gap-0.5 text-xs">
              <span className="font-semibold text-muted-foreground">Condição</span>
              <select className="h-8 rounded-sm border bg-background px-2 text-sm" value={cond} onChange={(e) => set({ condicao: e.target.value as CondicaoConfrontante })}>
                <option value="proprietario">Proprietário(a)</option>
                <option value="condomino">Condômino / coproprietário</option>
                <option value="usufrutuario">Usufrutuário (assina com nu-proprietário)</option>
                <option value="posseiro">Possuidor(a) / posseiro</option>
                <option value="espolio">Espólio</option>
                <option value="publico">Bem público (estrada, rio... não assina)</option>
              </select>
            </label>
            <Campo label="Nome" value={c.nome} onChange={(v) => set({ nome: v })} ph={cond === 'publico' ? 'Ex.: Estrada Municipal, Rio das Pedras' : 'Nome do confrontante'} />
            {cond !== 'publico' && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Campo label="CPF/CNPJ" value={c.cpf} onChange={(v) => set({ cpf: v })} aviso={avisoDoc(c.cpf)} />
                  {cond !== 'posseiro' && <Campo label="Matrícula" value={c.matricula} onChange={(v) => set({ matricula: v })} />}
                </div>
                {cond === 'usufrutuario' && (
                  <div className="grid grid-cols-2 gap-2">
                    <Campo label="Nu-proprietário (assina junto)" value={c.nuProprietarioNome ?? ''} onChange={(v) => set({ nuProprietarioNome: v })} />
                    <Campo label="CPF do nu-proprietário" value={c.nuProprietarioCpf ?? ''} onChange={(v) => set({ nuProprietarioCpf: v })} aviso={avisoDoc(c.nuProprietarioCpf ?? '')} />
                  </div>
                )}
                {cond === 'espolio' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Campo label="Inventariante" value={c.inventarianteNome ?? ''} onChange={(v) => set({ inventarianteNome: v })} />
                    <Campo label="CPF do inventariante" value={c.inventarianteCpf ?? ''} onChange={(v) => set({ inventarianteCpf: v })} aviso={avisoDoc(c.inventarianteCpf ?? '')} />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Campo label="Cônjuge" value={c.conjugeNome ?? ''} onChange={(v) => set({ conjugeNome: v })} />
                    <Campo label="CPF do cônjuge" value={c.conjugeCpf ?? ''} onChange={(v) => set({ conjugeCpf: v })} aviso={avisoDoc(c.conjugeCpf ?? '')} />
                  </div>
                )}
                <Campo label="Cartório (CNS)" value={c.cns} onChange={(v) => set({ cns: v })} />
              </>
            )}
          </div>

          {/* prévia do rótulo */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Prévia do rótulo na planta</span>
            <div className="flex min-h-[120px] items-center justify-center rounded-lg border bg-muted/30 p-4">
              <div className="rounded-sm border border-neutral-300 bg-white px-4 pb-2 pt-1 text-center text-[13px] text-black shadow-sm">
                <div className="mx-auto mb-1 h-px w-40 bg-black" />
                {linhas.map((l, i) => <div key={i} className="leading-snug">{l}</div>)}
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">{cond === 'publico' ? 'Bem público não assina — sem espaço de firma.' : 'A linha de cima é o espaço da assinatura do anuente.'}</p>
          </div>
        </div>

        <footer className="flex justify-end gap-2 border-t pt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => { onSalvar(c); onOpenChange(false); }}>Salvar</Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
