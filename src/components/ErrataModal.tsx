'use client';

import { useEffect, useState } from 'react';
import { saveAs } from 'file-saver';
import { FileWarning, Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ImovelData, TecnicoData, Confrontante } from '@/lib/topo/types';
import { gerarErrataDocx, type CorrecaoErrata } from '@/lib/export/errata';
import { compatibilizarWord2007 } from '@/lib/export/compatWord2007';
import { carregarPadroes } from '@/lib/store/padroes';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  imovel: ImovelData;
  tecnico: TecnicoData | null;
  confrontantes: Confrontante[];
  areaHa: number;
  onBaixar?: () => void;
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
function dataExtensoHoje(d = new Date()): string {
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

export default function ErrataModal({ open, onOpenChange, imovel, tecnico, confrontantes, areaHa, onBaixar }: Props) {
  const [correcoes, setCorrecoes] = useState<CorrecaoErrata[]>([{ onde: '', constava: '', passa: '' }]);
  const [acrescimoRT, setAcrescimoRT] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => { if (open) { setCorrecoes([{ onde: '', constava: '', passa: '' }]); setAcrescimoRT(''); setMsg(''); } }, [open]);

  // Atalhos de "onde" mais comuns, no formato dos modelos ("Confrontante X" + "Matrícula nº ...").
  const sugestoes: { rotulo: string; onde: string; constava: string }[] = [
    { rotulo: 'Matrícula', onde: 'Matrícula do imóvel', constava: imovel.matricula ? `Matrícula nº ${imovel.matricula}` : '' },
    { rotulo: 'Denominação', onde: 'Denominação do imóvel', constava: imovel.denominacao || '' },
    { rotulo: 'Proprietário', onde: 'Nome do proprietário', constava: imovel.proprietario || '' },
    ...confrontantes.filter((c) => c.nome).map((c) => ({
      rotulo: `Confront. ${c.nome}`, onde: `Confrontante ${c.nome}`, constava: c.matricula ? `Matrícula nº ${c.matricula}` : '',
    })),
  ];

  function setCor(i: number, patch: Partial<CorrecaoErrata>) {
    setCorrecoes((cs) => cs.map((c, k) => (k === i ? { ...c, ...patch } : c)));
  }
  function addCor(base?: Partial<CorrecaoErrata>) { setCorrecoes((cs) => [...cs, { onde: '', constava: '', passa: '', ...base }]); }
  function rmCor(i: number) { setCorrecoes((cs) => cs.filter((_, k) => k !== i)); }

  async function gerar() {
    if (!tecnico) { setMsg('Configure o responsável técnico primeiro.'); return; }
    const validas = correcoes.filter((c) => c.onde.trim() && c.passa.trim());
    if (!validas.length) { setMsg('Preencha ao menos uma correção (onde e o valor correto).'); return; }
    const padroes = carregarPadroes();
    const comarca = padroes.comarcaPadrao || imovel.municipio || '—';
    const blobBruto = await gerarErrataDocx({ imovel, tecnico, correcoes: validas, areaHa, acrescimoRT, dataExtenso: dataExtensoHoje(), comarca });
    const blob = await compatibilizarWord2007(blobBruto);
    saveAs(blob, `Errata - ${imovel.denominacao || 'imovel'}.docx`);
    setMsg('Errata gerada.');
    onBaixar?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col p-5">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-sm font-bold uppercase tracking-wider">Errata para o cartório</DialogTitle>
        </DialogHeader>
        
        <p className="text-[11px] text-muted-foreground shrink-0 leading-normal">
          Liste o que precisa ser corrigido. Para cada item, diga onde está o erro, o que constava e o
          que passa a constar. A errata sai pronta, já explicando ao cartório e com a linha de assinatura
          do responsável técnico.
        </p>

        {/* Área Central Rolável */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 my-1">
          {/* Duas colunas para atalhos e acréscimo RT para economizar espaço vertical */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
            {/* Atalhos de Sugestões */}
            <div className="space-y-1 rounded-lg border p-2 bg-muted/5 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Atalhos de preenchimento:</span>
                <div className="flex flex-wrap gap-1">
                  {sugestoes.map((s, i) => (
                    <Button key={i} size="sm" type="button" variant="outline" className="h-6 text-[10px] px-1.5 py-0"
                      onClick={() => addCor({ onde: s.onde, constava: s.constava })} title={`Adicionar correção de ${s.onde}`}>
                      <Plus className="size-2.5 mr-0.5" /> {s.rotulo}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Acréscimo RT */}
            <div className="space-y-1 rounded-lg border p-2 bg-muted/5 flex flex-col justify-center">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block leading-none mb-1">Acréscimo de Responsabilidade Técnica (opcional)</Label>
              <Input value={acrescimoRT} onChange={(e) => setAcrescimoRT(e.target.value)}
                placeholder="ex.: Número CFT/TRT 2605638774" className="h-7 text-xs" />
            </div>
          </div>

          {/* Lista de Correções */}
          <div className="space-y-2 rounded-lg border bg-muted/10 p-2.5">
            <div className="flex items-center justify-between border-b pb-1 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Itens de Correção</span>
              <Button size="sm" type="button" variant="outline" className="h-6 text-[10px] px-2 py-0" onClick={() => addCor()}><Plus className="size-2.5 mr-0.5" /> Adicionar correção</Button>
            </div>
            
            <div className="space-y-2 divide-y divide-border/60">
              {correcoes.map((c, i) => (
                <div key={i} className="flex items-end gap-2 pt-2 first:pt-0">
                  <div className="flex-grow grid grid-cols-3 gap-2">
                    <div className="space-y-0.5">
                      <Label className="text-[9px] text-muted-foreground font-semibold leading-none">Onde está o erro</Label>
                      <Input value={c.onde} onChange={(e) => setCor(i, { onde: e.target.value })} placeholder="ex.: Confrontante João" className="h-7 text-xs" />
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-[9px] text-muted-foreground font-semibold leading-none">Onde se lê (errado)</Label>
                      <Input value={c.constava} onChange={(e) => setCor(i, { constava: e.target.value })} placeholder="ex.: Matrícula 3383" className="h-7 text-xs" />
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-[9px] text-muted-foreground font-semibold leading-none">Leia-se (correto)</Label>
                      <Input value={c.passa} onChange={(e) => setCor(i, { passa: e.target.value })} placeholder="ex.: Matrícula 5378" className="h-7 text-xs" />
                    </div>
                  </div>
                  <Button size="sm" type="button" variant="ghost" className="h-7 w-7 p-0 shrink-0 hover:bg-destructive/10" onClick={() => rmCor(i)} title="Remover"><Trash2 className="size-3 text-destructive" /></Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Rodapé Fixo */}
        <div className="flex items-center justify-between border-t pt-2 mt-auto shrink-0">
          <Button onClick={gerar} size="sm"><FileWarning className="size-4 mr-1.5" /> Gerar errata (.docx)</Button>
          {msg && <span className="text-xs text-primary font-semibold">{msg}</span>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
