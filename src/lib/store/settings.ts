import type { TecnicoData, EscritorioData, PlantaConfig, ImportTxtConfig, ImportVerticesVizinhoConfig } from '../topo/types';

const KEY = 'metrica.tecnico';
const KEY_ESCRITORIO = 'metrica.escritorio';
const KEY_PLANTA = 'metrica.plantaPadrao';
const KEY_IMPORT_TXT = 'metrica.importTxt';
const KEY_IMPORT_VIZINHO = 'metrica.importVerticesVizinho';

// Mapeamento padrão das colunas do TXT (formato observado do GNSS).
export const IMPORT_TXT_PADRAO: ImportTxtConfig = {
  separador: ';',
  decimal: '.',
  temCabecalho: true,
  colunas: ['nome', 'codigo', 'norte', 'leste', 'elevacao', 'sigmaY', 'sigmaX', 'sigmaZ'],
};

/** Configuração de leitura do TXT, definida pelo usuário a partir de um exemplo. */
export function carregarImportTxt(): ImportTxtConfig {
  if (typeof window === 'undefined') return IMPORT_TXT_PADRAO;
  try {
    const raw = localStorage.getItem(KEY_IMPORT_TXT);
    if (!raw) return IMPORT_TXT_PADRAO;
    return { ...IMPORT_TXT_PADRAO, ...JSON.parse(raw) };
  } catch {
    return IMPORT_TXT_PADRAO;
  }
}

export function salvarImportTxt(c: ImportTxtConfig): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY_IMPORT_TXT, JSON.stringify(c));
}

// Mapeamento padrão do arquivo de vértices do vizinho: chute razoável (nome, latitude, longitude);
// o usuário ajusta em Configurações a partir de um exemplo real.
export const IMPORT_VIZINHO_PADRAO: ImportVerticesVizinhoConfig = {
  separador: ';',
  decimal: '.',
  temCabecalho: true,
  colunas: ['nome', 'latitude', 'longitude'],
};

export function carregarImportVerticesVizinho(): ImportVerticesVizinhoConfig {
  if (typeof window === 'undefined') return IMPORT_VIZINHO_PADRAO;
  try {
    const raw = localStorage.getItem(KEY_IMPORT_VIZINHO);
    if (!raw) return IMPORT_VIZINHO_PADRAO;
    return { ...IMPORT_VIZINHO_PADRAO, ...JSON.parse(raw) };
  } catch {
    return IMPORT_VIZINHO_PADRAO;
  }
}

export function salvarImportVerticesVizinho(c: ImportVerticesVizinhoConfig): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY_IMPORT_VIZINHO, JSON.stringify(c));
}

// ----- Modelo de planilha SIGEF (.ods) personalizado pelo usuário -----
const KEY_MODELO_SIGEF = 'metrica.modeloSigef';

function abParaBase64(ab: ArrayBuffer): string {
  const b = new Uint8Array(ab);
  let s = '';
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s);
}
function base64ParaAb(b64: string): ArrayBuffer {
  const s = atob(b64);
  const u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
  return u.buffer;
}

/** Substitui o modelo de planilha SIGEF do sistema por um .ods enviado pelo usuário. */
export function salvarModeloSigef(ab: ArrayBuffer): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY_MODELO_SIGEF, abParaBase64(ab));
}
/** Modelo SIGEF personalizado, se houver (senão null → usa o modelo embutido). */
export function carregarModeloSigef(): ArrayBuffer | null {
  if (typeof window === 'undefined') return null;
  try { const raw = localStorage.getItem(KEY_MODELO_SIGEF); return raw ? base64ParaAb(raw) : null; } catch { return null; }
}
export function temModeloSigefProprio(): boolean {
  return typeof window !== 'undefined' && !!localStorage.getItem(KEY_MODELO_SIGEF);
}
export function limparModeloSigef(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEY_MODELO_SIGEF);
}

// Dados padrão do responsável técnico (do modelo do dono). Editáveis nas Configurações (modal).
export const TECNICO_PADRAO: TecnicoData = {
  nome: 'Darlan Gonçalves de Souza',
  formacao: 'TÉCNICO EM AGRIMENSURA',
  cft: '12287132600-MG',
  art: 'CFT2505318024',
  credenciamentoIncra: 'COIN',
  cidadeAssinatura: 'Espera Feliz-MG',
  metodoPosicionamento: 'PG6',
  tipoLimite: 'LA6',
  contadorMarco: 1,
  contadorPonto: 1,
  contadorVirtual: 1,
  zonaBase: 23,
  fusosPermitidos: [18, 19, 20, 21, 22, 23, 24, 25],
};

