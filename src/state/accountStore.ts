import type { SupabaseClient } from '@supabase/supabase-js';
import { create } from 'zustand';
import { createSerialRunner, runSync } from '@/domain/sync/engine';
import { AUTH_STORAGE_KEY } from '@/config/supabase';
import { clearMeta, loadMeta, saveMeta, type StoredMeta } from '@/sync/meta';
import { SYNCABLES, clearDeviceData, deviceHasData, watchDeviceData } from '@/sync/registry';

/*
 * Accounts are optional. Without one the app never touches the network. The Supabase library is loaded
 * only when someone signs in, or when a session from an earlier visit is found, so people who never sign in
 * do not download it.
 */

export interface Person {
  id: string;
  email: string | null;
}

type Phase = 'idle' | 'syncing' | 'error';

interface AccountState {
  /** False until the app has checked for a saved sign-in. */
  ready: boolean;
  user: Person | null;
  phase: Phase;
  /** A message to show, for a failed sync or sign-in. */
  message: string | null;
  /** When the last sync finished, on this device's clock. For display only. */
  lastSyncedAt: number | null;
  /** The address a sign-in code was sent to, while waiting for it to be entered. */
  codeSentTo: string | null;
  busy: boolean;
  /** Set when someone else's account signs in on a device that holds data from a different account. */
  switchPending: Person | null;

  init: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  sendCode: (email: string) => Promise<void>;
  verifyCode: (email: string, code: string) => Promise<void>;
  cancelCode: () => void;
  syncNow: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<boolean>;
  /** `replace` empties this device and takes the account's data; `add` puts this device's data into the account. */
  resolveSwitch: (choice: 'replace' | 'add') => Promise<void>;
}

const SYNC_DELAY_MS = 3000;

let started = false;
let stopWatching: (() => void) | null = null;
let timer: number | undefined;
let meta: StoredMeta = { userId: null, stores: {} };

async function loadClient() {
  const { getClient, appUrl } = await import('@/sync/client');
  return { client: getClient(), appUrl };
}

/** Turns what Supabase or the network says into something a person can act on. */
function friendly(error: unknown): string {
  const text = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  const lower = text.toLowerCase();
  if (lower.includes('failed to fetch') || lower.includes('network') || lower.includes('load failed')) {
    return 'Could not reach the server. Your data is safe on this device and will sync when you are back online.';
  }
  if (lower.includes('rate limit') || lower.includes('too many') || (lower.includes('after') && lower.includes('seconds'))) {
    return 'Too many emails were requested. Wait a minute and try again.';
  }
  if (lower.includes('expired') || lower.includes('invalid')) return 'That code did not work. Check it, or ask for a new one.';
  if (lower.includes('provider is not enabled') || lower.includes('unsupported provider')) {
    return 'Google sign-in is not turned on yet.';
  }
  return text || 'Something went wrong. Try again.';
}

