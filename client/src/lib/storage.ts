/**
 * Client-side storage utilities for grid data caching
 * Uses IndexedDB for large datasets (>5MB) and localStorage for smaller ones
 */

const DB_NAME = 'accounting-cache';
const DB_VERSION = 1;
const STORE_NAME = 'journal-entries';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  companyId: number;
  expiresAt: number;
}

// IndexedDB wrapper for large datasets
class IndexedDBCache {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          store.createIndex('companyId', 'companyId', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async set<T>(key: string, data: T, companyId: number, ttl: number = 30 * 60 * 1000): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const entry: CacheEntry<T> & { key: string } = {
      key: `${companyId}:${key}`,
      data,
      timestamp: Date.now(),
      companyId,
      expiresAt: Date.now() + ttl,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(entry);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async get<T>(key: string, companyId: number): Promise<T | null> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(`${companyId}:${key}`);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const entry = request.result as (CacheEntry<T> & { key: string }) | undefined;
        if (!entry) {
          resolve(null);
          return;
        }

        // Check if expired
        if (entry.expiresAt < Date.now()) {
          this.delete(key, companyId); // Clean up expired entry
          resolve(null);
          return;
        }

        resolve(entry.data);
      };
    });
  }

  async delete(key: string, companyId: number): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(`${companyId}:${key}`);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clear(companyId?: number): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      if (companyId) {
        // Clear only entries for this company
        const index = store.index('companyId');
        const request = index.openCursor(IDBKeyRange.only(companyId));

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            resolve();
          }
        };
        request.onerror = () => reject(request.error);
      } else {
        // Clear all
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }
    });
  }

  async cleanupExpired(): Promise<number> {
    await this.init();
    if (!this.db) return 0;

    let deleted = 0;
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      const request = index.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const entry = cursor.value as CacheEntry<any>;
          if (entry.expiresAt < Date.now()) {
            cursor.delete();
            deleted++;
          }
          cursor.continue();
        } else {
          resolve(deleted);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
}

// LocalStorage wrapper for smaller datasets (fallback if IndexedDB unavailable)
class LocalStorageCache {
  private prefix = 'accounting-cache:';

  private getKey(key: string, companyId: number): string {
    return `${this.prefix}${companyId}:${key}`;
  }

  set<T>(key: string, data: T, companyId: number, ttl: number = 30 * 60 * 1000): void {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        companyId,
        expiresAt: Date.now() + ttl,
      };
      localStorage.setItem(this.getKey(key, companyId), JSON.stringify(entry));
    } catch (error) {
      // Handle quota exceeded error
      console.warn('LocalStorage quota exceeded, clearing old entries');
      this.cleanupExpired();
      try {
        const entry: CacheEntry<T> = {
          data,
          timestamp: Date.now(),
          companyId,
          expiresAt: Date.now() + ttl,
        };
        localStorage.setItem(this.getKey(key, companyId), JSON.stringify(entry));
      } catch (retryError) {
        console.error('Failed to cache data:', retryError);
      }
    }
  }

  get<T>(key: string, companyId: number): T | null {
    try {
      const item = localStorage.getItem(this.getKey(key, companyId));
      if (!item) return null;

      const entry = JSON.parse(item) as CacheEntry<T>;
      if (entry.expiresAt < Date.now()) {
        this.delete(key, companyId);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.error('Failed to retrieve cached data:', error);
      return null;
    }
  }

  delete(key: string, companyId: number): void {
    localStorage.removeItem(this.getKey(key, companyId));
  }

  clear(companyId?: number): void {
    if (companyId) {
      const prefix = this.getKey('', companyId);
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(prefix)) {
          localStorage.removeItem(key);
        }
      });
    } else {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
    }
  }

  cleanupExpired(): number {
    let deleted = 0;
    const now = Date.now();
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(this.prefix)) {
        try {
          const entry = JSON.parse(localStorage.getItem(key) || '{}') as CacheEntry<any>;
          if (entry.expiresAt && entry.expiresAt < now) {
            localStorage.removeItem(key);
            deleted++;
          }
        } catch (error) {
          // Invalid entry, remove it
          localStorage.removeItem(key);
          deleted++;
        }
      }
    });
    return deleted;
  }
}

// Unified cache interface
class UnifiedCache {
  private indexedDB: IndexedDBCache;
  private localStorage: LocalStorageCache;
  private useIndexedDB: boolean = true;

  constructor() {
    this.indexedDB = new IndexedDBCache();
    this.localStorage = new LocalStorageCache();
    this.checkIndexedDBSupport();
  }

  private async checkIndexedDBSupport(): Promise<void> {
    if (!('indexedDB' in window)) {
      this.useIndexedDB = false;
      return;
    }

    try {
      await this.indexedDB.init();
    } catch (error) {
      console.warn('IndexedDB not available, falling back to localStorage');
      this.useIndexedDB = false;
    }
  }

  async set<T>(key: string, data: T, companyId: number, ttl?: number): Promise<void> {
    // Use IndexedDB for large datasets (>1MB estimated)
    const dataSize = JSON.stringify(data).length;
    if (this.useIndexedDB && dataSize > 1024 * 1024) {
      await this.indexedDB.set(key, data, companyId, ttl);
    } else {
      this.localStorage.set(key, data, companyId, ttl);
    }
  }

  async get<T>(key: string, companyId: number): Promise<T | null> {
    if (this.useIndexedDB) {
      const result = await this.indexedDB.get<T>(key, companyId);
      if (result !== null) return result;
    }
    return this.localStorage.get<T>(key, companyId);
  }

  async delete(key: string, companyId: number): Promise<void> {
    if (this.useIndexedDB) {
      await this.indexedDB.delete(key, companyId);
    }
    this.localStorage.delete(key, companyId);
  }

  async clear(companyId?: number): Promise<void> {
    if (this.useIndexedDB) {
      await this.indexedDB.clear(companyId);
    }
    this.localStorage.clear(companyId);
  }

  async cleanupExpired(): Promise<number> {
    let count = 0;
    if (this.useIndexedDB) {
      count += await this.indexedDB.cleanupExpired();
    }
    count += this.localStorage.cleanupExpired();
    return count;
  }
}

export const cache = new UnifiedCache();

// Cleanup expired entries on load
if (typeof window !== 'undefined') {
  cache.cleanupExpired();
  
  // Cleanup every 5 minutes
  setInterval(() => {
    cache.cleanupExpired();
  }, 5 * 60 * 1000);
}

