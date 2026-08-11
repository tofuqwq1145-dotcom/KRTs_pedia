import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { normalizeSlug } from '@/lib/slug';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
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

  let payload: { name?: string; slug?: string; description?: string; sort_order?: number; parent_id?: string | null; theme_id?: string | null };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof payload.name === 'string') {
    if (!payload.name.trim()) return NextResponse.json({ error: '分级名称不能为空' }, { status: 400 });
    patch.name = payload.name.trim();
  }
  if (typeof payload.slug === 'string') {
    const slug = normalizeSlug(payload.slug);
    if (!slug) return NextResponse.json({ error: '分级标识（Slug）不能为空' }, { status: 400 });
    patch.slug = slug;
  }
  if (typeof payload.description === 'string') patch.description = payload.description.trim();
  if (Number.isFinite(Number(payload.sort_order))) patch.sort_order = Math.round(Number(payload.sort_order));
  if ('parent_id' in payload) patch.parent_id = payload.parent_id || null;
  if ('theme_id' in payload) patch.theme_id = payload.theme_id || null;

  const { data, error } = await supabase
    .from('series')
    .update(patch)
    .eq('id', params.id)
    .select('id, slug, name, description, sort_order, parent_id, theme_id')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '该 Slug 已被使用' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
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

  const { error } = await supabase.from('series').delete().eq('id', params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ message: '已删除' });
}