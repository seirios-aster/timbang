import type { SupabaseClient } from '@supabase/supabase-js';
import type { Remote, RemoteRow } from '@/domain/sync/engine';

const TABLE = 'user_data';

/** The cloud side of the sync: the `user_data` table, where row level security limits every row to its owner. */
export function createSupabaseRemote(client: SupabaseClient, userId: string): Remote {
  return {
    async fetchAll() {
      const { data, error } = await client.from(TABLE).select('store, data, updated_at');
      if (error) throw error;
      const rows: Record<string, RemoteRow> = {};
      for (const row of data ?? []) rows[row.store as string] = { data: row.data, updatedAt: row.updated_at as string };
      return rows;
    },

    async insert(store, data) {
      const { data: row, error } = await client.from(TABLE).insert({ user_id: userId, store, data }).select('updated_at').single();
      // 23505 is "already exists": another device added this store first.
      if (error) {
        if (error.code === '23505') return 'exists';
        throw error;
      }
      return { data, updatedAt: row.updated_at as string };
    },

    async update(store, data, expectedUpdatedAt) {
      const { data: rows, error } = await client
        .from(TABLE)
        .update({ data })
        .eq('user_id', userId)
        .eq('store', store)
        // Only if nobody changed it since we last looked.
        .eq('updated_at', expectedUpdatedAt)
        .select('updated_at');
      if (error) throw error;
      if (!rows || rows.length === 0) return 'stale';
      return { data, updatedAt: rows[0]!.updated_at as string };
    },
  };
}
