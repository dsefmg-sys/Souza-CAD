// Linhas do rótulo/assinatura de um confrontante — fonte ÚNICA usada tanto no mapa quanto na planta,
// para o bloco ficar idêntico nos dois lugares (Nome, CPF, Matrícula e condição/cônjuge). A linha de
// assinatura em si é desenhada por quem renderiza; aqui só montamos o texto.

import type { Confrontante } from './types';
import { formatMatricula } from './geometry';

/** Linhas de texto do rótulo do confrontante, conforme a condição (proprietário/posseiro/espólio). */
export function linhasRotuloConfrontante(c: Confrontante): string[] {
  const cond = c.condicao ?? 'proprietario';
  const linhas: string[] = [];

  // Bem público (estrada, rio...): só o nome — sem CPF/matrícula/cônjuge, porque não é pessoa.
  if (cond === 'publico') return [c.nome];

  if (cond === 'espolio') {
    linhas.push(/esp[óo]lio/i.test(c.nome) ? c.nome : `Espólio de ${c.nome}`);
    if (c.inventarianteNome) linhas.push(`Inventariante: ${c.inventarianteNome}`);
    if (c.inventarianteCpf) linhas.push(`CPF: ${c.inventarianteCpf}`);
    if (c.matricula) linhas.push(`Matrícula nº ${formatMatricula(c.matricula)}`);
    return linhas;
  }

  linhas.push(`Nome: ${c.nome}`);
  linhas.push(`CPF: ${c.cpf || '—'}`);
  if (cond === 'posseiro') linhas.push('Na condição de possuidor(a)');
  else linhas.push(`Matrícula nº ${formatMatricula(c.matricula) || '—'}`);
  if (c.conjugeNome) {
    linhas.push(`Cônjuge: ${c.conjugeNome}`);
    if (c.conjugeCpf) linhas.push(`CPF: ${c.conjugeCpf}`);
  }
  return linhas;
}
