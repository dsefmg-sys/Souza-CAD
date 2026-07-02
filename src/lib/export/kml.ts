import { Vertex, ImovelData } from '../topo/types';
import { escaparXml } from './sanitizar';

/**
 * Gera uma string contendo o conteúdo XML KML da gleba e seus vértices.
 */
export function gerarKML(vertices: Vertex[], imovel: ImovelData): string {
  if (vertices.length === 0) return '';

  // Filtra apenas os vértices que possuem latitude e longitude válidas
  const ptsValidos = vertices.filter((v) => Number.isFinite(v.lat) && Number.isFinite(v.lon));
  if (ptsValidos.length === 0) return '';

  // Monta a string do anel do polígono (deve fechar no primeiro ponto)
  const coordsAnel = [...ptsValidos, ptsValidos[0]]
    .map((v) => `${v.lon},${v.lat},${v.elevacao || 0}`)
    .join('\n            ');

  // Marcadores de vértice individuais
  const placemarksVertices = ptsValidos
    .map((v, i) => {
      const nome = escaparXml(v.codigoSigef) || `P${i + 1}`;
      return `    <Placemark>
      <name>${nome}</name>
      <description><![CDATA[
        <b>Vértice:</b> ${nome}<br/>
        <b>Latitude:</b> ${v.lat.toFixed(7)}°<br/>
        <b>Longitude:</b> ${v.lon.toFixed(7)}°<br/>
        <b>Altitude:</b> ${v.elevacao != null ? `${v.elevacao.toFixed(2)} m` : '—'}<br/>
        <b>Norte (UTM):</b> ${v.norte.toFixed(3)} m<br/>
        <b>Leste (UTM):</b> ${v.leste.toFixed(3)} m
      ]]></description>
      <styleUrl>#vertex_style</styleUrl>
      <Point>
        <coordinates>${v.lon},${v.lat},${v.elevacao || 0}</coordinates>
      </Point>
    </Placemark>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escaparXml(imovel.denominacao) || 'Imovel Sem Nome'}</name>
    <description>Gleba e vértices exportados pelo Souza-CAD</description>
    
    <Style id="polygon_style">
      <LineStyle>
        <color>ff0000ff</color> <!-- vermelho sólido -->
        <width>2.5</width>
      </LineStyle>
      <PolyStyle>
        <color>5500ff00</color> <!-- verde semitransparente -->
      </PolyStyle>
    </Style>
    
    <Style id="vertex_style">
      <IconStyle>
        <scale>0.8</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/paddle/red-circle.png</href>
        </Icon>
      </IconStyle>
    </Style>

    <Placemark>
      <name>Limites da Área</name>
      <description>${escaparXml(imovel.denominacao) || 'Polígono principal do imóvel'}</description>
      <styleUrl>#polygon_style</styleUrl>
      <Polygon>
        <tessellate>1</tessellate>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              ${coordsAnel}
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>

${placemarksVertices}
  </Document>
</kml>`;
}

/**
 * Inicia o download do arquivo KML no navegador.
 */
export function exportarKML(vertices: Vertex[], imovel: ImovelData) {
  const xml = gerarKML(vertices, imovel);
  if (!xml) return;
  
  const blob = new Blob([xml], { type: 'application/vnd.google-earth.kml+xml;charset=utf-8' });
  const filename = `${(imovel.denominacao || 'imovel').toLowerCase().replace(/\s+/g, '_')}.kml`;
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
