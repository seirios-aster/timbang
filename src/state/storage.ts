import { createJSONStorage, type StateStorage } from 'zustand/middleware';

/**
 * localStorage that never throws.
 * Private windows and embedded previews can block storage. The app then keeps
 * working from memory for the session and simply does not remember.
 */
const memory = new Map<string, string>();

const safeStorage: StateStorage = {
  getItem(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return memory.get(key) ?? null;
    }
  },
  setItem(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      memory.set(key, value);
    }
  },
  removeItem(key) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      memory.delete(key);
    }
  },
};

/**
 * Where the stores keep their data. To sync across devices later, replace this
 * with a storage backed by a server, and the stores do not need to change.
 */
export const appStorage = <T>() => createJSONStorage<T>(() => safeStorage);

export const storageKey = (name: string) => `timbang.${name}.v1`;
