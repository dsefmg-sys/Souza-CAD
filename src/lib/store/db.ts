import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Projeto, PontoRegistro, Contadores, ProprietarioCad, ConfrontanteCad, ImovelCad, CartorioCad } from '../topo/types';

export interface MetricaDB extends DBSchema {
  projetos: { key: string; value: Projeto };
  contadores: { key: string; value: Contadores };
  pontos: { key: string; value: PontoRegistro; indexes: { 'por-imovel': string } };
  proprietarios: { key: string; value: ProprietarioCad };
  confrontantes: { key: string; value: ConfrontanteCad };
  imoveis: { key: string; value: ImovelCad };
  cartorios: { key: string; value: CartorioCad };
}

let _db: Promise<IDBPDatabase<MetricaDB>> | null = null;

export function db(): Promise<IDBPDatabase<MetricaDB>> {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB indisponível neste ambiente'));
  }
  if (!_db) {
    _db = openDB<MetricaDB>('metrica', 3, {
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
      },
    });
  }
  return _db;
}

export function novoId(p = 'p'): string {
  return `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
