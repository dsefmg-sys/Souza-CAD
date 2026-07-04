import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Projeto, PontoRegistro, Contadores, ProprietarioCad, ConfrontanteCad, ImovelCad, CartorioCad } from '../topo/types';

/** Arquivo anexo de um projeto (guardado localmente no navegador). */
export interface ArquivoProjeto {
  id: string;
  projetoId: string;
  nome: string;
  tipo: string;        // mime
  tamanho: number;
  blob: Blob;
  criadoEm: number;
  rotulo?: string;      // ex.: "Espelho — Proprietário", "Espelho — Confrontante João"
  // A QUEM o documento pertence (organização por dono). Ausente = documento antigo/genérico do projeto.
  dono?: 'imovel' | 'confrontante';
  confrontanteId?: string; // quando dono === 'confrontante'
  tipoDoc?: string;        // ex.: 'CNH', 'Certidão de matrícula', 'Escritura', 'Foto'
}

export interface MetricaDB extends DBSchema {
  // `_uidLocal` é só de armazenamento (marca o dono do registro LOCAL, ver projects.ts) — nunca
  // aparece no tipo `Projeto` usado no resto do app, nem é escrito na nuvem.
  projetos: { key: string; value: Projeto & { _uidLocal?: string } };
  contadores: { key: string; value: Contadores };
  pontos: { key: string; value: PontoRegistro; indexes: { 'por-imovel': string } };
  proprietarios: { key: string; value: ProprietarioCad };
  confrontantes: { key: string; value: ConfrontanteCad };
  imoveis: { key: string; value: ImovelCad };
  cartorios: { key: string; value: CartorioCad };
  arquivos: { key: string; value: ArquivoProjeto; indexes: { 'por-projeto': string } };
  // lixeira do banco de pontos: pontos "zerados" pelo credenciado ficam aqui, recuperáveis
  // (dado importante — nunca some de vez sem passar por aqui).
  pontosLixeira: { key: string; value: PontoRegistro & { excluidoEm: number }; indexes: { 'por-imovel': string } };
}

let _db: Promise<IDBPDatabase<MetricaDB>> | null = null;

export function db(): Promise<IDBPDatabase<MetricaDB>> {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB indisponível neste ambiente'));
  }
  if (!_db) {
    _db = openDB<MetricaDB>('metrica', 5, {
      upgrade(d, oldVersion) {
        if (oldVersion < 1) {
          d.createObjectStore('projetos', { keyPath: 'id' });
        }
        if (oldVersion < 2) {
          if (!d.objectStoreNames.contains('projetos')) d.createObjectStore('projetos', { keyPath: 'id' });
          d.createObjectStore('contadores', { keyPath: 'prefixo' });
          const pontos = d.createObjectStore('pontos', { keyPath: 'codigo' });
          pontos.createIndex('por-imovel', 'imovelId');
          d.createObjectStore('proprietarios', { keyPath: 'id' });
          d.createObjectStore('confrontantes', { keyPath: 'id' });
          d.createObjectStore('imoveis', { keyPath: 'id' });
        }
        if (oldVersion < 3) {
          d.createObjectStore('cartorios', { keyPath: 'id' });
        }
        if (oldVersion < 4) {
          const a = d.createObjectStore('arquivos', { keyPath: 'id' });
          a.createIndex('por-projeto', 'projetoId');
        }
        if (oldVersion < 5) {
          const lix = d.createObjectStore('pontosLixeira', { keyPath: 'codigo' });
          lix.createIndex('por-imovel', 'imovelId');
        }
      },
    });
  }
  return _db;
}

export function novoId(p = 'p'): string {
  return `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
