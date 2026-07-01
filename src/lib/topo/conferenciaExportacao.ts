// Conferência de completude antes de gerar uma peça (memorial, planilha, planta, requerimento).
// Não gera a peça sozinha — apenas aponta o que falta preencher, para o botão de exportar
// poder avisar o usuário antes de entregar um documento incompleto.

import type { Vertex, Confrontante, ImovelData, TecnicoData } from './types';
import { cpfValido } from './validation';

export interface ConferenciaExportacao {
  ok: boolean;
  problemas: string[];
}

function cpfOuCnpjValido(v: string): boolean {
  const digitos = v.replace(/\D/g, '');
  if (digitos.length === 14) return true; // CNPJ: checagem de dígitos verificadores fica para outra etapa
  return cpfValido(v);
}

/** Verifica se o projeto tem o mínimo necessário para gerar peças oficiais (memorial, planilha, planta, requerimento). */
export function conferirProntoParaExportar(
  imovel: ImovelData,
  vertices: Vertex[],
  confrontantes: Confrontante[],
  tecnico: TecnicoData | null
): ConferenciaExportacao {
  const problemas: string[] = [];

  if (vertices.length < 3) {
    problemas.push('A poligonal precisa de pelo menos 3 vértices.');
  } else if (vertices.some((v) => !v.codigoSigef?.trim())) {
    problemas.push('Existem vértices sem código definitivo — registre os pontos antes de exportar.');
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

  for (const c of confrontantes) {
    if (!c.nome?.trim()) { problemas.push('Existe um confrontante sem nome preenchido.'); continue; }
    if (c.cpf?.trim() && !cpfOuCnpjValido(c.cpf)) problemas.push(`O CPF/CNPJ de "${c.nome}" parece inválido — confira.`);
  }

  return { ok: problemas.length === 0, problemas };
}
