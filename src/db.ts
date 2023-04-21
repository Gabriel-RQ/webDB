import type { WebDBSetupOptions } from "../@types/src/db";

/**
 * Promise Wrapper for the IndexedDB API. Provides simple utilities to work with IndexedDB using promises.
 */
export class WebDB {
  private databaseRequest: IDBOpenDBRequest;
  private db: IDBDatabase | undefined = undefined;

  constructor(
    public name: string,
    public version: number,
    private setup?: WebDBSetupOptions,
    private handlers?: {
      onBlocked?: (oldVersion: number, newVersion: number | null) => any;
      onVersionChange?: (
        db: IDBDatabase,
        oldVersion: number,
        newVersion: number | null
      ) => any;
      onError?: (error: DOMException | null) => any;
    }
  ) {
    if (!("indexedDB" in window)) throw new Error("No support for indexedDB!");

    this.databaseRequest = indexedDB.open(name, version);
    this.handleUpgradeNeeded();
    this.handleSuccess();
    this.handleBlocked();
    this.handleError();
  }

  private handleUpgradeNeeded() {
    this.databaseRequest.onupgradeneeded = () => {
      this.db = this.databaseRequest.result;

      if (this.setup?.objectStores) {
        for (const { name, options, configs } of this.setup.objectStores) {
          if (configs?.recreate && this.db.objectStoreNames.contains(name))
            this.db.deleteObjectStore(name);

          if (!this.db.objectStoreNames.contains(name)) {
            const store = this.db.createObjectStore(name, options);

            if (configs?.indexes) {
              configs.indexes.forEach((idx) =>
                store.createIndex(idx.name, idx.keyPath, idx.options)
              );
            }
          }
        }
      }
    };
  }

  private handleSuccess() {
    this.databaseRequest.onsuccess = () => {
      this.db = this.databaseRequest.result;

      if (this.handlers?.onVersionChange) {
        this.db.onversionchange = (event) => {
          if (this.db && this.handlers)
            this.handlers.onVersionChange?.(
              this.db,
              event.oldVersion,
              event.newVersion
            );
        };
      }
    };
  }

  private handleBlocked() {
    if (this.handlers?.onBlocked)
      this.databaseRequest.onblocked = (event) => {
        if (this.handlers?.onBlocked)
          this.handlers.onBlocked(event.oldVersion, event.newVersion);
      };
  }

  private handleError() {
    if (this.handlers?.onError)
      this.databaseRequest.onerror = () => {
        if (this.handlers?.onError)
          this.handlers.onError(this.databaseRequest.error);
      };
  }

  /**
   * Starts a transaction using the given `Object Store names` and return a promise that resolves to a reference to the transaction,
   * or rejects to an error.
   */
  transaction(
    storeNames: string | Iterable<string>,
    mode: "readwrite" | "readonly" = "readonly"
  ): Promise<IDBTransaction> {
    return new Promise((resolve, reject) => {
      const transaction = this.db?.transaction(storeNames, mode);

      if (transaction) resolve(transaction);
      else reject(new Error("Couldn't resolve the transaction"));
    });
  }

  /**
   * Retrieves a value from a single Object Store. Can search the `query` in a specific `index` in the Object Store.
   */
  async get<T>(
    store: string,
    query: IDBValidKey | IDBKeyRange,
    index?: string
  ): Promise<T | DOMException> {
    const transaction = await this.transaction(store);
    const objectStore = transaction.objectStore(store);
    const idx = index ? objectStore.index(index) : undefined;

    return new Promise((resolve, reject) => {
      const request = idx ? idx.get(query) : objectStore.get(query);

      request.onsuccess = () => resolve(request.result as T);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Gets all the data from a single Object Store. Can search for the an `index` in the store.
   */
  async getAll<T>(
    store: string,
    query?: IDBValidKey | IDBKeyRange,
    index?: string
  ): Promise<T[] | DOMException> {
    const transaction = await this.transaction(store);
    const objectStore = transaction.objectStore(store);
    const idx = index ? objectStore.index(index) : undefined;

    return new Promise((resolve, reject) => {
      const request = idx ? idx.getAll(query) : objectStore.getAll(query);

      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Abstracts `IDBObjectStore.add()`. Returns a promise that resolves to the key of the inserted record if successful, or resolves to the the transaction's error if
   * unsuccessful. Fails if an existing record with the same key exists.
   */
  async add<T>(
    store: string,
    data: T,
    key?: IDBValidKey | undefined
  ): Promise<IDBValidKey | DOMException> {
    return new Promise(async (resolve, reject) => {
      const transaction = await this.transaction(store, "readwrite");
      const objectStore = transaction.objectStore(store);

      const k = objectStore.add(data, key);

      transaction.oncomplete = () => resolve(k.result);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Abstracts `IDBObjectStore.put()`. Returns a promise that resolves to the key of the inserted record if successful,
   * and rejects to the transaction's error if unsuccessful. Replaces existing records with the same key.
   */
  async put<T>(
    store: string,
    data: T,
    key?: IDBValidKey | undefined
  ): Promise<IDBValidKey | DOMException> {
    return new Promise(async (resolve, reject) => {
      const transaction = await this.transaction(store, "readwrite");
      const objectStore = transaction.objectStore(store);

      const k = objectStore.put(data, key);

      transaction.oncomplete = () => resolve(k.result);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Clears all the data in the Object Store(s) passed as argument.
   * Returns a promise that resolves to `true` if successful, or rejects to the transaction's error.
   */
  async clear(storeNames: string | string[]): Promise<true | DOMException> {
    return new Promise(async (resolve, reject) => {
      const transaction = await this.transaction(storeNames, "readwrite");

      if (Array.isArray(storeNames)) {
        storeNames.forEach((name) => {
          const objectStore = transaction.objectStore(name);
          objectStore.clear();
        });
      } else {
        const objectStore = transaction.objectStore(storeNames).clear();
      }

      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Abstracts the `IDBObjectStore.delete()` method, returning a promise that resolves to `true` if successful, or rejects to the request's error.;
   */
  async delete(
    store: string,
    query: IDBValidKey | IDBKeyRange
  ): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const transaction = await this.transaction(store, "readwrite");
      const objectStore = transaction.objectStore(store);
      const request = objectStore.delete(query);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }
}
