import type { Gleba, Vertex, Projeto } from './types';
import { listarProjetos } from '../store/projects';

export interface AlertaUnicidadeVertice {
  tipo: 'erro_divergente' | 'aviso_compartilhado';
  codigo: string;
  distanciaMetros: number;
  mensagem: string;
  projetoOrigemId?: string;
  projetoOrigemNome?: string;
  glebaOrigemNome?: string;
}

/** Calcula a distância em metros no terreno entre dois vértices. */
export function calcularDistanciaMetros(
  v1: { lat: number; lon: number; leste?: number; norte?: number },
  v2: { lat: number; lon: number; leste?: number; norte?: number }
): number {
  if (v1.leste && v1.norte && v2.leste && v2.norte && Math.abs(v1.leste - v2.leste) < 500000) {
    return Math.hypot(v2.leste - v1.leste, v2.norte - v1.norte);
  }
  // Fórmula de Haversine para lat/lon em graus
  const R = 6371000;
  const dLat = ((v2.lat - v1.lat) * Math.PI) / 180;
  const dLon = ((v2.lon - v1.lon) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((v1.lat * Math.PI) / 180) * Math.cos((v2.lat * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
  Analisa a unicidade e coerência geográfica de todos os vértices das glebas do projeto atual
  e contra outros projetos salvos no histórico.
 
  Regras do SIGEF/INCRA:
  - Cada código de vértice (ex: COIN-M-0001) é único no espaço geográfico.
  - Se um mesmo código for usado em coordenadas DIFERENTES (> 10cm), gera ALERTA GRAVE DE ERRO.
  - Se for usado na MESMA coordenada (<= 10cm), é reconhecido como VÉRTICE COMPARTILHADO DE DIVISA (válido).
 */
export async function validarUnicidadeEGeometriaVertices(
  glebas: Gleba[],
  projetoAtualId?: string,
  nomeProjetoAtual?: string
): Promise<{ alertas: AlertaUnicidadeVertice[]; errosGraves: string[]; avisos: string[] }> {
  const alertas: AlertaUnicidadeVertice[] = [];
  const errosGraves: string[] = [];
  const avisos: string[] = [];

  // Mapear todos os vértices do projeto atual
  const mapaVerticesAtuais: { v: Vertex; glebaNome: string }[] = [];
  for (const g of glebas) {
    const nomeG = g.denominacao || 'Gleba';
    for (const v of g.vertices) {
      if (v.codigoSigef || v.nome) {
        mapaVerticesAtuais.push({ v, glebaNome: nomeG });
      }
    }
  }

  // 1. VERIFICAÇÃO INTRA-PROJETO (Entre glebas/polígonos do projeto atual)
  const porCodigoInterno = new Map<string, { v: Vertex; glebaNome: string }[]>();
  for (const item of mapaVerticesAtuais) {
    const cod = (item.v.codigoSigef || item.v.nome).trim().toUpperCase();
    if (!porCodigoInterno.has(cod)) porCodigoInterno.set(cod, []);
    porCodigoInterno.get(cod)!.push(item);
  }

  porCodigoInterno.forEach((itens, cod) => {
    if (itens.length > 1) {
      // Comparar distâncias entre as ocorrências do mesmo código no projeto
      for (let i = 0; i < itens.length; i++) {
        for (let j = i + 1; j < itens.length; j++) {
          const v1 = itens[i].v;
          const v2 = itens[j].v;
          const dist = calcularDistanciaMetros(v1, v2);

          if (dist > 0.10) {
            const msg = `O vértice "${cod}" foi usado em posições DIFERENTES no projeto atual (distância de ${dist.toFixed(1).replace('.', ',')} m entre ${itens[i].glebaNome} e ${itens[j].glebaNome}). No SIGEF, cada vértice é único e não pode ter coordenadas divergentes.`;
            errosGraves.push(msg);
            alertas.push({
              tipo: 'erro_divergente',
              codigo: cod,
              distanciaMetros: dist,
              mensagem: msg,
              glebaOrigemNome: itens[j].glebaNome
            });
          } else {
            const msg = `Vértice "${cod}" compartilhado legitimamente na divisa entre ${itens[i].glebaNome} e ${itens[j].glebaNome} (mesma posição geográfica).`;
            avisos.push(msg);
            alertas.push({
              tipo: 'aviso_compartilhado',
              codigo: cod,
              distanciaMetros: dist,
              mensagem: msg,
              glebaOrigemNome: itens[j].glebaNome
            });
          }
        }
      }
    }
  });

  // 2. VERIFICAÇÃO INTER-PROJETOS (Contra o histórico de projetos salvos)
  try {
    const todosProjetos = await listarProjetos();
    const outrosProjetos = todosProjetos.filter((p) => p.id !== projetoAtualId);

    for (const item of mapaVerticesAtuais) {
      const cod = (item.v.codigoSigef || item.v.nome).trim().toUpperCase();

      for (const pOutro of outrosProjetos) {
        const nomeOutro = pOutro.nome || pOutro.imovel?.denominacao || 'Projeto sem nome';
        const verticesOutro = (pOutro.glebas || []).flatMap((g) => g.vertices || []);

        for (const vOutro of verticesOutro) {
          const codOutro = (vOutro.codigoSigef || vOutro.nome || '').trim().toUpperCase();
          if (codOutro === cod) {
            const dist = calcularDistanciaMetros(item.v, vOutro);

            if (dist > 0.10) {
              const msg = `O código de vértice "${cod}" já foi utilizado no projeto "${nomeOutro}" em coordenadas DIFERENTES (distância de ${dist.toFixed(1).replace('.', ',')} m). No SIGEF, cada vértice é único e não pode ser reutilizado em outro local. Verifique a numeração.`;
              if (!errosGraves.includes(msg)) {
                errosGraves.push(msg);
                alertas.push({
                  tipo: 'erro_divergente',
                  codigo: cod,
                  distanciaMetros: dist,
                  mensagem: msg,
                  projetoOrigemId: pOutro.id,
                  projetoOrigemNome: nomeOutro
                });
              }
            } else {
              const msg = `Vértice "${cod}" de divisa compartilhado com o projeto vizinho "${nomeOutro}" (mesmo ponto geográfico).`;
              if (!avisos.includes(msg)) {
                avisos.push(msg);
                alertas.push({
                  tipo: 'aviso_compartilhado',
                  codigo: cod,
                  distanciaMetros: dist,
                  mensagem: msg,
                  projetoOrigemId: pOutro.id,
                  projetoOrigemNome: nomeOutro
                });
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('[UnicidadeVértices] Erro ao consultar projetos do histórico:', err);
  }

  return { alertas, errosGraves, avisos };
}
