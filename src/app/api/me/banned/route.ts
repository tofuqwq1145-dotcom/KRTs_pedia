import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ banned: false });
  const { data } = await supabase
    .from('profiles')
    .select('banned')
    .eq('id', user.id)
    .maybeSingle();
  return NextResponse.json({ banned: !!data?.banned });
}
