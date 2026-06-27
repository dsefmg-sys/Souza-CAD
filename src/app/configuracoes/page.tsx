'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TecnicoData } from '@/lib/topo/types';
import { carregarTecnico, salvarTecnico, TECNICO_PADRAO } from '@/lib/store/settings';

export default function ConfiguracoesPage() {
  const [t, setT] = useState<TecnicoData>(TECNICO_PADRAO);
  const [msg, setMsg] = useState('');

  useEffect(() => { setT(carregarTecnico()); }, []);

  const set = (k: keyof TecnicoData, v: string | number) => setT((p) => ({ ...p, [k]: v }));

  function salvar() {
    salvarTecnico(t);
    setMsg('Configurações salvas.');
    setTimeout(() => setMsg(''), 3000);
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-4 flex items-center gap-2">
        <Link href="/"><Button variant="ghost" size="sm"><ArrowLeft /> Voltar</Button></Link>
        <h1 className="text-xl font-semibold">Configurações do responsável técnico</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>Dados que aparecem no memorial e na planilha</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <Campo wide label="Nome" value={t.nome} onChange={(v) => set('nome', v)} />
          <Campo wide label="Formação" value={t.formacao} onChange={(v) => set('formacao', v)} />
          <Campo label="CFT" value={t.cft} onChange={(v) => set('cft', v)} />
          <Campo label="TRT/ART" value={t.art} onChange={(v) => set('art', v)} />
          <Campo label="Credenciamento INCRA (prefixo dos vértices)" value={t.credenciamentoIncra} onChange={(v) => set('credenciamentoIncra', v)} />
          <Campo label="Cidade da assinatura" value={t.cidadeAssinatura} onChange={(v) => set('cidadeAssinatura', v)} />
          <Campo label="Método de posicionamento" value={t.metodoPosicionamento} onChange={(v) => set('metodoPosicionamento', v)} />
          <Campo label="Tipo de limite" value={t.tipoLimite} onChange={(v) => set('tipoLimite', v)} />
          <div className="space-y-1">
            <Label>Nº inicial dos marcos (M)</Label>
            <Input type="number" value={t.contadorMarco} onChange={(e) => set('contadorMarco', Number(e.target.value))} />
          </div>
          <div className="space-y-1">
            <Label>Nº inicial dos pontos (P)</Label>
            <Input type="number" value={t.contadorPonto} onChange={(e) => set('contadorPonto', Number(e.target.value))} />
          </div>
          <div className="space-y-1">
            <Label>Nº inicial dos virtuais (V)</Label>
            <Input type="number" value={t.contadorVirtual ?? 1} onChange={(e) => set('contadorVirtual', Number(e.target.value))} />
          </div>
          <div className="space-y-1">
            <Label>Fuso UTM principal</Label>
            <Input type="number" value={t.zonaBase ?? 23} onChange={(e) => set('zonaBase', Number(e.target.value))} />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Fusos permitidos (auto-detecção pela âncora do município)</Label>
            <Input value={(t.fusosPermitidos ?? [22, 23, 24, 25]).join(', ')}
              onChange={(e) => setT((p) => ({ ...p, fusosPermitidos: e.target.value.split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n)) }))} />
          </div>
        </CardContent>
      </Card>
      <p className="mt-3 text-xs text-muted-foreground">
        Os contadores aqui são apenas a semente inicial. Depois que você salva projetos, o banco
        de pontos passa a controlar a numeração para nunca repetir um vértice já usado.
      </p>

      <div className="mt-4 flex items-center gap-3">
        <Button onClick={salvar}><Save /> Salvar configurações</Button>
        {msg && <span className="text-sm text-primary">{msg}</span>}
      </div>
    </div>
  );
}

function Campo({ label, value, onChange, wide }: { label: string; value: string; onChange: (v: string) => void; wide?: boolean }) {
  return (
    <div className={`space-y-1 ${wide ? 'col-span-2' : ''}`}>
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
