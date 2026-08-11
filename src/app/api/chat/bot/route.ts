import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { normalizeSlug } from '@/lib/slug';
import type { PageType } from '@/data/types';
import { BOT_NAME, COOLDOWN_MS, MAX_REPLY, ALLOWED_TYPES, SYSTEM_PROMPT, pickMood, isMentioned, sanitizeReply } from '@/lib/petia';

const THEME_STYLES = ['modern', 'scp', 'classic'];
const HEADER_STYLES = ['none', 'linear', 'linear-diag', 'radial'];
const ANIMATIONS = ['none', 'float', 'pulse', 'glow', 'scan', 'grid', 'ripple'];
const FONT_KEYS = ['sans', 'serif', 'kai', 'mono', 'default'];

function isColor(v: string | undefined): boolean {
  if (!v) return true;
  return /^#[0-9a-fA-F]{3,6}$/.test(v);
}

function pick(arr: string[], v: string | undefined, fallback: string): string {
  return arr.includes(v as string) ? (v as string) : fallback;
}

const RECORD_TOOL = {
  type: 'function',
  function: {
    name: 'record_entry',
    description: '当对话中出现值得收录进 KRTP 档案库的新信息（新事件、人物、建筑、国家、战争、词条等）时，调用此函数写入一条待审核词条。',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: '词条标题（中文或对应语言）' },
        slug: { type: 'string', description: '词条唯一标识，英文小写连字符，例如 new-star-2026' },
        type: { type: 'string', enum: ALLOWED_TYPES, description: '词条类型' },
        body: { type: 'string', description: '词条正文，markdown 格式，从对话中整理出的内容' },
        theme_id: { type: ['string', 'null'], description: '可选，已过审版式的 id，列表在用户上下文提示中给出；不确定时填 null' },
        series_id: { type: ['string', 'null'], description: '可选，系列的 id，列表在用户上下文提示中给出；不确定时填 null' },
      },
      required: ['title', 'slug', 'type', 'body'],
    },
  },
} as const;

const THEME_TOOL = {
  type: 'function',
  function: {
    name: 'submit_theme',
    description: '当对话中有人想为档案站设计或提交一套新版式主题（配色、字体、头图风格等）时，调用此函数写入一条待审核版式。纯文字参数，无需图片。',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: '版式名称' },
        slug: { type: 'string', description: '唯一标识，英文小写连字符' },
        slogan: { type: 'string', description: '版式标语（可选）' },
        style: { type: 'string', enum: THEME_STYLES, description: '风格：modern/scp/classic' },
        accent: { type: 'string', description: '#RRGGBB 主色' },
        accent_soft: { type: 'string', description: '#RRGGBB 辅色' },
        bg: { type: 'string', description: '#RRGGBB 底纸色' },
        title_color: { type: 'string', description: '#RRGGBB 标题色（可选）' },
        body_color: { type: 'string', description: '#RRGGBB 正文字色（可选）' },
        header_from: { type: 'string', description: '#RRGGBB 头图渐变起始色' },
        header_to: { type: 'string', description: '#RRGGBB 头图渐变结束色' },
        title_font: { type: 'string', enum: FONT_KEYS, description: '标题字体：sans/serif/kai/mono/default' },
        body_font: { type: 'string', enum: FONT_KEYS, description: '正文字体：sans/serif/kai/mono/default' },
        header_style: { type: 'string', enum: HEADER_STYLES, description: '头图样式：none/linear/linear-diag/radial' },
        header_animation: { type: 'string', enum: ANIMATIONS, description: '头图动效：none/float/pulse/glow/scan/grid/ripple' },
      },
      required: ['name', 'slug'],
    },
  },
} as const;

interface RecordArgs {
  title?: string;
  slug?: string;
  type?: string;
  body?: string;
  theme_id?: string | null;
  series_id?: string | null;
}

