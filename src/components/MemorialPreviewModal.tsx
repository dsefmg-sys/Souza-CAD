'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye, Copy, Check, Download } from 'lucide-react';
import type { ImovelData, TecnicoData, Confrontante, Vertex } from '@/lib/topo/types';
import { calcular } from '@/lib/topo/calcular';
import { valoresEfetivos } from '@/lib/topo/conferencia';
import { rotulosProfissional } from '@/lib/topo/profissional';
import { construirNarrativaSegmentos, descreverConfrontante, rumoDMS } from '@/lib/export/memorial';
import { carregarModelos, preencherModelo } from '@/lib/store/modelos';
import { numBR, numBRmilhar, formatMatricula } from '@/lib/topo/geometry';
import { azimute, distancia, azimuteDMS } from '@/lib/topo/geometry';
import { convergenciaMeridiana } from '@/lib/topo/coords';

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
  requerente?: any;
  transmitente?: any;
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
    cidade: tecnico?.cidadeAssinatura || '',
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
      
      texto += `${tecnico.cidadeAssinatura}, ${dataExtenso}.\n\n`;
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

  const usarGeodesico = imovel.tipoAzimute !== 'plano';

  const obterAzimuteEfetivo = (l: any) => {
    if (!usarGeodesico) {
      return azimute({ e: l.de.leste, n: l.de.norte }, { e: l.para.leste, n: l.para.norte });
    }
    const v = l.de;
    if (v.lat != null && v.lon != null) {
      const cm = convergenciaMeridiana(v.lat, v.lon, zona);
      const azPlano = azimute({ e: l.de.leste, n: l.de.norte }, { e: l.para.leste, n: l.para.norte });
      return (azPlano + cm + 360) % 360;
    }
    return l.azimute;
  };

  const mapaC = new Map(confrontantes.map((c) => [c.id, c]));

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
          <div className="bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 w-full max-w-[800px] shadow-lg rounded-md border border-neutral-200 dark:border-neutral-700 p-8 md:p-12 font-sans text-xs leading-relaxed space-y-6">
            
            {/* Aviso de Demonstração */}
            {imovel.ficticio && (
              <div className="border border-red-200 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 p-2.5 rounded text-center font-bold text-[10px] uppercase tracking-wider">
                *** DADOS FICTÍCIOS — DOCUMENTO DE DEMONSTRAÇÃO, SEM VALIDADE LEGAL ***
              </div>
            )}

            {/* Título Principal */}
            <div className="text-center space-y-1 my-4">
              <h2 className="text-sm font-bold uppercase tracking-wider">
                {ehServidao ? 'MEMORIAL DESCRITIVO DE SERVIDÃO' : 'MEMORIAL DESCRITIVO'}
              </h2>
            </div>

            {/* Tabela do Cabeçalho */}
            <div className="border border-black dark:border-neutral-600">
              <div className="grid grid-cols-2 border-b border-black dark:border-neutral-600">
                <div className="p-2 border-r border-black dark:border-neutral-600">
                  <strong>IMÓVEL:</strong> {imovel.denominacao || '—'}
                </div>
                <div className="p-2">
                  <strong>ÁREA:</strong> {numBR(ef.areaHa, 4)} ha
                </div>
              </div>
              <div className="grid grid-cols-2 border-b border-black dark:border-neutral-600">
                <div className="p-2 border-r border-black dark:border-neutral-600">
                  <strong>PROPRIETÁRIO:</strong> {imovel.proprietario || '—'}
                </div>
                <div className="p-2">
                  <strong>PERÍMETRO:</strong> {numBR(ef.perimetro)} m
                </div>
              </div>
              <div className="grid grid-cols-2 border-b border-black dark:border-neutral-600">
                <div className="p-2 border-r border-black dark:border-neutral-600">
                  <strong>MUNICÍPIO/UF:</strong> {imovel.municipio || '—'}
                </div>
                <div className="p-2">
                  <strong>LOCAL:</strong> {imovel.local || '—'}
                </div>
              </div>
              <div className="grid grid-cols-2">
                <div className="p-2 border-r border-black dark:border-neutral-600">
                  <strong>MATRÍCULA:</strong> {imovel.matricula || '—'} (CNS: {imovel.cns || '—'})
                </div>
                <div className="p-2">
                  <strong>CÓDIGO INCRA:</strong> {imovel.codigoImovelIncra || '—'}
                </div>
              </div>
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
                {tecnico.cidadeAssinatura || '—'}, {dataExtenso || '—'}.
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
                          {c.conjugeNome && <div className="text-[9px] text-neutral-400">Cônjuge: {c.conjugeNome} (CPF: {c.conjugeCpf || '—'})</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tabela de Roteiro Geométrico (Anexo) */}
            {res && (
              <div className="pt-8 space-y-4 border-t border-dashed border-neutral-300">
                <h4 className="font-bold text-center uppercase text-[11px] tracking-wider">
                  TABELA DE ROTEIRO GEOMÉTRICO (ANEXO)
                </h4>
                
                <table className="w-full border-collapse border border-black text-[9px] text-center dark:border-neutral-600">
                  <thead>
                    <tr className="bg-neutral-100 dark:bg-neutral-800">
                      <th className="border border-black p-1 dark:border-neutral-600 font-bold">DE</th>
                      <th className="border border-black p-1 dark:border-neutral-600 font-bold">PARA</th>
                      <th className="border border-black p-1 dark:border-neutral-600 font-bold">AZIMUTE</th>
                      <th className="border border-black p-1 dark:border-neutral-600 font-bold">RUMO</th>
                      <th className="border border-black p-1 dark:border-neutral-600 font-bold">DISTÂNCIA (m)</th>
                      <th className="border border-black p-1 dark:border-neutral-600 font-bold">CONFRONTANTE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {res.lados.map((l, idx) => {
                      const azEf = obterAzimuteEfetivo(l);
                      const rumo = rumoDMS(azEf);
                      const confId = confrontantePorLado[idx];
                      const confObj = mapaC.get(confId);
                      const nomeC = confObj ? descreverConfrontante(confObj) : '—';

                      return (
                        <tr key={idx}>
                          <td className="border border-black p-1 dark:border-neutral-600 font-bold">{l.de.codigoSigef || l.de.nome}</td>
                          <td className="border border-black p-1 dark:border-neutral-600 font-bold">{l.para.codigoSigef || l.para.nome}</td>
                          <td className="border border-black p-1 dark:border-neutral-600">{azimuteDMS(azEf)}</td>
                          <td className="border border-black p-1 dark:border-neutral-600">{rumo}</td>
                          <td className="border border-black p-1 dark:border-neutral-600">{numBR(l.distancia)}</td>
                          <td className="border border-black p-1 dark:border-neutral-600 text-left truncate max-w-[200px]">{nomeC}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
