'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import type { Confrontante, CondicaoConfrontante, CartorioCad } from '@/lib/topo/types';
import { linhasRotuloConfrontante } from '@/lib/topo/rotuloConfrontante';
import { cpfOuCnpjValido, formatarCpfCnpj } from '@/lib/topo/validation';

interface Props {
  open: boolean;
  confrontante: Confrontante | null;
  onSalvar: (c: Confrontante) => void;
  onOpenChange: (o: boolean) => void;
  sugCartorios?: CartorioCad[];
}

function Campo({ label, value, onChange, ph, aviso, list }: { label: string; value: string; onChange: (v: string) => void; ph?: string; aviso?: string; list?: string }) {
  const formatado = /cpf|cnpj/i.test(label) ? formatarCpfCnpj(value) : value;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    if (/cpf|cnpj/i.test(label)) {
      onChange(formatarCpfCnpj(rawVal));
    } else {
      onChange(rawVal.toUpperCase());
    }
  };

  return (
    <label className="flex flex-col gap-0.5 text-xs">
      <span className="font-semibold text-muted-foreground">{label}</span>
      <input list={list} className="h-8 rounded-sm border bg-background px-2 text-sm" value={formatado} placeholder={ph} onChange={handleChange} />
      {aviso && <span className="mt-0.5 block font-medium text-amber-500">{aviso}</span>}
    </label>
  );
}

