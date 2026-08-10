import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseConfig } from '@/lib/supabase/config';

export function createClient() {
  const cookieStore = cookies();
  const { url, key } = getSupabaseConfig();

  return createServerClient(url!, key!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: { path?: string; domain?: string; maxAge?: number; expires?: Date; httpOnly?: boolean; sameSite?: 'lax' | 'strict' | 'none' | true | false; secure?: boolean } }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // 在 Server Component 中调用 setAll 时忽略（由中间件负责）
        }
      },
    },
  });
}

export { supabaseConfigured } from '@/lib/supabase/config';