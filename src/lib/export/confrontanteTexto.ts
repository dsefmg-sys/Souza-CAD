import type { Confrontante } from '../topo/types';
import { formatMatricula } from '../topo/geometry';

// Descrição ÚNICA do confrontante, usada pelo memorial E pela planilha SIGEF (.ods).
// Antes cada documento montava a sua e eles divergiam (a planilha ignorava espólio,
// matrícula e condição de posseiro) — documentos oficiais do mesmo processo precisam
// contar a mesma história.

/** Nome do imóvel/pessoa do confrontante já considerando espólio. */
export function nomeConfrontante(c: Confrontante): string {
  if ((c.condicao ?? 'proprietario') === 'espolio') {
    return /esp[óo]lio/i.test(c.nome) ? c.nome : `Espólio de ${c.nome}`;
  }
  return c.nome;
}

/** Descrição do confrontante como aparece no memorial e na planilha SIGEF. */
export function descreverConfrontante(c: Confrontante | undefined): string {
  if (!c) return 'confrontante não informado';
  if (c.descricaoExtra && c.descricaoExtra.trim()) return c.descricaoExtra.trim();
  const cond = c.condicao ?? 'proprietario';
  const partes: string[] = [];
  if (c.cpf) partes.push(`CPF nº ${c.cpf}`);
  // posseiro não tem matrícula; espólio e proprietário têm
  if (cond !== 'posseiro' && c.matricula) partes.push(`Matrícula nº ${formatMatricula(c.matricula)}`);
  const sufixo = partes.length ? ` (${partes.join(', ')})` : '';
  const base = `${nomeConfrontante(c)}${sufixo}`;
  if (cond === 'posseiro') return `${base}, na condição de possuidor(a)`;
  if (cond === 'condomino') return `${base}, na condição de condômino(a)`;
  if (cond === 'usufrutuario') {
    const nu = c.nuProprietarioNome?.trim();
    return nu ? `${base}, na condição de usufrutuário(a), sendo nu-proprietário(a) ${nu}` : `${base}, na condição de usufrutuário(a)`;
  }
  return base;
}
