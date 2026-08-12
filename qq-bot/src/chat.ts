import { SYSTEM_PROMPT, ALLOWED_TYPES, beijingNow, sanitizeReply } from '@/lib/petia';
import { normalizeSlug } from '@/lib/slug';
import type { PageType } from '@/data/types';
import { readClient, petiaSession } from './supabase';

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

function parseArgs(raw: string | undefined): Record<string, unknown> {
  let s = (raw || '').trim();
  s = s.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try { return JSON.parse(s) as Record<string, unknown>; } catch { /* 继续尝试截取 */ }
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try { return JSON.parse(s.slice(start, end + 1)) as Record<string, unknown>; } catch { /* 解析失败 */ }
  }
  return {};
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

const SEARCH_TOOL = {
  type: 'function',
  function: {
    name: 'search_archive',
    description: '当用户询问档案库中的词条（国家、人物、战争、事件、建筑、词条等）时，调用此函数在已过审档案中检索，返回匹配的词条列表。',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '检索关键词，例如「塞西亚」或「三年战争」' },
      },
      required: ['query'],
    },
  },
} as const;

const WEB_SEARCH_TOOL = {
  type: 'function',
  function: {
    name: 'web_search',
    description: '当用户询问档案库以外的信息、时事新闻、外网内容，或需要联网查证实时资料时，调用此函数用 Bing 联网搜索，返回网页标题、链接与摘要。',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索关键词，简洁准确' },
      },
      required: ['query'],
    },
  },
} as const;

const TOOLS = [RECORD_TOOL, THEME_TOOL, SEARCH_TOOL, WEB_SEARCH_TOOL];

async function searchArchive(query: string): Promise<string> {
  const q = (query || '').trim();
  if (!q) return '检索词为空，请提供关键词。';
  const { data, error } = await readClient()
    .from('pages')
    .select('title, type, slug')
    .eq('status', 'approved')
    .or(`title.ilike.%${q}%,body.ilike.%${q}%`)
    .limit(5);
  if (error) return `检索出错：${error.message}`;
  if (!data || data.length === 0) return '未找到相关档案，数据库中没有匹配记录。';
  const site = process.env.SITE_URL ?? 'https://krts-pedia.vercel.app';
  return data.map((p) => `- ${p.title}（${p.type}） ${site}/pages/${p.slug}`).join('\n');
}

const SEARCH_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

async function webSearch(query: string): Promise<string> {
  const q = (query || '').trim();
  if (!q) return '搜索关键词为空。';
  try {
    const res = await fetch(`https://www.bing.com/search?q=${encodeURIComponent(q)}&setlang=zh-hans&mkt=zh-CN`, {
      headers: { 'User-Agent': SEARCH_UA, 'Accept-Language': 'zh-CN,zh;q=0.9' },
    });
    if (!res.ok) return `联网搜索失败（HTTP ${res.status}）。`;
    const html = await res.text();
    const blocks = html.match(/<li class="b_algo"[\s\S]*?<\/li>/g) ?? [];
    const out: string[] = [];
    for (const b of blocks.slice(0, 5)) {
      const h2 = b.match(/<h2[^>]*>[\s\S]*?<\/h2>/)?.[0] ?? '';
      const title = h2.replace(/<[^>]+>/g, '').trim();
      const url = h2.match(/href="([^"]+)"/)?.[1] ?? '';
      const snip = (b.match(/<p[^>]*>[\s\S]*?<\/p>/)?.[0] ?? '')
        .replace(/<[^>]+>/g, '')
        .replace(/&#\d+;/g, '')
        .replace(/&[a-z]+;/g, ' ')
        .trim();
      if (title || url) out.push(`- ${title}\n  链接：${url}\n  摘要：${snip}`);
    }
    return out.length ? out.join('\n') : '搜索没有返回结果。';
  } catch (e) {
    return `联网搜索出错：${(e as Error).message}`;
  }
}

export interface HistoryLine {
  author: string;
  content: string;
}

