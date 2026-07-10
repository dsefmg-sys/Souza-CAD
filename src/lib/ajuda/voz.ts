// Utilitários puros pra fala do tutorial (TTS) — separados do componente pra dar pra testar sem DOM.

export interface VozCandidata {
  name: string;
  lang: string;
  localService?: boolean;
}

// Deixa o texto (escrito pra leitura visual) mais natural quando falado: some símbolo, travessão e
// barra que os motores de síntese de voz costumam ler de um jeito estranho ("barra", "traço"...).
export function prepararTextoParaFala(texto: string): string {
  return texto
    .replace(/[*_#`[\]()]/g, ' ')
    .replace(/°/g, ' graus')
    .replace(/—/g, ', ')
    .replace(/([\p{L}\p{N}])\/([\p{L}\p{N}])/gu, '$1 $2')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

// Quebra o texto em frases curtas: evita o corte no meio da fala que alguns navegadores fazem em
// falas muito longas, e dá uma pausa natural entre uma frase e outra.
export function dividirEmFrases(texto: string, tamanhoMax = 180): string[] {
  const frases = texto
    .split(/(?<=[.!?;:])\s+(?=[A-ZÀ-ÿ0-9(])/)
    .map((s) => s.trim())
    .filter(Boolean);
  const base = frases.length ? frases : [texto];

  const partes: string[] = [];
  // Último recurso pra um pedaço que continua grande mesmo depois de quebrado por vírgula: quebra por palavra.
  const empurrarPorPalavra = (pedaco: string) => {
    if (pedaco.length <= tamanhoMax) { partes.push(pedaco); return; }
    let atual = '';
    for (const palavra of pedaco.split(/\s+/)) {
      const candidato = atual ? `${atual} ${palavra}` : palavra;
      if (atual && candidato.length > tamanhoMax) {
        partes.push(atual);
        atual = palavra;
      } else {
        atual = candidato;
      }
    }
    if (atual) partes.push(atual);
  };

  for (const frase of base) {
    if (frase.length <= tamanhoMax) {
      partes.push(frase);
      continue;
    }
    let atual = '';
    for (const pedaco of frase.split(/,\s+/)) {
      const candidato = atual ? `${atual}, ${pedaco}` : pedaco;
      if (atual && candidato.length > tamanhoMax) {
        empurrarPorPalavra(atual);
        atual = pedaco;
      } else {
        atual = candidato;
      }
    }
    if (atual) empurrarPorPalavra(atual);
  }
  return partes.filter(Boolean);
}

// Escolhe a melhor voz em português disponível: prioriza vozes online (Google/Microsoft Natural),
// que soam muito mais naturais que a voz local "de sistema" (offline, robótica) que os navegadores
// usam como voz padrão quando nada é escolhido a dedo.
export function melhorVozPt<T extends VozCandidata>(vozes: T[]): T | null {
  if (!vozes.length) return null;
  const pontuar = (v: T) => {
    let nota = 0;
    const nome = v.name.toLowerCase();
    const lang = v.lang.toLowerCase();
    if (lang === 'pt-br') nota += 3;
    else if (lang.startsWith('pt')) nota += 1;
    if (v.localService === false) nota += 2;
    if (/natural|online|google|neural/.test(nome)) nota += 3;
    if (/compact/.test(nome)) nota -= 3;
    return nota;
  };
  return [...vozes].sort((a, b) => pontuar(b) - pontuar(a))[0];
}
