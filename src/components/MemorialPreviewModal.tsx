'use client';

import { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye, Download } from 'lucide-react';
import type { ImovelData, TecnicoData, Confrontante, Vertex, PessoaQualificada } from '@/lib/topo/types';
import { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import { calcular } from '@/lib/topo/calcular';
import { valoresEfetivos } from '@/lib/topo/conferencia';
import { rotulosProfissional } from '@/lib/topo/profissional';
import { construirNarrativaSegmentos } from '@/lib/export/memorial';
import { carregarModelos, preencherModelo } from '@/lib/store/modelos';
import { numBR, formatMatricula } from '@/lib/topo/geometry';
import { obterComarca } from '@/lib/topo/municipios';

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
  onBaixar?: (blobEditado?: Blob) => void;
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
  modo,
  dataExtenso,
  requerente,
  transmitente,
  onBaixar,
}: Props) {
  const papelRef = useRef<HTMLDivElement>(null);

  async function gerarDocxDoHtmlEditable(container: HTMLElement): Promise<Blob> {
    const children: (Paragraph | Table)[] = [];
    const CORPO = 22; // 11pt

    const parseNodesToRuns = (parent: HTMLElement): TextRun[] => {
      const runs: TextRun[] = [];
      parent.childNodes.forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const txt = child.textContent || '';
          if (txt) runs.push(new TextRun({ text: txt, size: CORPO }));
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          const el = child as HTMLElement;
          const tag = el.tagName.toLowerCase();
          if (tag === 'br') {
            runs.push(new TextRun({ text: '\n', size: CORPO }));
          } else if (tag === 'strong' || tag === 'b') {
            runs.push(new TextRun({ text: el.innerText || el.textContent || '', bold: true, size: CORPO }));
          } else {
            runs.push(...parseNodesToRuns(el));
          }
        }
      });
      return runs;
    };

    container.childNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();

        if (tag === 'table') {
          const rows: TableRow[] = [];
          const trs = el.querySelectorAll('tr');
          trs.forEach((tr) => {
            const cells: TableCell[] = [];
            const tds = tr.querySelectorAll('td');
            tds.forEach((td) => {
              const widthStr = td.getAttribute('style') || '';
              const wMatch = widthStr.match(/width:\s*(\d+)%/i);
              const wPct = wMatch ? parseFloat(wMatch[1]) : (100 / tds.length);
              
              const cellRuns = parseNodesToRuns(td);
              cells.push(new TableCell({
                width: { size: wPct, type: WidthType.PERCENTAGE },
                borders: {
                  top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                  bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                  left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                  right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                },
                children: [new Paragraph({ children: cellRuns, spacing: { after: 120 } })],
              }));
            });
            rows.push(new TableRow({ children: cells }));
          });
          children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));
        } else if (tag === 'h2' || tag === 'h3' || tag === 'h4') {
          const text = el.innerText || el.textContent || '';
          children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 360, after: 160 },
            children: [new TextRun({ text, bold: true, size: tag === 'h2' ? 28 : 24 })],
          }));
        } else if (tag === 'div' || tag === 'p') {
          const text = el.innerText || el.textContent || '';
          if (text.includes('*** DADOS FICTÍCIOS')) return;

          let alignment: any = AlignmentType.JUSTIFIED;
          if (el.classList.contains('text-center')) alignment = AlignmentType.CENTER;
          else if (el.classList.contains('text-right')) alignment = AlignmentType.RIGHT;

          const isAssinatura = el.classList.contains('text-center') && (el.classList.contains('pt-12') || el.classList.contains('pt-10'));
          const isNarrativa = el.classList.contains('indent-8');

          const paragraphRuns = parseNodesToRuns(el);
          children.push(new Paragraph({
            alignment,
            indent: isNarrativa ? { firstLine: 450 } : undefined,
            spacing: { before: isAssinatura ? 360 : 120, after: 120 },
            children: paragraphRuns,
          }));
        }
      }
    });

    const doc = new Document({
      styles: { default: { document: { run: { font: 'Arial', size: CORPO } } } },
      sections: [{
        properties: { page: { margin: { top: 1417, bottom: 1417, left: 1417, right: 1417 } } },
        children,
      }],
    });
    return await Packer.toBlob(doc);
  }

  const handleBaixar = async () => {
    if (onBaixar) {
      if (papelRef.current) {
        try {
          const blob = await gerarDocxDoHtmlEditable(papelRef.current);
          onBaixar(blob);
        } catch (e) {
          console.error('[MEMORIAL] Falha ao compilar HTML editado:', e);
          onBaixar();
        }
      } else {
        onBaixar();
      }
      onOpenChange(false);
    }
  };

  // Computa os dados geométricos do polígono
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
    comarca: obterComarca(imovel),
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
            {onBaixar && (
              <Button size="sm" className="text-xs gap-1.5 bg-green-600 hover:bg-green-700 text-white" onClick={handleBaixar}>
                <Download className="size-3" />
                Baixar DOCX
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Papel A4 Virtual com Scroll - Blends in with dialog background to avoid weird rectangle */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 flex justify-center bg-background">
          <div ref={papelRef} contentEditable suppressContentEditableWarning className="text-foreground w-full max-w-[800px] font-serif text-[13px] leading-relaxed space-y-8 outline-none focus:ring-1 focus:ring-amber-500/30">
            
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

            {/* Identificação em tabela de duas colunas, espelhando o DOCX */}
            {(() => {
              const isUrbano = imovel.tipoImovel === 'urbano';
              const labelArea = isUrbano ? 'Área SGL (m²):' : 'Área SGL (ha):';
              const valArea = isUrbano ? `${numBR(ef.areaHa * 10000)} m²` : `${numBR(ef.areaHa, 4)} ha`;
              const idMunicipal = isUrbano && imovel.inscricaoMunicipal
                ? ` / Insc.: ${imovel.inscricaoMunicipal}`
                : '';
              const valMatricula = imovel.regimeTerra === 'posse' && !imovel.matricula 
                ? 'Posse' 
                : `${imovel.matricula || '—'}${idMunicipal}`;

              return (
                <table className="w-full text-[13px] border-collapse my-4" style={{ border: 'none' }}>
                  <tbody>
                    <tr>
                      <td className="py-1 pr-4" style={{ width: '60%', border: 'none', verticalAlign: 'top' }}>
                        <strong>Imóvel:</strong> {imovel.denominacao || '—'}
                      </td>
                      <td className="py-1" style={{ width: '40%', border: 'none', verticalAlign: 'top' }}>
                        <strong>Matrícula:</strong> {valMatricula} {imovel.cns && `(CNS: ${imovel.cns})`}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 pr-4" style={{ border: 'none', verticalAlign: 'top' }}>
                        <strong>{labelArea}</strong> {valArea}
                      </td>
                      <td className="py-1" style={{ border: 'none', verticalAlign: 'top' }}>
                        <strong>Perímetro (m):</strong> {numBR(ef.perimetro)} m
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 pr-4" style={{ border: 'none', verticalAlign: 'top' }}>
                        <strong>Proprietário(a):</strong> {imovel.proprietario || '—'}
                      </td>
                      <td className="py-1" style={{ border: 'none', verticalAlign: 'top' }}>
                        <strong>TRT:</strong> {imovel.numeroTrt || tecnico?.art || '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              );
            })()}

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
            <div className="space-y-6 pt-2">
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
                  OBSERVAÇÕES:
                </h3>
                <p className="text-justify whitespace-pre-wrap">
                  {getMod(imovel.tipoImovel === 'urbano' ? 'memorialObservacoesUrbano' : 'memorialObservacoes').replace(/^\s*OBSERVAÇÕES:\s*/i, '')}
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
              <div className="text-center pt-12 space-y-1 max-w-sm mx-auto">
                <div className="border-t border-neutral-400 pt-1.5 font-bold uppercase">
                  {tecnico.nome}
                </div>
                <div className="text-neutral-500 text-[10px] space-y-0.5">
                  <div>{tecnico.formacao}</div>
                  <div>{rotulosProfissional(tecnico).registro}: {tecnico.cft}</div>
                  <div>Credenciamento INCRA: {tecnico.credenciamentoIncra}</div>
                </div>
              </div>
            )}

            {/* Assinatura dos Proprietários */}
            <div className="pt-12 space-y-4">
              <h4 className="font-bold text-center uppercase text-[10px] tracking-wider">PROPRIETÁRIOS</h4>
              <p className="text-justify whitespace-pre-wrap text-neutral-500 text-[10px]">{getMod('declProprietario')}</p>
              
              <div className="grid grid-cols-2 gap-8 pt-10">
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
              <div className="pt-12 space-y-4">
                <h4 className="font-bold text-center uppercase text-[10px] tracking-wider">COMPRADORES</h4>
                <p className="text-justify whitespace-pre-wrap text-neutral-500 text-[10px]">{getMod('declProprietario')}</p>
                
                <div className="grid grid-cols-2 gap-8 pt-10">
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
              <div className="pt-12 space-y-4">
                <h4 className="font-bold text-center uppercase text-[10px] tracking-wider">CONFRONTANTES</h4>
                <p className="text-justify whitespace-pre-wrap text-neutral-500 text-[10px]">{getMod('declConfrontantes')}</p>
                
                <div className="grid grid-cols-2 gap-x-8 gap-y-12 pt-10">
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