export async function chatWithPetia(history: HistoryLine[], latest: string): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return '……佩蒂娅暂时休眠了（缺 API 密钥）。';

  const supabase = readClient();
  const [{ data: themeRows }, { data: seriesRows }, { data: pageRows }, { data: recentRows }, { count: chatCount }, { count: seriesCount }] = await Promise.all([
    supabase.from('themes').select('id, name').eq('status', 'approved'),
    supabase.from('series').select('id, name'),
    supabase.from('pages').select('status, type'),
    supabase.from('pages').select('title').eq('status', 'approved').order('created_at', { ascending: false }).limit(6),
    supabase.from('chat_messages').select('id', { count: 'exact', head: true }),
    supabase.from('series').select('id', { count: 'exact', head: true }),
  ]);

  const themeOpts = (themeRows ?? []).map((t) => `${t.name}(${t.id})`).join('、') || '无';
  const seriesOpts = (seriesRows ?? []).map((s) => `${s.name}(${s.id})`).join('、') || '无';

  const all = pageRows ?? [];
  const approved = all.filter((p) => p.status === 'approved');
  const byType = approved.reduce<Record<string, number>>((acc, p) => {
    acc[p.type] = (acc[p.type] ?? 0) + 1;
    return acc;
  }, {});
  const snapshot =
    `- 当前北京时间：${beijingNow()}\n` +
    `- 词条总数 ${all.length}（已过审 ${approved.length} / 待审 ${all.filter((p) => p.status === 'pending').length} / 驳回 ${all.filter((p) => p.status === 'rejected').length}）\n` +
    `- 分类数量：${ALLOWED_TYPES.map((t) => `${t} ${byType[t] ?? 0}`).join('、')}\n` +
    `- 最近收录：「${(recentRows ?? []).map((r) => r.title).join('」「')}」\n` +
    `- 系列 ${seriesCount ?? 0} 个，聊天室共 ${chatCount ?? 0} 条消息`;

  const context = history
    .slice(-10)
    .map((m) => `${m.author}: ${m.content}`)
    .join('\n');

  const baseMessages: any[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...(context ? [{ role: 'user' as const, content: `最近聊天记录（含你之前的回复，用 SCI-Petia 开头）如下：\n${context}` }] : []),
    { role: 'user', content: latest },
    { role: 'user', content: `当前档案库真实快照（涉及本站数据的回答只能引用这些真实数字与标题，绝对不要编造不存在的馆藏、文献、纸张、战地记录等细节）：\n${snapshot}` },
    { role: 'user', content: `若你要调用 record_entry，可选的已过审版式(id)：${themeOpts}；可选的系列(id)：${seriesOpts}。theme_id 和 series_id 都可以为 null。` },
    { role: 'user', content: '当用户明确让你「上传/提交/做一个版式（主题）」时，请立刻调用 submit_theme，版式是纯文字参数、不需要任何图片。若用户没给出具体配色/字体，就把没提到的字段用默认值补齐（主色 accent=#8a5a2b、辅色 accent_soft=#a58050、底纸 bg=#f7f3ec、头图渐变 #1a1a1a→#3a3a3a、风格 modern、无动效）；name 用用户提到的主题名，若确实没提到就用简短的中文名；slug 用英文小写连字符。' },
    { role: 'user', content: '联网搜索判断规则（重要）：当用户问的是现实世界的时事、新闻、当下正在发生的大事、天气，或任何档案库之外需要实时查证的信息——尤其提到「今天/最近/现在有什么大事」「新闻」这类词，且不是在问 KRT 世界时——必须立即调用 web_search 联网搜索后再回答；不要只依赖档案库回答，也不要因为档案库没有记录就回答「没有」。只有当用户明确在问 KRT 世界/本站档案内容时，才用 search_archive 查档案库，并在回答时事类问题时明确区分「这是档案记录」与「这是网上查到的」。' },
  ];

  try {
    let replyText = '';

    for (;;) {
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
          messages: baseMessages,
          tools: TOOLS,
        }),
      });

      if (!res.ok) {
        const bodyText = await res.text().catch(() => '');
        console.error('[krt-qq] deepseek http', res.status, bodyText.slice(0, 500));
        throw new Error(`DeepSeek ${res.status}`);
      }
      const data = await res.json();
      const message = data?.choices?.[0]?.message;
      const text = typeof message?.content === 'string' ? message.content : '';
      const calls = Array.isArray(message?.tool_calls) ? message.tool_calls : [];
      console.log('[krt-qq] reply len', text.length, '| finish', message?.finish_reason, '| tools', calls.map((c: any) => c?.function?.name).join(',') || 'none');

      const callList = calls as Array<{ id: string; function?: { name?: string; arguments?: string } }>;

      if (callList.length > 0) {
        const toolResponses: { id: string; content: string }[] = [];

        for (const call of callList) {
          const fnName = call?.function?.name ?? '';
          const args = parseArgs(call?.function?.arguments ?? '{}');

          if (fnName === 'search_archive') {
            toolResponses.push({ id: call.id, content: await searchArchive(String(args.query ?? '')) });
            continue;
          }

          if (fnName === 'web_search') {
            toolResponses.push({ id: call.id, content: await webSearch(String(args.query ?? '')) });
            continue;
          }

          if (fnName === 'record_entry') {
            const title = ((args.title as string) ?? '').trim();
            const slug = normalizeSlug(args.slug as string);
            const type = ALLOWED_TYPES.includes(args.type as PageType) ? (args.type as PageType) : 'article';
            const body = ((args.body as string) ?? '').trim();

            if (!(title && slug && body)) {
              toolResponses.push({ id: call.id, content: '缺少必填参数：title（标题）、body（正文）、slug（英文小写连字符标识）。请补全后重新调用 record_entry。' });
              continue;
            }

            const session = await petiaSession();
            if (!session) {
              toolResponses.push({ id: call.id, content: '当前环境没有档案写入权限（写入账号未配置），无法直接写入。请诚实地告诉用户暂时无法代录，建议到网站 /submit 提交。' });
              continue;
            }

            const themeId = (themeRows ?? []).some((t) => t.id === args.theme_id) ? args.theme_id : null;
            const seriesId = (seriesRows ?? []).some((s) => s.id === args.series_id) ? args.series_id : null;

            const { error: insertError } = await session.client.from('pages').insert({
              slug,
              title,
              type,
              body,
              status: 'pending',
              source: 'petia',
              author_id: session.userId,
              author_name: 'SCI-Petia',
              tags: [],
              cover_url: '',
              series_id: seriesId,
              theme_id: themeId,
              song_title: '',
              song_url: '',
            });

            if (!insertError) {
              toolResponses.push({ id: call.id, content: '词条已成功写入档案库，状态为待审核（等待站长审核）。' });
            } else if (insertError.code === '23505') {
              toolResponses.push({ id: call.id, content: '写入失败：该条目标识已存在（重复），请换个 slug。' });
            } else {
              toolResponses.push({ id: call.id, content: `写入失败：${insertError.message}` });
            }
            continue;
          }

          if (fnName === 'submit_theme') {
            const name = ((args.name as string) ?? '').trim();
            const slug = normalizeSlug(args.slug as string);
            const slogan = ((args.slogan as string) ?? '').trim();
            const titleFont = pick(FONT_KEYS, args.title_font as string, '');
            const bodyFont = pick(FONT_KEYS, args.body_font as string, '');
            const headerStyle = pick(HEADER_STYLES, args.header_style as string, 'none');
            const animation = pick(ANIMATIONS, args.header_animation as string, 'none');

            if (!name) {
              toolResponses.push({ id: call.id, content: '缺少必填参数 name（版式名称）。请补全 name，slug 用英文小写连字符（可基于 name 生成），重新调用 submit_theme。' });
              continue;
            }

            const colors = {
              accent: (args.accent as string) || '#8a5a2b',
              accent_soft: (args.accent_soft as string) || '#a58050',
              bg: (args.bg as string) || '#f7f3ec',
              title_color: (args.title_color as string) || '',
              body_color: (args.body_color as string) || '',
              header_from: (args.header_from as string) || '#1a1a1a',
              header_to: (args.header_to as string) || '#3a3a3a',
            };
            const validColors = Object.values(colors).every((v) => isColor(v || undefined));

            const session = await petiaSession();
            if (!session) {
              toolResponses.push({ id: call.id, content: '当前环境没有版式写入权限（写入账号未配置），无法直接写入。请诚实地告诉用户暂时无法代提交，建议到网站提交。' });
              continue;
            }

            const insertRes = validColors
              ? await session.client.from('themes').insert({
                  name,
                  slug,
                  slogan,
                  accent: colors.accent,
                  accent_soft: colors.accent_soft,
                  bg: colors.bg,
                  style: pick(THEME_STYLES, args.style as string, 'modern'),
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
                  author_id: session.userId,
                })
              : { error: { code: '400', message: '颜色格式不合法' } };

            if (!insertRes.error) {
              toolResponses.push({ id: call.id, content: '版式已成功写入档案库，状态为待审核（等待站长审核）。' });
            } else if (insertRes.error.code === '23505') {
              toolResponses.push({ id: call.id, content: '写入失败：该版式标识已存在（重复），请换个 slug。' });
            } else {
              toolResponses.push({ id: call.id, content: `写入失败：${insertRes.error.message}` });
            }
            continue;
          }

          toolResponses.push({ id: call.id, content: '该工具暂不可用。' });
        }

        baseMessages.push({ role: 'assistant', content: text, tool_calls: message?.tool_calls ?? [] });
        for (const r of toolResponses) {
          baseMessages.push({ role: 'tool', tool_call_id: r.id, content: r.content });
        }
        continue;
      }

      replyText = text;
      break;
    }

    if (replyText.trim()) {
      const out = sanitizeReply(replyText).replace(/\[mascot:[a-z]+\]/gi, '').trim();
      return out;
    }
    if (/版式|主题|设计|上传|提交|配色|字体|头图/.test(latest)) {
      return '嗯，要提交版式的话，把设计想法告诉我吧：版式名称、主色/底纸/文字配色、字体、头图风格。拿不准的地方我就用默认值补齐。';
    }
    return '';
  } catch (e) {
    console.error('[krt-qq] deepseek error', e);
    return '';
  }
}
