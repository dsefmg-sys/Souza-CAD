import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LayoutGrid, Download, ShieldCheck, Coins, FileText, Users, Settings, Check } from 'lucide-react';
import { compatibilizarWord2007 } from '@/lib/export/compatWord2007';
import { Packer } from 'docx';
import { gerarContratoLoteDocx } from '@/lib/export/contratoLote';
import { ImovelData, EscritorioData, TecnicoData, Gleba } from '@/lib/topo/types';
import { confirmar, avisar } from '@/lib/ui/dialogos';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { calcular } from '@/lib/topo/calcular';
import { gerarMemorialDocx } from '@/lib/export/memorial';
import { gerarPdfMemorialLoteamento, gerarPdfLaudoInfraestrutura } from '@/lib/export/loteamento';
import { carregarPreferencias } from '@/lib/store/preferencias';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  imovel: ImovelData;
  onChangeImovel: (i: ImovelData) => void;
  tecnico: TecnicoData;
  esc: EscritorioData | null;
  onSalvarProjeto: () => void;
  glebas?: Gleba[];
  onChangeGlebas?: (gs: Gleba[]) => void;
  defaultVolCorte?: number;
  defaultVolAterro?: number;
}

export default function LoteamentoModal({
  open,
  onOpenChange,
  imovel,
  onChangeImovel,
  tecnico,
  esc,
  onSalvarProjeto,
  glebas = [],
  onChangeGlebas,
  defaultVolCorte,
  defaultVolAterro,
  onMinimizar
}: Props & { onMinimizar?: () => void }) {
  const [msg, setMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'projeto' | 'vendas'>('projeto');
  const [loteSelecionadoId, setLoteSelecionadoId] = useState<string>('');
  const [precoM2Input, setPrecoM2Input] = useState('');

  const lotes = (glebas || []).filter((g) => g.tipoGleba === 'auxiliar');

  // Sync selected lot ID on load
  useEffect(() => {
    if (lotes.length > 0 && !loteSelecionadoId) {
      setLoteSelecionadoId(lotes[0].id);
    }
  }, [open, glebas]);

  const obterAreaLote = (l: Gleba) => {
    const pts = l.vertices || [];
    let areaM2 = 0;
    if (pts.length > 2) {
      let soma = 0;
      for (let i = 0; i < pts.length; i++) {
        const curr = pts[i];
        const next = pts[(i + 1) % pts.length];
        soma += (curr.leste * next.norte - next.leste * curr.norte);
      }
      areaM2 = Math.abs(soma / 2);
    }
    return areaM2;
  };

  const atualizarLote = (loteId: string, patch: Partial<Gleba>) => {
    if (onChangeGlebas) {
      onChangeGlebas(glebas.map((g) => (g.id === loteId ? { ...g, ...patch } : g)));
    }
  };

  const aplicarPrecificacaoMassa = () => {
    const vM2 = Number(precoM2Input);
    if (!vM2 || vM2 <= 0) {
      alert('Por favor, insira um valor válido por metro quadrado.');
      return;
    }
    if (onChangeGlebas) {
      const novas = glebas.map((g) => {
        if (g.tipoGleba === 'auxiliar') {
          const area = obterAreaLote(g);
          const preco = Number((area * vM2).toFixed(2));
          return { ...g, precoVenda: preco };
        }
        return g;
      });
      onChangeGlebas(novas);
      setMsg('Precificação aplicada a todos os lotes!');
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const baixarContratoLote = async (l: Gleba) => {
    try {
      const doc = gerarContratoLoteDocx(imovel, l, tecnico);
      const blob = await compatibilizarWord2007(await Packer.toBlob(doc));
      saveAs(blob, `Contrato_Compra_Venda_${(l.denominacao || 'lote').replace(/\s+/g, '_')}.docx`);
    } catch (e) {
      console.error(e);
      alert('Erro ao gerar contrato DOCX.');
    }
  };

  // Local state
  const [numeroLotes, setNumeroLotes] = useState('');
  const [areaVerde, setAreaVerde] = useState('');
  const [areaRuas, setAreaRuas] = useState('');
  const [volCorte, setVolCorte] = useState('');
  const [volAterro, setVolAterro] = useState('');
  const [infraAgua, setInfraAgua] = useState(true);
  const [infraEsgoto, setInfraEsgoto] = useState(true);
  const [infraLuz, setInfraLuz] = useState(true);
  const [infraDrenagem, setInfraDrenagem] = useState(true);

  useEffect(() => {
    if (open && imovel.dadosLoteamento) {
      const d = imovel.dadosLoteamento;
      setNumeroLotes(d.numeroLotes || '');
      setAreaVerde(d.areaVerde || '');
      setAreaRuas(d.areaRuas || '');
      setVolCorte(d.volCorte || '');
      setVolAterro(d.volAterro || '');
      setInfraAgua(d.infraAgua !== false);
      setInfraEsgoto(d.infraEsgoto !== false);
      setInfraLuz(d.infraLuz !== false);
      setInfraDrenagem(d.infraDrenagem !== false);
    } else if (open) {
      setNumeroLotes('');
      setAreaVerde('');
      setAreaRuas('');
      setVolCorte('');
      setVolAterro('');
      setInfraAgua(true);
      setInfraEsgoto(true);
      setInfraLuz(true);
      setInfraDrenagem(true);
    }
  }, [open, imovel]);

  const obterDadosAtuais = () => ({
    numeroLotes,
    areaVerde,
    areaRuas,
    volCorte,
    volAterro,
    infraAgua,
    infraEsgoto,
    infraLuz,
    infraDrenagem
  });

  const verificarModificado = () => {
    const atual = obterDadosAtuais();
    const salvo = imovel.dadosLoteamento || {};
    return JSON.stringify(atual) !== JSON.stringify({
      numeroLotes: salvo.numeroLotes || '',
      areaVerde: salvo.areaVerde || '',
      areaRuas: salvo.areaRuas || '',
      volCorte: salvo.volCorte || '',
      volAterro: salvo.volAterro || '',
      infraAgua: salvo.infraAgua !== false,
      infraEsgoto: salvo.infraEsgoto !== false,
      infraLuz: salvo.infraLuz !== false,
      infraDrenagem: salvo.infraDrenagem !== false
    });
  };

  const salvarLocal = () => {
    onChangeImovel({
      ...imovel,
      dadosLoteamento: obterDadosAtuais()
    });
    setMsg('Dados de Loteamento salvos!');
    setTimeout(() => setMsg(''), 3000);
  };

  const fecharComVerificacao = async () => {
    if (verificarModificado()) {
      const fecharSemSalvar = await confirmar({
        titulo: 'Alterações pendentes',
        mensagem: 'Você fez alterações no projeto de loteamento. Deseja fechar e descartar as alterações?',
        okLabel: 'Descartar e Fechar',
        perigo: true
      });
      if (!fecharSemSalvar) return;
    }
    onOpenChange(false);
  };

  const baixarMemoriaisLotesZip = async () => {
    const lotes = (glebas || []).filter((g) => g.tipoGleba === 'auxiliar');
    if (lotes.length === 0) {
      await avisar({
        titulo: 'Nenhum lote secundário',
        mensagem: 'Não foram encontrados lotes secundários (glebas auxiliares) desenhados neste projeto. Crie glebas auxiliares no painel de glebas para representar cada lote.'
      });
      return;
    }

    setMsg('Gerando memoriais dos lotes...');
    try {
      const zip = new JSZip();
      
      for (let i = 0; i < lotes.length; i++) {
        const g = lotes[i];
        const vsG = g.vertices;
        if (vsG.length < 3) continue; // ignora lotes incompletos
        
        const rG = calcular(vsG, g.confrontantePorLado ?? {});
        const nomeLote = g.denominacao || `Lote ${i + 1}`;
        
        const prefs = carregarPreferencias();
        const docxBlob = await gerarMemorialDocx({
          res: rG,
          imovel: {
            ...imovel,
            denominacao: nomeLote,
            matricula: g.matricula || imovel.matricula,
            cns: g.cns || imovel.cns,
            codigoImovelIncra: g.codigoImovelIncra || imovel.codigoImovelIncra
          },
          tecnico,
          confrontantes: g.confrontantes || [],
          confrontantePorLado: g.confrontantePorLado || {},
          dataExtenso: new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }),
          requerente: undefined,
          transmitente: undefined,
          partesAdicionais: [],
          preferencias: {
            memorialTipoCoordenada: prefs.memorialTipoCoordenada,
            memorialLatLonFormat: prefs.memorialLatLonFormat,
          }
        });

        zip.file(`Memorial - ${nomeLote.replace(/[/\\?%*:|"<>/\s]/g, '_')}.docx`, docxBlob);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, `${imovel.denominacao || 'projeto'}_memoriais_lotes.zip`);
      setMsg('Memoriais exportados!');
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      console.error(e);
      setMsg('Erro ao gerar memoriais.');
    }
  };

  const baixarMemorial = () => {
    const doc = gerarPdfMemorialLoteamento(imovel, esc, tecnico, {
      numeroLotes,
      areaVerde,
      areaRuas,
      volCorte,
      volAterro,
      infraAgua,
      infraEsgoto,
      infraLuz,
      infraDrenagem
    });
    doc.save(`${imovel.denominacao || 'imovel'}_memorial_loteamento.pdf`);
  };

  const baixarLaudoInfra = () => {
    const doc = gerarPdfLaudoInfraestrutura(imovel, esc, tecnico, {
      numeroLotes,
      areaVerde,
      areaRuas,
      volCorte,
      volAterro,
      infraAgua,
      infraEsgoto,
      infraLuz,
      infraDrenagem
    });
    doc.save(`${imovel.denominacao || 'imovel'}_laudo_infraestrutura.pdf`);
  };

  const baixarQuadroLoteamentoDocx = async () => {
    const { gerarDocxQuadroLoteamento } = await import('@/lib/export/loteamento');
    const { saveAs } = await import('file-saver');
    const blob = await gerarDocxQuadroLoteamento(imovel, esc, tecnico, {
      numeroLotes,
      areaVerde,
      areaRuas,
      volCorte,
      volAterro,
      infraAgua,
      infraEsgoto,
      infraLuz,
      infraDrenagem
    });
    saveAs(blob, `${imovel.denominacao || 'imovel'}_memorial_loteamento.docx`);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) fecharComVerificacao(); else onOpenChange(val); }}>
      <DialogContent className="w-[96vw] sm:w-[92vw] max-w-[750px] max-h-[92vh] flex flex-col p-4 sm:p-6 overflow-hidden shadow-2xl" onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="shrink-0 flex flex-row items-center justify-between border-b pb-3">
          <DialogTitle className="flex items-center gap-2 text-base font-extrabold uppercase tracking-wide text-foreground">
            <LayoutGrid className="size-5 text-teal-500 shrink-0" /> Módulo de Loteamentos &amp; Infraestrutura
          </DialogTitle>
          <div className="flex items-center gap-2">
            {msg && <span className="text-xs font-bold text-emerald-500 animate-pulse">{msg}</span>}
            <Button size="sm" variant="outline" className="text-xs font-bold" onClick={salvarLocal}>
              Salvar Alterações
            </Button>
          </div>
        </DialogHeader>

        
        {/* Tab Selection */}
        <div className="flex border-b text-xs font-bold shrink-0">
          <button
            onClick={() => setActiveTab('projeto')}
            className={`py-2 px-4 transition-all ${activeTab === 'projeto' ? 'border-b-2 border-teal-500 text-teal-600 dark:text-teal-400 font-extrabold' : 'text-muted-foreground'}`}
          >
            Dados do Projeto &amp; Infraestrutura
          </button>
          <button
            onClick={() => setActiveTab('vendas')}
            className={`py-2 px-4 transition-all ${activeTab === 'vendas' ? 'border-b-2 border-teal-500 text-teal-600 dark:text-teal-400 font-extrabold' : 'text-muted-foreground'}`}
          >
            Venda &amp; Comercial de Lotes
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1 py-2 text-xs sm:text-sm">
          {activeTab === 'projeto' && (
            <>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Número de Lotes Projetados</Label>
              <Input
                type="number"
                placeholder="Ex: 120"
                value={numeroLotes}
                onChange={(e) => setNumeroLotes(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Área das Ruas (m²)</Label>
              <Input
                placeholder="Ex: 12.500,00"
                value={areaRuas}
                onChange={(e) => setAreaRuas(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Área Verde / Recreação (m²)</Label>
              <Input
                placeholder="Ex: 8.200,00"
                value={areaVerde}
                onChange={(e) => setAreaVerde(e.target.value)}
              />
            </div>
          </div>

          <div className="border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wide">Movimentação de Terra &amp; Topocad 3D</h4>
              {(defaultVolCorte !== undefined || defaultVolAterro !== undefined) && (
                <button
                  type="button"
                  onClick={() => {
                    if (defaultVolCorte !== undefined) setVolCorte(defaultVolCorte.toFixed(2));
                    if (defaultVolAterro !== undefined) setVolAterro(defaultVolAterro.toFixed(2));
                  }}
                  className="text-[10px] font-black uppercase text-teal-600 dark:text-teal-400 bg-teal-500/10 hover:bg-teal-500/20 px-2 py-0.5 rounded transition-all cursor-pointer"
                  title="Importar os volumes exatos de terraplenagem calculados no visualizador 3D (Delaunay TIN)"
                >
                  Importar do Relevo 3D
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Volume de Corte Estimado (m³)</Label>
                <Input
                  placeholder="Ex: 4.850,00"
                  value={volCorte}
                  onChange={(e) => setVolCorte(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Volume de Aterro Estimado (m³)</Label>
                <Input
                  placeholder="Ex: 3.200,00"
                  value={volAterro}
                  onChange={(e) => setVolAterro(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-3">
            <h4 className="text-xs font-bold text-teal-600 dark:text-teal-400 mb-2 uppercase tracking-wide">Infraestrutura Declarada no Empreendimento</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <label className="flex items-center gap-2 p-2 rounded border bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors">
                <input
                  type="checkbox"
                  checked={infraAgua}
                  onChange={(e) => setInfraAgua(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 size-4"
                />
                <span className="text-[11px] font-semibold">Rede de Água</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded border bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors">
                <input
                  type="checkbox"
                  checked={infraEsgoto}
                  onChange={(e) => setInfraEsgoto(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 size-4"
                />
                <span className="text-[11px] font-semibold">Rede de Esgoto</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded border bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors">
                <input
                  type="checkbox"
                  checked={infraLuz}
                  onChange={(e) => setInfraLuz(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 size-4"
                />
                <span className="text-[11px] font-semibold">Rede Elétrica</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded border bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors">
                <input
                  type="checkbox"
                  checked={infraDrenagem}
                  onChange={(e) => setInfraDrenagem(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 size-4"
                />
                <span className="text-[11px] font-semibold">Drenagem Pluvial</span>
              </label>
            </div>
          </div>

          <div className="pt-4 border-t flex flex-wrap gap-2 justify-end">
            <Button variant="outline" className="text-xs font-bold gap-1.5 mr-auto" onClick={baixarMemoriaisLotesZip}>
              <Download className="size-4" /> Memoriais por Lote (ZIP)
            </Button>
            <Button variant="outline" className="text-xs font-bold gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50" onClick={baixarQuadroLoteamentoDocx}>
              <Download className="size-4 text-blue-600" /> Memorial de Loteamento (Word)
            </Button>
            <Button variant="outline" className="text-xs font-bold gap-1.5" onClick={baixarLaudoInfra}>
              <Download className="size-4" /> Infraestrutura &amp; Terraplenagem (PDF)
            </Button>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white font-bold gap-1.5 text-xs" onClick={baixarMemorial}>
              <Download className="size-4" /> Memorial de Loteamento (PDF)
            </Button>
          </div>
            </>
          )}

          {activeTab === 'vendas' && (
            <div className="space-y-4">
              {/* Precificação em massa */}
              <div className="p-3 bg-teal-500/5 border border-teal-500/10 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                <div>
                  <h4 className="text-xs font-extrabold text-teal-600 dark:text-teal-400 uppercase tracking-wide flex items-center gap-1.5">
                    <Coins className="size-4" /> Precificação Massiva por Metro Quadrado
                  </h4>
                  <p className="text-[10px] text-muted-foreground">
                    Aplica o valor de venda em todos os lotes secundários proporcionalmente à área planar calculada de cada um.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="relative flex items-center">
                    <span className="absolute left-2.5 text-[10px] font-bold text-zinc-500">R$ / m²</span>
                    <Input
                      type="number"
                      placeholder="Ex: 150"
                      value={precoM2Input}
                      onChange={(e) => setPrecoM2Input(e.target.value)}
                      className="w-28 h-8 text-xs font-bold pl-12 pr-1.5"
                    />
                  </div>
                  <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs h-8" onClick={aplicarPrecificacaoMassa}>
                    Aplicar
                  </Button>
                </div>
              </div>

              {lotes.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground border border-dashed rounded-xl">
                  Nenhum lote secundário (gleba auxiliar) desenhado neste projeto. Desenhe os lotes primeiro no palco para gerenciar as vendas.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Lista de lotes */}
                  <div className="border rounded-xl p-2.5 space-y-1.5 max-h-[350px] overflow-y-auto bg-muted/5">
                    <span className="text-[9.5px] uppercase font-black tracking-wider text-muted-foreground block mb-1">Selecione o Lote</span>
                    {lotes.map((l) => {
                      const area = obterAreaLote(l);
                      const isSel = l.id === loteSelecionadoId;
                      return (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => setLoteSelecionadoId(l.id)}
                          className={`w-full text-left p-2 rounded-lg border text-xs transition-all flex justify-between items-center ${
                            isSel
                              ? 'border-teal-500 bg-teal-500/10 font-bold text-teal-600 dark:text-teal-400'
                              : 'border-border bg-card hover:bg-muted/50'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="truncate font-semibold">{l.denominacao || 'Sem nome'}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">{area.toFixed(1)} m²</div>
                          </div>
                          {l.precoVenda ? (
                            <div className="text-[10px] font-mono font-bold text-emerald-600 shrink-0">
                              R$ {l.precoVenda.toLocaleString('pt-BR')}
                            </div>
                          ) : (
                            <div className="text-[9.5px] text-zinc-500 italic shrink-0">Não precificado</div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Form do Lote Selecionado */}
                  {(() => {
                    const l = lotes.find((x) => x.id === loteSelecionadoId) || lotes[0];
                    if (!l) return null;
                    const area = obterAreaLote(l);
                    
                    // Financiamento simulation
                    const preco = l.precoVenda || 0;
                    const sinal = l.sinalEntrada || 0;
                    const parcelas = l.parcelasQtd || 1;
                    const juros = l.jurosMensais || 0;
                    const sistema = l.sistemaAmortizacao || 'price';
                    const saldo = Math.max(0, preco - sinal);
                    let pmtSim = 0;
                    let pmtLastSim = 0;

                    if (saldo > 0) {
                      if (juros === 0) {
                        pmtSim = saldo / parcelas;
                        pmtLastSim = pmtSim;
                      } else {
                        const i = juros / 100;
                        if (sistema === 'price') {
                          pmtSim = saldo * (i * Math.pow(1 + i, parcelas)) / (Math.pow(1 + i, parcelas) - 1);
                          pmtLastSim = pmtSim;
                        } else {
                          const amort = saldo / parcelas;
                          pmtSim = amort + (saldo * i);
                          pmtLastSim = amort + (amort * i);
                        }
                      }
                    }

                    return (
                      <div className="md:col-span-2 space-y-4 border rounded-xl p-3 bg-card">
                        <div className="flex justify-between items-center pb-2 border-b">
                          <div>
                            <h4 className="text-xs font-black text-white uppercase">{l.denominacao || 'Lote'}</h4>
                            <span className="text-[10px] text-muted-foreground font-mono">Área Planar: {area.toFixed(2)} m²</span>
                          </div>
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1 text-[11px] h-7 px-2" onClick={() => baixarContratoLote(l)}>
                            <Download className="size-3.5" /> Contrato (DOCX)
                          </Button>
                        </div>

                        {/* Comprador Info */}
                        <div className="space-y-2">
                          <span className="text-[9.5px] uppercase font-black tracking-wider text-teal-600 dark:text-teal-400">Qualificação do Comprador</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[10px] font-bold">Nome Completo</Label>
                              <Input
                                value={l.compradorNome || ''}
                                onChange={(e) => atualizarLote(l.id, { compradorNome: e.target.value })}
                                className="h-7 text-xs font-semibold"
                                placeholder="Nome do comprador"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] font-bold">CPF</Label>
                              <Input
                                value={l.compradorCpf || ''}
                                onChange={(e) => atualizarLote(l.id, { compradorCpf: e.target.value })}
                                className="h-7 text-xs"
                                placeholder="CPF do comprador"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] font-bold">RG</Label>
                              <Input
                                value={l.compradorRg || ''}
                                onChange={(e) => atualizarLote(l.id, { compradorRg: e.target.value })}
                                className="h-7 text-xs"
                                placeholder="RG do comprador"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] font-bold">Estado Civil</Label>
                              <Input
                                value={l.compradorEstadoCivil || ''}
                                onChange={(e) => atualizarLote(l.id, { compradorEstadoCivil: e.target.value })}
                                className="h-7 text-xs"
                                placeholder="Ex: Casado(a)"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] font-bold">Profissão</Label>
                              <Input
                                value={l.compradorProfissao || ''}
                                onChange={(e) => atualizarLote(l.id, { compradorProfissao: e.target.value })}
                                className="h-7 text-xs"
                                placeholder="Profissão"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] font-bold">Endereço Residencial</Label>
                              <Input
                                value={l.compradorEndereco || ''}
                                onChange={(e) => atualizarLote(l.id, { compradorEndereco: e.target.value })}
                                className="h-7 text-xs"
                                placeholder="Rua, nº, Bairro, Cidade-UF"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Financiamento & Precificação */}
                        <div className="space-y-2 border-t pt-3">
                          <span className="text-[9.5px] uppercase font-black tracking-wider text-teal-600 dark:text-teal-400">Condições Financeiras &amp; Financiamento</span>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[10px] font-bold">Preço de Venda (R$)</Label>
                              <Input
                                type="number"
                                value={l.precoVenda || ''}
                                onChange={(e) => atualizarLote(l.id, { precoVenda: e.target.value !== '' ? Number(e.target.value) : undefined })}
                                className="h-7 text-xs font-bold"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] font-bold">Sinal / Entrada (R$)</Label>
                              <Input
                                type="number"
                                value={l.sinalEntrada || ''}
                                onChange={(e) => atualizarLote(l.id, { sinalEntrada: e.target.value !== '' ? Number(e.target.value) : undefined })}
                                className="h-7 text-xs font-bold text-emerald-600"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] font-bold">Parcelas (Qtd)</Label>
                              <Input
                                type="number"
                                value={l.parcelasQtd || ''}
                                onChange={(e) => atualizarLote(l.id, { parcelasQtd: e.target.value !== '' ? Number(e.target.value) : undefined })}
                                className="h-7 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] font-bold">Juros Mensais (%)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={l.jurosMensais || ''}
                                onChange={(e) => atualizarLote(l.id, { jurosMensais: e.target.value !== '' ? Number(e.target.value) : undefined })}
                                className="h-7 text-xs"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                            <div className="space-y-1">
                              <Label className="text-[10px] font-bold">Sistema de Amortização</Label>
                              <select
                                value={l.sistemaAmortizacao || 'price'}
                                onChange={(e) => atualizarLote(l.id, { sistemaAmortizacao: e.target.value as 'price' | 'sac' })}
                                className="w-full bg-background border h-7 px-2 rounded text-xs focus:outline-none"
                              >
                                <option value="price">Tabela Price (Fixas)</option>
                                <option value="sac">Sistema SAC (Decrescentes)</option>
                              </select>
                            </div>

                            {/* Simulação rápida */}
                            {saldo > 0 && (
                              <div className="bg-zinc-950 p-2 rounded-lg border border-border/80 flex flex-col justify-center">
                                <span className="text-[8px] font-bold text-zinc-500 uppercase">Simulação Parcela</span>
                                <div className="text-[11px] font-extrabold text-emerald-500 font-mono">
                                  {sistema === 'price' ? (
                                    `PMT: R$ ${pmtSim.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                  ) : (
                                    `SAC: R$ ${pmtSim.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (1ª) ... R$ ${pmtLastSim.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (Últ.)`
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
