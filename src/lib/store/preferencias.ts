// Preferências globais do app (comportamentos que o dono pode ligar/desligar), guardadas no
// navegador. Diferente de TecnicoData/EscritorioData (dados fixos da assinatura/empresa), aqui
// ficam só interruptores de comportamento da interface e das validações.

import { confirmar } from '../ui/dialogos';

export interface PreferenciasApp {
  /** Exige nome do cônjuge preenchido (proprietário/confrontante) antes de prosseguir. Padrão: false. */
  exigirConjuge: boolean;
  /** Exige o cartório (CNS) preenchido antes de gerar uma peça oficial. Padrão: false. */
  exigirCns: boolean;
  /** Mostra as dicas educativas do glossário de tipos de ato. Padrão: true. */
  mostrarDicasEducativas: boolean;
  /** Quando falso, um problema "grave" da conferência de exportação vira só aviso (pode prosseguir). Padrão: true (trava de verdade). */
  bloquearExportacaoIncompleta: boolean;
  /**
   * NÍVEL DE PROFISSÃO — quanta explicação a ajuda dá. Coisa DIFERENTE do `modo`:
   *  - 'iniciante':  linguagem didática, explica os porquês. Pra quem tem pouco tempo de profissão.
   *  - 'experiente': objetiva, direto ao ponto. Pra o agrimensor veterano que não quer tanta explicação.
   * Independente do `modo` (um veterano pode preferir a tela Simples e mesmo assim a ajuda "experiente").
   * Padrão: iniciante.
   */
  nivelExperiencia: 'iniciante' | 'experiente';
  /**
   * MODO DA INTERFACE — quanta ferramenta aparece na tela. Coisa DIFERENTE do `nivelExperiencia`.
   * Três degraus, do mais enxuto ao mais completo:
   *  - 'simples':  só o caminho essencial do georreferenciamento. Pensado pra QUALQUER nível se adaptar ao software.
   *  - 'medio':    o essencial + as ferramentas do dia a dia (desenho, anotação, vértices, vizinhos certificados,
   *                errata, CAR, calculadora e camadas). Um passo além do Fácil, sem ainda mostrar tudo.
   *  - 'completo': todas as ferramentas à mostra, inclusive as avançadas (geometria CAD, DXF, estúdio, etc.).
   * A chave do app gira em ciclo: Fácil → Médio → Completo → Fácil.
   * Padrão: 'simples' (todo usuário começa se adaptando ao software).
   */
  modo: 'simples' | 'medio' | 'completo';
  /**
   * Tempo acumulado (ms) que o usuário passou no modo Completo. Ao passar de 5 h, a chave no topo
   * some (interface mais limpa) e voltar ao Simples passa a ser só pelas Configurações.
   */
  tempoCompletoMs: number;
  /** Chaves de botões do cabeçalho cujo ÍCONE fica oculto (só o texto). Padrão: dados, trt, análise. */
  iconesCabecalhoOcultos: string[];
  /** Toca o vídeo de abertura (splash animado) na primeira vez que o app abre neste navegador. Padrão: true. */
  introVideoAtiva: boolean;
  /**
   * Tamanho do texto da interface (zoom). 1 = normal. Vale só na aparência da tela.
   * Faixa segura pra não quebrar o layout: 0.9 a 1.25. Padrão: 1.
   */
  escalaFonte: number;
  /**
   * Liga o controle de casas decimais na tela. DESLIGADO por padrão: sem se preocupar com isso,
   * cada tela usa a precisão que já usava. Só quando ligado é que `casasDecimais` passa a valer.
   */
  casasDecimaisAtivo: boolean;
  /**
   * Casas decimais na EXIBIÇÃO da tela (coordenadas, distâncias, área) — só vale quando
   * `casasDecimaisAtivo` está ligado. NÃO afeta os documentos oficiais nem as exportações —
   * memorial, planilha SIGEF, KML e afins mantêm a precisão exigida pela norma. Padrão: 3.
   */
  casasDecimais: number;
  /** Pede confirmação antes de apagar (vértice, projeto, divisa). Padrão: true. */
  confirmarAntesApagar: boolean;
  /** Mostra campos para assinatura dos confrontantes na planta. Padrão: true. */
  mostrarAssinaturaConfrontantes: boolean;
}

export const PREFERENCIAS_PADRAO: PreferenciasApp = {
  exigirConjuge: false,
  exigirCns: false,
  mostrarDicasEducativas: true,
  bloquearExportacaoIncompleta: true,
  nivelExperiencia: 'iniciante',
  modo: 'simples',
  tempoCompletoMs: 0,
  iconesCabecalhoOcultos: ['dados', 'trt', 'analise'],
  introVideoAtiva: true,
  escalaFonte: 1,
  casasDecimaisAtivo: false,
  casasDecimais: 3,
  confirmarAntesApagar: true,
  mostrarAssinaturaConfrontantes: true,
};

