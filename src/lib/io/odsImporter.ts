import JSZip from 'jszip';
import type { Projeto, Vertex, Confrontante, ImovelData, Gleba } from '../topo/types';
import { novoId, salvarProjeto } from '../store/projects';
import { geoParaUtm, utmParaGeo } from '../topo/coords';

function parseCoordenada(val: string): number | null {
  if (!val) return null;
  
  // Substitui vírgulas por pontos decimais
  const str = val.trim().replace(',', '.');
  
  // Se contiver múltiplos blocos de números separados por espaços, é DMS (graus minutos segundos)!
  const partesEspaco = str.split(/\s+/).filter(Boolean);
  const temEspacoMultiplo = partesEspaco.length >= 3 && partesEspaco.slice(0, 3).every(p => /^-?\d+(\.\d+)?$/.test(p.replace(/[^0-9.-]/g, '')));
  
  if (temEspacoMultiplo) {
    const isSouthOrWest = /[SW]/i.test(str) || str.startsWith('-');
    const clean = str.replace(/[^0-9.\s-]/g, ' ').trim().split(/\s+/).filter(Boolean);
    if (clean.length >= 3) {
      const d = Math.abs(parseFloat(clean[0]));
      const m = Math.abs(parseFloat(clean[1]));
      const s = Math.abs(parseFloat(clean[2]));
      if (Number.isFinite(d) && Number.isFinite(m) && Number.isFinite(s)) {
        let dec = d + m / 60 + s / 3600;
        if (isSouthOrWest) dec = -dec;
        return dec;
      }
    }
  }
  
  // Se for DMS tradicional com os símbolos de graus/minutos/segundos (° ' ")
  if (/[°'"]/.test(str)) {
    const isSouthOrWest = /[SW]/i.test(str) || str.startsWith('-');
    const clean = str.replace(/[^0-9.\s-]/g, ' ').trim().split(/\s+/).filter(Boolean);
    if (clean.length >= 3) {
      const d = Math.abs(parseFloat(clean[0]));
      const m = Math.abs(parseFloat(clean[1]));
      const s = Math.abs(parseFloat(clean[2]));
      if (Number.isFinite(d) && Number.isFinite(m) && Number.isFinite(s)) {
        let dec = d + m / 60 + s / 3600;
        if (isSouthOrWest) dec = -dec;
        return dec;
      }
    }
  }
  
  // Se for float decimal simples
  const num = parseFloat(str);
  if (Number.isFinite(num)) {
    return num;
  }
  
  return null;
}

interface RawVertice {
  codigo: string;
  latOrEste: number;
  lonOrNorte: number;
  elev: number;
  metodo: string;
  tipoLimite: string;
  confrontante: string;
  matricula?: string;
  cns?: string;
}

interface SheetData {
  nome: string;
  vertices: RawVertice[];
}

export async function importarOdsParaProjeto(file: File): Promise<Projeto> {
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);
  const contentXml = await zip.file('content.xml')?.async('string');
  
  if (!contentXml) {
    throw new Error('Formato ODS inválido: arquivo content.xml não foi localizado no pacote.');
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(contentXml, 'text/xml');
  const tables = Array.from(doc.getElementsByTagName('table:table'));

  if (tables.length === 0) {
    throw new Error('Nenhuma tabela de planilha encontrada dentro do arquivo ODS.');
  }

  let denominacaoImovel = '';
  let municipioImovel = '';
  let ufImovel = '';
  let proprietarioNome = '';
  let proprietarioCpf = '';
  let matriculaImovel = '';
  
  let fusoInformado = 23;
  let hemisferioInformado: 'N' | 'S' = 'S';

  const sheetsData: SheetData[] = [];

  // Varrer todas as tabelas procurando dados cadastrais, metadados de projeção e vértices por aba
  for (let tIdx = 0; tIdx < tables.length; tIdx++) {
    const table = tables[tIdx];
    const sheetName = table.getAttribute('table:name') || table.getAttribute('table:title') || `Gleba ${tIdx + 1}`;
    const rows = Array.from(table.getElementsByTagName('table:table-row'));
    
    const tableMatrix: string[][] = [];
    
    for (let rIdx = 0; rIdx < rows.length; rIdx++) {
      const row = rows[rIdx];
      const cellsNodes = Array.from(row.children);
      const rowTexts: string[] = [];

      for (const cellNode of cellsNodes) {
        const tagName = cellNode.tagName.toLowerCase();
        if (tagName.includes('table-cell') || tagName.includes('covered-table-cell')) {
          const repeatAttr = cellNode.getAttribute('table:number-columns-repeated');
          const paragraphs = Array.from(cellNode.getElementsByTagName('text:p'));
          const cellText = paragraphs.map((p) => p.textContent || '').join(' ').trim();

          // Evita estouro de células vazias repetidas no Calc (ex: 16380)
          const count = cellText ? (repeatAttr ? Math.min(parseInt(repeatAttr, 10), 100) : 1) : 1;
          for (let c = 0; c < count; c++) {
            rowTexts.push(cellText);
          }
        }
      }

      tableMatrix.push(rowTexts);
    }

    // Processar metadados cadastrais em qualquer linha do documento
    for (let rIdx = 0; rIdx < tableMatrix.length; rIdx++) {
      const rowTexts = tableMatrix[rIdx];
      const rowStr = rowTexts.join(' | ').toUpperCase();

      if (rowStr.includes('DENOMINAÇÃO') || rowStr.includes('NOME DO IMÓVEL') || rowStr.includes('IMOVEL:')) {
        const idx = rowTexts.findIndex((t) => /DENOMINAÇ|NOME DO IM|IMOVEL/i.test(t));
        if (idx >= 0 && rowTexts[idx + 1] && !denominacaoImovel) denominacaoImovel = rowTexts[idx + 1];
      }
      
      if (rowStr.includes('MUNICÍPIO') || rowStr.includes('MUNICIPIO') || rowStr.includes('MUNICÍPIO(S)')) {
        const idx = rowTexts.findIndex((t) => /MUNIC/i.test(t));
        if (idx >= 0 && !municipioImovel) {
          const valNext = rowTexts[idx + 1];
          if (valNext && valNext.trim() && !/adicionar/i.test(valNext)) {
            municipioImovel = valNext;
          } else if (tableMatrix[rIdx + 1]) {
            const nextTexts = tableMatrix[rIdx + 1].filter(Boolean);
            const munCand = nextTexts.find(t => !/adicionar/i.test(t) && t.length > 2 && !/munic/i.test(t));
            if (munCand) municipioImovel = munCand;
          }
        }
      }
      
      if (rowStr.includes('UF') && !ufImovel) {
        const idx = rowTexts.findIndex((t) => /^UF$/i.test(t.trim()));
        if (idx >= 0 && rowTexts[idx + 1]) ufImovel = rowTexts[idx + 1];
      }
      
      if ((rowStr.includes('PROPRIETÁRIO') || rowStr.includes('PROPRIETARIO') || rowStr.includes('REQUERENTE')) && !proprietarioNome) {
        const idx = rowTexts.findIndex((t) => /PROPRIET|REQUER/i.test(t));
        if (idx >= 0 && rowTexts[idx + 1]) proprietarioNome = rowTexts[idx + 1];
      }
      
      if ((rowStr.includes('CPF') || rowStr.includes('CNPJ')) && !proprietarioCpf) {
        const idx = rowTexts.findIndex((t) => /CPF|CNPJ/i.test(t));
        if (idx >= 0 && rowTexts[idx + 1]) proprietarioCpf = rowTexts[idx + 1];
      }
      
      if ((rowStr.includes('MATRÍCULA') || rowStr.includes('MATRICULA')) && !matriculaImovel) {
        const idx = rowTexts.findIndex((t) => /MATRIC/i.test(t));
        if (idx >= 0) {
          const matCand = rowTexts.slice(idx + 1).find(t => t.trim().length > 0 && !/matric/i.test(t));
          if (matCand) matriculaImovel = matCand;
        }
      }

      if (rowStr.includes('MERIDIANO CENTRAL')) {
        const idx = rowTexts.findIndex((t) => /MERIDIANO CENTRAL/i.test(t));
        if (idx >= 0 && rowTexts[idx + 1]) {
          const mc = parseInt(rowTexts[idx + 1].replace(/[^0-9.-]/g, ''), 10);
          if (Number.isFinite(mc) && mc !== 0) {
            fusoInformado = Math.floor((mc + 183) / 6);
          }
        }
      }
      
      if (rowStr.includes('HEMISFÉRIO') || rowStr.includes('HEMISFERIO')) {
        const idx = rowTexts.findIndex((t) => /HEMISF/i.test(t));
        if (idx >= 0 && rowTexts[idx + 1]) {
          const hStr = rowTexts[idx + 1].trim().toUpperCase();
          if (hStr.startsWith('S') || hStr.includes('SUL')) hemisferioInformado = 'S';
          else if (hStr.startsWith('N') || hStr.includes('NORTE')) hemisferioInformado = 'N';
        }
      }
    }

    // Varrer os vértices desta aba específica
    const sheetVertices: RawVertice[] = [];

    // Mapeamento dinâmico de cabeçalho da tabela se houver
    let colVertice = -1;
    let colLongOrEste = -1;
    let colLatOrNorte = -1;
    let colElev = -1;
    let colMetodo = -1;
    let colTipoLimite = -1;
    let colCns = -1;
    let colMatricula = -1;
    let colConfrontante = -1;

    for (let rIdx = 0; rIdx < tableMatrix.length; rIdx++) {
      const rowTexts = tableMatrix[rIdx];
      const rowUpper = rowTexts.map((t) => t.toUpperCase());

      // Tentar encontrar a linha de cabeçalho
      if (rowUpper.some((t) => t.includes('VÉRTICE') || t.includes('VERTICE'))) {
        colVertice = rowUpper.findIndex((t) => t.includes('VÉRTICE') || t.includes('VERTICE'));
        colLongOrEste = rowUpper.findIndex((t) => t.includes('E/LONG') || t.includes('LONGITUDE') || t.includes('ESTE'));
        colLatOrNorte = rowUpper.findIndex((t) => t.includes('N/LAT') || t.includes('LATITUDE') || t.includes('NORTE'));
        colElev = rowUpper.findIndex((t) => t === 'H' || t.includes('ALTITUDE') || t.includes('SIGMA H'));
        if (colElev >= 0 && rowUpper[colElev].includes('SIGMA H') && colElev > 0) colElev = colElev - 1; // pega o h real antes do sigma h
        colMetodo = rowUpper.findIndex((t) => t.includes('MÉTODO') || t.includes('METODO'));
        colTipoLimite = rowUpper.findIndex((t) => t.includes('LIMITE') || t.includes('POSICIONAMENTO'));
        colCns = rowUpper.findIndex((t) => t.includes('CNS'));
        colMatricula = rowUpper.findIndex((t) => t.includes('MATRÍCULA') || t.includes('MATRICULA'));
        colConfrontante = rowUpper.findIndex((t) => t.includes('DESCRITIVO') || t.includes('CONFRONTANTE'));
      }

      // Procurar código de vértice na linha
      const vertCodeIdx = rowTexts.findIndex((t) => /^[A-Z0-9]{3,6}-[MPV]-0*\d+/i.test(t) || /^[MPV]-0*\d+/i.test(t));
      if (vertCodeIdx >= 0) {
        const codigo = rowTexts[vertCodeIdx];
        
        let val1: number | null = null; // Longitude ou Este
        let val2: number | null = null; // Latitude ou Norte
        let val3: number = 0; // Altitude h
        let metodo = 'PG7';
        let tipoLimite = 'LA6';
        let confrontante = '';
        let matStr = '';
        let cnsStr = '';

        // Se mapeamos pelo cabeçalho do SIGEF:
        if (colLongOrEste >= 0 && colLatOrNorte >= 0 && rowTexts[colLongOrEste] && rowTexts[colLatOrNorte]) {
          val1 = parseCoordenada(rowTexts[colLongOrEste]);
          val2 = parseCoordenada(rowTexts[colLatOrNorte]);
          if (colElev >= 0 && rowTexts[colElev]) val3 = parseCoordenada(rowTexts[colElev]) ?? 0;
          if (colMetodo >= 0 && rowTexts[colMetodo]) metodo = rowTexts[colMetodo];
          if (colTipoLimite >= 0 && rowTexts[colTipoLimite]) tipoLimite = rowTexts[colTipoLimite];
          if (colCns >= 0 && rowTexts[colCns]) cnsStr = rowTexts[colCns];
          if (colMatricula >= 0 && rowTexts[colMatricula]) matStr = rowTexts[colMatricula];
          if (colConfrontante >= 0 && rowTexts[colConfrontante]) confrontante = rowTexts[colConfrontante];
        }

        // Fallback resiliente baseado nas colunas do SIGEF padrão (Col B = Longitude, Col D = Latitude - pula Sigma long!)
        if (val1 === null || val2 === null) {
          // Col B (vIdx + 1): E/Long
          const cLong = rowTexts[vertCodeIdx + 1];
          // Col C (vIdx + 2): Sigma long (PULA!) -> Col D (vIdx + 3): N/Lat
          const cLatCand1 = rowTexts[vertCodeIdx + 3];
          const cLatCand2 = rowTexts[vertCodeIdx + 2]; // Em planilhas sem coluna Sigma

          const parsedLong = parseCoordenada(cLong);
          let parsedLat = parseCoordenada(cLatCand1);

          // Se parsedLat em vIdx + 3 for nulo ou igual a zero (ex: Sigma long 0,00), verifica a vIdx + 2
          if ((parsedLat === null || parsedLat === 0) && parsedLong !== null) {
            const altLat = parseCoordenada(cLatCand2);
            if (altLat !== null && Math.abs(altLat) > 1) {
              parsedLat = altLat;
            }
          }

          if (parsedLong !== null && parsedLat !== null) {
            val1 = parsedLong;
            val2 = parsedLat;

            // Altitude h (Col F = vIdx + 5)
            const cElev = rowTexts[vertCodeIdx + 5] || rowTexts[vertCodeIdx + 4];
            if (cElev) val3 = parseCoordenada(cElev) ?? 0;

            // Busca por método, tipo de limite, CNS, matrícula e confrontante nas colunas restantes
            // Col J (vIdx + 9): Tipo Limite, Col K (vIdx + 10): CNS, Col L (vIdx + 11): Matrícula, Col M (vIdx + 12): Descritivo
            if (rowTexts[vertCodeIdx + 10] && /^\d{2}\.\d{3}/.test(rowTexts[vertCodeIdx + 10])) {
              cnsStr = rowTexts[vertCodeIdx + 10];
            }
            if (rowTexts[vertCodeIdx + 11] && /^\d+$/.test(rowTexts[vertCodeIdx + 11])) {
              matStr = rowTexts[vertCodeIdx + 11];
            }

            for (let i = vertCodeIdx + 6; i < rowTexts.length; i++) {
              const txt = rowTexts[i];
              if (/^(P[GA]\d|PT\d|RTK|GNSS)/i.test(txt)) metodo = txt;
              else if (/^(L[AN]\d|LOD)/i.test(txt)) tipoLimite = txt;
              else if (txt.length > 3 && !/^\d+$/.test(txt) && parseCoordenada(txt) === null && !/PG\d|LA\d/i.test(txt)) {
                if (!confrontante) confrontante = txt;
              }
            }
          }
        }

        if (matStr && !matriculaImovel) {
          matriculaImovel = matStr;
        }

        if (val1 !== null && val2 !== null) {
          sheetVertices.push({
            codigo,
            latOrEste: val1,
            lonOrNorte: val2,
            elev: val3,
            metodo,
            tipoLimite,
            confrontante,
            matricula: matStr,
            cns: cnsStr
          });
        }
      }
    }

    if (sheetVertices.length > 0) {
      sheetsData.push({
        nome: sheetName,
        vertices: sheetVertices
      });
    }
  }

  if (sheetsData.length === 0) {
    throw new Error('Nenhum vértice com código no padrão do SIGEF (ex: M-0001, P-0001) localizado na planilha ODS.');
  }

  // Recalcular fuso UTM e hemisfério dinamicamente a partir do primeiro vértice válido da primeira aba
  const primeiroVert = sheetsData[0].vertices[0];
  if (primeiroVert) {
    const val1 = primeiroVert.latOrEste;
    const val2 = primeiroVert.lonOrNorte;
    if (Math.abs(val1) <= 180 && Math.abs(val2) <= 90) {
      fusoInformado = Math.floor((val1 + 180) / 6) + 1;
      hemisferioInformado = val2 < 0 ? 'S' : 'N';
    }
  }

  const municipioUf = municipioImovel ? (ufImovel && !municipioImovel.includes(ufImovel) ? `${municipioImovel} - ${ufImovel}` : municipioImovel) : '';
  const nomeProjeto = (denominacaoImovel || file.name.replace(/\.ods$/i, '')).toUpperCase();

  // Construir as Glebas do Projeto (uma para cada aba contendo vértices)
  const glebasProcessadas: Gleba[] = sheetsData.map((sData, gIdx) => {
    const verticesProcessados: Vertex[] = sData.vertices.map((v, i) => {
      let lat: number;
      let lon: number;
      let leste: number;
      let norte: number;

      const val1 = v.latOrEste;
      const val2 = v.lonOrNorte;

      if (Math.abs(val1) <= 180 && Math.abs(val2) <= 90) {
        lon = val1;
        lat = val2;
        const utm = geoParaUtm(lat, lon, fusoInformado, hemisferioInformado);
        leste = utm.leste;
        norte = utm.norte;
      } else {
        leste = val1;
        norte = val2;
        const geo = utmParaGeo(leste, norte, fusoInformado, hemisferioInformado);
        lat = geo.lat;
        lon = geo.lon;
      }

      const tipoLetra = v.codigo.match(/([MPV])/i)?.[1]?.toUpperCase() || 'M';
      const tipo = (tipoLetra === 'P' ? 'P' : tipoLetra === 'V' ? 'V' : 'M') as 'M' | 'P' | 'V';

      return {
        id: `v-ods-${gIdx}-${i}-${Date.now()}`,
        ordem: i,
        nome: v.codigo,
        codigoCampo: v.codigo,
        codigoSigef: v.codigo,
        lat,
        lon,
        leste,
        norte,
        elevacao: v.elev,
        tipo,
        metodo: v.metodo as any,
        tipoLimite: v.tipoLimite,
        isDivisa: true,
        registrado: true
      };
    });

    const nomesConfrontantes = Array.from(new Set(sData.vertices.map((v) => v.confrontante).filter(Boolean)));
    const confrontantesProcessados: Confrontante[] = nomesConfrontantes.map((nome, idx) => {
      const sampleVert = sData.vertices.find((v) => v.confrontante === nome);
      return {
        id: `conf-ods-${gIdx}-${idx}`,
        nome,
        cpf: '',
        matricula: sampleVert?.matricula || '',
        cns: sampleVert?.cns || '',
        tipo: 'particular',
        condicao: 'proprietario'
      };
    });

    const confrontantePorLado: Record<number, string> = {};
    sData.vertices.forEach((v, idx) => {
      if (v.confrontante) {
        const confObj = confrontantesProcessados.find((c) => c.nome === v.confrontante);
        if (confObj) {
          confrontantePorLado[idx] = confObj.id;
        }
      }
    });

    return {
      id: `gleba-ods-${gIdx}-${Date.now()}`,
      denominacao: sData.nome || `Gleba ${gIdx + 1}`,
      parcela: String(gIdx + 1).padStart(3, '0'),
      vertices: verticesProcessados,
      confrontantes: confrontantesProcessados,
      confrontantePorLado
    };
  });

  const imovelData: ImovelData = {
    denominacao: denominacaoImovel || nomeProjeto,
    municipio: municipioUf,
    proprietario: proprietarioNome,
    cpfProprietario: proprietarioCpf,
    matricula: matriculaImovel,
    cns: '',
    codigoImovelIncra: '',
    tipoPessoa: 'Física',
    local: municipioUf,
    naturezaServico: 'Georreferenciamento Rural',
    naturezaArea: 'rural',
    situacao: 'Imóvel Registrado'
  };

  const novoProj: Projeto = {
    id: novoId(),
    nome: nomeProjeto,
    criadoEm: Date.now(),
    atualizadoEm: Date.now(),
    zonaUtm: fusoInformado,
    hemisferio: hemisferioInformado,
    imovel: imovelData,
    glebas: glebasProcessadas
  };

  // Salvar no IndexedDB e Firestore
  await salvarProjeto(novoProj);

  return novoProj;
}
