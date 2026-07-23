'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Scale, Download, Play, BookOpen, FileCheck, ShieldCheck } from 'lucide-react';
import { ImovelData, EscritorioData, TecnicoData } from '@/lib/topo/types';
import { confirmar } from '@/lib/ui/dialogos';
import { gerarPdfPeticaoUsucapiao, gerarPdfNotificacaoExtrajudicial } from '@/lib/export/juridico';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  imovel: ImovelData;
  onChangeImovel: (i: ImovelData) => void;
  tecnico: TecnicoData;
  esc: EscritorioData | null;
  onSalvarProjeto: () => void;
  confrontantesList?: string[];
}

export default function JuridicoModal({
  open,
  onOpenChange,
  imovel,
  onChangeImovel,
  tecnico,
  esc,
  onSalvarProjeto,
  confrontantesList = []
}: Props) {
  const [aba, setAba] = useState<'peticao' | 'notificacao'>('peticao');
  const [msg, setMsg] = useState('');

  // Local state
  const [foroComarca, setForoComarca] = useState('');
  const [advogadoNome, setAdvogadoNome] = useState('');
  const [advogadoOab, setAdvogadoOab] = useState('');
  const [qualificacaoFatos, setQualificacaoFatos] = useState('');
  const [direitoFundamento, setDireitoFundamento] = useState('');
  const [confrontanteNome, setConfrontanteNome] = useState('');
  const [confrontanteQualificacao, setConfrontanteQualificacao] = useState('');

  const obterDefaultFatos = () => {
    const proprietario = imovel.proprietario || '___';
    const cpf = imovel.cpfProprietario || '___';
    const denom = imovel.denominacao || '___';
    const municipio = imovel.municipio || '___';
    const nomeTecnico = tecnico?.nome || '___';
    const areaHa = imovel.areaHa ? imovel.areaHa.toFixed(4) : '0.0000';
    return `O(A) Requerente ${proprietario.toUpperCase()}, inscrito sob o CPF ${cpf}, exerce posse mansa, pacífica, contínua e com animus domini, há mais de 15 anos, sobre o imóvel denominado "${denom}", situado no município de ${municipio}. O imóvel possui levantamento topográfico e memorial descritivo assinado pelo responsável técnico ${nomeTecnico}, com área total georreferenciada de ${areaHa} ha. Os confrontantes foram identificados e não apresentam contestação à referida delimitação perimétrica.`;
  };

  const obterDefaultDireito = () => {
    return `A pretensão do Requerente encontra amparo legal no artigo 1.238 do Código Civil Brasileiro e artigo 216-A da Lei de Registros Públicos (Lei 6.015/73), que estabelecem a aquisição da propriedade imóvel por aquele que exercer posse mansa e pacífica pelo prazo legal, instruindo a peça com as divisas apuradas no levantamento geodésico de precisão.`;
  };

  const restaurarTextoPadrao = () => {
    setQualificacaoFatos(obterDefaultFatos());
    setDireitoFundamento(obterDefaultDireito());
    setMsg('Textos originais restaurados!');
    setTimeout(() => setMsg(''), 3000);
  };

  useEffect(() => {
    if (open) {
      const d = imovel.dadosJuridico || {};
      setForoComarca(d.foroComarca || imovel.municipio || '');
      setAdvogadoNome(d.advogadoNome || (tecnico?.oab ? tecnico.nome : ''));
      setAdvogadoOab(d.advogadoOab || tecnico?.oab || '');
      setQualificacaoFatos(d.qualificacaoFatos || obterDefaultFatos());
      setDireitoFundamento(d.direitoFundamento || obterDefaultDireito());
      setConfrontanteNome(d.notificacaoConfrontanteId || '');
    }
  }, [open, imovel, tecnico]);

  const obterDadosAtuais = () => ({
    foroComarca,
    advogadoNome,
    advogadoOab,
    qualificacaoFatos,
    direitoFundamento,
    notificacaoConfrontanteId: confrontanteNome
  });

  const salvarLocal = () => {
    onChangeImovel({
      ...imovel,
      dadosJuridico: obterDadosAtuais()
    });
    setMsg('Dados Jurídicos salvos!');
    setTimeout(() => setMsg(''), 3000);
  };

  const fecharComVerificacao = async () => {
    onOpenChange(false);
  };

  // Presets de Preenchimento Rápido
  const carregarPeticaoUsucapiao = () => {
    setForoComarca(imovel.municipio ? `Juízo de Direito da Comarca de ${imovel.municipio}` : 'Juízo de Direito da Comarca de Registros Públicos');
    setQualificacaoFatos(obterDefaultFatos());
    setDireitoFundamento(obterDefaultDireito());
    setMsg('Cenário Ação de Usucapião carregado!');
    setTimeout(() => setMsg(''), 3000);
  };

  const carregarRetificacaoArea = () => {
    setForoComarca(imovel.municipio ? `Ofício de Registro de Imóveis da Comarca de ${imovel.municipio}` : 'Ofício de Registro de Imóveis');
    setQualificacaoFatos(`O Requerente é proprietário do imóvel registrado na Matrícula nº ${imovel.matricula || '___'}, onde constatou-se divergência entre a área constante no registro tabular e a área real apurada pelo levantamento topográfico georreferenciado realizado com precisão centimétrica conforme normas do INCRA/SIGEF.`);
    setDireitoFundamento(`O pedido fundamenta-se no artigo 213, inciso II, da Lei de Registros Públicos (Lei nº 6.015/1973), que autoriza a retificação intra-muros do registro imobiliário quando os confrontantes forem notificados ou manifestarem anuência expressa.`);
    setMsg('Cenário Retificação de Área (Lei 6.015/73 Art. 213) carregado!');
    setTimeout(() => setMsg(''), 3000);
  };

  const baixarPeticaoPdf = () => {
    const doc = gerarPdfPeticaoUsucapiao(imovel, esc, tecnico, obterDadosAtuais());
    doc.save(`${imovel.denominacao || 'imovel'}_peticao_usucapiao.pdf`);
  };

  const baixarPeticaoDocx = async () => {
    const { gerarDocxParecerJuridico } = await import('@/lib/export/juridico');
    const { saveAs } = await import('file-saver');
    const blob = await gerarDocxParecerJuridico(imovel, esc, tecnico, obterDadosAtuais());
    saveAs(blob, `${imovel.denominacao || 'imovel'}_parecer_juridico.docx`);
  };

  const baixarNotificacaoPdf = () => {
    const doc = gerarPdfNotificacaoExtrajudicial(imovel, esc, tecnico, {
      ...obterDadosAtuais(),
      confrontanteNome: confrontanteNome || 'Confrontante',
      confrontanteQualificacao
    });
    doc.save(`${imovel.denominacao || 'imovel'}_notificacao_extrajudicial.pdf`);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) fecharComVerificacao(); else onOpenChange(val); }}>
      <DialogContent className="w-[96vw] sm:w-[92vw] max-w-[800px] max-h-[92vh] flex flex-col p-4 sm:p-6 overflow-hidden shadow-2xl" onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="shrink-0 flex flex-row items-center justify-between border-b pb-3">
          <DialogTitle className="flex items-center gap-2 text-base font-extrabold uppercase tracking-wide text-foreground">
            <Scale className="size-5 text-indigo-500 shrink-0" /> Módulo Jurídico &amp; Petições Cartorárias
          </DialogTitle>
          <div className="flex items-center gap-2">
            {msg && <span className="text-xs font-bold text-indigo-500 animate-pulse">{msg}</span>}
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs" onClick={salvarLocal}>
              Salvar Dados
            </Button>
          </div>
        </DialogHeader>

        {/* Tab Buttons */}
        <div className="flex border-b text-xs font-bold shrink-0">
          <button
            onClick={() => setAba('peticao')}
            className={`py-2 px-4 transition-all ${aba === 'peticao' ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400 font-extrabold' : 'text-muted-foreground'}`}
          >
            1. Petição de Usucapião / Retificação
          </button>
          <button
            onClick={() => setAba('notificacao')}
            className={`py-2 px-4 transition-all ${aba === 'notificacao' ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400 font-extrabold' : 'text-muted-foreground'}`}
          >
            2. Notificação Extrajudicial de Confrontante
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1 py-2 text-xs sm:text-sm">
          {aba === 'peticao' && (
            <div className="space-y-4">
              {/* Presets */}
              <div className="space-y-1.5 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30">
                <span className="text-xs font-extrabold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide flex items-center gap-1.5">
                  <Play className="size-3.5" /> Preenchimento Rápido da Peça Jurídica:
                </span>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={carregarPeticaoUsucapiao}
                    className="px-2.5 py-1.5 rounded-md bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-all"
                  >
                    Ação de Usucapião (Art. 1.238 CC / Provimento 65 CNJ)
                  </button>
                  <button
                    type="button"
                    onClick={carregarRetificacaoArea}
                    className="px-2.5 py-1.5 rounded-md bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-all"
                  >
                    Retificação de Área (Lei 6.015/73 Art. 213)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-bold">Foro / Comarca / Cartório de Registro</Label>
                  <Input
                    placeholder="Ex: Juízo de Direito da Comarca de Patos de Minas - MG"
                    value={foroComarca}
                    onChange={(e) => setForoComarca(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Inscrição OAB do Advogado / RT</Label>
                  <Input
                    placeholder="Ex: OAB/MG 123.456"
                    value={advogadoOab}
                    onChange={(e) => setAdvogadoOab(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-bold">Dos Fatos e da Posse / Histórico Imobiliário</Label>
                  <button type="button" onClick={restaurarTextoPadrao} className="text-[11px] text-indigo-500 hover:underline font-bold">
                    Restaurar Texto Padrão
                  </button>
                </div>
                <textarea
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
                  rows={4}
                  value={qualificacaoFatos}
                  onChange={(e) => setQualificacaoFatos(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Do Direito e Fundamentação Jurídica</Label>
                <textarea
                  className="flex min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
                  rows={3}
                  value={direitoFundamento}
                  onChange={(e) => setDireitoFundamento(e.target.value)}
                />
              </div>
            </div>
          )}

          {aba === 'notificacao' && (
            <div className="space-y-4">
              <div className="p-3 border rounded-xl bg-amber-500/10 border-amber-500/30 text-xs text-amber-800 dark:text-amber-300">
                <strong>Notificação de Anotação de Limite Perimétrico:</strong> Notificação extrajudicial enviada ao confrontante para formalização da ciência e anuência das divisas apuradas no levantamento geodésico.
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Nome do Confrontante a Notificar</Label>
                <Input
                  placeholder="Ex: João da Silva / Confrontante Leste"
                  value={confrontanteNome}
                  onChange={(e) => setConfrontanteNome(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Qualificação Completa e Endereço do Notificado</Label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
                  rows={3}
                  placeholder="Ex: brasileiro, casado, produtor rural, inscrito no CPF nº 000.000.000-00, residente no imóvel lindeiro..."
                  value={confrontanteQualificacao}
                  onChange={(e) => setConfrontanteQualificacao(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* BOTOES COM CORES SOLIDADAS DE ALTO CONTRASTE */}
        <div className="pt-3 border-t flex flex-wrap gap-2 justify-end shrink-0 bg-card">
          {aba === 'peticao' ? (
            <>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5 shrink-0" onClick={baixarPeticaoDocx}>
                <Download className="size-4" /> Parecer Jurídico (Word)
              </Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5 shrink-0" onClick={baixarPeticaoPdf}>
                <Download className="size-4" /> Petição de Usucapião (PDF)
              </Button>
            </>
          ) : (
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5 shrink-0" onClick={baixarNotificacaoPdf}>
              <Download className="size-4" /> Notificação Extrajudicial (PDF)
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
