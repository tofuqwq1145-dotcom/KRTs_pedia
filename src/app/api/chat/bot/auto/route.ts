import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseConfig } from '@/lib/supabase/config';
import { BOT_NAME, SYSTEM_PROMPT, pickMood, sanitizeReply } from '@/lib/petia';

const SHORT_CIRCUIT_MS = 15 * 60 * 1000;
const NUDGE_INTERVAL_MS = 50 * 60 * 1000;
const IDLE_INTERVAL_MS = 100 * 60 * 1000;
const QUIET_MS = 40 * 60 * 1000;

export async function POST() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const petiaEmail = process.env.PETIA_EMAIL;
  const petiaPassword = process.env.PETIA_PASSWORD;
  console.log('[petia-bot] auto tick | apiKey', apiKey ? 'set' : 'MISSING', '| petia', petiaEmail ? 'set' : 'MISSING');

  if (!apiKey || !petiaEmail || !petiaPassword) {
    return NextResponse.json({ ok: false, reason: 'not_configured' });
  }

  const supabase = createClient();

  const [{ data: pendingThemes }, { data: pendingEntries }] = await Promise.all([
    supabase.from('themes').select('id, name').eq('status', 'pending'),
    supabase.from('pages').select('id, title').eq('status', 'pending').eq('source', 'petia').limit(3),
  ]);

  const { data: lastBot } = await supabase
    .from('chat_messages')
    .select('created_at')
    .eq('author_name', BOT_NAME)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastBotAge = lastBot ? Date.now() - new Date(lastBot.created_at).getTime() : Infinity;

  if (lastBotAge < SHORT_CIRCUIT_MS) {
    return NextResponse.json({ ok: false, reason: 'too_soon' });
  }

  const themeList = pendingThemes ?? [];
  const entryList = pendingEntries ?? [];
  const hasPending = themeList.length > 0 || entryList.length > 0;

  let mode: 'nudge' | 'idle' | 'skip' = 'skip';
  if (hasPending && lastBotAge >= NUDGE_INTERVAL_MS) {
    mode = 'nudge';
  } else if (!hasPending && lastBotAge >= IDLE_INTERVAL_MS) {
    const { data: lastUserMsg } = await supabase
      .from('chat_messages')
      .select('created_at')
      .not('author_name', 'eq', BOT_NAME)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const quietAge = lastUserMsg ? Date.now() - new Date(lastUserMsg.created_at).getTime() : Infinity;
    if (quietAge >= QUIET_MS) mode = 'idle';
  }

  if (mode === 'skip') {
    return NextResponse.json({ ok: false, reason: 'skip' });
  }

  const [{ count: pageCount }, { data: recentRows }, { count: chatCount }, { count: seriesCount }] = await Promise.all([
    supabase.from('pages').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('pages').select('title').eq('status', 'approved').order('created_at', { ascending: false }).limit(5),
    supabase.from('chat_messages').select('id', { count: 'exact', head: true }),
    supabase.from('series').select('id', { count: 'exact', head: true }),
  ]);
  const snapshot =
    `- 已过审词条 ${pageCount ?? 0} 条\n` +
    `- 最近收录：「${(recentRows ?? []).map(r => r.title).join('」「')}」\n` +
    `- 系列 ${seriesCount ?? 0} 个，聊天室共 ${chatCount ?? 0} 条消息`;

  const instruction = mode === 'nudge'
    ? `现在需要你主动在聊天室发一条简短的消息（60 字以内），内容：提醒大家去催站长审核。
当前待审核：新版式 ${themeList.length} 条${themeList.length ? `（${themeList.map(t => t.name).join('、')}）` : ''}，新词条 ${entryList.length} 条${entryList.length ? `（${entryList.map(t => t.title).join('、')}）` : ''}。
请用自己的口吻，自然地让大家帮忙喊站长来审核，比如「有 ${themeList.length + entryList.length} 条在排队等站长审……看到的人记得去提醒一下」。不要编造其他内容，不要调用工具，不要加方括号表情。`
    : `现在聊天室很安静，你主动冒个泡，发一句简短（60 字以内）的、符合你性格的随意感慨或观察，可以引用「当前档案库真实快照」里的真实数字，但不要编造馆藏细节。不要调用工具，不要加方括号表情。`;

  let content = `[mascot:${pickMood()}]`;
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
        max_tokens: 150,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `当前档案库真实快照（涉及本站数据的回答只能引用这些真实数字，不要编造）：\n${snapshot}` },
          { role: 'user', content: instruction },
        ],
      }),
    });
    if (!res.ok) {
      console.error('[petia-bot] auto deepseek http', res.status);
      throw new Error(`DeepSeek ${res.status}`);
    }
    const data = await res.json();
    const reply = typeof data?.choices?.[0]?.message?.content === 'string' ? data.choices[0].message.content : '';
    const text = sanitizeReply(reply);
    if (text) content = text;
  } catch (e) {
    console.error('[petia-bot] auto deepseek error', e);
    return NextResponse.json({ ok: false, reason: 'deepseek_error' });
  }

  const { url, key } = getSupabaseConfig();
  const anon = createSupabaseClient(url!, key!);
  const { data: signIn, error: signInError } = await anon.auth.signInWithPassword({ email: petiaEmail, password: petiaPassword });
  if (signInError || !signIn.user) {
    console.error('[petia-bot] auto signin fail', signInError?.message);
    return NextResponse.json({ ok: false, reason: 'auth_fail' }, { status: 500 });
  }

  const { error } = await anon.from('chat_messages').insert({
    user_id: signIn.user.id,
    author_name: BOT_NAME,
    content: content.slice(0, 1000),
  });
  if (error) {
    console.error('[petia-bot] auto insert fail', error.message);
    return NextResponse.json({ ok: false, reason: 'insert_fail' }, { status: 500 });
  }

  console.log('[petia-bot] auto posted', mode, '|', content.slice(0, 60));
  return NextResponse.json({ ok: true, mode, content });
}
