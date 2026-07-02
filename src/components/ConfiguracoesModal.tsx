'use client';

import { useEffect, useRef, useState } from 'react';
import { FileCog, FileSpreadsheet, RotateCcw, Check, UploadCloud, UserCheck, AlertTriangle, Trash2 } from 'lucide-react';
import { zerarBancoPontos } from '@/lib/store/registro';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { TecnicoData, EscritorioData } from '@/lib/topo/types';
import {
  carregarTecnico,
  salvarTecnico,
  TECNICO_PADRAO,
  carregarEscritorio,
  salvarEscritorio,
  ESCRITORIO_PADRAO,
  salvarModeloSigef,
  temModeloSigefProprio,
  limparModeloSigef,
} from '@/lib/store/settings';
import { souMaster, carregarWhatsappSuporte, salvarWhatsappSuporte } from '@/lib/store/suporte';
import ImportTxtConfigModal from '@/components/ImportTxtConfigModal';
import ImportVerticesVizinhoConfigModal from '@/components/ImportVerticesVizinhoConfigModal';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfigChange?: () => void; // Notifica a página principal caso mude algum contador ou fuso base
}

// Pessoal = só do usuário (assinatura técnica). Global = da empresa (todos usam o mesmo).
type AbaConfig = 'pessoal' | 'escritorio' | 'numeracao' | 'modelos';