export const ESCRITORIO_PADRAO: EscritorioData = {
  nome: 'SOUZA GESTÃO FUNDIÁRIA',
  ramo: 'Agrimensura e Georreferenciamento',
  cnpj: '45.539.408/0001-74',
  endereco: 'Rua Doutor José Paixão 1400, Sala 02 Santa Inês, Espera Feliz',
  telefone: '(32) 99911-6227',
};

export function carregarEscritorio(): EscritorioData {
  if (typeof window === 'undefined') return ESCRITORIO_PADRAO;
  try {
    const raw = localStorage.getItem(KEY_ESCRITORIO);
    if (!raw) return ESCRITORIO_PADRAO;
    return { ...ESCRITORIO_PADRAO, ...JSON.parse(raw) };
  } catch {
    return ESCRITORIO_PADRAO;
  }
}

export function salvarEscritorio(e: EscritorioData): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY_ESCRITORIO, JSON.stringify(e));
}

export function carregarTecnico(): TecnicoData {
  if (typeof window === 'undefined') return TECNICO_PADRAO;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return TECNICO_PADRAO;
    return { ...TECNICO_PADRAO, ...JSON.parse(raw) };
  } catch {
    return TECNICO_PADRAO;
  }
}

export function salvarTecnico(t: TecnicoData): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(t));
}

// ----- Numeração automática dos recibos (sequencial, por navegador) -----
const KEY_RECIBO_SEQ = 'metrica.reciboSeq';
/** Próximo número de recibo que será usado (sem avançar o contador). Serve pra mostrar nos Ajustes. */
export function proximoNumeroReciboSeq(): number {
  if (typeof window === 'undefined') return 1;
  try { return Math.max(1, Math.floor(Number(localStorage.getItem(KEY_RECIBO_SEQ) || '1')) || 1); } catch { return 1; }
}
/** Define de quanto parte o próximo recibo (ex.: continuar de uma numeração antiga). */
export function definirNumeroReciboSeq(seq: number): void {
  if (typeof window === 'undefined') return;
  const n = Math.max(1, Math.floor(seq) || 1);
  try { localStorage.setItem(KEY_RECIBO_SEQ, String(n)); } catch { /* ignore */ }
}
/** Devolve o próximo número de recibo no formato "0001/AAAA" e já avança o contador. */
export function consumirNumeroRecibo(ano: number): string {
  if (typeof window === 'undefined') return `0001/${ano}`;
  const seq = proximoNumeroReciboSeq();
  try { localStorage.setItem(KEY_RECIBO_SEQ, String(seq + 1)); } catch { /* ignore */ }
  return `${String(seq).padStart(4, '0')}/${ano}`;
}

/** Configuração-padrão da planta (tamanhos de fonte, blocos, textos) — vale para trabalhos futuros. */
export function carregarPlantaPadrao(): PlantaConfig {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(KEY_PLANTA);
    return raw ? (JSON.parse(raw) as PlantaConfig) : {};
  } catch {
    return {};
  }
}

export function salvarPlantaPadrao(c: PlantaConfig): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY_PLANTA, JSON.stringify(c));
}

// ----- Tutorial de boas-vindas: já visto? (por navegador, não por projeto) -----
const KEY_TUTORIAL = 'metrica.onboarded';
export function tutorialJaVisto(): boolean {
  if (typeof window === 'undefined') return true;
  try { return localStorage.getItem(KEY_TUTORIAL) === '1'; } catch { return true; }
}
export function marcarTutorialVisto(): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(KEY_TUTORIAL, '1'); } catch { /* ignore */ }
}

import { db as fdb } from '../firebase/client';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export async function salvarTemaUsuario(uid: string, tema: 'claro' | 'escuro'): Promise<void> {
  const d = fdb();
  if (!d) return;
  try {
    await setDoc(doc(d, 'users', uid), { tema }, { merge: true });
  } catch {
    // ignore
  }
}

export async function carregarTemaUsuario(uid: string): Promise<'claro' | 'escuro' | null> {
  const d = fdb();
  if (!d) return null;
  try {
    const s = await getDoc(doc(d, 'users', uid));
    if (s.exists()) {
      return (s.data() as any).tema ?? null;
    }
  } catch {
    // ignore
  }
  return null;
}
