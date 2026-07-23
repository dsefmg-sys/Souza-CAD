import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Leaf, Download, Sparkles, ShieldCheck } from 'lucide-react';
import { ImovelData, EscritorioData, TecnicoData } from '@/lib/topo/types';
import { confirmar } from '@/lib/ui/dialogos';
import { gerarPdfLTCA, gerarPdfFinanciamento, gerarPdfPRADA } from '@/lib/export/meioAmbiente';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  imovel: ImovelData;
  onChangeImovel: (i: ImovelData) => void;
  tecnico: TecnicoData;
  esc: EscritorioData | null;
  onSalvarProjeto: () => void;
}

export default function MeioAmbienteModal({
  open,
  onOpenChange,
  imovel,
  onChangeImovel,
  tecnico,
  esc,
  onSalvarProjeto
}: Props) {
  const [aba, setAba] = useState<'ltca' | 'financiamento' | 'prada'>('ltca');
  const [msg, setMsg] = useState('');

  // Local state for inputs
  const [vegetacao, setVegetacao] = useState('');
  const [conservacao, setConservacao] = useState('');
  const [corposAgua, setCorposAgua] = useState('');
  const [appEstimada, setAppEstimada] = useState('');
  const [fauna, setFauna] = useState('');
  const [diagnostico, setDiagnostico] = useState('');

  const [instituicao, setInstituicao] = useState('');
  const [linhaCredito, setLinhaCredito] = useState('');
  const [atividade, setAtividade] = useState('');
  const [valorFinanc, setValorFinanc] = useState('');
  const [cronograma, setCronograma] = useState('');

  const [declividade, setDeclividade] = useState('');
  const [recomposicao, setRecomposicao] = useState(false);
  const [acoesPRADA, setAcoesPRADA] = useState('');

  // Initial load
  useEffect(() => {
    if (open && imovel.dadosAmbientais) {
      const d = imovel.dadosAmbientais;
      setVegetacao(d.vegetacao || '');
      setConservacao(d.conservacao || '');
      setCorposAgua(d.corposAgua || '');
      setAppEstimada(d.appEstimada || '');
      setFauna(d.fauna || '');
      setDiagnostico(d.diagnostico || '');
      setInstituicao(d.instituicao || '');
      setLinhaCredito(d.linhaCredito || '');
      setAtividade(d.atividade || '');
      setValorFinanc(d.valorFinanc || '');
      setCronograma(d.cronograma || '');
      setDeclividade(d.declividade || '');
      setRecomposicao(!!d.recomposicao);
      setAcoesPRADA(d.acoesPRADA || '');
    } else if (open) {
      // Clear
      setVegetacao('');
      setConservacao('');
      setCorposAgua('');
      setAppEstimada('');
      setFauna('');
      setDiagnostico('');
      setInstituicao('');
      setLinhaCredito('');
      setAtividade('');
      setValorFinanc('');
      setCronograma('');
      setDeclividade('');
      setRecomposicao(false);
      setAcoesPRADA('');
    }
  }, [open, imovel]);

  // Check if modified
  const obterDadosAtuais = () => ({
    vegetacao,
    conservacao,
    corposAgua,
    appEstimada,
    fauna,
    diagnostico,
    instituicao,
    linhaCredito,
    atividade,
    valorFinanc,
    cronograma,
    declividade,
    recomposicao,
    acoesPRADA
  });

  const verificarModificado = () => {
    const atual = obterDadosAtuais();
    const salvo = imovel.dadosAmbientais || {};
    return JSON.stringify(atual) !== JSON.stringify({
      vegetacao: salvo.vegetacao || '',
      conservacao: salvo.conservacao || '',
      corposAgua: salvo.corposAgua || '',
      appEstimada: salvo.appEstimada || '',
      fauna: salvo.fauna || '',
      diagnostico: salvo.diagnostico || '',
      instituicao: salvo.instituicao || '',
      linhaCredito: salvo.linhaCredito || '',
      atividade: salvo.atividade || '',
      valorFinanc: salvo.valorFinanc || '',
      cronograma: salvo.cronograma || '',
      declividade: salvo.declividade || '',
      recomposicao: !!salvo.recomposicao,
      acoesPRADA: salvo.acoesPRADA || ''
    });
  };

  const salvarLocal = () => {
    onChangeImovel({
      ...imovel,
      dadosAmbientais: obterDadosAtuais()
    });
    setMsg('Alterações salvas no rascunho!');
    setTimeout(() => setMsg(''), 3000);
  };

  const fecharComVerificacao = async () => {
    if (verificarModificado()) {
      const fecharSemSalvar = await confirmar({
        titulo: 'Alterações não salvas',
        mensagem: 'Você fez alterações que não foram salvas. Deseja descartar as alterações e fechar?',
        okLabel: 'Descartar e Fechar',
        perigo: true
      });
      if (!fecharSemSalvar) return;
    }
    onOpenChange(false);
  };

  const baixarLTCA = () => {
    const doc = gerarPdfLTCA(imovel, esc, tecnico, {
      vegetacao,
      conservacao,
      corposAgua,
      appEstimada,
      fauna,
      diagnostico
    });
    doc.save(`${imovel.denominacao || 'imovel'}_laudo_ambiental_ltca.pdf`);
  };

  const baixarLtcaDocx = async () => {
    const { gerarDocxLaudoAmbiental } = await import('@/lib/export/meioAmbiente');
    const { saveAs } = await import('file-saver');
    const blob = await gerarDocxLaudoAmbiental(imovel, esc, tecnico, {
      vegetacao,
      conservacao,
      corposAgua,
      appEstimada,
      fauna,
      diagnostico
    });
    saveAs(blob, `${imovel.denominacao || 'imovel'}_laudo_ambiental_ltca.docx`);
  };

  const baixarFinanciamento = () => {
    const doc = gerarPdfFinanciamento(imovel, esc, tecnico, {
      instituicao,
      linhaCredito,
      atividade,
      valor: valorFinanc,
      cronograma
    });
    doc.save(`${imovel.denominacao || 'imovel'}_projeto_financiamento.pdf`);
  };

  const baixarPRADA = () => {
    const doc = gerarPdfPRADA(imovel, esc, tecnico, {
      declividade,
      recomposicao,
      acoes: acoesPRADA
    });
    doc.save(`${imovel.denominacao || 'imovel'}_prada.pdf`);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) fecharComVerificacao(); else onOpenChange(val); }}>
      <DialogContent className="w-[96vw] sm:w-[92vw] max-w-[850px] max-h-[92vh] flex flex-col p-4 sm:p-6 overflow-hidden shadow-2xl" onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="shrink-0 flex flex-row items-center justify-between border-b pb-3">
          <DialogTitle className="flex items-center gap-2 text-base font-extrabold uppercase tracking-wide text-foreground">
            <Leaf className="size-5 text-lime-500 shrink-0 animate-pulse" /> Módulo de Serviços Ambientais
          </DialogTitle>
          <div className="flex items-center gap-2">
            {msg && <span className="text-xs font-bold text-emerald-500 animate-pulse">{msg}</span>}
            <Button size="sm" variant="outline" className="text-xs font-bold" onClick={salvarLocal}>
              Salvar Rascunho
            </Button>
          </div>
        </DialogHeader>

        {/* Tab Selector */}
        <div className="flex gap-1 border-b my-2 bg-muted/20 p-1 rounded-lg shrink-0">
          {(['ltca', 'financiamento', 'prada'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setAba(t)}
              className={`flex-1 text-center py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
                aba === t
                  ? 'bg-lime-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {t === 'ltca' ? 'Caracterização (LTCA)' : t === 'financiamento' ? 'Financiamento' : 'Recuperação (PRADA)'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 py-2 text-xs sm:text-sm">
          {aba === 'ltca' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Vegetação Predominante</Label>
                  <Input
                    placeholder="Ex: Floresta Estacional, Cerrado, Mata Atlântica"
                    value={vegetacao}
                    onChange={(e) => setVegetacao(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Estado de Conservação</Label>
                  <Input
                    placeholder="Ex: Preservado, Antropizado, Regeneração Natural"
                    value={conservacao}
                    onChange={(e) => setConservacao(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Corpos d'Água / Hidrografia</Label>
                  <Input
                    placeholder="Ex: Rio de médio porte, 2 nascentes internas"
                    value={corposAgua}
                    onChange={(e) => setCorposAgua(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Área de APP Estimada (ha)</Label>
                  <Input
                    type="text"
                    placeholder="Ex: 4.50"
                    value={appEstimada}
                    onChange={(e) => setAppEstimada(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Fauna Silvestre Observada/Registrada</Label>
                <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                  rows={2}
                  placeholder="Liste espécies ou observações de fauna..."
                  value={fauna}
                  onChange={(e) => setFauna(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Diagnóstico e Parecer Ambiental do Técnico</Label>
                <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                  rows={3}
                  placeholder="Conclusão sobre a conformidade ambiental e reserva legal..."
                  value={diagnostico}
                  onChange={(e) => setDiagnostico(e.target.value)}
                />
              </div>

              <div className="pt-2 border-t flex flex-wrap gap-2 justify-end">
                <Button variant="outline" className="text-xs font-bold gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50" onClick={baixarLtcaDocx}>
                  <Download className="size-4 text-blue-600" /> Laudo LTCA (Word)
                </Button>
                <Button className="bg-lime-600 hover:bg-lime-700 text-white font-bold gap-1.5 text-xs" onClick={baixarLTCA}>
                  <Download className="size-4" /> Laudo LTCA (PDF)
                </Button>
              </div>
            </div>
          )}

          {aba === 'financiamento' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Instituição Financeira</Label>
                  <Input
                    placeholder="Ex: Banco do Brasil, Caixa, BNDES"
                    value={instituicao}
                    onChange={(e) => setInstituicao(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Linha de Crédito</Label>
                  <Input
                    placeholder="Ex: PRONAF, PRONAMP, ABC+ Verde"
                    value={linhaCredito}
                    onChange={(e) => setLinhaCredito(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Atividade Principal do Projeto</Label>
                  <Input
                    placeholder="Ex: Agrofloresta, Café Irrigado, Pastagem Rotacionada"
                    value={atividade}
                    onChange={(e) => setAtividade(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Valor Estimado do Projeto (R$)</Label>
                  <Input
                    placeholder="Ex: 150.000,00"
                    value={valorFinanc}
                    onChange={(e) => setValorFinanc(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Cronograma de Investimentos e Uso dos Recursos</Label>
                <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                  rows={4}
                  placeholder="Detalhamento das etapas de aquisição de insumos, maquinário, preparo do solo e implantação..."
                  value={cronograma}
                  onChange={(e) => setCronograma(e.target.value)}
                />
              </div>

              <div className="pt-2 border-t flex justify-end">
                <Button className="bg-lime-600 hover:bg-lime-700 text-white font-bold gap-1.5" onClick={baixarFinanciamento}>
                  <Download className="size-4" /> Gerar Projeto de Financiamento (PDF)
                </Button>
              </div>
            </div>
          )}

          {aba === 'prada' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Declividade Média do Relevo</Label>
                  <Input
                    placeholder="Ex: 15% (Ondulado), > 45° (APP)"
                    value={declividade}
                    onChange={(e) => setDeclividade(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="recom"
                    checked={recomposicao}
                    onChange={(e) => setRecomposicao(e.target.checked)}
                    className="size-4 cursor-pointer"
                  />
                  <Label htmlFor="recom" className="font-bold cursor-pointer">
                    Recomposicao de APP / Reserva Requerida
                  </Label>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Ações de Recuperação Recomendadas</Label>
                <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                  rows={4}
                  placeholder="Descreva o isolamento da área (cercamento), plantio de mudas nativas, controle de erosão ou passivos ambientais..."
                  value={acoesPRADA}
                  onChange={(e) => setAcoesPRADA(e.target.value)}
                />
              </div>

              <div className="pt-2 border-t flex justify-end">
                <Button className="bg-lime-600 hover:bg-lime-700 text-white font-bold gap-1.5" onClick={baixarPRADA}>
                  <Download className="size-4" /> Gerar Plano PRADA (PDF)
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
