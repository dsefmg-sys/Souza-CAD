'use client';

import { useState } from 'react';
import { Copy, CheckCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { ImovelData, TecnicoData } from '@/lib/topo/types';
import { numBR } from '@/lib/topo/geometry';
import { rotulosProfissional } from '@/lib/topo/profissional';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  imovel: ImovelData;
  tecnico: TecnicoData | null;
  areaHa: number;
  perimetro: number;
  onChangeImovel?: (im: ImovelData) => void;
}

export default function TrtModal({ open, onOpenChange, imovel, tecnico, areaHa, perimetro, onChangeImovel }: Props) {
  const [copiado, setCopiado] = useState<string | null>(null);
  const rot = rotulosProfissional(tecnico);
  // Onde emitir o termo: TRT do técnico via SINCETI; ART do engenheiro via CONFEA/CREA.
  const linkEmitir = rot.termo === 'ART' ? 'https://www.confea.org.br/' : 'https://servicos.sinceti.net.br/';

  const linhas: [string, string][] = [
    ['Responsável técnico', tecnico?.nome ?? ''],
    ['Título profissional', tecnico?.formacao ?? ''],
    [rot.registro, tecnico?.cft ?? ''],
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
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Dados para o {rot.termo}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">Confira e copie os campos para preencher a {rot.termoExtenso} ({rot.termo}) no conselho.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 rounded border p-3 bg-muted/20 overflow-y-auto">
          {linhas.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-2 p-2 border rounded bg-background text-sm">
              <div className="min-w-0"><div className="text-[10px] uppercase text-muted-foreground">{k}</div><div className="truncate font-medium">{v || '—'}</div></div>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 shrink-0" onClick={() => copiar(v, k)} title="Copiar">{copiado === k ? <CheckCheck className="text-primary size-4" /> : <Copy className="size-4" />}</Button>
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center mt-3 border-t pt-3">
          <a href={linkEmitir} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="default" className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1">
              EMITIR {rot.termo}
            </Button>
          </a>
          <Button size="sm" className="gap-1" onClick={copiarTudo}>{copiado === '__tudo__' ? <CheckCheck className="size-4" /> : <Copy className="size-4" />} Copiar tudo</Button>
        </div>
        {/* Nº do TRT emitido — no FIM; vira dado do projeto e aparece na planta na hora */}
        <div className="mt-3 flex items-center gap-2 rounded border p-3 bg-background">
          <label className="text-sm font-semibold whitespace-nowrap">Nº do {rot.termo} emitido</label>
          <input
            className="flex-1 rounded border bg-background px-2 py-1 text-sm"
            placeholder={`Depois de emitir, cole aqui o número — conclui a etapa ${rot.termo} e aparece na planta`}
            value={imovel.numeroTrt ?? ''}
            onChange={(e) => onChangeImovel?.({ ...imovel, numeroTrt: e.target.value })}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
