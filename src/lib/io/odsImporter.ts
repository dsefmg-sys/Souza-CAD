import JSZip from 'jszip';
import type { Projeto, Vertex, Confrontante, ImovelData } from '../topo/types';
import { novoId, salvarProjeto } from '../store/projects';
import { geoParaUtm, utmParaGeo } from '../topo/coords';

function parseCoordenada(val: string): number | null {
  if (!val) return null;
  
  // Substitui vírgulas por pontos decimais
  const str = val.trim().replace(',', '.');
  
  // Se contiver múltiplos blocos de números separados por espaços, é DMS!
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
  
  // Se for DMS tradicional com os símbolos de graus/minutos/segundos
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

  const rawVertices: {
    codigo: string;
    latOrEste: number;
    lonOrNorte: number;
    elev: number;
    metodo: string;
    tipoLimite: string;
    confrontante: string;
  }[] = [];

  // Varrer todas as tabelas procurando dados cadastrais, metadados de projeção e a lista de vértices
  for (const table of tables) {
    const rows = Array.from(table.getElementsByTagName('table:table-row'));
    
    for (let rIdx = 0; rIdx < rows.length; rIdx++) {
      const row = rows[rIdx];
      const cellsNodes = Array.from(row.children);
      const rowTexts: string[] = [];

      for (const cellNode of cellsNodes) {
        const tagName = cellNode.tagName.toLowerCase();
        if (tagName.includes('table-cell') || tagName.includes('covered-table-cell')) {
          const repeatAttr = cellNode.getAttribute('table:number-columns-repeated');
          const count = repeatAttr ? Math.min(parseInt(repeatAttr, 10), 100) : 1;
          const paragraphs = Array.from(cellNode.getElementsByTagName('text:p'));
          const cellText = paragraphs.map((p) => p.textContent || '').join(' ').trim();

          for (let c = 0; c < count; c++) {
            rowTexts.push(cellText);
          }
        }
      }

      const rowStr = rowTexts.join(' | ').toUpperCase();

      // Busca por campos cadastrais
      if (rowStr.includes('DENOMINAÇÃO') || rowStr.includes('NOME DO IMÓVEL') || rowStr.includes('IMOVEL:')) {
        const idx = rowTexts.findIndex((t) => /DENOMINAÇ|NOME DO IM|IMOVEL/i.test(t));
        if (idx >= 0 && rowTexts[idx + 1]) denominacaoImovel = rowTexts[idx + 1];
      }
      
      // Busca pelo município real lidando com a estrutura "Adicionar Municipio"
      if (rowStr.includes('MUNICÍPIO') || rowStr.includes('MUNICIPIO') || rowStr.includes('MUNICÍPIO(S)')) {
        const idx = rowTexts.findIndex((t) => /MUNIC/i.test(t));
        if (idx >= 0) {
          const valNext = rowTexts[idx + 1];
          if (valNext && valNext.trim() && !/adicionar/i.test(valNext)) {
            municipioImovel = valNext;
          } else {
            // Se ao lado for instrução do SIGEF ("Adicionar Municipio"), lemos a linha de baixo
            const nextRow = rows[rIdx + 1];
            if (nextRow) {
              const nextCells = Array.from(nextRow.children);
              const nextTexts = nextCells.map(c => c.textContent?.trim() || '').filter(Boolean);
              const munCand = nextTexts.find(t => t.includes('-') && t.trim().length > 3 && !/munic/i.test(t));
              if (munCand) {
                municipioImovel = munCand;
              } else if (nextTexts[0]) {
                municipioImovel = nextTexts[0];
              }
            }
          }
        }
      }
      
      if (rowStr.includes('UF') && !ufImovel) {
        const idx = rowTexts.findIndex((t) => /^UF$/i.test(t.trim()));
        if (idx >= 0 && rowTexts[idx + 1]) ufImovel = rowTexts[idx + 1];
      }
      
      if (rowStr.includes('PROPRIETÁRIO') || rowStr.includes('PROPRIETARIO') || rowStr.includes('REQUERENTE')) {
        const idx = rowTexts.findIndex((t) => /PROPRIET|REQUER/i.test(t));
        if (idx >= 0 && rowTexts[idx + 1]) proprietarioNome = rowTexts[idx + 1];
      }
      
      if (rowStr.includes('CPF') || rowStr.includes('CNPJ')) {
        const idx = rowTexts.findIndex((t) => /CPF|CNPJ/i.test(t));
        if (idx >= 0 && rowTexts[idx + 1]) proprietarioCpf = rowTexts[idx + 1];
      }
      
      if (rowStr.includes('MATRÍCULA') || rowStr.includes('MATRICULA')) {
        const idx = rowTexts.findIndex((t) => /MATRIC/i.test(t));
        if (idx >= 0 && rowTexts[idx + 1]) matriculaImovel = rowTexts[idx + 1];
      }

      // Busca por Meridiano Central nos metadados
      if (rowStr.includes('MERIDIANO CENTRAL') || rowStr.includes('MERIDIANO CENTRAL (°)')) {
        const idx = rowTexts.findIndex((t) => /MERIDIANO CENTRAL/i.test(t));
        if (idx >= 0 && rowTexts[idx + 1]) {
          const mc = parseInt(rowTexts[idx + 1].replace(/[^0-9.-]/g, ''), 10);
          if (Number.isFinite(mc) && mc !== 0) {
            fusoInformado = Math.floor((mc + 183) / 6);
          }
        }
      }
      
      // Busca por Hemisfério nos metadados
      if (rowStr.includes('HEMISFÉRIO') || rowStr.includes('HEMISFERIO')) {
        const idx = rowTexts.findIndex((t) => /HEMISF/i.test(t));
        if (idx >= 0 && rowTexts[idx + 1]) {
          const hStr = rowTexts[idx + 1].trim().toUpperCase();
          if (hStr.startsWith('S') || hStr.includes('SUL')) hemisferioInformado = 'S';
          else if (hStr.startsWith('N') || hStr.includes('NORTE')) hemisferioInformado = 'N';
        }
      }

      // Detectar linhas de vértices (código do vértice: M-0001, P-0001 ou com prefixo)
      const vertCodeIdx = rowTexts.findIndex((t) => /^[A-Z0-9]{3,6}-[MPV]-0*\d+/i.test(t) || /^[MPV]-0*\d+/i.test(t));
      if (vertCodeIdx >= 0) {
        const codigo = rowTexts[vertCodeIdx];
        
        // Ler coordenadas e altitude
        const nums: { val: number; raw: string }[] = [];
        for (let i = vertCodeIdx + 1; i < rowTexts.length; i++) {
          const parsed = parseCoordenada(rowTexts[i]);
          if (parsed !== null) {
            nums.push({ val: parsed, raw: rowTexts[i] });
          }
        }

        if (nums.length >= 2) {
          const val1 = nums[0].val; // Longitude ou Este
          const val2 = nums[1].val; // Latitude ou Norte
          const val3 = nums[2] ? nums[2].val : 0; // Altitude h

          // Procura Método, Tipo de Limite e Confrontante
          let metodo = 'PG7';
          let tipoLimite = 'LA6';
          let confrontante = '';

          for (let i = vertCodeIdx + 1; i < rowTexts.length; i++) {
            const txt = rowTexts[i];
            if (/^(P[GA]\d|PT\d|RTK|GNSS)/i.test(txt)) metodo = txt;
            else if (/^(L[AN]\d|LOD)/i.test(txt)) tipoLimite = txt;
            else if (txt.length > 3 && !/^\d+$/.test(txt) && parseCoordenada(txt) === null) {
              confrontante = txt;
            }
          }

          rawVertices.push({
            codigo,
            latOrEste: val1,
            lonOrNorte: val2,
            elev: val3,
            metodo,
            tipoLimite,
            confrontante
          });
        }
      }
    }
  }

  if (rawVertices.length === 0) {
    throw new Error('Nenhum vértice com código no padrão do SIGEF (ex: M-0001, P-0001) localizado na planilha ODS.');
  }

  // Se as coordenadas forem geográficas (lat e lon), recalcula o fuso UTM e hemisfério dinamicamente a partir do primeiro vértice
  const primeiroVert = rawVertices[0];
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

  // Processar os vértices para Lat/Lon e UTM Este/Norte correspondentes
  const verticesProcessados: Vertex[] = rawVertices.map((v, i) => {
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
      id: `v-ods-${i}-${Date.now()}`,
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

  // Processar lista de confrontantes únicos
  const nomesConfrontantes = Array.from(new Set(rawVertices.map((v) => v.confrontante).filter(Boolean)));
  const confrontantesProcessados: Confrontante[] = nomesConfrontantes.map((nome, idx) => ({
    id: `conf-ods-${idx}`,
    nome,
    cpf: '',
    matricula: '',
    cns: '',
    tipo: 'particular',
    condicao: 'proprietario'
  }));

  // Mapeamento de confrontantes por lado
  const confrontantePorLado: Record<number, string> = {};
  rawVertices.forEach((v, idx) => {
    if (v.confrontante) {
      const confObj = confrontantesProcessados.find((c) => c.nome === v.confrontante);
      if (confObj) {
        confrontantePorLado[idx] = confObj.id;
      }
    }
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
    glebas: [
      {
        id: `gleba-ods-${Date.now()}`,
        denominacao: 'Gleba Principal',
        parcela: '001',
        vertices: verticesProcessados,
        confrontantes: confrontantesProcessados,
        confrontantePorLado
      }
    ]
  };

  // Salvar no IndexedDB e Firestore
  await salvarProjeto(novoProj);

  return novoProj;
}
