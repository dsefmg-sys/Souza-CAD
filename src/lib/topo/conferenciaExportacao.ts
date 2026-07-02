// Conferência de completude antes de gerar uma peça (memorial, planilha, planta, requerimento).
// Não gera a peça sozinha — apenas aponta o que falta preencher, para o botão de exportar
// poder avisar o usuário antes de entregar um documento incompleto.

import type { Vertex, Confrontante, ImovelData, TecnicoData } from './types';
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

/** Verifica se o projeto tem o mínimo necessário para gerar peças oficiais (memorial, planilha, planta, requerimento). */
export function conferirProntoParaExportar(
  imovel: ImovelData,
  vertices: Vertex[],
  confrontantes: Confrontante[],
  tecnico: TecnicoData | null,
  confrontantePorLado?: Record<number, string>
): ConferenciaExportacao {
  const problemas: string[] = [];
  const graves: string[] = [];
  const grave = (msg: string) => { problemas.push(msg); graves.push(msg); };

  if (vertices.length < 3) {
    grave('A poligonal precisa de pelo menos 3 vértices.');
  } else if (vertices.some((v) => !v.codigoSigef?.trim())) {
    grave('Existem vértices sem código definitivo — registre os pontos antes de exportar.');
  } else {
    const vistos = new Set<string>();
    const duplicados = new Set<string>();
    for (const v of vertices) {
      const cod = v.codigoSigef.trim();
      if (vistos.has(cod)) duplicados.add(cod); else vistos.add(cod);
    }
    if (duplicados.size > 0) {
      grave(`Existem vértices com o código repetido (${[...duplicados].join(', ')}) — cada vértice precisa de um código único.`);
    }
  }

  if (!tecnico) {
    problemas.push('Configure os dados do responsável técnico antes de exportar.');
  }

  if (!imovel.denominacao?.trim()) problemas.push('Preencha a denominação do imóvel.');
  if (!imovel.proprietario?.trim()) problemas.push('Preencha o nome do proprietário.');
  if (!imovel.municipio?.trim()) problemas.push('Preencha o município do imóvel.');

  if (imovel.cpfProprietario?.trim() && !cpfOuCnpjValido(imovel.cpfProprietario)) {
    problemas.push('O CPF/CNPJ do proprietário parece inválido — confira.');
  }

  if (imovel.conjugeProprietario?.trim() && !imovel.cpfConjugeProprietario?.trim()) {
    problemas.push('O cônjuge do proprietário está preenchido, mas falta o CPF dele(a).');
  }

  for (const c of confrontantes) {
    if (!c.nome?.trim()) { problemas.push('Existe um confrontante sem nome preenchido.'); continue; }
    if (c.cpf?.trim() && !cpfOuCnpjValido(c.cpf)) problemas.push(`O CPF/CNPJ de "${c.nome}" parece inválido — confira.`);
    // espólio sem inventariante: o memorial assina com "Inventariante: —", assinatura juridicamente nula.
    if ((c.condicao ?? 'proprietario') === 'espolio' && !c.inventarianteNome?.trim()) {
      grave(`O espólio de "${c.nome}" está sem o nome do inventariante — a assinatura sairia em branco no memorial.`);
    }
  }

  // todo trecho do perímetro precisa de um confrontante atribuído: sem isso, o memorial narra
  // "confrontando com confrontante não informado" (texto literal, inválido para o cartório) e a
  // planilha SIGEF sai com a célula de confrontante em branco naquele trecho.
  if (confrontantePorLado && vertices.length >= 3) {
    const semConfrontante = vertices.some((_, i) => !confrontantePorLado[i]?.trim());
    if (semConfrontante) {
      grave('Existem trechos do perímetro sem confrontante atribuído — o memorial sairia com o texto "confrontante não informado".');
    }
    const idsUsados = new Set(Object.values(confrontantePorLado));
    for (const c of confrontantes) {
      if (!idsUsados.has(c.id)) {
        problemas.push(`O confrontante "${c.nome || '(sem nome)'}" está cadastrado mas não foi atribuído a nenhum trecho do perímetro.`);
      }
    }
  }

  return { ok: problemas.length === 0, problemas, graves };
}
