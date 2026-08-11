import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

async function adminGuard(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();
  return profile?.is_admin ? user : null;
}

// 站主审核：通过 / 驳回 / 改标题备注
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const admin = await adminGuard(supabase);
  if (!admin) {
    return NextResponse.json({ error: '没有权限' }, { status: 403 });
  }

  let payload: { status?: string; name?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }

  const status = payload.status;
  if (!['pending', 'approved', 'rejected'].includes(status ?? '')) {
    return NextResponse.json({ error: '状态不合法' }, { status: 400 });
  }

  const patch: Record<string, unknown> = { status };
  if (typeof payload.name === 'string') patch.name = payload.name.trim() || undefined;

  const { data, error } = await supabase
    .from('themes')
    .update(patch)
    .eq('id', params.id)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const admin = await adminGuard(supabase);
  if (!admin) {
    return NextResponse.json({ error: '没有权限' }, { status: 403 });
  }

  const { error } = await supabase.from('themes').delete().eq('id', params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ message: '已删除' });
}