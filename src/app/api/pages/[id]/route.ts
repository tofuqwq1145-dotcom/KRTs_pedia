import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { PageType } from '@/data/types';

const ALLOWED_TYPES: PageType[] = ['nation', 'person', 'event', 'war', 'building', 'chronicle', 'article'];

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
  if (existing.author_id !== user.id) {
    return NextResponse.json({ error: '只能修改自己的投稿' }, { status: 403 });
  }
  if (existing.status === 'approved') {
    return NextResponse.json({ error: '已通过的条目不能直接修改' }, { status: 400 });
  }

  let payload: { title?: string; slug?: string; type?: string; body?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }

  const title = (payload.title ?? '').trim();
  const slug = (payload.slug ?? '').trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const type = ALLOWED_TYPES.includes(payload.type as PageType) ? (payload.type as PageType) : 'article';
  const body = (payload.body ?? '').trim();

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
      status: 'pending',
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