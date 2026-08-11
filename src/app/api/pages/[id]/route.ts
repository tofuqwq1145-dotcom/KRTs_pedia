import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { PageType } from '@/data/types';
import { normalizeSlug } from '@/lib/slug';

const ALLOWED_TYPES: PageType[] = ['nation', 'person', 'event', 'war', 'building', 'chronicle', 'article'];

function normalizeTags(raw?: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of raw ?? []) {
    const tag = t.trim().replace(/^#+/, '').slice(0, 20);
    if (tag && !seen.has(tag)) {
      seen.add(tag);
      out.push(tag);
    }
    if (out.length >= 8) break;
  }
  return out;
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const { data: existing, error: fetchError } = await supabase
    .from('pages')
    .select('id, author_id, status')
    .eq('id', params.id)
    .maybeSingle();

  if (fetchError || !existing) {
    return NextResponse.json({ error: '条目不存在' }, { status: 404 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();
  const isAdmin = !!profile?.is_admin;
  if (existing.author_id !== user.id && !isAdmin) {
    return NextResponse.json({ error: '只能修改自己的投稿' }, { status: 403 });
  }

  let payload: { title?: string; slug?: string; type?: string; body?: string; series_id?: string | null; tags?: string[]; cover_url?: string; theme_id?: string | null };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }

  const title = (payload.title ?? '').trim();
  const slug = normalizeSlug(payload.slug);
  const type = ALLOWED_TYPES.includes(payload.type as PageType) ? (payload.type as PageType) : 'article';
  const body = (payload.body ?? '').trim();
  const tags = normalizeTags(payload.tags);

  if (!title || !slug || !body) {
    return NextResponse.json({ error: '标题 / Slug / 正文不能为空' }, { status: 400 });
  }

  const { error } = await supabase
    .from('pages')
    .update({
      slug,
      title,
      type,
      body,
      series_id: payload.series_id || null,
      tags,
      cover_url: (payload.cover_url ?? '').trim(),
      theme_id: payload.theme_id || null,
      status: isAdmin && existing.status === 'approved' ? 'approved' : 'pending',
      review_note: '',
      reviewed_by: null,
      reviewed_at: null,
    })
    .eq('id', params.id);

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '该条目标识已存在，请修改 Slug。' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: '已保存并重新提交审核。' });
}