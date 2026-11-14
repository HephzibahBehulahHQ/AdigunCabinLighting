export type CabinAudioRole = 'mood' | 'welcome' | 'tour';

export type StoredCabinAudioAsset = {
  readonly key: string;
  readonly projectId: string;
  readonly role: CabinAudioRole;
  readonly sceneId: string | null;
  readonly title: string;
  readonly fileName: string;
  readonly mediaType: string;
  readonly rightsReference: string;
  readonly savedAt: string;
  readonly blob: Blob;
};

const DATABASE_NAME = 'adigun-cabin-audio-assets';
const DATABASE_VERSION = 1;
const STORE_NAME = 'audio-assets';
let databasePromise: Promise<IDBDatabase> | null = null;

/** Keeps browser-local audio roles isolated by project and scene without putting media in scene exports. */
export function cabinAudioAssetKey(projectId: string, role: CabinAudioRole, sceneId?: string): string {
  return JSON.stringify([projectId, role, role === 'mood' ? sceneId ?? '' : '']);
}

function openAudioDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('IndexedDB is unavailable in this browser.'));
  if (databasePromise) return databasePromise;

  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME, { keyPath: 'key' });
    };
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => {
        database.close();
        databasePromise = null;
      };
      resolve(database);
    };
    request.onerror = () => {
      databasePromise = null;
      reject(request.error ?? new Error('Could not open browser-local audio storage.'));
    };
    request.onblocked = () => {
      databasePromise = null;
      reject(new Error('Browser-local audio storage is busy in another tab.'));
    };
  });
  return databasePromise;
}

export async function saveCabinAudioAsset(asset: StoredCabinAudioAsset): Promise<void> {
  const database = await openAudioDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(asset);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not save the browser-local audio asset.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Browser-local audio save was aborted.'));
  });
}

export async function readCabinAudioAsset(key: string): Promise<StoredCabinAudioAsset | undefined> {
  const database = await openAudioDatabase();
  return new Promise<StoredCabinAudioAsset | undefined>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(key);
    let result: StoredCabinAudioAsset | undefined;
    request.onsuccess = () => { result = request.result as StoredCabinAudioAsset | undefined; };
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not read the browser-local audio asset.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Browser-local audio read was aborted.'));
  });
}

export async function deleteCabinAudioAsset(key: string): Promise<void> {
  const database = await openAudioDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).delete(key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not remove the browser-local audio asset.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Browser-local audio removal was aborted.'));
  });
}
