import type { Vertex, Contadores, PontoRegistro, TecnicoData } from '../topo/types';
import { db } from './db';
import { semente, atribuirDefinitivo } from '../topo/registroCore';
import { db as fdb, auth, firebaseConfigurado } from '../firebase/client';
import { doc, getDoc, setDoc, runTransaction } from 'firebase/firestore';

export async function lerContadores(prefixo: string, tec: TecnicoData): Promise<Contadores> {
  const uid = auth()?.currentUser?.uid ?? null;
  if (firebaseConfigurado && uid) {
    try {
      const snap = await getDoc(doc(fdb()!, 'credenciados', prefixo));
      if (snap.exists()) {
        const c = snap.data() as Contadores;
        const d = await db();
        await d.put('contadores', c);
        return c;
      }
    } catch (e) {
      console.warn('Erro ao ler contadores do Firestore:', e);
    }
  }
  const d = await db();
  const c = await d.get('contadores', prefixo);
  return c ?? semente(prefixo, tec);
}

/**
 * Registra (consome) os pontos ainda não registrados de um conjunto de vértices.
 * Lê o contador autoritativo no momento do commit, grava contador + pontos numa transação,
 * e devolve os vértices com os códigos definitivos. Garante numeração que nunca se repete.
 */
export async function registrarPontos(
  vertices: Vertex[],
  prefixo: string,
  imovelId: string | undefined,
  zonaUtm: number,
  hemisferio: 'N' | 'S',
  tec: TecnicoData
): Promise<{ vertices: Vertex[]; pontos: PontoRegistro[] }> {
  if (imovelId?.includes('DEMO') || imovelId?.includes('FICTICIO') || imovelId?.includes('COPIA DADOS FICTICIOS')) {
    // Projetos de demonstração e vídeos não consomem nem afetam o banco/contador oficial de vértices
    return { vertices, pontos: [] };
  }
  const uid = auth()?.currentUser?.uid ?? null;
  if (firebaseConfigurado && uid) {
    try {
      const result = await runTransaction(fdb()!, async (transaction) => {
        const counterDocRef = doc(fdb()!, 'credenciados', prefixo);
        const counterSnap = await transaction.get(counterDocRef);
        const atual = counterSnap.exists()
          ? (counterSnap.data() as Contadores)
          : semente(prefixo, tec);

        const r = atribuirDefinitivo(vertices, atual, imovelId, zonaUtm, hemisferio, Date.now());

        transaction.set(counterDocRef, { ...r.contadores, _uid: uid });

        for (const p of r.pontos) {
          const pointDocRef = doc(fdb()!, 'credenciados', prefixo, 'pontos', p.codigo);
          transaction.set(pointDocRef, p);
        }

        return r;
      });

      const d = await db();
      const tx = d.transaction(['contadores', 'pontos'], 'readwrite');
      await tx.objectStore('contadores').put(result.contadores);
      for (const p of result.pontos) await tx.objectStore('pontos').put(p);
      await tx.done;

      return { vertices: result.vertices, pontos: result.pontos };
    } catch (e) {
      console.warn('Erro ao registrar pontos via transação do Firestore:', e);
    }
  }

  const d = await db();
  const tx = d.transaction(['contadores', 'pontos'], 'readwrite');
  const atual = (await tx.objectStore('contadores').get(prefixo)) ?? semente(prefixo, tec);
  const r = atribuirDefinitivo(vertices, atual, imovelId, zonaUtm, hemisferio, Date.now());
  await tx.objectStore('contadores').put(r.contadores);
  for (const p of r.pontos) await tx.objectStore('pontos').put(p);
  await tx.done;
  return { vertices: r.vertices, pontos: r.pontos };
}

export async function codigoEmUso(codigo: string): Promise<boolean> {
  const d = await db();
  return (await d.get('pontos', codigo)) !== undefined;
}

export async function pontosDoImovel(imovelId: string): Promise<PontoRegistro[]> {
  const d = await db();
  return d.getAllFromIndex('pontos', 'por-imovel', imovelId);
}

