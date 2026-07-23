import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Scale, Download, Users } from 'lucide-react';
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
  confrontantesList?: string[]; // List of confrontantes names to populate notif selector
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
    return `A pretensão do Requerente encontra amparo legal no artigo 1.238 do Código Civil Brasileiro, que estabelece a aquisição da propriedade imóvel por aquele que exercer posse mansa e pacífica pelo prazo de 15 anos, independentemente de justo título e boa-fé. Resta preenchido todo o arcabouço probatório-técnico com as peças geodésicas anexas.`;
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
      setForoComarca(d.foroComarca || '');
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

  const verificarModificado = () => {
    const atual = obterDadosAtuais();
    const salvo = imovel.dadosJuridico || {};
    return JSON.stringify(atual) !== JSON.stringify({
      foroComarca: salvo.foroComarca || '',
      advogadoNome: salvo.advogadoNome || '',
      advogadoOab: salvo.advogadoOab || '',
      qualificacaoFatos: salvo.qualificacaoFatos || '',
      direitoFundamento: salvo.direitoFundamento || '',
      notificacaoConfrontanteId: salvo.notificacaoConfrontanteId || ''
    });
  };

  const salvarLocal = () => {
    onChangeImovel({
      ...imovel,
      dadosJuridico: obterDadosAtuais()
    });
    setMsg('Rascunho Jurídico salvo!');
    setTimeout(() => setMsg(''), 3000);
  };

  const fecharComVerificacao = async () => {
    if (verificarModificado()) {
      const fecharSemSalvar = await confirmar({
        titulo: 'Alterações jurídicas pendentes',
        mensagem: 'Você fez alterações nos dados jurídicos. Deseja fechar e descartar as alterações?',
        okLabel: 'Descartar e Fechar',
        perigo: true
      });
      if (!fecharSemSalvar) return;
    }
    onOpenChange(false);
  };

  const baixarPeticao = () => {
    const doc = gerarPdfPeticaoUsucapiao(imovel, esc, tecnico, {
      foroComarca,
      advogadoNome,
      advogadoOab,
      qualificacaoFatos,
      direitoFundamento
    });
    doc.save(`${imovel.denominacao || 'imovel'}_peticao_usucapiao.pdf`);
  };

  const baixarParecerDocx = async () => {
    const { gerarDocxParecerJuridico } = await import('@/lib/export/juridico');
    const { saveAs } = await import('file-saver');
    const blob = await gerarDocxParecerJuridico(imovel, esc, tecnico, {
      foroComarca,
      advogadoNome,
      advogadoOab,
      qualificacaoFatos,
      direitoFundamento
    });
    saveAs(blob, `${imovel.denominacao || 'imovel'}_parecer_juridico.docx`);
  };

  const baixarNotificacao = () => {
    const doc = gerarPdfNotificacaoExtrajudicial(imovel, esc, tecnico, {
      foroComarca,
      advogadoNome,
      advogadoOab,
      qualificacaoFatos,
      direitoFundamento,
      confrontanteNome,
      confrontanteQualificacao
    });
    doc.save(`${imovel.denominacao || 'imovel'}_notificacao_${confrontanteNome || 'vizinho'}.pdf`);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) fecharComVerificacao(); else onOpenChange(val); }}>
      <DialogContent className="w-[96vw] sm:w-[92vw] max-w-[800px] max-h-[92vh] flex flex-col p-4 sm:p-6 overflow-hidden shadow-2xl" onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="shrink-0 flex flex-row items-center justify-between border-b pb-3">
          <DialogTitle className="flex items-center gap-2 text-base font-extrabold uppercase tracking-wide text-foreground">
            <Scale className="size-5 text-indigo-500 shrink-0" /> Módulo Jurídico &amp; Regularização
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
          {(['peticao', 'notificacao'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setAba(t)}
              className={`flex-1 text-center py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
                aba === t
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {t === 'peticao' ? 'Petição Inicial Usucapião' : 'Notificação Extrajudicial'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1 py-2 text-xs sm:text-sm">
          {/* Advogado Info (Shared by both) */}
          <div className="p-3 bg-muted/20 border rounded-lg space-y-3">
            <span className="text-[10px] font-extrabold uppercase text-muted-foreground">Credenciais do Patrono / Advogado</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Nome do Advogado(a)</Label>
                <Input
                  placeholder="Ex: Dra. Mariana Alencar"
                  value={advogadoNome}
                  onChange={(e) => setAdvogadoNome(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">OAB (Número/UF)</Label>
                <Input
                  placeholder="Ex: 123.456/MG"
                  value={advogadoOab}
                  onChange={(e) => setAdvogadoOab(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Foro / Comarca Judicial</Label>
                <Input
                  placeholder="Ex: Espera Feliz-MG"
                  value={foroComarca}
                  onChange={(e) => setForoComarca(e.target.value)}
                />
              </div>
            </div>
          </div>

          {aba === 'peticao' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Fundamentação Jurídica (Artigo / Tese)</Label>
                <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                  rows={3}
                  placeholder="Ex: Art. 1.238 do Código Civil (Usucapião Extraordinária com posse mansa por mais de 15 anos)..."
                  value={direitoFundamento}
                  onChange={(e) => setDireitoFundamento(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Fatos Adicionais e Qualificação das Benfeitorias</Label>
                <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                  rows={4}
                  placeholder="Descreva a cadeia de posse anterior, como o posseiro explora a terra e outros argumentos fáticos do direito de propriedade..."
                  value={qualificacaoFatos}
                  onChange={(e) => setQualificacaoFatos(e.target.value)}
                />
              </div>

              <div className="pt-2 border-t flex flex-wrap gap-2 justify-end items-center">
                <Button type="button" variant="outline" className="text-xs font-bold mr-auto" onClick={restaurarTextoPadrao}>
                  Restaurar Texto Padrão
                </Button>
                <Button variant="outline" className="text-xs font-bold gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50" onClick={baixarParecerDocx}>
                  <Download className="size-4 text-blue-600" /> Parecer Jurídico (Word)
                </Button>
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 text-xs" onClick={baixarPeticao}>
                  <Download className="size-4" /> Petição Inicial (PDF)
                </Button>
              </div>
            </div>
          )}

          {aba === 'notificacao' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Selecionar Confrontante para Notificar</Label>
                  <select
                    value={confrontanteNome}
                    onChange={(e) => setConfrontanteNome(e.target.value)}
                    className="w-full bg-background border border-input h-9 px-3 rounded-md text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">-- Selecione ou digite abaixo --</option>
                    {confrontantesList.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Nome do Notificado (Digitar Manual se necessário)</Label>
                  <Input
                    placeholder="Ex: Antônio Rodrigues de Souza"
                    value={confrontanteNome}
                    onChange={(e) => setConfrontanteNome(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Qualificação / Descrição do Confrontante Notificado</Label>
                <Input
                  placeholder="Ex: Proprietário do lote vizinho matriculado sob nº 4.567"
                  value={confrontanteQualificacao}
                  onChange={(e) => setConfrontanteQualificacao(e.target.value)}
                />
              </div>

              <div className="pt-2 border-t flex justify-end">
                <Button className="bg-red-600 hover:bg-red-700 text-white font-bold gap-1.5" onClick={baixarNotificacao}>
                  <Download className="size-4" /> Gerar Notificação Extrajudicial (PDF)
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
