/**
 * Validação de CPF brasileiro.
 */
export function cpfValido(cpf: string): boolean {
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return false;
  
  // Ignora CPFs conhecidos com todos os dígitos iguais
  if (/^(\d)\1{10}$/.test(clean)) return false;
  
  // Primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(clean.charAt(i)) * (10 - i);
  }
  let resto = soma % 11;
  const digito1 = resto < 2 ? 0 : 11 - resto;
  if (parseInt(clean.charAt(9)) !== digito1) return false;
  
  // Segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(clean.charAt(i)) * (11 - i);
  }
  resto = soma % 11;
  const digito2 = resto < 2 ? 0 : 11 - resto;
  return parseInt(clean.charAt(10)) === digito2;
}

/**
 * Validação de CNPJ brasileiro (dígitos verificadores).
 */
export function cnpjValido(cnpj: string): boolean {
  const clean = cnpj.replace(/\D/g, '');
  if (clean.length !== 14) return false;

  // Ignora CNPJs conhecidos com todos os dígitos iguais
  if (/^(\d)\1{13}$/.test(clean)) return false;

  const calcDigito = (base: string, pesos: number[]): number => {
    const soma = base.split('').reduce((acc, d, i) => acc + parseInt(d) * pesos[i], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const digito1 = calcDigito(clean.slice(0, 12), pesos1);
  if (parseInt(clean.charAt(12)) !== digito1) return false;

  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const digito2 = calcDigito(clean.slice(0, 13), pesos2);
  return parseInt(clean.charAt(13)) === digito2;
}

/** Valida CPF (11 dígitos) ou CNPJ (14 dígitos), conforme o tamanho do documento. */
export function cpfOuCnpjValido(doc: string): boolean {
  const clean = doc.replace(/\D/g, '');
  if (clean.length === 14) return cnpjValido(doc);
  return cpfValido(doc);
}
