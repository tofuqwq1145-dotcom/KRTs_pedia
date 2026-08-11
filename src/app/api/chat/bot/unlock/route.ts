import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { BOT_NAME, SYSTEM_PROMPT, sanitizeReply } from '@/lib/petia';

const FALLBACK = (songTitle: string) =>
  `「${songTitle}」已解锁。谢谢这段时间陪我聊了这么多……以后也继续一起记录下去吧。`;

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  let songTitle = '';
  try {
    const j = await request.json();
    songTitle = String(j?.songTitle || '').trim();
  } catch { /* 忽略 */ }
  if (!songTitle) {
    return NextResponse.json({ text: FALLBACK('这首曲目') });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ text: FALLBACK(songTitle) });
  }

  const { data: msgs } = await supabase
    .from('chat_messages')
    .select('author_name, content')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30);
  const conv = [...(msgs ?? [])]
    .reverse()
    .map(m => `${m.author_name}: ${m.content}`)
    .join('\n') || '（暂无记录）';

  const instruction = `用户刚刚在档案站解锁了成就曲「${songTitle}」。请以你的口吻写一段 80 字以内的贺词：
1. 简要回顾你们最近聊过的话题（严格从上面聊天记录里总结，不要编造；若记录很少或没有，就自然地略过回顾部分）；
2. 再说一句鼓励或祝贺的话，符合你的性格，简短；
3. 不要用方括号表情，不要写动作/舞台提示。`;

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
        max_tokens: 160,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `这是「${BOT_NAME}」与你（用户）的最近聊天记录：\n${conv}` },
          { role: 'user', content: instruction },
        ],
      }),
    });
    if (!res.ok) {
      console.error('[petia-bot] unlock deepseek http', res.status);
      throw new Error(`DeepSeek ${res.status}`);
    }
    const data = await res.json();
    const reply = typeof data?.choices?.[0]?.message?.content === 'string' ? data.choices[0].message.content : '';
    const text = sanitizeReply(reply);
    console.log('[petia-bot] unlock text len', text.length);
    return NextResponse.json({ text: text || FALLBACK(songTitle) });
  } catch (e) {
    console.error('[petia-bot] unlock deepseek error', e);
    return NextResponse.json({ text: FALLBACK(songTitle) });
  }
}
