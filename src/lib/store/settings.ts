import type { TecnicoData } from '../topo/types';

const KEY = 'metrica.tecnico';

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
