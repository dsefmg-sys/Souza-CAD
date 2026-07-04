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
    const blob = await gerarErrataDocx({ imovel, tecnico, correcoes: validas, areaHa, acrescimoRT, dataExtenso: dataExtensoHoje() });
    saveAs(blob, `Errata - ${imovel.denominacao || 'imovel'}.docx`);
    setMsg('Errata gerada.');
    onBaixar?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Errata para o cartório</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Liste o que precisa ser corrigido. Para cada item, diga onde está o erro, o que constava e o
          que passa a constar. A errata sai pronta, já explicando ao cartório e com a linha de assinatura
          do responsável técnico.
        </p>

        <div className="flex flex-wrap gap-1">
          <span className="self-center text-xs text-muted-foreground">Atalhos:</span>
          {sugestoes.map((s, i) => (
            <Button key={i} size="sm" variant="outline" className="h-7 text-xs"
              onClick={() => addCor({ onde: s.onde, constava: s.constava })} title={`Adicionar correção de ${s.onde}`}>
              <Plus className="size-3" /> {s.rotulo}
            </Button>
          ))}
        </div>

        <div className="space-y-3">
          {correcoes.map((c, i) => (
            <div key={i} className="rounded border p-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Correção {i + 1}</span>
                <Button size="sm" variant="ghost" className="h-6 px-1" onClick={() => rmCor(i)} title="Remover"><Trash2 className="size-3.5 text-destructive" /></Button>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Onde está o erro</Label>
                  <Input value={c.onde} onChange={(e) => setCor(i, { onde: e.target.value })} placeholder="ex.: Confrontante João Alves" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Onde se lê (errado)</Label>
                    <Input value={c.constava} onChange={(e) => setCor(i, { constava: e.target.value })} placeholder="ex.: Matrícula nº 3383" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Leia-se (correto)</Label>
                    <Input value={c.passa} onChange={(e) => setCor(i, { passa: e.target.value })} placeholder="ex.: Matrícula nº 5.378" />
                  </div>
                </div>
              </div>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => addCor()}><Plus /> Adicionar correção</Button>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Acréscimo de Responsabilidade Técnica (opcional)</Label>
          <Input value={acrescimoRT} onChange={(e) => setAcrescimoRT(e.target.value)}
            placeholder="ex.: Número CFT/TRT 2605638774 (só se precisar acrescentar o registro)" />
        </div>

        <div className="flex items-center gap-3 border-t pt-3">
          <Button onClick={gerar}><FileWarning /> Gerar errata (.docx)</Button>
          {msg && <span className="text-sm text-primary">{msg}</span>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
