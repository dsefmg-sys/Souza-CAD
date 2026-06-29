'use client';

import { useState } from 'react';
import { Copy, CheckCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { ImovelData, TecnicoData } from '@/lib/topo/types';
import { numBR } from '@/lib/topo/geometry';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  imovel: ImovelData;
  tecnico: TecnicoData | null;
  areaHa: number;
  perimetro: number;
}

export default function TrtModal({ open, onOpenChange, imovel, tecnico, areaHa, perimetro }: Props) {
  const [copiado, setCopiado] = useState<string | null>(null);

  const linhas: [string, string][] = [
    ['Responsável técnico', tecnico?.nome ?? ''],
    ['Título profissional', tecnico?.formacao ?? ''],
    ['CFT', tecnico?.cft ?? ''],
    ['Credenciamento INCRA', tecnico?.credenciamentoIncra ?? ''],
    ['Atividade técnica', 'Georreferenciamento de imóvel rural — levantamento topográfico georreferenciado (SIGEF/INCRA)'],
    ['Proprietário / contratante', imovel.proprietario],
    ['CPF/CNPJ', imovel.cpfProprietario],
    ['Imóvel', imovel.denominacao],
    ['Matrícula', imovel.matricula],
    ['Código do Imóvel (SNCR/INCRA)', imovel.codigoImovelIncra],
    ['Cartório (CNS)', imovel.cns],
    ['Município/UF', imovel.municipio],
    ['Área (ha)', `${numBR(areaHa, 4)} ha`],
    ['Perímetro (m)', `${numBR(perimetro)} m`],
  ];

  function copiar(texto: string, chave: string) {
    const ok = () => { setCopiado(chave); setTimeout(() => setCopiado(null), 1500); };
    const fallback = () => {
      try {
        const ta = document.createElement('textarea');
        ta.value = texto; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.focus(); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta); ok();
      } catch { /* navegador não permitiu copiar */ }
    };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(texto).then(ok).catch(fallback);
    else fallback();
  }
  function copiarTudo() {
    const txt = linhas.map(([k, v]) => `${k}: ${v || '—'}`).join('\n');
    copiar(txt, '__tudo__');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dados para o TRT</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">Confira e copie os campos para preencher o Termo de Responsabilidade Técnica no conselho.</p>
        <div className="divide-y rounded border">
          {linhas.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <div className="min-w-0"><div className="text-[10px] uppercase text-muted-foreground">{k}</div><div className="truncate">{v || '—'}</div></div>
              <Button size="sm" variant="ghost" onClick={() => copiar(v, k)} title="Copiar">{copiado === k ? <CheckCheck className="text-primary" /> : <Copy />}</Button>
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <Button size="sm" onClick={copiarTudo}>{copiado === '__tudo__' ? <CheckCheck /> : <Copy />} Copiar tudo</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
