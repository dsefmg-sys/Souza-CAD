// Motor de cálculo do CAR (Cadastro Ambiental Rural). Regras puras do Código Florestal (Lei
// 12.651/2012) e da Lei 8.629/1993 — sem React, sem UI, testável e copiável. A casca visual e a
// exportação SICAR (que dependem do esquema de import do SICAR) ficam por fora, numa etapa seguinte.

export type Bioma = 'amazonia-floresta' | 'amazonia-cerrado' | 'amazonia-campos' | 'demais';

/** Percentual mínimo de Reserva Legal por localização/bioma (Lei 12.651/2012, art. 12). */
export function percentualReservaLegal(bioma: Bioma): number {
  switch (bioma) {
    case 'amazonia-floresta': return 0.8; // 80% em área de florestas na Amazônia Legal
    case 'amazonia-cerrado': return 0.35; // 35% em área de cerrado na Amazônia Legal
    case 'amazonia-campos': return 0.2;   // 20% em campos gerais na Amazônia Legal
    default: return 0.2;                   // 20% nas demais regiões do País
  }
}

/** Área mínima de Reserva Legal (ha) exigida para o imóvel. */
export function reservaLegalMinimaHa(areaImovelHa: number, bioma: Bioma): number {
  return Math.max(0, areaImovelHa) * percentualReservaLegal(bioma);
}

export interface ConfereReservaLegal {
  exigidaHa: number;
  declaradaHa: number;
  atende: boolean;
  faltaHa: number; // 0 quando atende
}

/** Confere se a Reserva Legal desenhada/declarada atende o mínimo legal. */
export function conferirReservaLegal(areaImovelHa: number, bioma: Bioma, reservaDeclaradaHa: number): ConfereReservaLegal {
  const exigidaHa = reservaLegalMinimaHa(areaImovelHa, bioma);
  const declaradaHa = Math.max(0, reservaDeclaradaHa);
  const atende = declaradaHa + 1e-6 >= exigidaHa;
  return { exigidaHa, declaradaHa, atende, faltaHa: atende ? 0 : exigidaHa - declaradaHa };
}

// ---------- Módulos fiscais (Lei 8.629/1993, art. 4) ----------
// O tamanho do módulo fiscal (em ha) varia por município — a tabela oficial é do INCRA e entra por
// parâmetro (moduloFiscalHa). Aqui só derivamos o nº de módulos e a classificação do imóvel.

export type ClasseImovel = 'minifundio' | 'pequena' | 'media' | 'grande';

/** Número de módulos fiscais do imóvel (área ÷ tamanho do módulo fiscal do município). */
export function numeroModulosFiscais(areaImovelHa: number, moduloFiscalHa: number): number {
  if (!(moduloFiscalHa > 0)) return 0;
  return areaImovelHa / moduloFiscalHa;
}

/** Classificação do imóvel rural pelo nº de módulos fiscais. */
export function classificarImovel(numModulos: number): ClasseImovel {
  if (numModulos < 1) return 'minifundio';
  if (numModulos <= 4) return 'pequena';
  if (numModulos <= 15) return 'media';
  return 'grande';
}

// ---------- APP — Áreas de Preservação Permanente (Lei 12.651/2012, art. 4) ----------

/**
 * Faixa de APP (m) na margem de curso d'água natural, pela largura do rio.
 * <10 m → 30 m; 10–50 → 50; 50–200 → 100; 200–600 → 200; >600 → 500.
 */
export function appMargemRio(larguraRioM: number): number {
  const l = Math.max(0, larguraRioM);
  if (l < 10) return 30;
  if (l <= 50) return 50;
  if (l <= 200) return 100;
  if (l <= 600) return 200;
  return 500;
}

/** Raio de APP no entorno de nascente/olho d'água perene: 50 m. */
export const APP_NASCENTE_M = 50;

/**
 * Faixa de APP no entorno de lago/lagoa natural.
 * Rural: 100 m (ou 50 m se o corpo d'água tem até 20 ha). Urbano: 30 m.
 */
export function appLago(areaLagoHa: number, urbano = false): number {
  if (urbano) return 30;
  return areaLagoHa <= 20 ? 50 : 100;
}

// ---------- Resumo consolidado ----------

export interface ResumoCar {
  areaImovelHa: number;
  numModulos: number;
  classe: ClasseImovel;
  reservaLegal: ConfereReservaLegal;
  /** APP total declarada (ha), se informada. */
  appTotalHa: number;
  /** Vegetação nativa remanescente declarada (ha), se informada. */
  vegetacaoNativaHa: number;
  /** Área de uso consolidado declarada (ha), se informada. */
  usoConsolidadoHa: number;
}

export interface EntradaResumoCar {
  areaImovelHa: number;
  bioma: Bioma;
  moduloFiscalHa: number;
  reservaLegalHa?: number;
  appTotalHa?: number;
  vegetacaoNativaHa?: number;
  usoConsolidadoHa?: number;
}

export function resumirCar(e: EntradaResumoCar): ResumoCar {
  const numModulos = numeroModulosFiscais(e.areaImovelHa, e.moduloFiscalHa);
  return {
    areaImovelHa: e.areaImovelHa,
    numModulos,
    classe: classificarImovel(numModulos),
    reservaLegal: conferirReservaLegal(e.areaImovelHa, e.bioma, e.reservaLegalHa ?? 0),
    appTotalHa: Math.max(0, e.appTotalHa ?? 0),
    vegetacaoNativaHa: Math.max(0, e.vegetacaoNativaHa ?? 0),
    usoConsolidadoHa: Math.max(0, e.usoConsolidadoHa ?? 0),
  };
}
