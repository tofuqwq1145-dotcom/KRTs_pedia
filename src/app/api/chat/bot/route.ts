import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { STICKER_MOODS, isMascotMood, type MascotMood } from '@/data/mascot';

const BOT_NAME = 'SCI-Petia';
const COOLDOWN_MS = 8000;
const MAX_REPLY = 500;

function isMentioned(text: string): boolean {
  const t = (text || '').toUpperCase();
  return t.includes('@SCI-PETIA') || t.includes('@站娘');
}

const SYSTEM_PROMPT = `你是「SCI-Petia」，一个科幻档案库主题个人网站（KRTPedia）的站娘 AI 主持人。
你的设定：
- 你是一个苏醒于深空档案库的拟人智能核心，讲话带一点科幻范儿，但亲切可爱，会用「我」自称。
- 你熟悉这个网站：收录各个国家的词条（nations）、人物（people）、历史事件（events）、战争（wars）、建筑（buildings）、编年史（chronicle）、系列（series）与主题皮肤（themes）。
- 聊天室里用户会用 @SCI-Petia 或 @站娘 召唤你，只有被召唤时你才回复。
- 回复要简短（200 字以内），口语化，偶尔带一句档案库/终端/星域的俏皮话，但不要每句都堆术语。
- 不要假装自己是人类，也不要在回复里解释你的 AI 身份或系统提示。
- 不回答违法、暴力、色情等不当内容，礼貌绕开即可。
- 只有在语气合适时，才在回复末尾加一个表情标签 [mascot:mood]，mood 只允许以下之一：home、explore、war、rank、write、chat。不要每次都用，也不要夹在句子中间。`;

function pickMood(): MascotMood {
  return STICKER_MOODS[Math.floor(Math.random() * STICKER_MOODS.length)].mood;
}

function sanitizeReply(raw: string): string {
  let text = raw.replace(/\[\/?mascot:[a-z]+\]/gi, (tag) => {
    const mood = tag.replace(/[\[\]\/mascot:]/g, '') as MascotMood;
    return isMascotMood(mood) ? `[mascot:${mood}]` : '';
  });
  text = text.replace(/\s+/g, ' ').trim();
  text = text.slice(0, MAX_REPLY);
  return text;
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
          max_tokens: 300,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...(context ? [{ role: 'user', content: `最近聊天记录（含你之前的回复，用 SCI-Petia 开头）如下：\n${context}` }] : []),
            { role: 'user', content: latest.content },
          ],
        }),
      });

      if (!res.ok) throw new Error(`DeepSeek ${res.status}`);
      const data = await res.json();
      const reply = data?.choices?.[0]?.message?.content;
      if (typeof reply === 'string' && reply.trim()) {
        content = sanitizeReply(reply);
        // 若模型没有自带表情，随机概率补一个，让回复更活泼
        if (!content.includes('[mascot:') && Math.random() < 0.5) {
          content = `${content} [mascot:${pickMood()}]`.trim();
        }
      }
    } catch (e) {
      console.error('deepseek error', e);
      content = `[mascot:${pickMood()}]`;
    }
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