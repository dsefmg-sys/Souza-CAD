'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, FileCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TecnicoData, EscritorioData } from '@/lib/topo/types';
import { carregarTecnico, salvarTecnico, TECNICO_PADRAO, carregarEscritorio, salvarEscritorio, ESCRITORIO_PADRAO } from '@/lib/store/settings';
import ImportTxtConfigModal from '@/components/ImportTxtConfigModal';

export default function ConfiguracoesPage() {
  const [t, setT] = useState<TecnicoData>(TECNICO_PADRAO);
  const [esc, setEsc] = useState<EscritorioData>(ESCRITORIO_PADRAO);
  const [msg, setMsg] = useState('');
  const [importTxtAberto, setImportTxtAberto] = useState(false);

  useEffect(() => { setT(carregarTecnico()); setEsc(carregarEscritorio()); }, []);

  const set = (k: keyof TecnicoData, v: string | number) => setT((p) => ({ ...p, [k]: v }));
  const setE = (k: keyof EscritorioData, v: string) => setEsc((p) => ({ ...p, [k]: v }));

  function salvar() {
    salvarTecnico(t);
    salvarEscritorio(esc);
    setMsg('Configurações salvas.');
    setTimeout(() => setMsg(''), 3000);
  }

  function lerLogo(file: File) {
    const r = new FileReader();
    r.onload = () => setE('logoDataUrl', String(r.result));
    r.readAsDataURL(file);
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

      <Card className="mt-4">
        <CardHeader><CardTitle>Importação de TXT (ordem das colunas)</CardTitle></CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Cada equipamento exporta o TXT numa ordem diferente de colunas. Envie um arquivo de
            exemplo e diga o que cada coluna é (nome do ponto, Norte, Leste, altitude, sigma X, sigma Y,
            sigma Z, método). O sistema passa a ler todos os TXT seguindo esse mapa.
          </p>
          <Button variant="outline" onClick={() => setImportTxtAberto(true)}>
            <FileCog /> Configurar importação de TXT
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader><CardTitle>Carimbo do escritório (planta)</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <Campo wide label="Nome do escritório" value={esc.nome} onChange={(v) => setE('nome', v)} />
          <Campo wide label="Ramo" value={esc.ramo} onChange={(v) => setE('ramo', v)} />
          <Campo label="CNPJ" value={esc.cnpj} onChange={(v) => setE('cnpj', v)} />
          <Campo label="Telefone/WhatsApp" value={esc.telefone} onChange={(v) => setE('telefone', v)} />
          <Campo wide label="Endereço" value={esc.endereco} onChange={(v) => setE('endereco', v)} />
          <div className="col-span-2 space-y-1">
            <Label>Logotipo (opcional)</Label>
            <Input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) lerLogo(f); }} />
            {esc.logoDataUrl ? <img src={esc.logoDataUrl} alt="logo" className="mt-1 h-12 object-contain" /> : null}
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 flex items-center gap-3">
        <Button onClick={salvar}><Save /> Salvar configurações</Button>
        {msg && <span className="text-sm text-primary">{msg}</span>}
      </div>

      <ImportTxtConfigModal open={importTxtAberto} onOpenChange={setImportTxtAberto} />
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
