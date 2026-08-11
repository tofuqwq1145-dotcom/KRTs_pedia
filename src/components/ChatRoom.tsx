'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import SiteMascot from '@/components/SiteMascot';
import { renderStickers } from '@/lib/stickers';
import { STICKER_MOODS } from '@/data/mascot';

interface Message {
  id: string;
  user_id: string;
  author_name: string;
  content: string;
  created_at: string;
}

export default function ChatRoom() {
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [botOn, setBotOn] = useState<boolean>(() => typeof window !== 'undefined' && window.localStorage.getItem('krt-bot') !== '0');
  const listRef = useRef<HTMLDivElement>(null);

  const append = useCallback((m: Message) => {
    setMsgs(prev => (prev.some(x => x.id === m.id) ? prev : [...prev, m]));
  }, []);

  useEffect(() => {
    let supabase: any = null;
    let channel: any = null;
    let cancelled = false;

    (async () => {
      const { createClient } = await import('@/lib/supabase/client');
      supabase = createClient();
      const { data: { user: u } } = await supabase.auth.getUser();
      if (cancelled) return;
      setUser(u);
      setAuthChecked(true);
      if (!u) return;

      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100);
      if (!cancelled && data) setMsgs(data as Message[]);

      channel = supabase
        .channel('chat_room_realtime')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload: any) => {
          append(payload.new as Message);
        })
        .subscribe();
    })();

    return () => {
      cancelled = true;
      channel?.unsubscribe();
      supabase?.removeChannel(channel);
    };
  }, [append]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs.length]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data } = await supabase.from('profiles').select('id, title').not('title', 'is', null).neq('title', '');
        if (!cancelled && data) {
          const map: Record<string, string> = {};
          (data as { id: string; title: string }[]).forEach(r => { map[r.id] = r.title; });
          setTitles(map);
        }
      } catch { /* 无称号列时忽略 */ }
    })();
    return () => { cancelled = true; };
  }, []);

  async function onSend() {
    const content = text.trim();
    if (!content) return;
    setError('');
    setBusy(true);
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) throw new Error('请先登录');
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', u.id)
        .maybeSingle();
      const { error } = await supabase.from('chat_messages').insert({
        user_id: u.id,
        author_name: (profile?.display_name as string) || u.email?.split('@')[0] || '匿名',
        content: content.slice(0, 1000),
      });
      if (error) throw new Error(error.message);
      setText('');
      const mentioned = content.toUpperCase().includes('@SCI-PETIA') || content.includes('@站娘');
      if (botOn && mentioned) {
        try {
          const r = await fetch('/api/chat/bot', { method: 'POST' });
          if (!r.ok) {
            const j = await r.json().catch(() => null);
            if (j?.error) setError(j.error);
          }
        } catch { /* 网络异常忽略 */ }
      }
    } catch (e: any) {
      setError(e.message || '发送失败。');
    } finally {
      setBusy(false);
    }
  }

  const fmt = (iso: string) => new Date(iso).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div>
      {authChecked && !user ? (
        <div className="py-20 text-center border border-archive-border bg-archive-paper">
          <p className="font-serif text-xl text-archive-muted mb-6">登录后才能加入聊天室</p>
          <Link href="/auth/login" className="px-6 py-3 bg-archive-text text-archive-paper text-sm tracking-widest hover:bg-archive-accent transition-colors">登录 / 注册</Link>
        </div>
      ) : (
        <>
          <div ref={listRef} className="h-[520px] overflow-y-auto bg-archive-paper border border-archive-border p-6 space-y-3 mb-4">
            {msgs.length === 0 && <p className="text-sm text-archive-muted tracking-widest">还没有消息，来说第一句话吧。</p>}
            {msgs.map(m => {
              const isBot = m.author_name === 'SCI-Petia';
              return (
                <div key={m.id} className="flex items-start gap-3">
                  <span className="shrink-0 flex items-center gap-1.5 mt-1">
                    {!isBot && titles[m.user_id] && (
                      <span className="px-1.5 py-0.5 text-[10px] tracking-widest text-archive-paper bg-archive-accent leading-none">{titles[m.user_id]}</span>
                    )}
                    {isBot && <SiteMascot mood="chat" active size={20} />}
                    <span className={`text-xs tracking-widest ${isBot ? 'text-[#7FB8E4]' : 'text-archive-accent'}`}>{m.author_name}</span>
                  </span>
                  <div className={`flex-1 border px-4 py-2.5 ${isBot ? 'bg-[#7FB8E4]/10 border-[#7FB8E4]/25' : 'bg-archive-bg/60 border-archive-border'}`}>
                    <p className="text-sm text-archive-text leading-relaxed break-words whitespace-pre-wrap">{renderStickers(m.content)}</p>
                    <p className="text-[10px] text-archive-muted tracking-widest mt-1.5">{fmt(m.created_at)}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1">
            {STICKER_MOODS.map(s => (
              <button key={s.mood} onClick={() => setText(t => (t ? t + ' ' : '') + `[mascot:${s.mood}]`)} title={`发送「${s.label}」表情`}
                className="shrink-0 hover:scale-110 transition-transform">
                <SiteMascot mood={s.mood} active size={30} />
              </button>
            ))}
            <span className="shrink-0 text-[10px] text-archive-muted tracking-widest">点击插入站娘表情</span>
            <label className="shrink-0 flex items-center gap-1.5 pl-3 ml-2 border-l border-archive-border text-[11px] text-archive-muted tracking-widest cursor-pointer select-none" title="开启后，你 @站娘 或 @SCI-Petia 时她会用 DeepSeek 应答">
              <input type="checkbox" checked={botOn} onChange={e => {
                const v = e.target.checked;
                setBotOn(v);
                try { window.localStorage.setItem('krt-bot', v ? '1' : '0'); } catch { /* 忽略 */ }
              }} className="accent-[#7FB8E4]" />
              站娘应答
            </label>
          </div>

          <div className="flex gap-3">
            <input
              type="text"
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) onSend(); }}
              placeholder="输入消息，Enter 发送…（@站娘 或 @SCI-Petia 召唤她应答）"
              maxLength={1000}
              className="flex-1 p-4 border border-archive-border bg-archive-paper outline-none focus:border-archive-accent transition-colors text-sm tracking-widest"
            />
            <button onClick={onSend} disabled={busy || !text.trim()}
              className="px-8 py-4 bg-archive-text text-archive-paper text-sm tracking-widest hover:bg-archive-accent transition-colors disabled:opacity-50">
              发送
            </button>
          </div>
          <div className="mt-3 text-sm">
            {error && <p className="text-archive-accent">{error}</p>}
          </div>
        </>
      )}
    </div>
  );
}