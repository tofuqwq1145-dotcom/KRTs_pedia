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
    return NextResponse.json({ error: '无权执行此操作' }, { status: 403 });
  }

  let payload: { ids?: string[]; action?: 'approve' | 'reject' | 'delete'; note?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }

  const ids = Array.from(new Set((payload.ids ?? []).filter(Boolean)));
  const action = payload.action;
  if (ids.length === 0 || !['approve', 'reject', 'delete'].includes(action ?? '')) {
    return NextResponse.json({ error: '参数错误' }, { status: 400 });
  }

  if (action === 'delete') {
    const { error } = await supabase
      .from('pages')
      .delete()
      .in('id', ids);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ message: `已删除 ${ids.length} 条档案。` });
  }

  const { error } = await supabase
    .from('pages')
    .update({
      status: action === 'approve' ? 'approved' : 'rejected',
      review_note: (payload.note ?? '').trim(),
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .in('id', ids);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    message: `已${action === 'approve' ? '通过' : '驳回'} ${ids.length} 条投稿。`,
  });
}
