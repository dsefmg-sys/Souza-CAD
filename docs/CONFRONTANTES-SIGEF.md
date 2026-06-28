# Importar confrontantes certificados do SIGEF — pesquisa e plano

Objetivo: trazer a geometria de imóveis vizinhos **já certificados no SIGEF** para a nossa
poligonal **encostar exatamente** nos pontos do outro agrimensor.

## Fontes oficiais (INCRA / Acervo Fundiário)
- WMS/WFS i3geo: `http://acervofundiario.incra.gov.br/i3geo/ogc.php?tema=certificada_sigef_particular_<uf>`
  (ex.: `_mg`, `_es`). WMS é só leitura; WFS dá vetor.
- Shapefile por estado: `https://certificacao.incra.gov.br/csv_shp/zip/Sigef Brasil_<UF>.zip`.
- Exportação de parcela (login gov.br): `https://certificacao.incra.gov.br/csv_shp/export_shp.py`.
- KML via i3geo.

## Limitação
Os servidores do INCRA **não enviam CORS** e são lentos/instáveis. Um app **só no navegador**
não consegue consumir o WFS direto — precisaria de um **proxy no servidor**. Isso fica para
quando houver backend (nuvem).

## Caminho adotado agora (sem backend, sem CORS)
**Importar a geometria do vizinho certificado** que o usuário obtém externamente:
- baixa o SHP do Acervo Fundiário, OU exporta a parcela do QGIS para **GeoJSON** (ou DXF — já
  importamos DXF).
- O app lê os vértices da parcela e os usa como **referência + alvos de snap**, para a nossa
  poligonal encostar exata nos pontos certificados do confrontante.

Implementado: **importador de GeoJSON** (`src/lib/io/geojson.ts`) — lê Polygon/MultiPolygon,
detecta geográfica (lon/lat) x UTM pela magnitude, e devolve anéis. Os pontos viram camada de
referência no mapa e entram nos alvos de snap.

## Futuro (com backend)
Proxy server que consulta o WFS do INCRA por bbox e devolve GeoJSON ao app; busca automática
dos confrontantes que tocam a nossa poligonal.
