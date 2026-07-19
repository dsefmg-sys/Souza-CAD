import { z } from 'zod';

/**
 * Esquemas Zod para validação em tempo de execução das leituras de LocalStorage
 */

export const TecnicoSchema = z.object({
  nome: z.string().catch('DADO AUSENTE'),
  cpf: z.string().catch(''),
  cft: z.string().catch(''),
  artTrt: z.string().catch(''),
  conselho: z.enum(['CREA', 'CFT', 'CFTA']).catch('CREA'),
  codigoCredenciamento: z.string().catch(''),
  telefone: z.string().catch(''),
  email: z.string().catch(''),
  municipio: z.string().catch(''),
  uf: z.string().catch('MG'),
});

export type TecnicoSchemaType = z.infer<typeof TecnicoSchema>;

export const EscritorioSchema = z.object({
  nome: z.string().catch('SOUZA-CAD PROJETOS'),
  cnpj: z.string().catch(''),
  endereco: z.string().catch(''),
  telefone: z.string().catch(''),
  email: z.string().catch(''),
  municipio: z.string().catch(''),
  uf: z.string().catch('MG'),
  logoSvg: z.string().optional(),
});

export type EscritorioSchemaType = z.infer<typeof EscritorioSchema>;

export const ImportTxtSchema = z.object({
  separador: z.string().catch(';'),
  decimal: z.string().catch('.'),
  temCabecalho: z.boolean().catch(true),
  colunas: z.array(z.string()).catch(['nome', 'codigo', 'norte', 'leste', 'elevacao', 'sigmaY', 'sigmaX', 'sigmaZ']),
});

export type ImportTxtSchemaType = z.infer<typeof ImportTxtSchema>;

/**
 * Esquemas Zod para validação em tempo de execução de respostas de API externas
 */

export const IaExtrairImovelSchema = z.object({
  denominacao: z.string().catch('DADO AUSENTE'),
  municipio: z.string().catch('___'),
  uf: z.string().catch('MG'),
  matricula: z.string().catch(''),
  comarca: z.string().catch(''),
  areaHa: z.number().catch(0),
  perimetroM: z.number().catch(0),
  proprietarios: z.array(z.object({
    nome: z.string().catch('DADO AUSENTE'),
    cpfCnpj: z.string().catch(''),
  })).catch([]),
  vertices: z.array(z.object({
    nome: z.string(),
    leste: z.number(),
    norte: z.number(),
    elevacao: z.number().catch(0),
  })).catch([]),
});

export type IaExtrairImovelType = z.infer<typeof IaExtrairImovelSchema>;

/**
 * Esquema Zod para validação de formulários (Requerimento Cartorário)
 */

export const RequerimentoFormSchema = z.object({
  requerenteNome: z.string().min(2, 'Nome do requerente deve ter ao menos 2 caracteres'),
  requerenteCpfCnpj: z.string().min(11, 'CPF/CNPJ inválido'),
  imovelDenominacao: z.string().min(2, 'Denominação do imóvel é obrigatória'),
  imovelMatricula: z.string().catch(''),
  municipio: z.string().min(2, 'Município é obrigatório'),
  uf: z.string().length(2, 'UF deve ter exatamente 2 letras'),
});

export type RequerimentoFormType = z.infer<typeof RequerimentoFormSchema>;
