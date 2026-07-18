// Conferência de completude antes de gerar uma peça (memorial, planilha, planta, requerimento).
// Não gera a peça sozinha — apenas aponta o que falta preencher, para o botão de exportar
// poder avisar o usuário antes de entregar um documento incompleto.

import type { Vertex, Confrontante, ImovelData, TecnicoData, Gleba } from './types';
import { cpfOuCnpjValido } from './validation';

export interface ConferenciaExportacao {
  ok: boolean;
  problemas: string[];
  /**
   * Subconjunto de `problemas` que é GRAVE o bastante para travar a exportação de verdade (sem
   * chance de "exportar mesmo assim"): geometria incompleta ou código de vértice repetido, que o
   * SIGEF rejeita na certificação. O resto de `problemas` (campo de cadastro faltando, CPF com
   * cara de inválido) continua como aviso — o usuário pode decidir prosseguir.
   */
  graves: string[];
}

/** Regras extras de conferência que o usuário liga/desliga nos Ajustes (aba Comportamento). */
export interface OpcoesConferencia {
  /** Exige nome do cônjuge do proprietário e de cada confrontante proprietário/posseiro. */
  exigirConjuge?: boolean;
  /** Exige o CNS do cartório do imóvel preenchido. */
  exigirCns?: boolean;
}

/** Acumulador interno: junta problemas e marca quais são graves. */
interface Acc {
  problemas: string[];
  graves: string[];
  opcoes: OpcoesConferencia;
  avisa: (msg: string) => void;
  trava: (msg: string) => void;
}

function novoAcc(opcoes: OpcoesConferencia = {}): Acc {
  const problemas: string[] = [];
  const graves: string[] = [];
  return {
    problemas,
    graves,
    opcoes,
    avisa: (msg) => problemas.push(msg),
    trava: (msg) => { problemas.push(msg); graves.push(msg); },
  };
}

/** Checagens de CADASTRO (imóvel + técnico) — valem para o projeto inteiro, uma vez só. */
function conferirCadastro(imovel: ImovelData, tecnico: TecnicoData | null, acc: Acc): void {
  if (!tecnico) acc.avisa('Configure os dados do responsável técnico antes de exportar.');

  if (!imovel.denominacao?.trim()) acc.avisa('Preencha a denominação do imóvel.');
  if (!imovel.proprietario?.trim()) acc.avisa('Preencha o nome do proprietário.');
  if (!imovel.municipio?.trim()) acc.avisa('Preencha o município do imóvel.');

  if (imovel.cpfProprietario?.trim() && !cpfOuCnpjValido(imovel.cpfProprietario)) {
    acc.avisa('O CPF/CNPJ do proprietário parece inválido — confira.');
  }

  if (imovel.conjugeProprietario?.trim() && !imovel.cpfConjugeProprietario?.trim()) {
    acc.avisa('O cônjuge do proprietário está preenchido, mas falta o CPF dele(a).');
  }

  // TRT/ART — necessário para o requerimento e memorial descritivo.
  const temTrt = !!(imovel.numeroTrt?.trim() || tecnico?.art?.trim());
  if (!temTrt) {
    acc.avisa('Número da TRT/ART do projeto não foi informado — preencha na seção TRT do imóvel ou nos dados do técnico (ART).');
  }

  // Regras opcionais, ligadas nos Ajustes (aba Comportamento).
  if (acc.opcoes.exigirConjuge && imovel.proprietario?.trim() && !imovel.conjugeProprietario?.trim()) {
    acc.avisa('Falta o nome do cônjuge do proprietário (exigência ligada nos Ajustes).');
  }
  if (acc.opcoes.exigirCns && !imovel.cns?.trim()) {
    acc.avisa('Falta o CNS do cartório do imóvel (exigência ligada nos Ajustes).');
  }
}

