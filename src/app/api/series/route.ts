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
    return NextResponse.json({ error: '没有权限' }, { status: 403 });
  }

  let payload: { name?: string; slug?: string; description?: string; sort_order?: number };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }

  const name = (payload.name ?? '').trim();
  const slug = (payload.slug ?? '').trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const description = (payload.description ?? '').trim();
  const sort_order = Number.isFinite(Number(payload.sort_order)) ? Math.round(Number(payload.sort_order)) : 0;

  if (!name) return NextResponse.json({ error: '分级名称不能为空' }, { status: 400 });
  if (!slug) return NextResponse.json({ error: '分级标识（Slug）不能为空' }, { status: 400 });

  const { data, error } = await supabase
    .from('series')
    .insert({ name, slug, description, sort_order })
    .select('id, slug, name, description, sort_order')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '该 Slug 已被使用' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}