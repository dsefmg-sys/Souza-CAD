'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, FileCog, FileSpreadsheet, RotateCcw, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TecnicoData, EscritorioData } from '@/lib/topo/types';
import { carregarTecnico, salvarTecnico, TECNICO_PADRAO, carregarEscritorio, salvarEscritorio, ESCRITORIO_PADRAO, salvarModeloSigef, temModeloSigefProprio, limparModeloSigef } from '@/lib/store/settings';
import ImportTxtConfigModal from '@/components/ImportTxtConfigModal';
import ImportVerticesVizinhoConfigModal from '@/components/ImportVerticesVizinhoConfigModal';

// Pessoal = só do usuário (sua assinatura técnica). Global = da empresa (todos usam o mesmo).
type AbaConfig = 'pessoal' | 'escritorio' | 'numeracao' | 'modelos';

export default function ConfiguracoesPage() {
  const [aba, setAba] = useState<AbaConfig>('pessoal');
  const [t, setT] = useState<TecnicoData>(TECNICO_PADRAO);
  const [esc, setEsc] = useState<EscritorioData>(ESCRITORIO_PADRAO);
  const [msg, setMsg] = useState('');
  const [importTxtAberto, setImportTxtAberto] = useState(false);
  const [importVizinhoAberto, setImportVizinhoAberto] = useState(false);
  const [modeloProprio, setModeloProprio] = useState(false);
  const sigefRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setT(carregarTecnico()); setEsc(carregarEscritorio()); setModeloProprio(temModeloSigefProprio()); }, []);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };
  async function atualizarModeloSigef(file: File) {
    if (!window.confirm('Deseja realmente substituir a planilha SIGEF do sistema por este arquivo?\n\nEle passará a ser usado em TODAS as exportações de planilha (.ods), no lugar do modelo embutido.')) return;
    salvarModeloSigef(await file.arrayBuffer());
    setModeloProprio(true);
    flash('Modelo de planilha SIGEF atualizado.');
  }
  function restaurarModeloSigef() {
    if (!window.confirm('Voltar a usar o modelo de planilha SIGEF embutido do sistema?')) return;
    limparModeloSigef();
    setModeloProprio(false);
    flash('Modelo SIGEF restaurado para o padrão do sistema.');
  }

  const set = (k: keyof TecnicoData, v: string | number) => setT((p) => ({ ...p, [k]: v }));
  const setE = (k: keyof EscritorioData, v: string) => setEsc((p) => ({ ...p, [k]: v }));

  function salvar() {
    salvarTecnico(t);
    salvarEscritorio(esc);
    flash('Configurações salvas.');
  }

  function lerLogo(file: File) {
    const r = new FileReader();
    r.onload = () => setE('logoDataUrl', String(r.result));
    r.readAsDataURL(file);
  }

  const TabBtn = ({ a, rotulo }: { a: AbaConfig; rotulo: string }) => (
    <button onClick={() => setAba(a)}
      className={`px-3 py-2 text-sm ${aba === a ? 'border-b-2 border-primary font-medium text-primary' : 'text-muted-foreground'}`}>{rotulo}</button>
  );

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-4 flex items-center gap-2">
        <Link href="/"><Button variant="ghost" size="sm"><ArrowLeft /> Voltar</Button></Link>
        <h1 className="text-xl font-semibold">Configurações</h1>
      </div>

      <p className="mb-4 rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
        As configurações <strong>Globais</strong> são da empresa: valem para todos os usuários e para
        todos os projetos. As <strong>Pessoais</strong> são só suas, como a sua assinatura técnica.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-x-1 gap-y-2 border-b pb-1">
        <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Pessoais</span>
        <TabBtn a="pessoal" rotulo="Responsável Técnico" />
        <span className="mx-2 h-5 w-px bg-border" />
        <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Globais (da empresa)</span>
        <TabBtn a="escritorio" rotulo="Escritório / Carimbo" />
        <TabBtn a="numeracao" rotulo="Numeração e Fuso" />
        <TabBtn a="modelos" rotulo="Importação e Modelos" />
      </div>

      {aba === 'pessoal' && (<>
      <Card>
        <CardHeader><CardTitle>Sua assinatura técnica (aparece no memorial e na planilha)</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <Campo wide label="Nome" value={t.nome} onChange={(v) => set('nome', v)} />
          <Campo wide label="Formação" value={t.formacao} onChange={(v) => set('formacao', v)} />
          <Campo label="CFT" value={t.cft} onChange={(v) => set('cft', v)} />
          <Campo label="TRT/ART" value={t.art} onChange={(v) => set('art', v)} />
          <Campo wide label="Cidade da assinatura" value={t.cidadeAssinatura} onChange={(v) => set('cidadeAssinatura', v)} />
        </CardContent>
      </Card>
      <p className="mt-3 text-xs text-muted-foreground">
        Estes dados são pessoais: cada técnico da empresa assina com os seus.
      </p>
      </>)}

      {aba === 'escritorio' && (
      <Card>
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
      )}

      {aba === 'numeracao' && (<>
      <Card>
        <CardHeader><CardTitle>Credenciamento, numeração e fuso (padrão da empresa)</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <Campo wide label="Credenciamento INCRA (prefixo dos vértices)" value={t.credenciamentoIncra} onChange={(v) => set('credenciamentoIncra', v)} />
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
            <Input value={(t.fusosPermitidos ?? [18, 19, 20, 21, 22, 23, 24, 25]).join(', ')}
              onChange={(e) => setT((p) => ({ ...p, fusosPermitidos: e.target.value.split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n)) }))} />
          </div>
        </CardContent>
      </Card>
      <p className="mt-3 text-xs text-muted-foreground">
        Os contadores aqui são apenas a semente inicial. Depois que você salva projetos, o banco
        de pontos passa a controlar a numeração para nunca repetir um vértice já usado.
      </p>
      </>)}

      {aba === 'modelos' && (<>
      <Card>
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
        <CardHeader><CardTitle>Vértices de vizinho certificado (adotar código oficial)</CardTitle></CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Quando um vizinho já certificado no SIGEF empresta o vértice de divisa (baixado por
            vocês do Distribuidor de Coordenadas do Acervo Fundiário), o código dele deve ser
            reaproveitado, não gerado de novo. Envie um arquivo de exemplo e diga qual coluna é o
            nome/código do vértice e qual é a coordenada.
          </p>
          <Button variant="outline" onClick={() => setImportVizinhoAberto(true)}>
            <UserCheck /> Configurar leitura de vértices do vizinho
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader><CardTitle>Modelo de planilha SIGEF (.ods)</CardTitle></CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            O sistema já vem com o modelo oficial. Se você usa um modelo próprio, substitua aqui — ele
            passa a ser usado em TODAS as exportações de planilha SIGEF, no lugar do embutido.
          </p>
          <input ref={sigefRef} type="file" accept=".ods" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) atualizarModeloSigef(f); e.currentTarget.value = ''; }} />
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => sigefRef.current?.click()}><FileSpreadsheet /> Atualizar modelo de planilha SIGEF</Button>
            {modeloProprio && <Button variant="ghost" onClick={restaurarModeloSigef}><RotateCcw /> Restaurar modelo do sistema</Button>}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{modeloProprio ? 'Em uso: um modelo personalizado seu.' : 'Em uso: o modelo embutido do sistema.'}</p>
        </CardContent>
      </Card>
      </>)}

      {(aba === 'pessoal' || aba === 'escritorio' || aba === 'numeracao') && (
      <div className="mt-4 flex items-center gap-3">
        <Button onClick={salvar}><Save /> Salvar configurações</Button>
        {msg && <span className="text-sm text-primary">{msg}</span>}
      </div>
      )}
      {aba === 'modelos' && msg && <div className="mt-3 text-sm text-primary">{msg}</div>}

      <ImportTxtConfigModal open={importTxtAberto} onOpenChange={setImportTxtAberto} />
      <ImportVerticesVizinhoConfigModal open={importVizinhoAberto} onOpenChange={setImportVizinhoAberto} />
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
