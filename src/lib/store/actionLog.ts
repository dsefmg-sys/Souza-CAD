import { collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db as fdb, auth, firebaseConfigurado } from '../firebase/client';

export interface ActionLog {
  id?: string;
  autorUid: string;
  autorEmail: string;
  tipoAcao: string;
  detalhes: string;
  timestamp: number;
}

/** Registra uma ação administrativa no Firestore (coleção `actionLogs`). */
export async function registrarAcaoAdmin(tipoAcao: string, detalhes: string): Promise<void> {
  const user = auth()?.currentUser;
  const autorUid = user?.uid || 'sistema';
  const autorEmail = user?.email || 'sistema@souzacad.com.br';
  const log: ActionLog = {
    autorUid,
    autorEmail,
    tipoAcao,
    detalhes,
    timestamp: Date.now(),
  };

  if (firebaseConfigurado && fdb()) {
    try {
      await addDoc(collection(fdb()!, 'actionLogs'), log);
    } catch (e) {
      console.warn('[actionLog] Erro ao salvar log no Firestore:', e);
    }
  }
}

/** Lista os logs de ações administrativas mais recentes. */
export async function listarAcoesAdmin(maxItens: number = 30): Promise<ActionLog[]> {
  if (!firebaseConfigurado || !fdb()) return [];
  try {
    const q = query(collection(fdb()!, 'actionLogs'), orderBy('timestamp', 'desc'), limit(maxItens));
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as ActionLog) }));
  } catch (e) {
    console.warn('[actionLog] Erro ao listar logs:', e);
    return [];
  }
}
