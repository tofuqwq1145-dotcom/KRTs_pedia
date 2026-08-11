'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ThemeRow {
  id: string;
  slug: string;
  name: string;
  slogan: string;
  accent: string;
  bg: string;
  style: string;
  status: string;
  author_id: string | null;
  logo_url: string;
}

const STATUS_LABEL: Record<string, string> = { pending: '待审核', approved: '已通过', rejected: '已驳回' };
const STYLE_OPTIONS = [
  { value: 'modern', label: '现代档案馆' },
  { value: 'scp', label: 'SCP 式深色' },
  { value: 'classic', label: '复古羊皮纸' },
];

export default function ThemeReview() {
  const [list, setList] = useState<ThemeRow[]>([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase.from('themes').select('*').order('created_at', { ascending: true }).then((r: any) => {
      if (!r.error) setList(r.data ?? []);
    });
  }, []);

  async function setStatus(id: string, status: string, nm: string) {
    setBusy(id);
    setError('');
    setNotice('');
    try {
      const res = await fetch(`/api/themes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? '操作失败');
      setList(prev => prev.map(t => t.id === id ? { ...t, status } : t));
      setNotice(`「${nm}」已${status === 'approved' ? '通过' : status === 'rejected' ? '驳回' : '标记为待审核'}。`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  }

  async function onDelete(id: string, nm: string) {
    if (!window.confirm(`确定删除版式「${nm}」？使用该版式的分级/条目将回到默认版式。`)) return;
    setBusy(id);
    setError('');
    setNotice('');
    try {
      const res = await fetch(`/api/themes/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? '删除失败');
      setList(prev => prev.filter(t => t.id !== id));
      setNotice('已删除。');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  }

  const pending = list.filter(t => t.status === 'pending');
  const rest = list.filter(t => t.status !== 'pending');

  function Card({ t, withActions }: { t: ThemeRow; withActions: boolean }) {
    return (
      <div className="border p-5 bg-archive-paper flex flex-col" style={{ borderColor: t.accent }}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-serif text-lg text-archive-text">{t.name} <span className="text-xs text-archive-muted tracking-widest">/ {t.slug}</span></p>
            {t.slogan && <p className="mt-1 text-xs italic tracking-widest" style={{ color: t.accent }}>「{t.slogan}」</p>}
          </div>
          <span className="shrink-0 text-[10px] tracking-widest border px-2 py-0.5"
            style={{ borderColor: t.status === 'approved' ? '#059669' : t.status === 'rejected' ? '#b91c1c' : t.accent, color: t.status === 'approved' ? '#059669' : t.status === 'rejected' ? '#b91c1c' : t.accent }}>
            {STATUS_LABEL[t.status] ?? t.status}
          </span>
        </div>
        <div className="mt-3 space-y-1.5 text-xs tracking-widest text-archive-muted">
          {t.logo_url && <p>已上传 Logo</p>}
          <div className="flex items-center gap-2"><span className="w-4 h-4 border" style={{ background: t.accent }}></span>主色 {t.accent}</div>
          <div className="flex items-center gap-2"><span className="w-4 h-4 border" style={{ background: t.bg }}></span>底纸 {t.bg}</div>
          <p>风格:{STYLE_OPTIONS.find(s => s.value === t.style)?.label ?? t.style}</p>
        </div>
        {withActions && (
          <div className="mt-4 flex flex-wrap gap-2">
            {t.status !== 'approved' && (
              <button onClick={() => setStatus(t.id, 'approved', t.name)} disabled={busy === t.id}
                className="text-xs tracking-widest text-emerald-700 border border-emerald-700/40 px-3 py-1 hover:bg-emerald-700 hover:text-white transition-colors disabled:opacity-50">通过</button>
            )}
            {t.status !== 'rejected' && (
              <button onClick={() => setStatus(t.id, 'rejected', t.name)} disabled={busy === t.id}
                className="text-xs tracking-widest text-[#b91c1c] border border-[#b91c1c]/40 px-3 py-1 hover:bg-[#b91c1c] hover:text-white transition-colors disabled:opacity-50">驳回</button>
            )}
            {t.status !== 'pending' && (
              <button onClick={() => setStatus(t.id, 'pending', t.name)} disabled={busy === t.id}
                className="text-xs tracking-widest text-archive-muted border border-archive-border px-3 py-1 hover:bg-archive-text hover:text-archive-paper transition-colors disabled:opacity-50">转回待审核</button>
            )}
            <button onClick={() => onDelete(t.id, t.name)} disabled={busy === t.id}
              className="text-xs tracking-widest text-archive-accent border border-archive-accent/40 px-3 py-1 hover:bg-archive-accent hover:text-archive-paper transition-colors disabled:opacity-50">删除</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <section className="mt-0">
      <h2 className="font-serif text-2xl mb-2 text-archive-text border-b border-archive-border pb-4">版式主题审核</h2>
      <p className="text-sm tracking-widest text-archive-muted mb-6 mt-4">每位登录用户均可提交版式，需在此通过后公开展示、供投稿选用。</p>

      {error && <p className="text-sm text-archive-accent mb-4">{error}</p>}
      {notice && <p className="text-sm text-emerald-700 mb-4">{notice}</p>}

      <h3 className="font-serif text-xl mb-4 text-archive-text">待审核（{pending.length}）</h3>
      {pending.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {pending.map(t => <Card key={t.id} t={t} withActions />)}
        </div>
      ) : (
        <p className="text-sm text-archive-muted mb-8">暂无待审核的版式。</p>
      )}

      <h3 className="font-serif text-xl mb-4 text-archive-text">全部版式（{list.length}）</h3>
      {rest.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rest.map(t => <Card key={t.id} t={t} withActions />)}
        </div>
      ) : (
        <p className="text-sm text-archive-muted">暂无其他版式。</p>
      )}
    </section>
  );
}