export default function ConfiguracoesModal({ open, onOpenChange, onConfigChange }: Props) {
  const [aba, setAba] = useState<AbaConfig>('pessoal');
  const [t, setT] = useState<TecnicoData>(TECNICO_PADRAO);
  const [esc, setEsc] = useState<EscritorioData>(ESCRITORIO_PADRAO);
  const [msg, setMsg] = useState('');
  const [importTxtAberto, setImportTxtAberto] = useState(false);
  const [importVizinhoAberto, setImportVizinhoAberto] = useState(false);
  const [modeloProprio, setModeloProprio] = useState(false);
  const [zapSuporte, setZapSuporte] = useState('');
  const sigefRef = useRef<HTMLInputElement>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      setT(carregarTecnico());
      setEsc(carregarEscritorio());
      setModeloProprio(temModeloSigefProprio());
      if (souMaster()) carregarWhatsappSuporte().then(setZapSuporte).catch(() => {});
    }
  }, [open]);

  const flash = (m: string) => {
    setMsg(m);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setMsg(''), 2000);
  };

  const changeT = (k: keyof TecnicoData, val: TecnicoData[keyof TecnicoData]) => {
    const updated = { ...t, [k]: val };
    setT(updated);
    salvarTecnico(updated);
    onConfigChange?.();
    flash('Salvo automaticamente');
  };

  const changeEsc = (k: keyof EscritorioData, val: EscritorioData[keyof EscritorioData]) => {
    const updated = { ...esc, [k]: val };
    setEsc(updated);
    salvarEscritorio(updated);
    onConfigChange?.();
    flash('Salvo automaticamente');
  };

  async function atualizarModeloSigef(file: File) {
    if (
      !window.confirm(
        'Deseja realmente substituir a planilha SIGEF do sistema por este arquivo?\n\nEle passará a ser usado em TODAS as exportações de planilha (.ods), no lugar do modelo embutido.'
      )
    )
      return;
    salvarModeloSigef(await file.arrayBuffer());
    setModeloProprio(true);
    onConfigChange?.();
    flash('Modelo SIGEF atualizado.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function restaurarModeloSigef() {
    if (!window.confirm('Voltar a usar o modelo de planilha SIGEF embutido do sistema?')) return;
    limparModeloSigef();
    setModeloProprio(false);
    onConfigChange?.();
    flash('Modelo SIGEF restaurado.');
  }

  function lerLogo(file: File) {
    const r = new FileReader();
    r.onload = () => {
      changeEsc('logoDataUrl', String(r.result));
    };
    r.readAsDataURL(file);
  }

  const Tb = ({ a, rotulo }: { a: AbaConfig; rotulo: string }) => (
    <button onClick={() => setAba(a)}
      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${aba === a ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted/50'}`}>
      {rotulo}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col bg-background/95 backdrop-blur-md border border-border/80 shadow-2xl p-6 rounded-lg text-foreground">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              Configurações do Sistema
            </DialogTitle>
            {msg && (
              <span className="text-xs bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded flex items-center gap-1 font-semibold animate-pulse">
                <Check className="size-3" /> {msg}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-3 border-b-0">
            <span className="text-xs font-bold uppercase tracking-wide text-emerald-600">Pessoais</span>
            <Tb a="pessoal" rotulo="Responsável Técnico" />
            <span className="mx-1 h-4 w-px bg-border" />
            <span className="text-xs font-bold uppercase tracking-wide text-emerald-600">Globais (empresa)</span>
            <Tb a="escritorio" rotulo="Escritório & Carimbo" />
            <Tb a="numeracao" rotulo="Numeração e Fuso" />
            <Tb a="modelos" rotulo="Importação e Modelos" />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1 py-3 text-sm">
          {aba === 'pessoal' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3.5">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Nome Completo</Label>
                  <Input value={t.nome} onChange={(e) => changeT('nome', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Formação Profissional</Label>
                  <Input value={t.formacao} onChange={(e) => changeT('formacao', e.target.value)} />
                </div>
                {/* o TRT é sempre por projeto (emitido no TrtModal, campo imovel.numeroTrt) — não existe "TRT padrão" */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Registro CFT/CREA</Label>
                  <Input value={t.cft} onChange={(e) => changeT('cft', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Cidade da Assinatura (peças técnicas)</Label>
                  <Input value={t.cidadeAssinatura} onChange={(e) => changeT('cidadeAssinatura', e.target.value)} />
                </div>
              </div>

              <div className="space-y-3.5 border-t md:border-t-0 md:border-l md:pl-4 pt-3.5 md:pt-0">
                <div className="p-2.5 rounded bg-muted/40 text-[11px] leading-tight text-muted-foreground border">
                  Estes dados são <strong>pessoais</strong>: cada técnico da empresa assina as peças com os seus. O escritório, a numeração, o fuso e os modelos são da empresa (abas Globais).
                </div>
              </div>
            </div>
          )}

          {aba === 'numeracao' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3.5">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Credenciamento INCRA (prefixo dos vértices)</Label>
                  <Input value={t.credenciamentoIncra} onChange={(e) => changeT('credenciamentoIncra', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Método Posicionamento</Label>
                    <Input value={t.metodoPosicionamento} onChange={(e) => changeT('metodoPosicionamento', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Tipo Limite</Label>
                    <Input value={t.tipoLimite} onChange={(e) => changeT('tipoLimite', e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Marcos (M) inicial</Label>
                    <Input type="number" value={t.contadorMarco} onChange={(e) => changeT('contadorMarco', Number(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Pontos (P) inicial</Label>
                    <Input type="number" value={t.contadorPonto} onChange={(e) => changeT('contadorPonto', Number(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Virtuais (V) inicial</Label>
                    <Input type="number" value={t.contadorVirtual ?? 1} onChange={(e) => changeT('contadorVirtual', Number(e.target.value))} />
                  </div>
                </div>
              </div>

              <div className="space-y-3.5 border-t md:border-t-0 md:border-l md:pl-4 pt-3.5 md:pt-0">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Fuso UTM principal</Label>
                  <Input type="number" value={t.zonaBase ?? 23} onChange={(e) => changeT('zonaBase', Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Fusos permitidos (auto-detecção)</Label>
                  <Input
                    value={(t.fusosPermitidos ?? [18, 19, 20, 21, 22, 23, 24, 25]).join(', ')}
                    onChange={(e) =>
                      changeT(
                        'fusosPermitidos',
                        e.target.value
                          .split(',')
                          .map((s) => Number(s.trim()))
                          .filter((n) => Number.isFinite(n))
                      )
                    }
                  />
                </div>
                <div className="p-2.5 rounded bg-muted/40 text-[11px] leading-tight text-muted-foreground border">
                  <strong>Dica de agrimensor:</strong> A numeração dos contadores é a semente inicial. À medida que novos pontos são gerados, o banco de dados interno avança automaticamente para evitar duplicidades de vértices.
                </div>

                {/* Zona de perigo: zerar o banco de pontos (recuperável na tela do Banco de pontos) */}
                <div className="space-y-1.5 rounded border border-red-600/30 bg-red-600/5 p-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-red-700 dark:text-red-400"><AlertTriangle className="size-4" /> Zona de perigo</div>
                  <p className="text-[11px] leading-tight text-muted-foreground">
                    Zerar o banco de pontos do credenciado manda todos os pontos ativos para a <strong>lixeira</strong> (recuperáveis um a um ou todos de uma vez na tela do Banco de pontos). Use ao trocar de credenciado ou liberar códigos de uma certificação cancelada.
                  </p>
                  <Button size="sm" variant="outline" className="h-8 gap-1 border-red-600/40 text-red-700 hover:bg-red-600 hover:text-white dark:text-red-400"
                    onClick={async () => {
                      if (!window.confirm('Zerar o banco de pontos?\n\nTodos os pontos ativos vão para a lixeira (recuperáveis depois). Continuar?')) return;
                      const n = await zerarBancoPontos();
                      flash(n > 0 ? `${n} ponto(s) movidos para a lixeira.` : 'O banco já estava vazio.');
                    }}>
                    <Trash2 className="size-4" /> Zerar banco de pontos
                  </Button>
                </div>
              </div>
            </div>
          )}

          {aba === 'escritorio' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3.5">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Nome da Empresa / Escritório</Label>
                  <Input value={esc.nome} onChange={(e) => changeEsc('nome', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Ramo de Atuação</Label>
                  <Input value={esc.ramo} onChange={(e) => changeEsc('ramo', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">CNPJ / CPF</Label>
                    <Input value={esc.cnpj} onChange={(e) => changeEsc('cnpj', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">WhatsApp / Contato</Label>
                    <Input value={esc.telefone} onChange={(e) => changeEsc('telefone', e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Endereço Físico</Label>
                  <Input value={esc.endereco} onChange={(e) => changeEsc('endereco', e.target.value)} />
                </div>
                {souMaster() && (
                  <div className="space-y-1 rounded border border-emerald-600/30 bg-emerald-600/5 p-2">
                    <Label className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">WhatsApp de SUPORTE do sistema (só o master vê este campo)</Label>
                    <Input placeholder="Ex.: 32 9 9999-9999 — vazio = botão de suporte não aparece"
                      value={zapSuporte}
                      onChange={(e) => setZapSuporte(e.target.value)}
                      onBlur={() => { salvarWhatsappSuporte(zapSuporte).then(() => flash('Suporte salvo')).catch(() => flash('Salvo local; nuvem indisponível')); }} />
                    <p className="text-xs text-muted-foreground">Aparece pros clientes como botão &quot;Falar com o suporte&quot; no tutorial. Deixe vazio pra esconder.</p>
                  </div>
                )}
              </div>

              <div className="space-y-3.5 border-t md:border-t-0 md:border-l md:pl-4 pt-3.5 md:pt-0 flex flex-col justify-between">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Logotipo para a Planta</Label>
                  <div className="border border-dashed rounded-lg p-4 flex flex-col items-center justify-center bg-muted/20 hover:bg-muted/40 transition-colors relative cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) lerLogo(f);
                      }}
                    />
                    <UploadCloud className="size-8 text-muted-foreground mb-1" />
                    <span className="text-xs font-medium text-muted-foreground">Clique para selecionar imagem</span>
                  </div>
                  {esc.logoDataUrl && (
                    <div className="mt-2 p-2 border rounded bg-background flex items-center justify-between">
                      <img src={esc.logoDataUrl} alt="Logotipo do Escritório" className="h-10 object-contain" />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs text-destructive font-semibold hover:bg-destructive/10"
                        onClick={() => changeEsc('logoDataUrl', '')}
                      >
                        Remover
                      </Button>
                    </div>
                  )}
                </div>
                <div className="p-3 bg-muted/40 rounded border text-[11px] leading-snug text-muted-foreground">
                  O logotipo será desenhado automaticamente no quadro de convenções e carimbo de assinaturas nas pranchas impressas e exportações em PDF.
                </div>
              </div>
            </div>
          )}

          {aba === 'modelos' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded p-4 bg-muted/20 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm flex items-center gap-1.5">
                    <FileCog className="size-4" /> Layout do Arquivo TXT (Colunas)
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Personalize o posicionamento de cada coluna no arquivo de pontos (ex. Nome, Leste, Norte, Altitude, Precisões). O sistema lerá seus relatórios GNSS seguindo esse mapeamento.
                  </p>
                </div>
                <Button variant="outline" className="w-full font-semibold gap-1.5" onClick={() => setImportTxtAberto(true)}>
                  <FileCog className="size-4" /> Configurar ordem das colunas
                </Button>
              </div>

              <div className="border rounded p-4 bg-muted/20 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm flex items-center gap-1.5">
                    <FileSpreadsheet className="size-4" /> Modelo de Planilha SIGEF (.ods)
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Você pode fazer upload de um modelo próprio de planilha de dados cartográficos do SIGEF. O sistema o preencherá automaticamente ao exportar seus arquivos.
                  </p>
                </div>
                <input
                  ref={sigefRef}
                  type="file"
                  accept=".ods"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) atualizarModeloSigef(f);
                    e.currentTarget.value = '';
                  }}
                />
                <div className="flex flex-col gap-2">
                  <Button variant="outline" className="w-full font-semibold gap-1.5" onClick={() => sigefRef.current?.click()}>
                    <FileSpreadsheet className="size-4" /> Atualizar planilha modelo (.ods)
                  </Button>
                  {modeloProprio && (
                    <Button variant="ghost" className="w-full text-xs gap-1" onClick={restaurarModeloSigef}>
                      <RotateCcw className="size-3.5" /> Restaurar modelo padrão
                    </Button>
                  )}
                  <span className="text-[10px] text-muted-foreground text-center">
                    {modeloProprio ? 'Planilha ativa: Modelo personalizado.' : 'Planilha ativa: Modelo padrão embutido.'}
                  </span>
                </div>
              </div>

              <div className="border rounded p-4 bg-muted/20 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm flex items-center gap-1.5">
                    <UserCheck className="size-4" /> Vértices de Vizinho Certificado
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Quando um vizinho já certificado empresta o vértice de divisa, o código dele deve ser reaproveitado, não gerado de novo. Diga qual coluna do arquivo é o nome/código do vértice e qual é a coordenada.
                  </p>
                </div>
                <Button variant="outline" className="w-full font-semibold gap-1.5" onClick={() => setImportVizinhoAberto(true)}>
                  <UserCheck className="size-4" /> Configurar leitura de vértices do vizinho
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="border-t pt-3 flex justify-between items-center text-xs text-muted-foreground">
          <span>Pressione <kbd className="font-semibold">ESC</kbd> para fechar</span>
          <span className="font-medium text-emerald-500 flex items-center gap-1">
            <Check className="size-3.5" /> Salvamento automático habilitado
          </span>
        </div>
      </DialogContent>
      <ImportTxtConfigModal open={importTxtAberto} onOpenChange={setImportTxtAberto} />
      <ImportVerticesVizinhoConfigModal open={importVizinhoAberto} onOpenChange={setImportVizinhoAberto} />
    </Dialog>
  );
}
