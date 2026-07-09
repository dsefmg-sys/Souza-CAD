'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye, Copy, Check, Download } from 'lucide-react';
import type { ImovelData, TecnicoData, Confrontante, Vertex, PessoaQualificada } from '@/lib/topo/types';
import { calcular } from '@/lib/topo/calcular';
import { valoresEfetivos } from '@/lib/topo/conferencia';
import { rotulosProfissional } from '@/lib/topo/profissional';
import { construirNarrativaSegmentos } from '@/lib/export/memorial';
import { carregarModelos, preencherModelo } from '@/lib/store/modelos';
import { numBR, formatMatricula } from '@/lib/topo/geometry';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  vertices: Vertex[];
  confrontantes: Confrontante[];
  confrontantePorLado: Record<number, string>;
  imovel: ImovelData;
  tecnico: TecnicoData | null;
  zona: number;
  hemisferio: 'N' | 'S';
  modo: 'normal' | 'servidao';
  dataExtenso: string;
  requerente?: PessoaQualificada;
  transmitente?: PessoaQualificada;
  onBaixar?: () => void;
}

export default function MemorialPreviewModal({
  open,
  onOpenChange,
  vertices,
  confrontantes,
  confrontantePorLado,
  imovel,
  tecnico,
  zona,
  hemisferio,
  modo,
  dataExtenso,
  requerente,
  transmitente,
  onBaixar,
}: Props) {
  const [copiouNarrativa, setCopiouNarrativa] = useState(false);
  const [copiouTudo, setCopiouTudo] = useState(false);

  // Calcula os dados geométricos do polígono
  const res = vertices.length >= 3 ? calcular(vertices, confrontantePorLado) : null;
  const ef = res ? valoresEfetivos(res, imovel) : { areaHa: 0, perimetro: 0 };
  const ehServidao = modo === 'servidao';

  // Carrega e preenche os modelos de declarações
  const modelos = carregarModelos();
  const varsModelo: Record<string, string> = {
    proprietario: imovel.proprietario || '',
    cpf: imovel.cpfProprietario || '',
    denominacao: imovel.denominacao || '',
    matricula: imovel.matricula || '',
    cns: imovel.cns || '',
    municipio: imovel.municipio || '',
    comarca: imovel.municipio || '',
    area: `${numBR(ef.areaHa, 4)} ha`,
    areaAnterior: imovel.areaAnterior != null ? `${numBR(imovel.areaAnterior, 4)} ha` : '',
    perimetro: `${numBR(ef.perimetro)} m`,
    codigoIncra: imovel.codigoImovelIncra || '',
    tecnico: tecnico?.nome || '',
    cft: tecnico?.cft || '',
    numeroTrt: imovel.numeroTrt || tecnico?.art || '',
    cidade: imovel.municipio || tecnico?.cidadeAssinatura || '',
    data: dataExtenso || '',
  };

  const getMod = (chave: keyof typeof modelos) => {
    return preencherModelo(modelos[chave], varsModelo);
  };

  // Constrói a narrativa em segmentos
  const narrativaSegs = res
    ? construirNarrativaSegmentos(res, confrontantes, confrontantePorLado, imovel, zona)
    : [];

  const narrativaTexto = narrativaSegs.map((s) => s.t).join('');

  const copiarTexto = async (tipo: 'narrativa' | 'tudo') => {
    if (!res || !tecnico) return;

    let texto = '';
    if (tipo === 'narrativa') {
      texto = narrativaTexto;
      setCopiouNarrativa(true);
      setTimeout(() => setCopiouNarrativa(false), 2000);
    } else {
      // Monta o memorial descritivo completo em texto simples formatado
      const rot = rotulosProfissional(tecnico);
      const ehUrbano = imovel.tipoImovel === 'urbano';
      
      texto = `${ehServidao ? 'MEMORIAL DESCRITIVO DE SERVIDÃO' : 'MEMORIAL DESCRITIVO'}\n\n`;
      texto += `Denominação: ${imovel.denominacao || '—'}\n`;
      texto += `Proprietário: ${imovel.proprietario || '—'} (CPF: ${imovel.cpfProprietario || '—'})\n`;
      texto += `Município/UF: ${imovel.municipio || '—'}\n`;
      texto += `Área: ${numBR(ef.areaHa, 4)} ha   |   Perímetro: ${numBR(ef.perimetro)} m\n\n`;
      
      if (ehServidao) {
        texto += `${getMod('servidaoIntro')}\n\n`;
      }
      
      texto += `DESCRIÇÃO DO PERÍMETRO\n`;
      texto += `${narrativaTexto}\n\n`;
      
      texto += `INFORMAÇÕES TÉCNICAS\n`;
      texto += `${getMod(ehUrbano ? 'memorialInfoTecnicasUrbano' : 'memorialInfoTecnicas')}\n\n`;
      texto += `OBSERVAÇÕES\n`;
      texto += `${getMod(ehUrbano ? 'memorialObservacoesUrbano' : 'memorialObservacoes')}\n\n`;
      
      texto += `${imovel.municipio || tecnico.cidadeAssinatura}, ${dataExtenso}.\n\n`;
      texto += `________________________________________\n`;
      texto += `${tecnico.nome.toUpperCase()}\n`;
      texto += `${tecnico.formacao}\n`;
      texto += `${rot.registro}: ${tecnico.cft}\n`;
      texto += `${rot.termo} nº ${imovel.numeroTrt || tecnico.art}\n`;
      texto += `Credenciamento INCRA: ${tecnico.credenciamentoIncra}\n`;
      
      setCopiouTudo(true);
      setTimeout(() => setCopiouTudo(false), 2000);
    }

    try {
      await navigator.clipboard.writeText(texto);
    } catch (e) {
      // Fallback
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] flex flex-col p-6 dark:bg-neutral-900">
        <DialogHeader className="shrink-0 flex flex-row items-center justify-between border-b pb-3 mr-6">
          <div className="space-y-0.5">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Eye className="size-5 text-amber-500" />
              Pré-visualização do Memorial Descritivo
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Revise o laudo descritivo completo e as assinaturas formatadas antes de exportar
            </p>
          </div>
          <div className="flex items-center gap-2 pr-6">
            <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => copiarTexto('narrativa')}>
              {copiouNarrativa ? <Check className="size-3 text-green-600" /> : <Copy className="size-3" />}
              {copiouNarrativa ? 'Copiado!' : 'Copiar Narrativa'}
            </Button>
            <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => copiarTexto('tudo')}>
              {copiouTudo ? <Check className="size-3 text-green-600" /> : <Copy className="size-3" />}
              {copiouTudo ? 'Copiado!' : 'Copiar Laudo'}
            </Button>
            {onBaixar && (
              <Button size="sm" className="text-xs gap-1.5 bg-green-600 hover:bg-green-700 text-white" onClick={() => { onBaixar(); onOpenChange(false); }}>
                <Download className="size-3" />
                Baixar DOCX
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Papel A4 Virtual com Scroll */}
        <div className="flex-1 overflow-y-auto bg-neutral-100 dark:bg-neutral-950 p-4 md:p-8 flex justify-center">
          <div className="bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 w-full max-w-[800px] shadow-lg rounded-md border border-neutral-200 dark:border-neutral-700 p-8 md:p-12 font-serif text-[13px] leading-relaxed space-y-6">
            
            {/* Aviso de Demonstração */}
            {imovel.ficticio && (
              <div className="border border-red-200 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 p-2.5 rounded-sm text-center font-bold text-[10px] uppercase tracking-wider">
                *** DADOS FICTÍCIOS — DOCUMENTO DE DEMONSTRAÇÃO, SEM VALIDADE LEGAL ***
              </div>
            )}

            {/* Título Principal */}
            <div className="text-center space-y-1 my-4">
              <h2 className="text-sm font-bold uppercase tracking-wider">
                {ehServidao ? 'MEMORIAL DESCRITIVO DE SERVIDÃO' : 'MEMORIAL DESCRITIVO'}
              </h2>
            </div>

            {/* Identificação em texto simples (sem moldura), espelhando o DOCX */}
            <div className="space-y-0.5">
              <div><strong>Imóvel:</strong> {imovel.denominacao || '—'}</div>
              <div><strong>Matrícula:</strong> {imovel.matricula || '—'} (CNS: {imovel.cns || '—'})</div>
              <div><strong>Proprietário(a):</strong> {imovel.proprietario || '—'}</div>
              <div><strong>Área SGL (ha):</strong> {numBR(ef.areaHa, 4)} ha</div>
              <div><strong>Local:</strong> {imovel.local || imovel.municipio || '—'}</div>
              <div><strong>Perímetro (m):</strong> {numBR(ef.perimetro)} m</div>
            </div>

            {/* Abertura de Servidão se houver */}
            {ehServidao && (
              <div className="text-justify whitespace-pre-wrap">
                {getMod('servidaoIntro')}
              </div>
            )}

            {/* Narrativa do Perímetro */}
            <div className="space-y-2">
              <h3 className="font-bold text-center uppercase tracking-wider text-[11px]">
                DESCRIÇÃO DO PERÍMETRO
              </h3>
              {narrativaSegs.length > 0 ? (
                <p className="text-justify font-serif text-[13px] leading-relaxed indent-8">
                  {narrativaSegs.map((seg, idx) => (
                    seg.b ? <strong key={idx} className="font-bold">{seg.t}</strong> : <span key={idx}>{seg.t}</span>
                  ))}
                </p>
              ) : (
                <p className="text-center text-muted-foreground py-4">Importe e estruture pontos para ver a descrição perimetral.</p>
              )}
            </div>

            {/* Informações Técnicas e Observações */}
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <h3 className="font-bold text-center uppercase tracking-wider text-[11px]">
                  INFORMAÇÕES TÉCNICAS
                </h3>
                <p className="text-justify whitespace-pre-wrap">
                  {getMod(imovel.tipoImovel === 'urbano' ? 'memorialInfoTecnicasUrbano' : 'memorialInfoTecnicas')}
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-center uppercase tracking-wider text-[11px]">
                  OBSERVAÇÕES
                </h3>
                <p className="text-justify whitespace-pre-wrap">
                  {getMod(imovel.tipoImovel === 'urbano' ? 'memorialObservacoesUrbano' : 'memorialObservacoes')}
                </p>
              </div>
            </div>

            {/* Data e Local de Assinatura */}
            {tecnico && (
              <div className="text-right font-medium pt-2">
                {imovel.municipio || tecnico.cidadeAssinatura || '—'}, {dataExtenso || '—'}.
              </div>
            )}

            {/* Assinatura do Técnico */}
            {tecnico && (
              <div className="text-center pt-6 space-y-1 max-w-sm mx-auto">
                <div className="border-t border-neutral-400 pt-1.5 font-bold uppercase">
                  {tecnico.nome}
                </div>
                <div className="text-neutral-500 text-[10px] space-y-0.5">
                  <div>{tecnico.formacao}</div>
                  <div>{rotulosProfissional(tecnico).registro}: {tecnico.cft}</div>
                  <div>{rotulosProfissional(tecnico).termo} nº {imovel.numeroTrt || tecnico.art}</div>
                  <div>Credenciamento INCRA: {tecnico.credenciamentoIncra}</div>
                </div>
              </div>
            )}

            {/* Assinatura dos Proprietários */}
            <div className="pt-6 space-y-4">
              <h4 className="font-bold text-center uppercase text-[10px] tracking-wider">PROPRIETÁRIOS</h4>
              <p className="text-justify whitespace-pre-wrap text-neutral-500 text-[10px]">{getMod('declProprietario')}</p>
              
              <div className="grid grid-cols-2 gap-8 pt-4">
                <div className="text-center space-y-1">
                  <div className="border-t border-neutral-400 pt-1.5 font-semibold">
                    {imovel.proprietario || 'Proprietário'}
                  </div>
                  <div className="text-[10px] text-neutral-500">
                    CPF: {imovel.cpfProprietario || '—'}
                    {imovel.matricula && ` | Matrícula: ${imovel.matricula}`}
                  </div>
                </div>
                {(imovel.conjugeProprietario || transmitente?.conjugeNome) && (
                  <div className="text-center space-y-1">
                    <div className="border-t border-neutral-400 pt-1.5 font-semibold">
                      {imovel.conjugeProprietario || transmitente?.conjugeNome}
                    </div>
                    <div className="text-[10px] text-neutral-500">
                      Cônjuge | CPF: {imovel.cpfConjugeProprietario || transmitente?.conjugeCpf || '—'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Assinatura dos Compradores (se houver) */}
            {imovel.comprador && (
              <div className="pt-6 space-y-4">
                <h4 className="font-bold text-center uppercase text-[10px] tracking-wider">COMPRADORES</h4>
                <p className="text-justify whitespace-pre-wrap text-neutral-500 text-[10px]">{getMod('declProprietario')}</p>
                
                <div className="grid grid-cols-2 gap-8 pt-4">
                  <div className="text-center space-y-1">
                    <div className="border-t border-neutral-400 pt-1.5 font-semibold">
                      {imovel.comprador}
                    </div>
                    <div className="text-[10px] text-neutral-500">
                      CPF: {imovel.cpfComprador || '—'}
                    </div>
                  </div>
                  {requerente?.conjugeNome && (
                    <div className="text-center space-y-1">
                      <div className="border-t border-neutral-400 pt-1.5 font-semibold">
                        {requerente.conjugeNome}
                      </div>
                      <div className="text-[10px] text-neutral-500">
                        Cônjuge | CPF: {requerente.conjugeCpf || '—'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Assinatura dos Confrontantes */}
            {confrontantes.filter(c => c.nome).length > 0 && (
              <div className="pt-6 space-y-4">
                <h4 className="font-bold text-center uppercase text-[10px] tracking-wider">CONFRONTANTES</h4>
                <p className="text-justify whitespace-pre-wrap text-neutral-500 text-[10px]">{getMod('declConfrontantes')}</p>
                
                <div className="grid grid-cols-2 gap-x-8 gap-y-10 pt-4">
                  {confrontantes.filter(c => c.nome).map((c, idx) => {
                    const cond = c.condicao ?? 'proprietario';
                    let descCond = 'Proprietário(a)';
                    if (cond === 'posseiro') descCond = 'Possuidor(a)';
                    if (cond === 'espolio') descCond = 'Espólio de';

                    return (
                      <div key={idx} className="text-center space-y-1">
                        <div className="border-t border-neutral-400 pt-1.5 font-semibold">
                          {c.nome}
                        </div>
                        <div className="text-[10px] text-neutral-500 space-y-0.5">
                          <div>{descCond} {c.matricula && `| Matrícula: ${formatMatricula(c.matricula)}`}</div>
                          <div>CPF: {c.cpf || '—'}</div>
                          {c.conjugeNome && <div className="text-[10px] text-neutral-400">Cônjuge: {c.conjugeNome} (CPF: {c.conjugeCpf || '—'})</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
