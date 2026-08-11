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

  let payload: { name?: string; slug?: string; accent?: string; accent_soft?: string; bg?: string; style?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }

  const name = (payload.name ?? '').trim();
  const slug = (payload.slug ?? '').trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (!name) return NextResponse.json({ error: '主题名称不能为空' }, { status: 400 });
  if (!slug) return NextResponse.json({ error: '主题标识（Slug）不能为空' }, { status: 400 });

  const accent = (payload.accent ?? '').trim() || '#8a5a2b';
  const accentSoft = (payload.accent_soft ?? '').trim() || accent;
  const bg = (payload.bg ?? '').trim() || '#f7f3ec';
  const style = ['modern', 'scp', 'classic'].includes(payload.style ?? '') ? (payload.style as string) : 'modern';

  const hexOk = /^#[0-9a-fA-F]{6}$/.test(accent) || /^#[0-9a-fA-F]{3}$/.test(accent);
  if (accent && !hexOk) return NextResponse.json({ error: '主色需为 #RRGGBB 格式' }, { status: 400 });

  const { data, error } = await supabase
    .from('themes')
    .insert({ name, slug, accent, accent_soft: accentSoft, bg, style })
    .select('id, slug, name, accent, accent_soft, bg, style')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '该 Slug 已被使用' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}