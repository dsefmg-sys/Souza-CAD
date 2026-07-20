'use client';

import { useEffect, useState } from 'react';
import { saveAs } from 'file-saver';
import { FileWarning, Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { confirmar } from '@/lib/ui/dialogos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ImovelData, TecnicoData, Confrontante, CorrecaoErrata, NaturezaCorrecao } from '@/lib/topo/types';
import { compatibilizarWord2007 } from '@/lib/export/compatWord2007';
import { carregarPadroes } from '@/lib/store/padroes';
import { obterComarca } from '@/lib/topo/municipios';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  imovel: ImovelData;
  tecnico: TecnicoData | null;
  confrontantes: Confrontante[];
  areaHa: number;
  correcoes: CorrecaoErrata[];
  onChangeCorrecoes: React.Dispatch<React.SetStateAction<CorrecaoErrata[]>>;
  onBaixar?: () => void;
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
function dataExtensoHoje(d = new Date()): string {
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

export default function ErrataModal({ open, onOpenChange, imovel, tecnico, confrontantes, areaHa, correcoes, onChangeCorrecoes, onBaixar }: Props) {
  const [acrescimoRT, setAcrescimoRT] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (open) {
      if (!correcoes || correcoes.length === 0) {
        onChangeCorrecoes([{ onde: '', constava: '', passa: '', natureza: 'imovel' }]);
      }
      setAcrescimoRT('');
      setMsg('');
    }
  }, [open]);

  const setCorrecoes = onChangeCorrecoes;

  // Atalhos de "onde" mais comuns, no formato dos modelos ("Confrontante X" + "Matrícula nº ...").
  const sugestoes: { rotulo: string; onde: string; constava: string; natureza: NaturezaCorrecao }[] = [
    { rotulo: 'Matrícula', onde: 'Matrícula do imóvel', constava: imovel.matricula ? `Matrícula nº ${imovel.matricula}` : '', natureza: 'imovel' },
    { rotulo: 'Denominação', onde: 'Denominação do imóvel', constava: imovel.denominacao || '', natureza: 'imovel' },
    { rotulo: 'Proprietário', onde: 'Nome do proprietário', constava: imovel.proprietario || '', natureza: 'pessoais' },
    ...confrontantes.filter((c) => c.nome).map((c) => ({
      rotulo: `Confront. ${c.nome}`, onde: `Confrontante ${c.nome}`, constava: c.matricula ? `Matrícula nº ${c.matricula}` : '', natureza: 'confrontantes' as NaturezaCorrecao,
    })),
  ];

  function setCor(i: number, patch: Partial<CorrecaoErrata>) {
    setCorrecoes((cs) => cs.map((c, k) => (k === i ? { ...c, ...patch } : c)));
  }
  function addCor(base?: Partial<CorrecaoErrata>) { setCorrecoes((cs) => [...cs, { onde: '', constava: '', passa: '', natureza: 'imovel', ...base }]); }
  async function handleCloseRequest() {
    const mudouRT = acrescimoRT.trim() !== '';
    const mudouCorrecoes = (correcoes || []).some(
      (c) => c.onde.trim() !== '' || c.constava.trim() !== '' || c.passa.trim() !== ''
    ) || (correcoes && correcoes.length > 1);

    if (mudouRT || mudouCorrecoes) {
      const ok = await confirmar({
        titulo: 'Fechar errata',
        mensagem: 'Você preencheu dados na errata. Deseja realmente fechar e perder as informações digitadas?',
        okLabel: 'Descartar e fechar',
        perigo: true,
      });
      if (!ok) return;
    }
    onOpenChange(false);
  }

  function rmCor(i: number) { setCorrecoes((cs) => cs.filter((_, k) => k !== i)); }

  async function gerar() {
    if (!tecnico) { setMsg('Configure o responsável técnico primeiro.'); return; }
    const validas = correcoes.filter((c) => c.onde.trim() && c.passa.trim());
    if (!validas.length) { setMsg('Preencha ao menos uma correção (onde e o valor correto).'); return; }
    const padroes = carregarPadroes();
    const comarca = obterComarca(imovel, padroes.comarcaPadrao);
    try {
      const response = await fetch('/api/export/errata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imovel,
          tecnico,
          correcoes: validas,
          areaHa,
          acrescimoRT,
          dataExtenso: dataExtensoHoje(),
          comarca
        })
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.erro || 'Falha ao gerar errata no servidor.');
      }
      const blobBruto = await response.blob();
      const blob = await compatibilizarWord2007(blobBruto);
      saveAs(blob, `Errata - ${imovel.denominacao || 'imovel'}.docx`);
      setMsg('Errata gerada.');
      onBaixar?.();
    } catch (e: unknown) {
      console.error(e);
      setMsg((e as Error).message || 'Erro ao gerar errata.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleCloseRequest(); else onOpenChange(val); }}>
      <DialogContent className="flex max-h-[85vh] max-w-4xl flex-col bg-background border border-border text-foreground rounded-2xl p-4 md:p-6 shadow-2xl" onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="shrink-0 pb-2 border-b border-border/60">
          <DialogTitle className="flex items-center gap-2.5 text-lg font-black text-foreground">
            <FileWarning className="size-5.5 text-amber-500 animate-pulse" /> Errata para o Cartório
          </DialogTitle>
        </DialogHeader>
        
        <p className="text-xs md:text-sm text-muted-foreground shrink-0 leading-relaxed pt-2">
          Defina as correções necessárias para o processo de retificação de área. A errata será gerada em formato Word (.docx), pronta para protocolo, contendo a justificativa e o campo de assinatura do responsável técnico.
        </p>

        {/* Área Central Rolável */}
        <div className="flex-grow overflow-y-auto space-y-4 pr-1 my-2">
          {/* Duas colunas para atalhos e acréscimo RT */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0 mt-1">
            {/* Atalhos de Sugestões (Esquerda) */}
            <div className="space-y-2 rounded-xl border border-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-950/10 p-3.5 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider block mb-2">Atalhos de preenchimento rápido:</span>
                <div className="flex flex-wrap gap-1.5">
                  {sugestoes.map((s, i) => (
                    <Button key={i} size="sm" type="button" variant="secondary" className="h-8 text-xs px-2.5 font-semibold bg-white hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-border/60 transition-all text-foreground"
                      onClick={() => addCor({ onde: s.onde, constava: s.constava, natureza: s.natureza })} title={`Adicionar correção de ${s.onde}`}>
                      <Plus className="size-3.5 mr-0.5" /> {s.rotulo}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Acréscimo RT (Direita) */}
            <div className="space-y-2 rounded-xl border border-amber-500/20 bg-amber-50/30 dark:bg-amber-950/10 p-3.5 flex flex-col justify-center">
              <Label className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block leading-none mb-1">Responsabilidade Técnica Adicional (Opcional)</Label>
              <Input value={acrescimoRT} onChange={(e) => setAcrescimoRT(e.target.value)}
                placeholder="Ex.: Número do CFT/TRT ou CREA/ART" className="h-10 text-sm bg-background border-border/80 focus:ring-1 focus:ring-primary outline-none" />
            </div>
          </div>

          {/* Lista de Correções */}
          <div className="space-y-3 rounded-xl border border-border/80 bg-zinc-50/30 dark:bg-zinc-900/10 p-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-2 mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-foreground">Itens de Correção</span>
              <Button size="sm" type="button" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 text-xs px-3 gap-1 transition-all" onClick={() => addCor()}><Plus className="size-4" /> Adicionar Correção</Button>
            </div>
            
            <div className="space-y-3 divide-y divide-border/40">
              {correcoes.map((c, i) => (
                <div key={i} className="flex items-end gap-3 pt-3 first:pt-0">
                  <div className="flex-grow grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="space-y-1.5 text-left">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground leading-none">Natureza</Label>
                      <select
                        value={c.natureza || 'outros'}
                        onChange={(e) => setCor(i, { natureza: e.target.value as NaturezaCorrecao })}
                        className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-0 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                      >
                        <option value="imovel">Dados Imóvel</option>
                        <option value="pessoais">Dados Pessoais</option>
                        <option value="confrontantes">Confrontante / Registro</option>
                        <option value="geometria">Geometria (Coord/Az/Dist)</option>
                        <option value="outros">Outras</option>
                      </select>
                    </div>
                    <div className="space-y-1.5 text-left">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground leading-none">Onde está o erro</Label>
                      <Input value={c.onde} onChange={(e) => setCor(i, { onde: e.target.value })} placeholder="ex.: Confrontante João" className="h-10 text-sm bg-background border-border/80 focus:ring-1 focus:ring-primary outline-none" />
                    </div>
                    <div className="space-y-1.5 text-left">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground leading-none">Onde se lê (errado)</Label>
                      <Input value={c.constava} onChange={(e) => setCor(i, { constava: e.target.value })} placeholder="ex.: Matrícula 3383" className="h-10 text-sm bg-background border-border/80 focus:ring-1 focus:ring-primary outline-none" />
                    </div>
                    <div className="space-y-1.5 text-left">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground leading-none">Leia-se (correto)</Label>
                      <Input value={c.passa} onChange={(e) => setCor(i, { passa: e.target.value })} placeholder="ex.: Matrícula 5378" className="h-10 text-sm bg-background border-border/80 focus:ring-1 focus:ring-primary outline-none" />
                    </div>
                  </div>
                  <Button size="sm" type="button" variant="ghost" className="h-10 w-10 p-0 shrink-0 hover:bg-destructive/10 rounded-lg transition-colors" onClick={() => rmCor(i)} title="Remover"><Trash2 className="size-4.5 text-destructive" /></Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Rodapé Fixo */}
        <div className="flex items-center justify-between border-t border-border/60 pt-4 mt-auto shrink-0">
          <Button onClick={gerar} size="sm" className="h-11 px-5 text-xs font-black uppercase tracking-wider bg-amber-600 hover:bg-amber-700 text-white border-none transition-colors shadow-md hover:shadow-lg">
            <FileWarning className="size-4.5 mr-1.5" /> Gerar Documento Errata (.docx)
          </Button>
          {msg && (
            <span className={`text-xs md:text-sm font-bold bg-[#07170d]/10 border border-border/80 px-3.5 py-1.5 rounded-lg ${
              msg.includes('Erro') || msg.includes('primeiro') || msg.includes('Preencha') 
                ? 'text-red-600 dark:text-red-400 border-red-500/20 bg-red-500/5' 
                : 'text-emerald-600 dark:text-emerald-400 border-emerald-500/20 bg-emerald-500/5'
            }`}>
              {msg}
            </span>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
