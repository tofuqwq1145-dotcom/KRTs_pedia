'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import SiteMascot from '@/components/SiteMascot';
import { renderStickers } from '@/lib/stickers';
import { STICKER_MOODS } from '@/data/mascot';

interface Comment {
  id: string;
  user_id: string;
  author_name: string;
  body: string;
  created_at: string;
}

export default function Discussion({ pageId, slug }: { pageId: string; slug: string }) {
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [list, setList] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [titles, setTitles] = useState<Record<string, string>>({});
  const listRef = useRef<HTMLDivElement>(null);

  const append = useCallback((c: Comment) => {
    setList(prev => (prev.some(x => x.id === c.id) ? prev : [...prev, c]));
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

      const { data } = await supabase
        .from('comments')
        .select('*')
        .eq('page_id', pageId)
        .order('created_at', { ascending: true })
        .limit(200);
      if (!cancelled && data) setList(data as Comment[]);

      channel = supabase
        .channel(`comments_${pageId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `page_id=eq.${pageId}` }, (payload: any) => {
          append(payload.new as Comment);
        })
        .subscribe();
    })();

    return () => {
      cancelled = true;
      channel?.unsubscribe();
      supabase?.removeChannel(channel);
    };
  }, [append, pageId]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [list.length]);

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
    const body = text.trim();
    if (!body) return;
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
      const { error } = await supabase.from('comments').insert({
        page_id: pageId,
        user_id: u.id,
        author_name: (profile?.display_name as string) || u.email?.split('@')[0] || '匿名',
        body: body.slice(0, 2000),
      });
      if (error) throw new Error(error.message);
      setText('');
    } catch (e: any) {
      setError(e.message || '发送失败。');
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm('确定删除这条评论？')) return;
    setError('');
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    const { error } = await supabase.from('comments').delete().eq('id', id);
    if (error) return setError(error.message);
    setList(prev => prev.filter(c => c.id !== id));
  }

  const fmt = (iso: string) => new Date(iso).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <section className="border-t border-archive-border pt-8 mt-8">
      <h2 className="font-serif text-2xl text-archive-text mb-2">讨论区</h2>
      <p className="text-xs tracking-widest text-archive-muted mb-6">围绕本档案的补充、考据与讨论（登录后可发言）。</p>

      <div ref={listRef} className="max-h-[420px] overflow-y-auto bg-archive-bg/40 border border-archive-border p-6 space-y-4 mb-5">
        {list.length === 0 && <p className="text-sm text-archive-muted tracking-widest">还没有讨论，来留下第一条吧。</p>}
        {list.map(c => (
          <div key={c.id} className="flex items-start gap-3">
            <span className="shrink-0 flex items-center gap-1.5 mt-1">
              {titles[c.user_id] && (
                <span className="px-1.5 py-0.5 text-[10px] tracking-widest text-archive-paper bg-archive-accent leading-none">{titles[c.user_id]}</span>
              )}
              <span className="text-xs tracking-widest text-archive-accent">{c.author_name}</span>
            </span>
            <div className="flex-1 bg-archive-paper border border-archive-border px-4 py-3">
              <p className="text-sm text-archive-text leading-relaxed break-words whitespace-pre-wrap">{renderStickers(c.body)}</p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-[10px] text-archive-muted tracking-widest">{fmt(c.created_at)}</p>
                {user?.id === c.user_id && (
                  <button onClick={() => onDelete(c.id)} className="text-[10px] tracking-widest text-archive-muted hover:text-archive-accent">删除</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {authChecked && !user ? (
        <p className="text-sm tracking-widest text-archive-muted">
          <Link href={`/auth/login?next=/pages/${slug}`} className="text-archive-accent underline underline-offset-4 hover:opacity-80">登录</Link> 后参与讨论
        </p>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1">
            {STICKER_MOODS.map(s => (
              <button key={s.mood} onClick={() => setText(t => (t ? t + ' ' : '') + `[mascot:${s.mood}]`)} title={`发送「${s.label}」表情`}
                className="shrink-0 hover:scale-110 transition-transform">
                <SiteMascot mood={s.mood} active size={28} />
              </button>
            ))}
            <span className="shrink-0 text-[10px] text-archive-muted tracking-widest">点击插入站娘表情</span>
          </div>

          <div className="flex gap-3">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="写下你的看法…（Enter 提交，Ctrl+Enter 换行）"
              maxLength={2000}
              rows={3}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); onSend(); }
              }}
              className="flex-1 p-4 border border-archive-border bg-archive-paper outline-none focus:border-archive-accent transition-colors text-sm tracking-widest resize-y"
            />
            <button onClick={onSend} disabled={busy || !text.trim()}
              className="px-8 py-4 bg-archive-text text-archive-paper text-sm tracking-widest hover:bg-archive-accent transition-colors disabled:opacity-50 self-stretch">
              发布
            </button>
          </div>
          <div className="mt-3 text-sm">
            {error && <p className="text-archive-accent">{error}</p>}
          </div>
        </>
      )}
    </section>
  );
}