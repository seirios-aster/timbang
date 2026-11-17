import type { SyncMeta } from '@/domain/sync/engine';

const KEY = 'timbang.sync.v1';

export interface StoredMeta {
  /** The account this device last synced with. */
  userId: string | null;
  stores: SyncMeta;
}

const EMPTY: StoredMeta = { userId: null, stores: {} };

/** What the device remembers about its last sync. Safe to lose: the next sync just compares everything again. */
export function loadMeta(): StoredMeta {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY, stores: {} };
    const parsed = JSON.parse(raw) as Partial<StoredMeta>;
    return { userId: parsed.userId ?? null, stores: parsed.stores ?? {} };
  } catch {
    return { ...EMPTY, stores: {} };
  }
}

export function saveMeta(meta: StoredMeta): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(meta));
  } catch {
    // Storage is blocked. The next sync compares everything again.
  }
}

export function clearMeta(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
