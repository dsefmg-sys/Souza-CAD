'use client';

import type { Vertex, ImovelData, TecnicoData, ResultadoCalculo } from '@/lib/topo/types';
import { numBR } from '@/lib/topo/geometry';
import { valoresEfetivos } from '@/lib/topo/conferencia';

interface Props {
  vertices: Vertex[];
  res: ResultadoCalculo;
  imovel: ImovelData;
  tecnico: TecnicoData;
}

const W = 1123; // A4 paisagem aprox (px @96dpi: 1123x794)
const H = 794;
const MARG = { top: 30, right: 290, bottom: 30, left: 60 };

function intervaloGrade(extent: number): number {
  const alvo = extent / 6; // ~6 linhas
  const pot = Math.pow(10, Math.floor(Math.log10(alvo)));
  for (const m of [1, 2, 5, 10]) if (pot * m >= alvo) return pot * m;
  return pot * 10;
}

export default function Planta({ vertices, res, imovel, tecnico }: Props) {
  if (vertices.length < 3) {
    return <div className="p-8 text-sm text-muted-foreground">Importe pontos para gerar a planta.</div>;
  }
  const xs = vertices.map((v) => v.leste);
  const ys = vertices.map((v) => v.norte);
  let minX = Math.min(...xs), maxX = Math.max(...xs);
  let minY = Math.min(...ys), maxY = Math.max(...ys);
  const padX = (maxX - minX) * 0.12 || 10;
  const padY = (maxY - minY) * 0.12 || 10;
  minX -= padX; maxX += padX; minY -= padY; maxY += padY;

  const areaW = W - MARG.left - MARG.right;
  const areaH = H - MARG.top - MARG.bottom;
  // Escala "real" arredondada para múltiplo de 250 (1:3000, 1:3250, ...), nada de número picado.
  const escalaFit = Math.min(areaW / (maxX - minX), areaH / (maxY - minY));
  const denomNatural = 1 / (escalaFit * 0.0002645); // 1px @96dpi = 0,2645 mm
  const escalaDenominador = Math.max(250, Math.ceil(denomNatural / 250) * 250);
  const escala = 1 / (escalaDenominador * 0.0002645);
  // centraliza o desenho na área útil
  const desW = (maxX - minX) * escala;
  const desH = (maxY - minY) * escala;
  const offX = MARG.left + (areaW - desW) / 2;
  const offY = MARG.top + (areaH - desH) / 2;

  const sx = (e: number) => offX + (e - minX) * escala;
  const sy = (n: number) => offY + (maxY - n) * escala; // norte para cima

  const intervalo = intervaloGrade(Math.max(maxX - minX, maxY - minY));
  const linhasX: number[] = [];
  for (let x = Math.ceil(minX / intervalo) * intervalo; x <= maxX; x += intervalo) linhasX.push(x);
  const linhasY: number[] = [];
  for (let y = Math.ceil(minY / intervalo) * intervalo; y <= maxY; y += intervalo) linhasY.push(y);

  const pts = vertices.map((v) => `${sx(v.leste).toFixed(1)},${sy(v.norte).toFixed(1)}`).join(' ');
  const ef = valoresEfetivos(res, imovel);

  return (
    <svg id="planta-svg" viewBox={`0 0 ${W} ${H}`} width="100%" style={{ background: '#fff' }} xmlns="http://www.w3.org/2000/svg">
      <rect x={0} y={0} width={W} height={H} fill="#fff" />
      {/* moldura */}
      <rect x={10} y={10} width={W - 20} height={H - 20} fill="none" stroke="#000" strokeWidth={1.5} />

      {/* grade */}
      {linhasX.map((x) => (
        <g key={`x${x}`}>
          <line x1={sx(x)} y1={MARG.top} x2={sx(x)} y2={H - MARG.bottom} stroke="#999" strokeWidth={0.4} strokeDasharray="3 3" />
          <text x={sx(x)} y={H - MARG.bottom + 14} fontSize={9} textAnchor="middle" fill="#333">{x.toFixed(0)}</text>
        </g>
      ))}
      {linhasY.map((y) => (
        <g key={`y${y}`}>
          <line x1={MARG.left} y1={sy(y)} x2={W - MARG.right} y2={sy(y)} stroke="#999" strokeWidth={0.4} strokeDasharray="3 3" />
          <text x={MARG.left - 6} y={sy(y) + 3} fontSize={9} textAnchor="end" fill="#333">{y.toFixed(0)}</text>
        </g>
      ))}

      {/* polígono */}
      <polygon points={pts} fill="#fde68a" fillOpacity={0.25} stroke="#b45309" strokeWidth={1.6} />

      {/* vértices */}
      {vertices.map((v) => (
        <g key={v.id}>
          <circle cx={sx(v.leste)} cy={sy(v.norte)} r={v.tipo === 'M' ? 3.5 : 2.5} fill={v.tipo === 'M' ? '#b45309' : '#15803d'} stroke="#000" strokeWidth={0.5} />
          <text x={sx(v.leste) + 5} y={sy(v.norte) - 4} fontSize={8} fill="#000">{v.codigoSigef || 'S/N'}</text>
        </g>
      ))}

      {/* rosa dos ventos / norte */}
      <g transform={`translate(${W - MARG.right + 40}, 70)`}>
        <polygon points="0,-26 7,8 0,0 -7,8" fill="#000" />
        <text x={0} y={-30} fontSize={12} fontWeight="bold" textAnchor="middle">N</text>
      </g>

      {/* quadro de dados */}
      <g transform={`translate(${W - MARG.right + 18}, 110)`}>
        <rect x={0} y={0} width={MARG.right - 30} height={300} fill="#fff" stroke="#000" strokeWidth={1} />
        {[
          ['Imóvel', imovel.denominacao],
          ['Matrícula', imovel.matricula],
          ['Proprietário', imovel.proprietario],
          ['Município', imovel.municipio],
          ['Área SGL', `${numBR(ef.areaHa, 4)} ha`],
          ['Área (m²)', `${numBR(ef.areaM2)} m²`],
          ['Perímetro', `${numBR(ef.perimetro)} m`],
          ['Vértices', String(vertices.length)],
          ['Sistema', 'SIRGAS2000 / UTM'],
          ['Escala aprox.', `1:${escalaDenominador}`],
          ['Resp. técnico', tecnico.nome],
          ['Credenciamento', `INCRA: ${tecnico.credenciamentoIncra}`],
        ].map(([k, val], i) => (
          <g key={i} transform={`translate(8, ${20 + i * 23})`}>
            <text fontSize={9} fontWeight="bold" fill="#333">{k}</text>
            <text fontSize={10} y={11} fill="#000">{String(val).slice(0, 34)}</text>
          </g>
        ))}
      </g>

      <text x={W / 2} y={H - 16} fontSize={11} fontWeight="bold" textAnchor="middle">
        PLANTA DO IMÓVEL — {imovel.denominacao}
      </text>
    </svg>
  );
}
