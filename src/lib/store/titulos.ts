// Títulos de planta pré-cadastrados. O título principal da planta varia conforme o tipo de
// serviço — e essa escolha gera dúvida em agrimensores iniciantes. Aqui fica uma lista de
// títulos comuns (que o usuário pode ampliar), guardada no navegador. Cada empresa pode ter os
// seus. Guardo em localStorage (mesmo padrão de preferências); a migração pra nuvem por empresa
// entra junto do multi-tenant.

const KEY = 'metrica.titulosPlanta';

// Títulos padrão que já acompanham o sistema (o dono pediu que eu povoasse). Cobrem os serviços
// mais frequentes de agrimensura rural e urbana.
export const TITULOS_PADRAO: string[] = [
  'Levantamento Planimétrico Georreferenciado',
  'Levantamento Topográfico Planialtimétrico',
  'Georreferenciamento de Imóvel Rural',
  'Georreferenciamento para Retificação de Área',
  'Georreferenciamento para Desmembramento',
  'Georreferenciamento para Remembramento (Unificação)',
  'Planta de Situação e Localização',
  'Levantamento Planimétrico para Usucapião',
  'Levantamento Topográfico para Regularização Fundiária',
  'Planta de Desmembramento de Lote Urbano',
  'Planta de Loteamento',
  'Levantamento Cadastral Urbano',
];

export function carregarTitulos(): string[] {
  if (typeof window === 'undefined') return TITULOS_PADRAO;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return TITULOS_PADRAO;
    const salvos = JSON.parse(raw) as string[];
    // une os padrão com os que o usuário adicionou, sem duplicar
    const set = new Set<string>([...TITULOS_PADRAO, ...salvos.filter(Boolean)]);
    return [...set];
  } catch {
    return TITULOS_PADRAO;
  }
}

/** Adiciona um título à lista do usuário (se ainda não existir) e devolve a lista atualizada. */
export function adicionarTitulo(titulo: string): string[] {
  const t = titulo.trim();
  const atual = carregarTitulos();
  if (!t || atual.includes(t)) return atual;
  const novos = [...atual, t];
  try { localStorage.setItem(KEY, JSON.stringify(novos.filter((x) => !TITULOS_PADRAO.includes(x)))); } catch { /* ignore */ }
  return novos;
}

/** Remove um título personalizado (os padrão não podem ser removidos). */
export function removerTitulo(titulo: string): string[] {
  if (TITULOS_PADRAO.includes(titulo)) return carregarTitulos();
  const restantes = carregarTitulos().filter((t) => t !== titulo && !TITULOS_PADRAO.includes(t));
  try { localStorage.setItem(KEY, JSON.stringify(restantes)); } catch { /* ignore */ }
  return carregarTitulos();
}
