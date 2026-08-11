import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { STICKER_MOODS } from '@/data/mascot';

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  // 防刷：最近一条消息必须由本人发送且在过去 30 秒内
  const { data: latest } = await supabase
    .from('chat_messages')
    .select('user_id, created_at')
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

  const mood = STICKER_MOODS[Math.floor(Math.random() * STICKER_MOODS.length)].mood;

  const { error } = await supabase
    .from('chat_messages')
    .insert({
      user_id: user.id,
      author_name: 'SCI-Petia',
      content: `[mascot:${mood}]`,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, mood });
}