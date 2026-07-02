import { Vertex, ImovelData } from '../topo/types';
import { escaparXml } from './sanitizar';

/**
 * Gera uma string contendo o conteúdo XML GPX da gleba e seus vértices, para uso em
 * GPS portáteis de campo (Garmin e similares). Cada vértice vira um waypoint (com o
 * código SIGEF como nome) e a poligonal fechada vira uma trilha (track).
 */
export function gerarGPX(vertices: Vertex[], imovel: ImovelData): string {
  if (vertices.length === 0) return '';

  const ptsValidos = vertices.filter((v) => Number.isFinite(v.lat) && Number.isFinite(v.lon));
  if (ptsValidos.length === 0) return '';

  const waypoints = ptsValidos
    .map((v, i) => {
      const nome = escaparXml(v.codigoSigef) || `P${i + 1}`;
      return `  <wpt lat="${v.lat.toFixed(8)}" lon="${v.lon.toFixed(8)}">
    <ele>${v.elevacao || 0}</ele>
    <name>${nome}</name>
    <desc>Este: ${v.leste.toFixed(3)} m | Norte: ${v.norte.toFixed(3)} m</desc>
  </wpt>`;
    })
    .join('\n');

  const trkpts = [...ptsValidos, ptsValidos[0]]
    .map((v) => `      <trkpt lat="${v.lat.toFixed(8)}" lon="${v.lon.toFixed(8)}"><ele>${v.elevacao || 0}</ele></trkpt>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Souza-CAD" xmlns="http://www.topografix.com/GPX/1/1">
${waypoints}
  <trk>
    <name>${escaparXml(imovel.denominacao) || 'Imovel Sem Nome'}</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`;
}

/**
 * Inicia o download do arquivo GPX no navegador.
 */
export function exportarGPX(vertices: Vertex[], imovel: ImovelData) {
  const xml = gerarGPX(vertices, imovel);
  if (!xml) return;

  const blob = new Blob([xml], { type: 'application/gpx+xml;charset=utf-8' });
  const filename = `${(imovel.denominacao || 'imovel').toLowerCase().replace(/\s+/g, '_')}.gpx`;

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
