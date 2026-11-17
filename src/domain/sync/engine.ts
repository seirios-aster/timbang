import { canonical } from './canonical';

/**
 * Local-first sync. The app always works from the data on the device. This keeps a copy in the cloud and
 * brings changes from other devices in. It knows nothing about the network or the stores: both are
 * handed to it, so every rule here can be tested.
 *
 * How it decides, for each kind of data ("store"):
 * - Nothing in the cloud yet: send ours, unless ours is empty.
 * - The cloud copy is the one we last synced: send ours if we changed it since.
 * - The cloud copy changed since we last synced: take it if we did not change ours, and merge the two if we did.
 *
 * "Changed" is found by comparing with a snapshot taken at the last sync, and "the cloud copy changed" by the
 * server's own timestamp, so no device's clock is ever compared with another's.
 */

export interface RemoteRow {
  data: unknown;
  /** The server's time for the last write. Only ever compared with itself. */
  updatedAt: string;
}

export interface Remote {
  fetchAll(): Promise<Record<string, RemoteRow>>;
  /** Adds a store. Says `exists` if someone else added it first. */
  insert(store: string, data: unknown): Promise<RemoteRow | 'exists'>;
  /** Changes a store, only if it is still the version we last saw. Says `stale` if it moved on. */
  update(store: string, data: unknown, expectedUpdatedAt: string): Promise<RemoteRow | 'stale'>;
}

export interface Syncable {
  key: string;
  read(): unknown;
  write(data: unknown): void;
  /** True when there is nothing worth sending, such as a brand-new install. */
  isEmpty(data: unknown): boolean;
  /** Combines our copy with the cloud copy when both changed. */
  merge(local: unknown, remote: unknown): unknown;
}

export interface StoreMeta {
  /** The server time of the copy we last synced. */
  syncedAt: string | null;
  /** The data as it was at that moment, in canonical form. */
  snapshot: string | null;
}

export type SyncMeta = Record<string, StoreMeta>;

export interface SyncResult {
  pushed: string[];
  pulled: string[];
  merged: string[];
}

const MAX_PASSES = 3;

export async function runSync(syncables: readonly Syncable[], remote: Remote, meta: SyncMeta): Promise<SyncResult> {
  const result: SyncResult = { pushed: [], pulled: [], merged: [] };

  for (let pass = 0; pass < MAX_PASSES; pass += 1) {
    const rows = await remote.fetchAll();
    let retry = false;

    for (const syncable of syncables) {
      const { key } = syncable;
      const row = rows[key];
      const known = meta[key] ?? { syncedAt: null, snapshot: null };
      const local = syncable.read();
      const localJson = canonical(local);
      // Never synced and empty is not a change. Otherwise a change is anything that differs from the snapshot.
      const changed = known.snapshot === null ? !syncable.isEmpty(local) : localJson !== known.snapshot;

      const send = async (expected: string | null): Promise<void> => {
        const data = syncable.read();
        const outcome = expected === null ? await remote.insert(key, data) : await remote.update(key, data, expected);
        if (outcome === 'exists' || outcome === 'stale') {
          retry = true;
          return;
        }
        meta[key] = { syncedAt: outcome.updatedAt, snapshot: canonical(data) };
        result.pushed.push(key);
      };

      if (!row) {
        if (changed) await send(null);
        else meta[key] = { syncedAt: null, snapshot: localJson };
        continue;
      }

      if (known.syncedAt === row.updatedAt) {
        if (changed) await send(row.updatedAt);
        continue;
      }

      // The cloud copy is newer than the one we last synced.
      if (!changed) {
        syncable.write(row.data);
        meta[key] = { syncedAt: row.updatedAt, snapshot: canonical(syncable.read()) };
        result.pulled.push(key);
      } else {
        syncable.write(syncable.merge(local, row.data));
        // Treat the cloud copy as the base, so the merged result counts as a change and is sent next.
        meta[key] = { syncedAt: row.updatedAt, snapshot: canonical(row.data) };
        result.merged.push(key);
        await send(row.updatedAt);
      }
    }

    if (!retry) return result;
  }
  return result;
}

/** Collapses overlapping requests into one run at a time, with at most one waiting. */
export function createSerialRunner(task: () => Promise<void>) {
  let running = false;
  let again = false;
  return async function run(): Promise<void> {
    if (running) {
      again = true;
      return;
    }
    running = true;
    try {
      do {
        again = false;
        await task();
      } while (again);
    } finally {
      running = false;
    }
  };
}
