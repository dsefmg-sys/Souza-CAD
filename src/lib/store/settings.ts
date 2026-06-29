import type { TecnicoData, EscritorioData, PlantaConfig } from '../topo/types';

const KEY = 'metrica.tecnico';
const KEY_ESCRITORIO = 'metrica.escritorio';
const KEY_PLANTA = 'metrica.plantaPadrao';

// Dados padrão do responsável técnico (do modelo do dono). Editáveis em /configuracoes.
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
  fusosPermitidos: [22, 23, 24, 25],
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
