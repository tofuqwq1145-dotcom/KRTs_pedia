'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface SeriesRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  sort_order: number;
}

export default function SeriesManager() {
  const [list, setList] = useState<SeriesRow[]>([]);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    const load = () => {
      if (!supabase) return;
      supabase.from('series').select('*').order('sort_order', { ascending: true }).then((r: any) => {
        if (!cancelled && !r.error) setList(r.data ?? []);
      });
    };
    load();
    return () => { cancelled = true; };
  }, []);

  async function onCreate() {
    setError('');
    setNotice('');
    if (!name.trim() || !slug.trim()) {
      setError('请填写分级名称与标识（Slug）。');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim(), description: description.trim(), sort_order: sortOrder }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? '创建失败');
      setNotice(`已创建「${json.name}」`);
      setList(prev => [...prev, json].sort((a: any, b: any) => a.sort_order - b.sort_order));
      setName('');
      setSlug('');
      setDescription('');
      setSortOrder(0);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string, name: string) {
    if (!window.confirm(`确定删除分级「${name}」？档案不会被删除，但会取消该分级关联。`)) return;
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const res = await fetch(`/api/series/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? '删除失败');
      setList(prev => prev.filter(s => s.id !== id));
      setNotice('已删除。');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-14">
      <h2 className="font-serif text-2xl mb-6 text-archive-text border-b border-archive-border pb-4">分级管理（系列目录）</h2>

      <div className="bg-archive-paper border border-archive-border p-6 mb-8 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs tracking-widest text-archive-muted mb-2">分级名称 *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="例如：政治篇"
              className="w-full p-3 border border-archive-border bg-archive-paper outline-none focus:border-archive-accent transition-colors text-sm tracking-widest" />
          </div>
          <div>
            <label className="block text-xs tracking-widest text-archive-muted mb-2">分级标识 Slug *（用于网址，如 politics）</label>
            <input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5-]/g, '-'))} placeholder="politics"
              className="w-full p-3 border border-archive-border bg-archive-paper outline-none focus:border-archive-accent transition-colors text-sm tracking-widest" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs tracking-widest text-archive-muted mb-2">描述</label>
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="一句话介绍该分级的收录范围"
              className="w-full p-3 border border-archive-border bg-archive-paper outline-none focus:border-archive-accent transition-colors text-sm tracking-widest" />
          </div>
          <div>
            <label className="block text-xs tracking-widest text-archive-muted mb-2">排序（数字越小越靠前）</label>
            <input type="number" value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))}
              className="w-full p-3 border border-archive-border bg-archive-paper outline-none focus:border-archive-accent transition-colors text-sm tracking-widest" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={onCreate} disabled={busy}
            className="px-6 py-3 bg-archive-text text-archive-paper text-sm tracking-widest hover:bg-archive-accent transition-colors disabled:opacity-50">
            {busy ? '处理中…' : '创建分级'}
          </button>
          <div className="text-sm">
            {error && <p className="text-archive-accent">{error}</p>}
            {notice && <p className="text-emerald-700">{notice}</p>}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {list.map(s => (
          <div key={s.id} className="bg-archive-paper border border-archive-border p-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-serif text-lg text-archive-text">{s.name} <span className="text-xs text-archive-muted tracking-widest">/ {s.slug} / 排序 {s.sort_order}</span></p>
              <p className="text-sm text-archive-muted mt-1">{s.description || '暂无描述'}</p>
            </div>
            <button onClick={() => onDelete(s.id, s.name)} disabled={busy}
              className="text-xs tracking-widest text-archive-accent border border-archive-accent/40 px-3 py-1 hover:bg-archive-accent hover:text-archive-paper transition-colors disabled:opacity-50 shrink-0">
              删除
            </button>
          </div>
        ))}
        {list.length === 0 && <p className="text-sm text-archive-muted">还没有分级，可先创建第一个。</p>}
      </div>
    </section>
  );
}