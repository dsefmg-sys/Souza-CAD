// Modelos de TEXTO editáveis pelo usuário para as peças. Cada empresa escreve os blocos padrão do
// seu jeito, usando variáveis {como_esta} que o sistema troca pelos dados reais na hora de gerar.
// Só os blocos de TEXTO LIVRE são modelo — a estrutura das peças (tabela, narrativa calculada,
// assinaturas) continua automática, pra não quebrar a validade no cartório.

export interface ModelosDocs {
  declProprietario: string;   // declaração do(s) proprietário(s) — memorial e planta
  declConfrontantes: string;  // declaração dos confrontantes — memorial e planta
  laudoTecnico: string;       // laudo técnico — planta
  contratoObjeto: string;     // cláusula de OBJETO do contrato
  reciboReferente: string;    // "referente a..." do recibo
}

export const MODELOS_PADRAO: ModelosDocs = {
  declProprietario:
    'Atestamos, sob as penas da lei, serem verdadeiras todas as informações apresentadas nesta planta e no memorial anexo, e que indicamos em campo, de forma expressa, as divisas, limites e confrontações consideradas verdadeiras.',
  declConfrontantes:
    'Concordamos com as medidas apresentadas neste memorial e na planta anexa no tocante aos espaços em que o referido imóvel faz confrontação com o imóvel de nossa propriedade. Estamos cientes de que, nos termos do §10 do artigo 213 da LRP, nossa anuência supre a participação do cônjuge e de eventuais outros condôminos titulares de nosso imóvel.',
  laudoTecnico:
    'Atesto, sob as penas da lei, que efetuei pessoalmente o levantamento da área e que os valores dos azimutes, distâncias e dados de identificação dos confrontantes são os apresentados nesta planta e no memorial que a acompanha.',
  contratoObjeto:
    'Prestação de serviços de georreferenciamento e certificação do imóvel {denominacao}, matrícula {matricula}, situado em {municipio}, com área de {area} e perímetro de {perimetro}.',
  reciboReferente:
    'serviços de georreferenciamento e certificação do imóvel {denominacao}, matrícula {matricula}, situado em {municipio}, com área de {area}',
};

// Variáveis oferecidas ao usuário (para o painel de ajuda do editor).
export const VARIAVEIS_MODELO: { chave: string; descricao: string }[] = [
  { chave: '{proprietario}', descricao: 'Nome do proprietário' },
  { chave: '{cpf}', descricao: 'CPF/CNPJ do proprietário' },
  { chave: '{denominacao}', descricao: 'Nome do imóvel' },
  { chave: '{matricula}', descricao: 'Matrícula' },
  { chave: '{municipio}', descricao: 'Município' },
  { chave: '{area}', descricao: 'Área (ha)' },
  { chave: '{perimetro}', descricao: 'Perímetro (m)' },
  { chave: '{tecnico}', descricao: 'Nome do responsável técnico' },
  { chave: '{cft}', descricao: 'Registro CFT/CREA do técnico' },
  { chave: '{cidade}', descricao: 'Cidade da assinatura' },
];

const KEY = 'metrica.modelosDocs';

export function carregarModelos(): ModelosDocs {
  if (typeof window === 'undefined') return MODELOS_PADRAO;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return MODELOS_PADRAO;
    return { ...MODELOS_PADRAO, ...JSON.parse(raw) };
  } catch { return MODELOS_PADRAO; }
}

export function salvarModelos(m: ModelosDocs): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(KEY, JSON.stringify(m)); } catch { /* ignore */ }
}

/** Troca as variáveis {chave} do modelo pelos valores reais. Chaves desconhecidas viram ''. */
export function preencherModelo(texto: string, vars: Record<string, string | undefined>): string {
  return (texto || '').replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? '').toString());
}