interface ThemeArgs {
  name?: string;
  slug?: string;
  slogan?: string;
  style?: string;
  accent?: string;
  accent_soft?: string;
  bg?: string;
  title_color?: string;
  body_color?: string;
  header_from?: string;
  header_to?: string;
  title_font?: string;
  body_font?: string;
  header_style?: string;
  header_animation?: string;
}

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  // 防刷：最近一条消息必须由本人发送且在过去 30 秒内
  const { data: latest } = await supabase
    .from('chat_messages')
    .select('user_id, content, created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latest || latest.user_id !== user.id) {
    return NextResponse.json({ error: '站娘只在收到消息后应答' }, { status: 400 });
  }
  const age = Date.now() - new Date(latest.created_at).getTime();
  if (age > 30000) {
    return NextResponse.json({ error: '站娘只在收到消息后应答' }, { status: 400 });
  }
  if (!isMentioned(latest.content)) {
    return NextResponse.json({ error: '试试 @站娘 或 @SCI-Petia 来召唤她' }, { status: 400 });
  }

  // 冷却：避免刷屏烧钱
  const { data: lastBot } = await supabase
    .from('chat_messages')
    .select('created_at')
    .eq('user_id', user.id)
    .eq('author_name', BOT_NAME)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastBot && Date.now() - new Date(lastBot.created_at).getTime() < COOLDOWN_MS) {
    return NextResponse.json({ error: '站娘还在整理思绪，稍等一下再试' }, { status: 429 });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  let content = `[mascot:${pickMood()}]`;
  console.log('[petia-bot] user', user.id, '| apiKey', apiKey ? 'set' : 'MISSING');

  if (apiKey) {
    // 取最近 10 条消息作为上下文
    const { data: history } = await supabase
      .from('chat_messages')
      .select('author_name, content')
      .order('created_at', { ascending: false })
      .limit(10);

    const context = [...(history ?? [])]
      .reverse()
      .map(m => `${m.author_name}: ${m.content}`)
      .join('\n');

    const [{ data: themeRows }, { data: seriesRows }, { data: pageRows }, { data: recentRows }, { count: chatCount }, { count: seriesCount }] = await Promise.all([
      supabase.from('themes').select('id, name').eq('status', 'approved'),
      supabase.from('series').select('id, name'),
      supabase.from('pages').select('status, type'),
      supabase.from('pages').select('title').eq('status', 'approved').order('created_at', { ascending: false }).limit(6),
      supabase.from('chat_messages').select('id', { count: 'exact', head: true }),
      supabase.from('series').select('id', { count: 'exact', head: true }),
    ]);
    const themeOpts = (themeRows ?? []).map(t => `${t.name}(${t.id})`).join('、') || '无';
    const seriesOpts = (seriesRows ?? []).map(s => `${s.name}(${s.id})`).join('、') || '无';

    const all = pageRows ?? [];
    const approved = all.filter(p => p.status === 'approved');
    const byType = approved.reduce<Record<string, number>>((acc, p) => {
      acc[p.type] = (acc[p.type] ?? 0) + 1;
      return acc;
    }, {});
    const snapshot =
      `- 词条总数 ${all.length}（已过审 ${approved.length} / 待审 ${all.filter(p => p.status === 'pending').length} / 驳回 ${all.filter(p => p.status === 'rejected').length}）\n` +
      `- 分类数量：${ALLOWED_TYPES.map(t => `${t} ${byType[t] ?? 0}`).join('、')}\n` +
      `- 最近收录：「${(recentRows ?? []).map(r => r.title).join('」「')}」\n` +
      `- 系列 ${seriesCount ?? 0} 个，聊天室共 ${chatCount ?? 0} 条消息`;

    try {
      const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-v4-flash',
          temperature: 0.9,
          max_tokens: 500,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...(context ? [{ role: 'user', content: `最近聊天记录（含你之前的回复，用 SCI-Petia 开头）如下：\n${context}` }] : []),
            { role: 'user', content: latest.content },
            { role: 'user', content: `当前档案库真实快照（涉及本站数据的回答只能引用这些真实数字与标题，绝对不要编造不存在的馆藏、文献、纸张、战地记录等细节）：\n${snapshot}` },
            { role: 'user', content: `若你要调用 record_entry，可选的已过审版式(id)：${themeOpts}；可选的系列(id)：${seriesOpts}。theme_id 和 series_id 都可以为 null。` },
            { role: 'user', content: `若用户想设计/提交新版式，调用 submit_theme，只需填 name/slug 及想要的配色字体等文字参数，不需要图片。` },
          ],
          tools: [RECORD_TOOL, THEME_TOOL],
        }),
      });

      if (!res.ok) {
        const bodyText = await res.text().catch(() => '');
        console.error('[petia-bot] deepseek http', res.status, bodyText.slice(0, 500));
        throw new Error(`DeepSeek ${res.status}`);
      }
      const data = await res.json();
      const message = data?.choices?.[0]?.message;
      let replyText = typeof message?.content === 'string' ? message.content : '';
      console.log('[petia-bot] reply len', replyText.length, '| tool_calls', Array.isArray(message?.tool_calls) ? message.tool_calls.length : 0);

      const calls = Array.isArray(message?.tool_calls) ? message.tool_calls : [];
      const recordCall = calls.find((c: any) => c?.function?.name === 'record_entry');
      if (recordCall) {
        let args: RecordArgs = {};
        try {
          args = JSON.parse(recordCall.function.arguments || '{}');
        } catch { /* 参数解析失败则忽略 */ }

        const title = (args.title ?? '').trim();
        const slug = normalizeSlug(args.slug);
        const type = ALLOWED_TYPES.includes(args.type as PageType) ? (args.type as PageType) : 'article';
        const body = (args.body ?? '').trim();

        if (title && slug && body) {
          const themeId = (themeRows ?? []).some(t => t.id === args.theme_id) ? args.theme_id : null;
          const seriesId = (seriesRows ?? []).some(s => s.id === args.series_id) ? args.series_id : null;

          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', user.id)
            .maybeSingle();

          const { error: insertError } = await supabase.from('pages').insert({
            slug,
            title,
            type,
            body,
            status: 'pending',
            source: 'petia',
            author_id: user.id,
            author_name: profile?.display_name || user.email?.split('@')[0] || '匿名撰稿人',
            tags: [],
            cover_url: '',
            series_id: seriesId,
            theme_id: themeId,
            song_title: '',
            song_url: '',
          });

          if (!insertError) {
            replyText = `${replyText ? `${replyText} ` : ''}已记入档案，等待站长审核。`;
          } else if (insertError.code === '23505') {
            replyText = `${replyText ? `${replyText} ` : ''}这个条目标识好像已存在了……我需要换个方式记录它。`;
          } else {
            replyText = `${replyText ? `${replyText} ` : ''}啊，档案写入出了一点小故障，稍后再试。`;
          }
        }
      }

      const themeCall = calls.find((c: any) => c?.function?.name === 'submit_theme');
      if (themeCall) {
        let args: ThemeArgs = {};
        try {
          args = JSON.parse(themeCall.function.arguments || '{}');
        } catch { /* 参数解析失败则忽略 */ }

        const name = (args.name ?? '').trim();
        const slug = normalizeSlug(args.slug);
        const slogan = (args.slogan ?? '').trim();
        const titleFont = pick(FONT_KEYS, args.title_font, '');
        const bodyFont = pick(FONT_KEYS, args.body_font, '');
        const headerStyle = pick(HEADER_STYLES, args.header_style, 'none');
        const animation = pick(ANIMATIONS, args.header_animation, 'none');

        if (name && slug) {
          const colors = {
            accent: args.accent || '#8a5a2b',
            accent_soft: args.accent_soft || '#a58050',
            bg: args.bg || '#f7f3ec',
            title_color: args.title_color || '',
            body_color: args.body_color || '',
            header_from: args.header_from || '#1a1a1a',
            header_to: args.header_to || '#3a3a3a',
          };
          const validColors = Object.values(colors).every(v => isColor(v || undefined));

          const insertRes = validColors
            ? await supabase.from('themes').insert({
                name,
                slug,
                slogan,
                accent: colors.accent,
                accent_soft: colors.accent_soft,
                bg: colors.bg,
                style: pick(THEME_STYLES, args.style, 'modern'),
                title_color: colors.title_color || null,
                body_color: colors.body_color || null,
                title_font: titleFont || null,
                body_font: bodyFont || null,
                header_style: headerStyle,
                header_from: colors.header_from,
                header_to: colors.header_to,
                header_animation: animation,
                logo_url: '',
                bg_image: '',
                status: 'pending',
                author_id: user.id,
              })
            : { error: { code: '400', message: '颜色格式不合法' } };

          if (!insertRes.error) {
            replyText = `${replyText ? `${replyText} ` : ''}版式已提交，等待站长审核。`;
          } else if (insertRes.error.code === '23505') {
            replyText = `${replyText ? `${replyText} ` : ''}这个版式标识好像已存在了……换个 slug 试试。`;
          } else {
            replyText = `${replyText ? `${replyText} ` : ''}啊，版式写入出了一点小故障，稍后再试。`;
          }
        }
      }

      if (replyText.trim()) {
        content = sanitizeReply(replyText);
        if (!content.includes('[mascot:') && Math.random() < 0.5) {
          content = `${content} [mascot:${pickMood()}]`.trim();
        }
      }
    } catch (e) {
      console.error('[petia-bot] deepseek error', e);
      content = `[mascot:${pickMood()}]`;
    }
    console.log('[petia-bot] final content', content ? content.slice(0, 80) : '(empty)');
  }

  const { error } = await supabase
    .from('chat_messages')
    .insert({
      user_id: user.id,
      author_name: BOT_NAME,
      content: content.slice(0, 1000),
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, content });
}