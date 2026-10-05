import type { LocalPosSale, PosCatalog } from './types';

const DATABASE_NAME = 'digifeel-pos';
const DATABASE_VERSION = 2;

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('Le stockage hors connexion n’est pas disponible sur cet appareil.'));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains('catalog')) database.createObjectStore('catalog', { keyPath: 'key' });
      const sales = database.objectStoreNames.contains('sales')
        ? request.transaction?.objectStore('sales')
        : database.createObjectStore('sales', { keyPath: 'id' });
      if (sales && !sales.indexNames.contains('ownerId')) sales.createIndex('ownerId', 'ownerId', { unique: false });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Le stockage local de la caisse est indisponible.'));
    request.onblocked = () => reject(new Error('Fermez les autres onglets Digifeel pour mettre à jour le stockage local.'));
  });
}

function runRequest<T>(database: IDBDatabase, storeName: string, mode: IDBTransactionMode, requestFactory: (store: IDBObjectStore) => IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const request = requestFactory(transaction.objectStore(storeName));
    let result: T;
    request.onsuccess = () => { result = request.result; };
    request.onerror = () => reject(request.error ?? new Error('Échec du stockage local de la caisse.'));
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error ?? new Error('Échec du stockage local de la caisse.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Écriture locale interrompue.'));
  });
}

export async function saveCatalog(catalog: PosCatalog) {
  const database = await openDatabase();
  try {
    await runRequest(database, 'catalog', 'readwrite', store => store.put({ key: `user:${catalog.userId}`, catalog, savedAt: new Date().toISOString() }));
  } finally {
    database.close();
  }
}

export async function loadCatalog(userId: string): Promise<PosCatalog | null> {
  const database = await openDatabase();
  try {
    const entry = await runRequest<{ key: string; catalog: PosCatalog } | undefined>(database, 'catalog', 'readonly', store => store.get(`user:${userId}`));
    return entry?.catalog ?? null;
  } finally {
    database.close();
  }
}

export async function deleteCatalog(userId: string) {
  const database = await openDatabase();
  try {
    await runRequest(database, 'catalog', 'readwrite', store => store.delete(`user:${userId}`));
  } finally {
    database.close();
  }
}

export async function saveLocalSale(sale: LocalPosSale) {
  const database = await openDatabase();
  try {
    await runRequest(database, 'sales', 'readwrite', store => store.put(sale));
  } finally {
    database.close();
  }
}

export async function deleteLocalSale(id: string) {
  const database = await openDatabase();
  try {
    await runRequest(database, 'sales', 'readwrite', store => store.delete(id));
  } finally {
    database.close();
  }
}

export async function loadLocalSales(ownerId: string): Promise<LocalPosSale[]> {
  const database = await openDatabase();
  try {
    const sales = await runRequest<LocalPosSale[]>(database, 'sales', 'readonly', store => store.index('ownerId').getAll(ownerId));
    return sales.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  } finally {
    database.close();
  }
}