const KEY = 'metrica.preferencias';

/** Depois deste tempo no Completo, a chave do topo some (fica só nas Configurações). */
export const LIMITE_MODO_FIXO_MS = 5 * 60 * 60 * 1000; // 5 horas

export function carregarPreferencias(): PreferenciasApp {
  if (typeof window === 'undefined') return PREFERENCIAS_PADRAO;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return PREFERENCIAS_PADRAO;
    const parsed = JSON.parse(raw) as Partial<PreferenciasApp>;
    // modo e nivelExperiencia são INDEPENDENTES; cada um cai no padrão se não existir.
    return { ...PREFERENCIAS_PADRAO, ...parsed };
  } catch {
    return PREFERENCIAS_PADRAO;
  }
}

export function salvarPreferencias(p: PreferenciasApp): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(p));
}

/**
 * Aplica o zoom da fonte da interface no documento inteiro. Mexe no tamanho base do texto
 * (a raiz), então tudo que usa medida relativa acompanha. Presa entre 0,9 e 1,25 pra não
 * quebrar o layout. Chame no carregamento e sempre que o ajuste mudar.
 */
export function aplicarEscalaFonte(escala?: number): void {
  if (typeof document === 'undefined') return;
  const e = Math.min(1.25, Math.max(0.9, escala ?? carregarPreferencias().escalaFonte ?? 1));
  document.documentElement.style.fontSize = `${(16 * e).toFixed(2)}px`;
}

/**
 * Quantas casas decimais usar na EXIBIÇÃO da tela. `casasPadrao` é a precisão que aquela tela
 * SEMPRE usou. Com o ajuste DESLIGADO (padrão), devolve `casasPadrao` — nada muda. Com o ajuste
 * LIGADO, devolve as casas escolhidas pelo usuário. Combine com o formatador da tela (ex.: numBR).
 * NUNCA use isto em exportação/documento oficial — lá a precisão é fixa pela norma.
 */
export function casasTela(casasPadrao: number): number {
  const p = carregarPreferencias();
  const c = p.casasDecimaisAtivo ? (p.casasDecimais ?? casasPadrao) : casasPadrao;
  return Math.min(8, Math.max(0, c));
}

/**
 * Confirmação antes de apagar, respeitando o ajuste. Se o ajuste estiver desligado, apaga
 * direto (devolve true). Devolve true quando pode prosseguir.
 */
export async function confirmarApagar(mensagem: string): Promise<boolean> {
  if (typeof window === 'undefined') return true;
  if (!carregarPreferencias().confirmarAntesApagar) return true;
  return confirmar({ titulo: 'Confirmar exclusão', mensagem, okLabel: 'Apagar', perigo: true });
}

/** Modo atual da interface (a chave Fácil/Médio/Completo). */
export function carregarModo(): 'simples' | 'medio' | 'completo' {
  return carregarPreferencias().modo;
}

/** Vira a chave Fácil/Médio/Completo (não toca no nível da ajuda — são coisas diferentes). */
export function salvarModo(modo: 'simples' | 'medio' | 'completo'): void {
  salvarPreferencias({ ...carregarPreferencias(), modo });
}

/** Próximo degrau no ciclo da chave: Fácil → Médio → Completo → Fácil. */
export function proximoModo(modo: 'simples' | 'medio' | 'completo'): 'simples' | 'medio' | 'completo' {
  return modo === 'simples' ? 'medio' : modo === 'medio' ? 'completo' : 'simples';
}

/** Nível de profissão (linguagem da ajuda). Independente do modo. */
export function salvarNivelExperiencia(nivelExperiencia: 'iniciante' | 'experiente'): void {
  salvarPreferencias({ ...carregarPreferencias(), nivelExperiencia });
}

/** Soma tempo passado no modo Completo. Devolve o total acumulado. */
export function registrarTempoCompleto(ms: number): number {
  const p = carregarPreferencias();
  const total = Math.max(0, (p.tempoCompletoMs || 0) + Math.max(0, ms));
  salvarPreferencias({ ...p, tempoCompletoMs: total });
  return total;
}

/** true quando o usuário já usou o Completo o bastante pra "fixar" (chave do topo some). */
export function modoCompletoFixado(): boolean {
  return (carregarPreferencias().tempoCompletoMs || 0) >= LIMITE_MODO_FIXO_MS;
}
