declare module "@gabrielrq/web-db";

export type WebDBObjectStoreIndex = {
  name: string;
  keyPath: string;
  options?: IDBIndexParameters;
};

export interface WebDBObjectStore {
  name: string;
  options?: {
    keyPath?: string;
    autoIncrement?: boolean;
  };
  configs?: {
    recreate?: boolean;
    indexes?: WebDBObjectStoreIndex[];
  };
}

export interface WebDBSetupOptions {
  objectStores?: WebDBObjectStore[];
}

/**
 * Promise Wrapper for the IndexedDB API. Provides simple utilities to work with IndexedDB using promises.
 */
export declare class WebDB {
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
  );

  /**
   * Starts a transaction using the given `Object Store names` and return a promise that resolves to a reference to the transaction,
   * or rejects to an error.
   */
  transaction(
    storeNames: string | Iterable<string>,
    mode: "readwrite" | "readonly" = "readonly"
  ): Promise<IDBTransaction>;

  /**
   * Retrieves a value from a single Object Store. Can search the `query` in a specific `index` in the Object Store.
   */
  async get<T>(
    store: string,
    query: IDBValidKey | IDBKeyRange,
    index?: string
  ): Promise<T | undefined>;

  /**
   * Gets all the data from a single Object Store. Can search for the an `index` in the store.
   */
  async getAll<T>(
    store: string,
    query?: IDBValidKey | IDBKeyRange,
    index?: string
  ): Promise<T[] | undefined>;

  /**
   * Abstracts `IDBObjectStore.add()`. Returns a promise that resolves to the key of the inserted record if successfull, and false if
   * unsuccessfull. Fails if an existing record with the same key exists.
   */
  async add<T>(
    store: string,
    data: T,
    key?: IDBValidKey | undefined
  ): Promise<IDBValidKey | false>;

  /**
   * Abstracts `IDBObjectStore.put()`. Returns a promise that resolves to the key of the inserted record if successfull,
   * and false if unsuccessfull. Replaces existing records with the same key.
   */
  async put<T>(
    store: string,
    data: T,
    key?: IDBValidKey | undefined
  ): Promise<IDBValidKey | false>;

  /**
   * Clears all the data in the Object Store(s) passed as argument.
   */
  async clear(storeNames: string | string[]);

  /**
   * Abstracts the `IDBObjectStore.delete()` method, returning a promise that resolves to `true` if successfull, or rejects to `false`;
   */
  async delete(
    store: string,
    query: IDBValidKey | IDBKeyRange
  ): Promise<boolean>;
}
