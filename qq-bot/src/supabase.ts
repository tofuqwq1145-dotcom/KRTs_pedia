import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL ?? '';
const anonKey = process.env.SUPABASE_ANON_KEY ?? '';

export function readClient(): SupabaseClient {
  return createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export interface PetiaSession {
  client: SupabaseClient;
  userId: string;
}

let cached: PetiaSession | null = null;

export async function petiaSession(): Promise<PetiaSession | null> {
  if (cached) return cached;
  const email = process.env.PETIA_EMAIL;
  const password = process.env.PETIA_PASSWORD;
  if (!url || !anonKey || !email || !password) return null;

  const anon = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    console.error('[krt-qq] petia 账号登录失败', error?.message ?? 'no session');
    return null;
  }
  cached = {
    userId: data.user.id,
    client: createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
    }),
  };
  return cached;
}
