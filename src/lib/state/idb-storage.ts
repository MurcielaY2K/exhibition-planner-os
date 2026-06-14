import type { StateStorage } from "zustand/middleware";

// The exhibition store persists full project bundles, including base64 artwork
// images. localStorage caps at ~5MB and throws QuotaExceededError once a few
// images are added — which silently kills ALL subsequent persistence. IndexedDB
// has a far larger quota (hundreds of MB), so we back persistence with it and
// keep localStorage only as a one-time migration source for existing data.

const DB_NAME = "exhibition-planner";
const STORE_NAME = "keyval";
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  // If opening fails, let a later call retry from scratch.
  dbPromise.catch(() => {
    dbPromise = null;
  });

  return dbPromise;
}

async function idbGet(key: string): Promise<string | null> {
  const db = await openDb();
  return new Promise<string | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve((request.result as string | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
}

async function idbSet(key: string, value: string): Promise<void> {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function idbRemove(key: string): Promise<void> {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

// Server-side and unsupported-browser fallback: a no-op storage so the store
// initializes from in-code defaults and (on the client) rehydrates after mount.
const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

const indexedDbStorage: StateStorage = {
  async getItem(key) {
    try {
      const value = await idbGet(key);
      if (value !== null) {
        return value;
      }
      // One-time migration: import any pre-existing localStorage payload, then
      // hand persistence over to IndexedDB.
      if (typeof localStorage !== "undefined") {
        const legacy = localStorage.getItem(key);
        if (legacy !== null) {
          try {
            await idbSet(key, legacy);
          } catch {
            // If the import write fails, still return the legacy value so the
            // user's data loads this session.
          }
          return legacy;
        }
      }
      return null;
    } catch {
      return null;
    }
  },
  async setItem(key, value) {
    try {
      await idbSet(key, value);
      // Drop the legacy copy once it has been migrated to IndexedDB.
      if (typeof localStorage !== "undefined" && localStorage.getItem(key) !== null) {
        localStorage.removeItem(key);
      }
    } catch {
      // Swallow write failures rather than throwing inside Zustand's persist
      // pipeline, which would otherwise surface as an uncaught error.
    }
  },
  async removeItem(key) {
    try {
      await idbRemove(key);
    } catch {
      // ignore
    }
  },
};

export function getExhibitionStorage(): StateStorage {
  if (typeof indexedDB === "undefined") {
    return noopStorage;
  }
  return indexedDbStorage;
}