export async function totalPontosRegistrados(): Promise<number> {
  const d = await db();
  return d.count('pontos');
}

/** Lista todos os pontos já registrados neste navegador (para o gerenciador do banco). */
export async function listarTodosPontos(): Promise<PontoRegistro[]> {
  const d = await db();
  const arr = await d.getAll('pontos');
  return arr.sort((a, b) => b.criadoEm - a.criadoEm);
}

// ————————————————————————————————————————————————————————————————————————
// Gestão do banco de pontos (danger zone): zerar move os pontos para a LIXEIRA em vez de apagar
// de vez — dado importante (numeração do credenciado). De lá dá pra resgatar um a um ou todos.
// Opera no banco LOCAL deste navegador (mesma origem do gerenciador do banco de pontos).
// ————————————————————————————————————————————————————————————————————————

/** Move TODOS os pontos registrados para a lixeira. Devolve quantos foram para lá. */
export async function zerarBancoPontos(): Promise<number> {
  const d = await db();
  const todos = await d.getAll('pontos');
  if (!todos.length) return 0;
  const tx = d.transaction(['pontos', 'pontosLixeira'], 'readwrite');
  const agora = Date.now();
  for (const p of todos) {
    await tx.objectStore('pontosLixeira').put({ ...p, excluidoEm: agora });
    await tx.objectStore('pontos').delete(p.codigo);
  }
  await tx.done;
  return todos.length;
}

/** Move UM ponto para a lixeira (exclusão individual, recuperável). */
export async function excluirPonto(codigo: string): Promise<void> {
  const d = await db();
  const tx = d.transaction(['pontos', 'pontosLixeira'], 'readwrite');
  const p = await tx.objectStore('pontos').get(codigo);
  if (p) {
    await tx.objectStore('pontosLixeira').put({ ...p, excluidoEm: Date.now() });
    await tx.objectStore('pontos').delete(codigo);
  }
  await tx.done;
}

/** Lista os pontos que estão na lixeira (mais recentes primeiro). */
export async function listarLixeiraPontos(): Promise<(PontoRegistro & { excluidoEm: number })[]> {
  const d = await db();
  const arr = await d.getAll('pontosLixeira');
  return arr.sort((a, b) => b.excluidoEm - a.excluidoEm);
}

export async function totalLixeiraPontos(): Promise<number> {
  const d = await db();
  return d.count('pontosLixeira');
}

/** Resgata um ponto da lixeira de volta pro banco ativo. */
export async function resgatarPonto(codigo: string): Promise<void> {
  const d = await db();
  const tx = d.transaction(['pontos', 'pontosLixeira'], 'readwrite');
  const p = await tx.objectStore('pontosLixeira').get(codigo);
  if (p) {
    const { excluidoEm: _descartar, ...limpo } = p;
    void _descartar;
    await tx.objectStore('pontos').put(limpo);
    await tx.objectStore('pontosLixeira').delete(codigo);
  }
  await tx.done;
}

/** Resgata TODOS os pontos da lixeira. Devolve quantos voltaram. */
export async function resgatarTodosPontos(): Promise<number> {
  const d = await db();
  const todos = await d.getAll('pontosLixeira');
  if (!todos.length) return 0;
  const tx = d.transaction(['pontos', 'pontosLixeira'], 'readwrite');
  for (const p of todos) {
    const { excluidoEm: _descartar, ...limpo } = p;
    void _descartar;
    await tx.objectStore('pontos').put(limpo);
    await tx.objectStore('pontosLixeira').delete(p.codigo);
  }
  await tx.done;
  return todos.length;
}

/** Ajuste manual dos contadores (Configurações), respeitando o que já foi usado. */
export async function definirContadores(c: Contadores): Promise<void> {
  const uid = auth()?.currentUser?.uid ?? null;
  if (firebaseConfigurado && uid) {
    try {
      await setDoc(doc(fdb()!, 'credenciados', c.prefixo), { ...c, _uid: uid });
    } catch (e) {
      console.warn('Erro ao definir contadores no Firestore:', e);
    }
  }
  const d = await db();
  await d.put('contadores', c);
}
