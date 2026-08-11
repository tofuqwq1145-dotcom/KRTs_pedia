import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { normalizeSlug } from '@/lib/slug';

const STYLES = ['modern', 'scp', 'classic'];
const HEADER_STYLES = ['none', 'linear', 'linear-diag', 'radial'];
const ANIMATIONS = ['none', 'float', 'pulse', 'glow', 'scan', 'grid', 'ripple'];
const FONT_KEYS = ['sans', 'serif', 'kai', 'mono', 'default'];

function isColor(v: string | undefined): boolean {
  if (!v) return true;
  return /^#[0-9a-fA-F]{3,6}$/.test(v);
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }

  const str = (k: string) => typeof payload[k] === 'string' ? (payload[k] as string).trim() : '';
  const name = str('name');
  const slug = normalizeSlug(str('slug'));

  if (!name) return NextResponse.json({ error: '主题名称不能为空' }, { status: 400 });
  if (!slug) return NextResponse.json({ error: '主题标识（Slug）不能为空' }, { status: 400 });

  const style = STYLES.includes(str('style')) ? str('style') : 'modern';
  const headerStyle = HEADER_STYLES.includes(str('header_style')) ? str('header_style') : 'none';
  const animation = ANIMATIONS.includes(str('header_animation')) ? str('header_animation') : 'none';
  const titleFont = str('title_font');
  const bodyFont = str('body_font');

  if (!FONT_KEYS.includes(titleFont) && titleFont) {
    return NextResponse.json({ error: '标题字体取值不合法' }, { status: 400 });
  }
  if (!FONT_KEYS.includes(bodyFont) && bodyFont) {
    return NextResponse.json({ error: '正文字体取值不合法' }, { status: 400 });
  }

  const colors = {
    accent: str('accent') || '#8a5a2b',
    accent_soft: str('accent_soft') || '#a58050',
    bg: str('bg') || '#f7f3ec',
    title_color: str('title_color'),
    body_color: str('body_color'),
    header_from: str('header_from') || '#1a1a1a',
    header_to: str('header_to') || '#3a3a3a',
  };
  for (const [k, v] of Object.entries(colors)) {
    if (!isColor(v)) return NextResponse.json({ error: `${k} 需为 #RRGGBB 格式` }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('themes')
    .insert({
      name,
      slug,
      slogan: str('slogan'),
      accent: colors.accent,
      accent_soft: colors.accent_soft,
      bg: colors.bg,
      style,
      title_color: colors.title_color,
      body_color: colors.body_color,
      title_font: titleFont,
      body_font: bodyFont,
      header_style: headerStyle,
      header_from: colors.header_from,
      header_to: colors.header_to,
      header_animation: animation,
      logo_url: str('logo_url'),
      bg_image: str('bg_image'),
      status: 'pending',
      author_id: user.id,
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '该 Slug 已被使用' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}