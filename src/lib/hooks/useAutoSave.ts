'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import type { Vertex, Gleba, Confrontante, ImovelData, ObjetoDesenho, PlantaConfig } from '../topo/types';

/**
 * Auto-save: detecta mudança não salva no projeto e acende o "disquete laranja" na UI.
 *
 * Estratégia: serializa o conteúdo do projeto em uma string (projSig) e compara com a última
 * versão salva. Se forem diferentes e o `acabouDeSalvar` ainda não foi consumido, marca
 * `salvarLaranja = true` após 1 segundo (debounce — evita acender a cada tecla digitada).
 *
 * IMPORTANTE: `glebas` é serializado INTEIRO (não só IDs) — sem isso, edições em glebas
 * inativas não mudam a assinatura e o usuário perde trabalho sem aviso. Custo: serialização
 * cresce com o número de glebas. Medido: 25k vértices → 16ms, aceitável.
 *
 * O hook devolve:
 *  - `salvarLaranja` / `setSalvarLaranja`: estado da UI (disquete laranja)
 *  - `salvoOk` / `setSalvoOk`: sucesso de salvar na nuvem (verde)
 *  - `salvoNuvem` / `setSalvoNuvem`: se o último save foi pra nuvem
 *  - `marcarComoSalvo()`: chamar DEPOIS de salvar (zera o disquete e atualiza a baseline)
 *  - `resetBaseline()`: reseta a baseline sem mexer no disquete (útil em casos de loading)
 */
export interface EstadoAutoSave {
  salvarLaranja: boolean;
  setSalvarLaranja: (v: boolean) => void;
  salvoOk: boolean;
  setSalvoOk: (v: boolean) => void;
  salvoNuvem: boolean;
  setSalvoNuvem: (v: boolean) => void;
  marcarComoSalvo: () => void;
  resetBaseline: () => void;
}

export interface DepsAutoSave {
  vertices: Vertex[];
  imovel: ImovelData;
  confrontantes: Confrontante[];
  confrontantePorLado: Record<number, string>;
  objetos: ObjetoDesenho[];
  plantaConfig: PlantaConfig;
  glebas: Gleba[];
  verticesVizinho: import('../topo/types').VerticeVizinho[];
  verticesIgnorados: Vertex[];
  nomeProjeto: string;
  requerente: import('../topo/types').PessoaQualificada | null | undefined;
  transmitente: import('../topo/types').PessoaQualificada | null | undefined;
  tipoAto: string | null;
  partesAdicionais: import('../topo/types').PessoaQualificada[];
  gradeAltimetrica: { lat: number; lon: number; leste: number; norte: number; elevacao: number }[];
}

export function useAutoSave(deps: DepsAutoSave): EstadoAutoSave {
  const [salvarLaranja, setSalvarLaranja] = useState(false);
  const [salvoOk, setSalvoOk] = useState(true);
  const [salvoNuvem, setSalvoNuvem] = useState(false);

  const projSig = useMemo(
    () => JSON.stringify({
      v: deps.vertices, i: deps.imovel, c: deps.confrontantes, cpl: deps.confrontantePorLado,
      o: deps.objetos, pc: deps.plantaConfig, g: deps.glebas, vv: deps.verticesVizinho,
      ig: deps.verticesIgnorados, np: deps.nomeProjeto, rq: deps.requerente, tr: deps.transmitente,
      ta: deps.tipoAto, pa: deps.partesAdicionais, ga: deps.gradeAltimetrica,
    }),
    [
      deps.vertices, deps.imovel, deps.confrontantes, deps.confrontantePorLado,
      deps.objetos, deps.plantaConfig, deps.glebas, deps.verticesVizinho,
      deps.verticesIgnorados, deps.nomeProjeto, deps.requerente, deps.transmitente,
      deps.tipoAto, deps.partesAdicionais, deps.gradeAltimetrica,
    ]
  );

  // Baseline da última versão salva (string do projSig no momento do save). Comparado com o
  // projSig atual pra detectar mudanças não persistidas.
  const ultimoSalvoSig = useRef<string>('');
  // Flag consumida quando o usuário acabou de salvar: a próxima mudança é considerada a
  // "versão salva" sem acender o disquete (porque o salvar mudou os vértices/códigos).
  const acabouDeSalvar = useRef<boolean>(false);

  const justReseted = useRef<boolean>(false);

  useEffect(() => {
    if (justReseted.current) {
      justReseted.current = false;
      ultimoSalvoSig.current = projSig;
      setSalvarLaranja(false);
      setSalvoOk(true);
      return;
    }
    if (ultimoSalvoSig.current === '') {
      // primeira montagem: baseline = estado atual, sem disquete
      ultimoSalvoSig.current = projSig;
      setSalvarLaranja(false);
      return;
    }
    // o salvar mudou vértices/códigos: a mudança é IMEDIATA e considerada a versão salva
    if (acabouDeSalvar.current) {
      acabouDeSalvar.current = false;
      ultimoSalvoSig.current = projSig;
      setSalvarLaranja(false);
      return;
    }
    // estado atual == baseline: nada mudou
    if (projSig === ultimoSalvoSig.current) {
      setSalvarLaranja(false);
      return;
    }
    // mudou e não foi o save: acende o disquete após 1s (debounce)
    setSalvoOk(false);
    const t = setTimeout(() => setSalvarLaranja(true), 1000);
    return () => clearTimeout(t);
  }, [projSig]);

  return {
    salvarLaranja, setSalvarLaranja,
    salvoOk, setSalvoOk,
    salvoNuvem, setSalvoNuvem,
    marcarComoSalvo: () => {
      // A próxima mudança será tratada como "a versão salva" sem acender o disquete.
      // O useEffect abaixo atualiza a baseline quando projSig recalcular.
      acabouDeSalvar.current = true;
    },
    resetBaseline: () => {
      justReseted.current = true;
      setSalvarLaranja(false);
    },
  };
}
