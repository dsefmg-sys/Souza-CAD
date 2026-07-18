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
  // Quando o profissional tem mais de uma formação/registro cadastrado (Configurações → Pessoal),
  // ele escolhe aqui qual credencial está citando NESTA peça — a principal ou uma das extras.
  // As demais peças (memorial, planta etc.) continuam sempre usando a formação principal.
  const extras = tecnico?.registrosExtras ?? [];
  const [credencialIdx, setCredencialIdx] = useState(-1); // -1 = formação principal do técnico
  const credencial = credencialIdx >= 0 && extras[credencialIdx]
    ? extras[credencialIdx]
    : { formacao: tecnico?.formacao ?? '', conselho: tecnico?.conselho ?? 'CFT', registro: tecnico?.cft ?? '' };
  const rot = rotulosProfissional({ conselho: credencial.conselho });
  // Onde emitir o termo: TRT do técnico via SINCETI; ART do engenheiro via CREA-MG (portal SITAC).
  const linkEmitir = rot.termo === 'ART' ? 'https://servicos-crea-mg.sitac.com.br/index.php' : 'https://servicos.sinceti.net.br/';

  const linhas: [string, string][] = [
    ['Responsável técnico', tecnico?.nome ?? ''],
    ['Título profissional', credencial.formacao || ''],
    [rot.registro, credencial.registro || ''],
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
        {/* Só aparece pra quem tem mais de uma formação cadastrada (Configurações → Pessoal) —
            escolhe qual credencial está citando NESTA peça. */}
        {extras.length > 0 && (
          <div className="flex items-center gap-2 rounded-sm border bg-muted/20 p-2">
            <label className="shrink-0 text-xs font-semibold text-muted-foreground">Emitir como</label>
            <select className="h-8 flex-1 rounded-sm border bg-background px-2 text-sm"
              value={credencialIdx} onChange={(e) => setCredencialIdx(Number(e.target.value))}>
              <option value={-1}>{tecnico?.formacao || 'Formação principal'} — {tecnico?.conselho ?? 'CFT'}{tecnico?.cft ? ` (${tecnico.cft})` : ''}</option>
              {extras.map((r, i) => (
                <option key={i} value={i}>{r.formacao || r.conselho} — {r.conselho}{r.registro ? ` (${r.registro})` : ''}</option>
              ))}
            </select>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 rounded-sm border p-3 bg-muted/20 overflow-y-auto">
          {linhas.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-2 p-2 border rounded-sm bg-background text-sm">
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
        <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center gap-2 rounded-lg border p-3 bg-muted/10 shadow-sm">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Nº do {rot.termo} emitido:</label>
          <input
            className="flex-1 w-full rounded-md border bg-background px-3 py-1.5 text-xs font-mono font-bold focus:ring-1 focus:ring-primary"
            placeholder={`ex.: BR2026123456 (TRT) ou MG202698765 (ART). Cole aqui para vincular à planta e peças`}
            value={imovel.numeroTrt ?? ''}
            onChange={(e) => onChangeImovel?.({ ...imovel, numeroTrt: e.target.value })}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