export default function ConfrontanteEditModal({ open, confrontante, onSalvar, onOpenChange, sugCartorios = [] }: Props) {
  const [c, setC] = useState<Confrontante | null>(confrontante);
  useEffect(() => { setC(confrontante); }, [confrontante]);
  if (!c) return null;

  const cond: CondicaoConfrontante = c.condicao ?? 'proprietario';
  const set = (patch: Partial<Confrontante>) => setC({ ...c, ...patch });
  const linhas = linhasRotuloConfrontante(c);

  const avisoDoc = (v: string) => (v?.trim() && !cpfOuCnpjValido(v) ? 'CPF/CNPJ inválido (dígitos verificadores incorretos).' : undefined);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-background shadow-2xl p-6 rounded-xl overflow-hidden">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg font-black text-foreground">
            <Users className="size-5 text-primary" /> Editar Confrontante
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">Edite os dados cadastrais do confrontante; a prévia à direita mostra exatamente como o rótulo será impresso na planta final.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch my-2">
          {/* Formulário (Esquerda) */}
          <div className="border-l-4 border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/10 p-4 rounded-r-xl space-y-3.5 flex flex-col justify-start">
            <div className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400 mb-1">Dados de Qualificação</div>
            
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-bold text-muted-foreground">Condição Jurídica</span>
              <select className="h-9 rounded-lg border bg-background px-3 text-sm focus:ring-1 focus:ring-primary outline-none" value={cond} onChange={(e) => set({ condicao: e.target.value as CondicaoConfrontante })}>
                <option value="proprietario">Proprietário(a)</option>
                <option value="condomino">Condômino / coproprietário</option>
                <option value="usufrutuario">Usufrutuário (assina com nu-proprietário)</option>
                <option value="posseiro">Possuidor(a) / posseiro</option>
                <option value="espolio">Espólio</option>
                <option value="publico">Bem público (estrada, rio... não assina)</option>
              </select>
            </label>
            
            <Campo label="Nome ou Denominação" value={c.nome} onChange={(v) => set({ nome: v })} ph={cond === 'publico' ? 'Ex.: Estrada Municipal, Rio das Pedras' : 'Nome do confrontante'} />
            
            {cond !== 'publico' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Campo label="CPF / CNPJ" value={c.cpf} onChange={(v) => set({ cpf: v })} aviso={avisoDoc(c.cpf)} />
                  <Campo label="Estado Civil" value={c.estadoCivil ?? ''} onChange={(v) => set({ estadoCivil: v })} ph="Ex: Casado(a)" />
                </div>
                {cond !== 'posseiro' && (
                  <div className="grid grid-cols-1 gap-3">
                    <Campo label="Matrícula de Origem" value={c.matricula} onChange={(v) => set({ matricula: v })} />
                  </div>
                )}
                {cond === 'usufrutuario' && (
                  <div className="grid grid-cols-2 gap-3">
                    <Campo label="Nu-proprietário" value={c.nuProprietarioNome ?? ''} onChange={(v) => set({ nuProprietarioNome: v })} />
                    <Campo label="CPF do nu-proprietário" value={c.nuProprietarioCpf ?? ''} onChange={(v) => set({ nuProprietarioCpf: v })} aviso={avisoDoc(c.nuProprietarioCpf ?? '')} />
                  </div>
                )}
                {cond === 'espolio' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <Campo label="Inventariante" value={c.inventarianteNome ?? ''} onChange={(v) => set({ inventarianteNome: v })} />
                    <Campo label="CPF do inventariante" value={c.inventarianteCpf ?? ''} onChange={(v) => set({ inventarianteCpf: v })} aviso={avisoDoc(c.inventarianteCpf ?? '')} />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <Campo label="Nome do Cônjuge" value={c.conjugeNome ?? ''} onChange={(v) => set({ conjugeNome: v })} />
                    <Campo label="CPF do Cônjuge" value={c.conjugeCpf ?? ''} onChange={(v) => set({ conjugeCpf: v })} aviso={avisoDoc(c.conjugeCpf ?? '')} />
                  </div>
                )}
                <div className="space-y-1">
                  <Campo label="Código do Cartório (CNS)" value={c.cns} onChange={(v) => set({ cns: v })} list="lista-cns-modal" />
                  {(() => {
                    const cart = sugCartorios.find(x => x.cns === c.cns);
                    return cart ? (
                      <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 leading-tight">
                        {cart.municipio ? `${cart.municipio} - ` : ''}{cart.nome}
                      </p>
                    ) : null;
                  })()}
                </div>
                <datalist id="lista-cns-modal">
                  {sugCartorios.map((x) => (
                    <option key={x.id} value={x.cns}>
                      {x.municipio ? `${x.municipio} - ` : ''}{x.nome}
                    </option>
                  ))}
                </datalist>
              </>
            )}

            {/* Divisa e Limite (Para ODS e Memorial) */}
            <div className="border-t pt-3.5 space-y-3">
              <div className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400 mb-1">Dados da Divisa / Limite</div>
              
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-xs">
                  <span className="font-bold text-muted-foreground">Tipo de Limite (SIGEF)</span>
                  <select 
                    className="h-8 rounded-md border bg-background px-2 text-sm focus:ring-1 focus:ring-primary outline-none" 
                    value={c.tipoLimite || ''} 
                    onChange={(e) => {
                      const val = e.target.value;
                      set({ 
                        tipoLimite: val || undefined, 
                        // Limpa direção do rio se não for mais limite natural LN
                        direcaoRio: val.startsWith('LN') ? (c.direcaoRio || 'jusante') : undefined 
                      });
                    }}
                  >
                    <option value="">Padrão (LA6 - Linha Ideal)</option>
                    <option value="LA1">Cerca (LA1)</option>
                    <option value="LA2">Muro (LA2)</option>
                    <option value="LA3">Vala (LA3)</option>
                    <option value="LA4">Cachoeira / Escarpa (LA4)</option>
                    <option value="LA5">Linha de Cumeada (LA5)</option>
                    <option value="LA6">Linha Ideal (LA6)</option>
                    <option value="LN1">Curso d'água / Rio (LN1)</option>
                    <option value="LN2">Canal / Valão Natural (LN2)</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-xs">
                  <span className="font-bold text-muted-foreground">Faixa de Domínio / Largura (m)</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ex: 15,00"
                    className="h-8 rounded-sm border bg-background px-2 text-sm"
                    value={c.larguraFaixa ?? ''}
                    onChange={(e) => set({ larguraFaixa: e.target.value ? Number(e.target.value) : undefined })}
                  />
                </label>
              </div>

              {c.tipoLimite?.startsWith('LN') && (
                <label className="flex flex-col gap-1 text-xs">
                  <span className="font-bold text-muted-foreground">Direção do Rio (Fluxo)</span>
                  <select 
                    className="h-8 rounded-md border bg-background px-2 text-sm focus:ring-1 focus:ring-primary outline-none" 
                    value={c.direcaoRio || 'jusante'} 
                    onChange={(e) => set({ direcaoRio: e.target.value as 'jusante' | 'montante' })}
                  >
                    <option value="jusante">Jusante (sentido da correnteza)</option>
                    <option value="montante">Montante (sentido contrário à correnteza)</option>
                  </select>
                </label>
              )}
            </div>
          </div>

          {/* Prévia do Rótulo na Planta (Direita) */}
          <div className="border-l-4 border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/10 p-4 rounded-r-xl flex flex-col justify-between">
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-2">Visualização na Planta</div>
              <p className="text-[11px] text-muted-foreground mb-4">Veja como este confrontante será renderizado no rodapé da prancha:</p>
              
              <div className="flex items-center justify-center p-4 bg-zinc-100/50 dark:bg-zinc-950/40 rounded-xl border border-dashed border-border/80 min-h-[160px]">
                <div className="rounded-lg border border-neutral-300 bg-white px-6 pb-3 pt-2 text-center text-[12px] text-black shadow-lg w-full max-w-[280px]">
                  {cond !== 'publico' && <div className="mx-auto mb-2.5 h-[1px] w-full bg-neutral-400" />}
                  {(() => {
                    const matLine = linhas.find((l) => /^Matr[íi]cula/i.test(l));
                    const rest = linhas.filter((l) => l !== matLine);
                    return (
                      <div className="space-y-0.5">
                        {matLine && <div className="leading-tight font-extrabold text-neutral-800">{matLine}</div>}
                        {rest.map((l, idx) => <div key={idx} className="leading-tight text-neutral-700">{l}</div>)}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
            
            <p className="text-[10px] text-muted-foreground mt-3 font-medium">
              {cond === 'publico' 
                ? 'Bem público não gera linha para assinatura nem termo de anuência.' 
                : 'A linha horizontal indica onde o confrontante assinará a planta.'}
            </p>
          </div>
        </div>

        <footer className="flex justify-end gap-2 border-t pt-4 shrink-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-foreground font-semibold px-4">
            Cancelar
          </Button>
          <Button onClick={() => { onSalvar(c); onOpenChange(false); }} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5">
            Salvar Alterações
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
