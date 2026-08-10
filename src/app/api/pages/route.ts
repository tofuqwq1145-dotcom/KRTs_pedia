import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { PageType } from '@/data/types';

const ALLOWED_TYPES: PageType[] = ['nation', 'person', 'event', 'war', 'building', 'chronicle', 'article'];

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
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

  if (!title) return NextResponse.json({ error: '标题不能为空' }, { status: 400 });
  if (!slug) return NextResponse.json({ error: '条目标识不能为空' }, { status: 400 });
  if (!body) return NextResponse.json({ error: '正文不能为空' }, { status: 400 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle();

  const { data, error } = await supabase
    .from('pages')
    .insert({
      slug,
      title,
      type,
      body,
      status: 'pending',
      author_id: user.id,
      author_name: profile?.display_name || user.email?.split('@')[0] || '匿名撰稿人',
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '该条目标识已存在，请修改 Slug。' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, message: '已提交，等待站主审核。' });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}