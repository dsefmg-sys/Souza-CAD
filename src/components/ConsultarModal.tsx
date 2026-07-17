'use client';

import { useEffect, useState } from 'react';
import { Search, Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ProprietarioCad, ConfrontanteCad, ImovelCad, CartorioCad } from '@/lib/topo/types';
import { proprietarios, confrontantesCad, imoveisCad, cartoriosCad } from '@/lib/store/cadastros';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onInserirProprietario: (p: ProprietarioCad) => void;
  onInserirConfrontante: (c: ConfrontanteCad) => void;
  onInserirImovel: (i: ImovelCad) => void;
  onInserirCartorio: (c: CartorioCad) => void;
}

const normalizar = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

export default function ConsultarModal({ open, onOpenChange, onInserirProprietario, onInserirConfrontante, onInserirImovel, onInserirCartorio }: Props) {
  const [busca, setBusca] = useState('');
  const [props, setProps] = useState<ProprietarioCad[]>([]);
  const [confs, setConfs] = useState<ConfrontanteCad[]>([]);
  const [imoveis, setImoveis] = useState<ImovelCad[]>([]);
  const [cartorios, setCartorios] = useState<CartorioCad[]>([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!open) return;
    setBusca(''); setMsg('');
    proprietarios.listar().then(setProps).catch((e) => console.warn('[ConsultarModal] proprietarios:', e));
    confrontantesCad.listar().then(setConfs).catch((e) => console.warn('[ConsultarModal] confrontantes:', e));
    imoveisCad.listar().then(setImoveis).catch((e) => console.warn('[ConsultarModal] imoveis:', e));
    cartoriosCad.listar().then(setCartorios).catch((e) => { console.warn('[ConsultarModal] cartorios:', e); setMsg('Nuvem indisponível — dados locais ativos.'); });
  }, [open]);

  const q = normalizar(busca);
  const fp = props.filter((p) => normalizar(p.nome).includes(q) || normalizar(p.cpf).includes(q));
  const fc = confs.filter((c) => normalizar(c.nome).includes(q) || normalizar(c.cpf).includes(q) || normalizar(c.matricula).includes(q));
  const fi = imoveis.filter((i) => normalizar(i.denominacao).includes(q) || normalizar(i.matricula).includes(q) || normalizar(i.municipio).includes(q) || normalizar(i.codigoImovelIncra).includes(q));
  const fk = cartorios.filter((c) => normalizar(c.cns).includes(q) || normalizar(c.nome).includes(q) || normalizar(c.municipio).includes(q));

  const flash = (t: string) => { setMsg(t); setTimeout(() => setMsg(''), 2500); };

  function Grupo({ titulo, children, n }: { titulo: string; children: React.ReactNode; n: number }) {
    if (n === 0) return null;
    return (
      <div className="space-y-1">
        <h3 className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{titulo} ({n})</h3>
        <div className="divide-y rounded-md border bg-card">{children}</div>
      </div>
    );
  }
  function Linha({ titulo, sub, onInserir, onExcluir }: { titulo: string; sub: string; onInserir: () => void; onExcluir: () => void }) {
    return (
      <div className="flex items-center justify-between gap-2 p-2.5 text-sm">
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{titulo}</div>
          <div className="truncate text-xs text-muted-foreground">{sub}</div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button size="sm" variant="outline" className="h-8 gap-1" onClick={onInserir}><Plus className="h-3 w-3" /> Inserir neste projeto</Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onExcluir}
            title="Apagar permanentemente"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  const algumResultado = fp.length + fc.length + fi.length + fk.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Consultar dados de projetos anteriores</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground">Pesquise proprietários, confrontantes, imóveis e cartórios já cadastrados e traga-os para o projeto aberto, sem redigitar.</p>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input type="search" autoFocus placeholder="Buscar por nome, CPF, matrícula… (ignora acentos)" className="pl-8" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        {msg && <div className="text-sm text-primary">{msg}</div>}

        <div className="max-h-[55vh] space-y-4 overflow-auto">
          <Grupo titulo="Proprietários" n={fp.length}>
            {fp.map((p) => <Linha key={p.id} titulo={p.nome} sub={`CPF/CNPJ: ${p.cpf || '—'}`}
              onInserir={() => { onInserirProprietario(p); flash(`Proprietário "${p.nome}" inserido.`); }}
              onExcluir={async () => {
                if (window.confirm(`Deseja realmente apagar "${p.nome}" dos cadastros?`)) {
                  await proprietarios.excluir(p.id);
                  setProps((prev) => prev.filter((x) => x.id !== p.id));
                  flash(`Proprietário "${p.nome}" removido.`);
                }
              }} />)}
          </Grupo>
          <Grupo titulo="Confrontantes" n={fc.length}>
            {fc.map((c) => <Linha key={c.id} titulo={c.nome} sub={`CPF: ${c.cpf || '—'} · Mat.: ${c.matricula || '—'} · CNS: ${c.cns || '—'}`}
              onInserir={() => { onInserirConfrontante(c); flash(`Confrontante "${c.nome}" adicionado.`); }}
              onExcluir={async () => {
                if (window.confirm(`Deseja realmente apagar "${c.nome}" dos cadastros?`)) {
                  await confrontantesCad.excluir(c.id);
                  setConfs((prev) => prev.filter((x) => x.id !== c.id));
                  flash(`Confrontante "${c.nome}" removido.`);
                }
              }} />)}
          </Grupo>
          <Grupo titulo="Imóveis" n={fi.length}>
            {fi.map((i) => <Linha key={i.id} titulo={i.denominacao} sub={`Mat.: ${i.matricula || '—'} · ${i.municipio || '—'}`}
              onInserir={() => { onInserirImovel(i); flash(`Imóvel "${i.denominacao}" inserido.`); }}
              onExcluir={async () => {
                if (window.confirm(`Deseja realmente apagar "${i.denominacao}" dos cadastros?`)) {
                  await imoveisCad.excluir(i.id);
                  setImoveis((prev) => prev.filter((x) => x.id !== i.id));
                  flash(`Imóvel "${i.denominacao}" removido.`);
                }
              }} />)}
          </Grupo>
          <Grupo titulo="Cartórios" n={fk.length}>
            {fk.map((c) => <Linha key={c.id} titulo={c.nome} sub={`CNS: ${c.cns || '—'} · ${c.municipio || '—'}`}
              onInserir={() => { onInserirCartorio(c); flash(`Cartório "${c.nome}" inserido.`); }}
              onExcluir={async () => {
                if (window.confirm(`Deseja realmente apagar "${c.nome}" dos cadastros?`)) {
                  await cartoriosCad.excluir(c.id);
                  setCartorios((prev) => prev.filter((x) => x.id !== c.id));
                  flash(`Cartório "${c.nome}" removido.`);
                }
              }} />)}
          </Grupo>
          {busca && !algumResultado && <div className="py-10 text-center text-sm text-muted-foreground">Nenhum registro encontrado para “{busca}”.</div>}
          {!busca && <div className="py-10 text-center text-sm text-muted-foreground">Digite para buscar nos seus cadastros.</div>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
