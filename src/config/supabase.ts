/**
 * The project the app syncs to. Both values are meant to be public: the key only identifies the app,
 * and what a person can read or write is decided by row level security in the database.
 * Never put a secret (service role) key in this app.
 */
export const SUPABASE_URL = 'https://bdtmyshgdyzgmplndtka.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_X7BrrjxqdidPtTJT-jBNhQ_c3WIOxq8';

/** Where the sign-in session is kept. Also how the app tells, without loading anything, that someone is signed in. */
export const AUTH_STORAGE_KEY = 'timbang.auth';