/** Checagens de GEOMETRIA e CONFRONTANTES — por gleba. `prefixo` identifica a gleba em multi-gleba. */
function conferirGeometria(
  vertices: Vertex[],
  confrontantes: Confrontante[],
  confrontantePorLado: Record<number, string> | undefined,
  acc: Acc,
  prefixo = ''
): void {
  const trava = (msg: string) => acc.trava(`${prefixo}${msg}`);
  const avisa = (msg: string) => acc.avisa(`${prefixo}${msg}`);

  if (vertices.length < 3) {
    trava('A poligonal precisa de pelo menos 3 vértices.');
  } else if (vertices.some((v) => !v.codigoSigef?.trim())) {
    trava('Existem vértices sem código definitivo — registre os pontos antes de exportar.');
  } else {
    const vistos = new Set<string>();
    const duplicados = new Set<string>();
    for (const v of vertices) {
      const cod = v.codigoSigef.trim();
      if (vistos.has(cod)) duplicados.add(cod); else vistos.add(cod);
    }
    if (duplicados.size > 0) {
      trava(`Existem vértices com o código repetido (${[...duplicados].join(', ')}) — cada vértice precisa de um código único.`);
    }
  }

  for (const c of confrontantes) {
    if (!c.nome?.trim()) { avisa('Existe um confrontante sem nome preenchido.'); continue; }
    if (c.cpf?.trim() && !cpfOuCnpjValido(c.cpf)) avisa(`O CPF/CNPJ de "${c.nome}" parece inválido — confira.`);
    // espólio sem inventariante: o memorial assina com "Inventariante: —", assinatura juridicamente nula.
    if ((c.condicao ?? 'proprietario') === 'espolio' && !c.inventarianteNome?.trim()) {
      trava(`O espólio de "${c.nome}" está sem o nome do inventariante — a assinatura sairia em branco no memorial.`);
    }
    // Regra opcional (Ajustes): cônjuge do confrontante proprietário/posseiro.
    if (acc.opcoes.exigirConjuge && (c.condicao ?? 'proprietario') !== 'espolio' && !c.conjugeNome?.trim()) {
      avisa(`Falta o nome do cônjuge de "${c.nome}" (exigência ligada nos Ajustes).`);
    }
  }

  // todo trecho do perímetro precisa de um confrontante atribuído: sem isso, o memorial narra
  // "confrontando com confrontante não informado" (texto literal, inválido para o cartório) e a
  // planilha SIGEF sai com a célula de confrontante em branco naquele trecho.
  if (confrontantePorLado && vertices.length >= 3) {
    const semConfrontante = vertices.some((_, i) => !confrontantePorLado[i]?.trim());
    if (semConfrontante) {
      trava('Existem trechos do perímetro sem confrontante atribuído — o memorial sairia com o texto "confrontante não informado".');
    }
    const idsUsados = new Set(Object.values(confrontantePorLado));
    for (const c of confrontantes) {
      if (!idsUsados.has(c.id)) {
        avisa(`O confrontante "${c.nome || '(sem nome)'}" está cadastrado mas não foi atribuído a nenhum trecho do perímetro.`);
      }
    }
  }
}

/** Verifica se o projeto tem o mínimo necessário para gerar peças oficiais (memorial, planilha, planta, requerimento). */
export function conferirProntoParaExportar(
  imovel: ImovelData,
  vertices: Vertex[],
  confrontantes: Confrontante[],
  tecnico: TecnicoData | null,
  confrontantePorLado?: Record<number, string>,
  opcoes?: OpcoesConferencia
): ConferenciaExportacao {
  const acc = novoAcc(opcoes);
  conferirGeometria(vertices, confrontantes, confrontantePorLado, acc);
  conferirCadastro(imovel, tecnico, acc);
  return { ok: acc.problemas.length === 0, problemas: acc.problemas, graves: acc.graves };
}

/**
 * Confere o projeto INTEIRO, gleba por gleba. Importante: NÃO junte os vértices de todas as
 * glebas numa lista só antes de conferir — glebas vizinhas compartilham vértices de divisa com
 * o MESMO código SIGEF (isso é correto e obrigatório no SIGEF), e a checagem de código repetido
 * acusaria um falso problema. Cada gleba é conferida sozinha, com o seu próprio
 * confrontantePorLado; as checagens de cadastro (imóvel/técnico) entram uma vez só.
 */
export function conferirProjetoGlebas(
  imovel: ImovelData,
  glebas: Gleba[],
  tecnico: TecnicoData | null,
  opcoes?: OpcoesConferencia
): ConferenciaExportacao {
  const acc = novoAcc(opcoes);
  const multi = glebas.length > 1;

  if (glebas.length === 0) {
    acc.trava('O projeto não tem nenhuma gleba com vértices.');
  }
  glebas.forEach((g, i) => {
    const prefixo = multi ? `[${g.denominacao || `Gleba ${i + 1}`}] ` : '';
    conferirGeometria(g.vertices, g.confrontantes, g.confrontantePorLado, acc, prefixo);
  });
  conferirCadastro(imovel, tecnico, acc);

  return { ok: acc.problemas.length === 0, problemas: acc.problemas, graves: acc.graves };
}