export const useAccountStore = create<AccountState>()((set, get) => {
  const runner = createSerialRunner(async () => {
    const { user } = get();
    if (!user) return;
    set({ phase: 'syncing', message: null });
    try {
      const { client } = await loadClient();
      const { createSupabaseRemote } = await import('@/sync/supabaseRemote');
      const remote = createSupabaseRemote(client, user.id);
      await runSync(SYNCABLES, remote, meta.stores);
      meta.userId = user.id;
      saveMeta(meta);
      set({ phase: 'idle', lastSyncedAt: Date.now(), message: null });
    } catch (error) {
      // A partly finished sync is fine: what was sent is remembered, the rest goes next time.
      saveMeta(meta);
      set({ phase: 'error', message: friendly(error) });
    }
  });

  const schedule = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => void runner(), SYNC_DELAY_MS);
  };

  const begin = (person: Person) => {
    meta = loadMeta();
    const other = meta.userId !== null && meta.userId !== person.id;
    set({ user: person, codeSentTo: null, busy: false, message: null });
    if (other && deviceHasData()) {
      // Never mix two people's data without asking.
      set({ switchPending: person });
      return;
    }
    if (other) meta = { userId: null, stores: {} };
    startSyncing();
  };

  const startSyncing = () => {
    const person = get().user;
    if (person) {
      // Remember whose data this is straight away, so a failed first sync cannot hide an account change.
      meta.userId = person.id;
      saveMeta(meta);
    }
    stopWatching?.();
    stopWatching = watchDeviceData(schedule);
    void runner();
  };

  const stop = () => {
    window.clearTimeout(timer);
    stopWatching?.();
    stopWatching = null;
  };

  let attached: Promise<SupabaseClient> | null = null;
  const attach = () => (attached ??= connect());

  const connect = async () => {
    const { client } = await loadClient();
    client.auth.onAuthStateChange((event, session) => {
      // Do not call Supabase from inside this callback: defer, as its docs advise.
      window.setTimeout(() => {
        if (event === 'SIGNED_OUT') {
          stop();
          set({ user: null, phase: 'idle', message: null, switchPending: null });
        } else if (session?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
          if (get().user?.id !== session.user.id) begin({ id: session.user.id, email: session.user.email ?? null });
        }
      }, 0);
    });
    // Come back from Google or an email link: tidy the one-time code out of the address.
    const url = new URL(window.location.href);
    if (url.searchParams.has('code') || url.searchParams.has('error_description')) {
      const message = url.searchParams.get('error_description');
      url.searchParams.delete('code');
      url.searchParams.delete('error');
      url.searchParams.delete('error_code');
      url.searchParams.delete('error_description');
      window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
      if (message) set({ message: friendly(message) });
    }
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('online', wake);
    return client;
  };

  const wake = () => {
    if (get().user && document.visibilityState === 'visible') void runner();
  };

  return {
    ready: false,
    user: null,
    phase: 'idle',
    message: null,
    lastSyncedAt: null,
    codeSentTo: null,
    busy: false,
    switchPending: null,

    async init() {
      if (started) return;
      started = true;
      const returning = new URLSearchParams(window.location.search).has('code');
      let saved = false;
      try {
        saved = window.localStorage.getItem(AUTH_STORAGE_KEY) !== null;
      } catch {
        saved = false;
      }
      if (!saved && !returning) {
        set({ ready: true });
        return;
      }
      try {
        const client = await attach();
        // Wait for the saved session (or the code from the address) to be read.
        const { data } = await client.auth.getSession();
        if (data.session?.user && get().user === null) {
          begin({ id: data.session.user.id, email: data.session.user.email ?? null });
        }
      } catch (error) {
        set({ message: friendly(error) });
      } finally {
        set({ ready: true });
      }
    },

    async signInWithGoogle() {
      set({ busy: true, message: null });
      try {
        const { appUrl } = await loadClient();
        const client = await attach();
        const { error } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: appUrl() } });
        if (error) throw error;
        // The browser leaves for Google here, so `busy` stays on.
      } catch (error) {
        set({ busy: false, message: friendly(error) });
      }
    },

    async sendCode(email) {
      set({ busy: true, message: null });
      try {
        const { appUrl } = await loadClient();
        const client = await attach();
        const { error } = await client.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: appUrl(), shouldCreateUser: true },
        });
        if (error) throw error;
        set({ busy: false, codeSentTo: email });
      } catch (error) {
        set({ busy: false, message: friendly(error) });
      }
    },

    async verifyCode(email, code) {
      set({ busy: true, message: null });
      try {
        const client = await attach();
        const { data, error } = await client.auth.verifyOtp({ email, token: code.trim(), type: 'email' });
        if (error) throw error;
        if (data.user && get().user?.id !== data.user.id) begin({ id: data.user.id, email: data.user.email ?? email });
        set({ busy: false });
      } catch (error) {
        set({ busy: false, message: friendly(error) });
      }
    },

    cancelCode() {
      set({ codeSentTo: null, message: null });
    },

    async syncNow() {
      await runner();
    },

    async signOut() {
      set({ busy: true });
      stop();
      try {
        const { client } = await loadClient();
        await client.auth.signOut();
      } catch {
        // Signing out must work offline too. The saved session is removed below either way.
      }
      try {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
      } catch {
        // Nothing to remove.
      }
      set({ user: null, busy: false, phase: 'idle', message: null, switchPending: null, codeSentTo: null });
    },

    async deleteAccount() {
      set({ busy: true, message: null });
      try {
        const { client } = await loadClient();
        const { error } = await client.rpc('delete_my_account');
        if (error) throw error;
        stop();
        clearMeta();
        meta = { userId: null, stores: {} };
        await get().signOut();
        return true;
      } catch (error) {
        set({ busy: false, message: friendly(error) });
        return false;
      }
    },

    async resolveSwitch(choice) {
      if (!get().switchPending) return;
      if (choice === 'replace') clearDeviceData();
      meta = { userId: null, stores: {} };
      saveMeta(meta);
      set({ switchPending: null });
      startSyncing();
    },
  };
});
