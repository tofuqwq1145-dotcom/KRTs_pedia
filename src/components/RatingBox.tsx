'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

interface Row { id: string; value: number; user_id: string }

function Stars({ n, size = 20 }: { n: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" className={i <= n ? 'text-archive-accent' : 'text-archive-border'}>
          <path fill="currentColor" d="M12 2.5l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.4 5.9 20.9l1.5-6.8L2.2 9.5l6.9-.7z" />
        </svg>
      ))}
    </span>
  );
}

export default function RatingBox({ pageId, slug }: { pageId: string; slug: string }) {
  const [own, setOwn] = useState(0);
  const [avg, setAvg] = useState(0);
  const [count, setCount] = useState(0);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (supabase: any) => {
    const { data } = await supabase.from('ratings').select('id, value, user_id').eq('page_id', pageId);
    const rows = (data ?? []) as Row[];
    setCount(rows.length);
    setAvg(rows.length ? rows.reduce((s, r) => s + r.value, 0) / rows.length : 0);
    const { data: { user: u } } = await supabase.auth.getUser();
    setUser(u);
    if (u) {
      const mine = rows.find(r => r.user_id === u.id);
      setOwn(mine?.value ?? 0);
    }
    setAuthChecked(true);
  }, [pageId]);

  useEffect(() => {
    let supabase: any = null;
    let channel: any = null;
    let cancelled = false;
    (async () => {
      const { createClient } = await import('@/lib/supabase/client');
      supabase = createClient();
      await load(supabase);
      if (cancelled) return;
      channel = supabase
        .channel(`ratings_${pageId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ratings', filter: `page_id=eq.${pageId}` }, () => load(supabase))
        .subscribe();
    })();
    return () => {
      cancelled = true;
      channel?.unsubscribe();
      supabase?.removeChannel(channel);
    };
  }, [load, pageId]);

  async function rate(v: number) {
    setError('');
    if (busy) return;
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) {
      window.location.href = `/auth/login?next=/pages/${slug}`;
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.from('ratings').upsert(
        { page_id: pageId, user_id: u.id, value: v, updated_at: new Date().toISOString() },
        { onConflict: 'page_id,user_id' },
      );
      if (error) throw new Error(error.message);
      setOwn(v);
      await load(supabase);
    } catch (e: any) {
      setError(e.message || '评分失败。');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-archive-border mb-8">
      <div className="flex items-center gap-4 px-6 py-4 border-b border-archive-border bg-archive-paper/60">
        <span className="text-xs tracking-widest text-archive-muted w-16 shrink-0">平均评分</span>
        <Stars n={Math.round(avg)} />
        <span className="text-sm font-serif text-archive-text">{avg ? avg.toFixed(1) : '—'}</span>
        <span className="text-xs text-archive-muted tracking-widest">({count} 人)</span>
      </div>
      <div className="flex items-center gap-4 px-6 py-4">
        <span className="text-xs tracking-widest text-archive-muted w-16 shrink-0">我的评分</span>
        {!authChecked ? (
          <span className="text-xs text-archive-muted">加载中…</span>
        ) : user ? (
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(i => (
                <button key={i} onClick={() => rate(i)} disabled={busy}
                  className={own >= i ? 'text-archive-accent' : 'text-archive-border hover:text-archive-accent/60 transition-colors'}>
                  <svg width="22" height="22" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2.5l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.4 5.9 20.9l1.5-6.8L2.2 9.5l6.9-.7z" /></svg>
                </button>
              ))}
            </span>
            <span className="text-xs text-archive-muted tracking-widest">{own ? `已评 ${own} 分，点击可修改` : '点击星星评分'}</span>
          </div>
        ) : (
          <span className="text-xs tracking-widest">
            <Link href={`/auth/login?next=/pages/${slug}`} className="text-archive-accent underline underline-offset-4 hover:opacity-80">登录</Link>
            <span className="text-archive-muted"> 后可评分（每账号可改一次）</span>
          </span>
        )}
      </div>
      {error && <p className="px-6 pb-3 text-xs text-archive-accent">{error}</p>}
    </div>
  );
}