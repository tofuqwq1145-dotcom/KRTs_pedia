import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: '仅站主可执行审核' }, { status: 403 });
  }

  let payload: { id?: string; action?: 'approve' | 'reject'; note?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }

  if (!payload.id || !['approve', 'reject'].includes(payload.action ?? '')) {
    return NextResponse.json({ error: '参数错误' }, { status: 400 });
  }

  const { error } = await supabase
    .from('pages')
    .update({
      status: payload.action === 'approve' ? 'approved' : 'rejected',
      review_note: (payload.note ?? '').trim(),
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', payload.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    message: payload.action === 'approve' ? '已通过审核，内容已公开。' : '已驳回，可填写理由。',
  });
}