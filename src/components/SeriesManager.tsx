'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface SeriesRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  sort_order: number;
  parent_id?: string | null;
  theme_id?: string | null;
}

const emptyForm = { name: '', slug: '', description: '', sort_order: 0, parent_id: '', theme_id: '' };

export default function SeriesManager() {
  const [list, setList] = useState<SeriesRow[]>([]);
  const [themes, setThemes] = useState<{ id: string; name: string }[]>([]);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [themeId, setThemeId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<SeriesRow | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    const supabase = createClient();
    const load = () => {
      supabase.from('series').select('*').order('sort_order', { ascending: true }).then((r: any) => {
        if (!r.error) setList(r.data ?? []);
      });
      supabase.from('themes').select('id, name').eq('status', 'approved').order('created_at', { ascending: true }).then((r: any) => {
        if (!r.error) setThemes(r.data ?? []);
      });
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.slug.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q),
    );
  }, [list, query]);

  const descendantsOf = (id: string): string[] => {
    const seen = new Set<string>();
    const out: string[] = [];
    const walk = (pid: string) => {
      for (const s of list) {
        if (s.parent_id === pid && !seen.has(s.id)) {
          seen.add(s.id);
          out.push(s.id);
          walk(s.id);
        }
      }
    };
    walk(id);
    return out;
  };

  const labelOf = (s: SeriesRow) => `[${s.slug}] ${s.name}`;

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
        body: JSON.stringify({ name: name.trim(), slug: slug.trim(), description: description.trim(), sort_order: sortOrder, parent_id: parentId || null, theme_id: themeId || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? '创建失败');
      setNotice(`已创建「${json.name}」`);
      setList(prev => [...prev, json].sort((a: any, b: any) => a.sort_order - b.sort_order));
      setName('');
      setSlug('');
      setParentId('');
      setThemeId('');
      setDescription('');
      setSortOrder(0);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function startEdit(s: SeriesRow) {
    setEditing(s);
    setForm({
      name: s.name,
      slug: s.slug,
      description: s.description,
      sort_order: s.sort_order,
      parent_id: s.parent_id ?? '',
      theme_id: s.theme_id ?? '',
    });
    setError('');
    setNotice('');
  }

  function cancelEdit() {
    setEditing(null);
    setForm(emptyForm);
  }

  async function saveEdit() {
    if (!editing) return;
    setError('');
    setNotice('');
    if (!form.name.trim() || !form.slug.trim()) {
      setError('名称与标识（Slug）不能为空。');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/series/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          slug: form.slug.trim(),
          description: form.description.trim(),
          sort_order: Number(form.sort_order),
          parent_id: form.parent_id || null,
          theme_id: form.theme_id || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? '保存失败');
      setList(prev => prev.map(s => (s.id === editing.id ? { ...s, ...json } : s)));
      setNotice(`已保存「${json.name}」。`);
      setEditing(null);
      setForm(emptyForm);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function onChangeTheme(id: string, themeId: string) {
    setError('');
    setNotice('');
    try {
      const res = await fetch(`/api/series/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme_id: themeId || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? '更新失败');
      setList(prev => prev.map(s => (s.id === id ? { ...s, theme_id: themeId || null } : s)));
      setNotice(`已更新「${json.name}」的版式。`);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function onDelete(id: string, name: string) {
    if (!window.confirm(`确定删除分级「${name}」？其子分级与档案不会被删除，但会解除关联。`)) return;
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const res = await fetch(`/api/series/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? '删除失败');
      setList(prev => prev.filter(s => s.id !== id));
      if (editing?.id === id) cancelEdit();
      setNotice('已删除。');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const parentOptions = (forId?: string) => {
    const exclude = forId ? [forId, ...descendantsOf(forId)] : [];
    return list.filter(s => !exclude.includes(s.id));
  };

  const fieldCls = 'w-full p-3 border border-archive-border bg-archive-paper outline-none focus:border-archive-accent transition-colors text-sm tracking-widest';
  const labelCls = 'block text-xs tracking-widest text-archive-muted mb-2';

  return (
    <section className="mt-0">
      <h2 className="font-serif text-2xl mb-6 text-archive-text border-b border-archive-border pb-4">分级管理（系列目录，支持子分级）</h2>

      <div className="bg-archive-paper border border-archive-border p-6 mb-8 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>分级名称 *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="例如：政治篇" className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>分级标识 Slug *（用于网址，如 politics）</label>
            <input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5-]/g, '-'))} placeholder="politics" className={fieldCls} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>父分级（可选，作为子分级挂到某个分级下）</label>
            <select value={parentId} onChange={e => setParentId(e.target.value)} className={fieldCls}>
              <option value="">顶级分级（不挂靠）</option>
              {list.map(s => <option key={s.id} value={s.id}>{labelOf(s)}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>版式主题（可选，该分级下所有条目使用此版式）</label>
            <select value={themeId} onChange={e => setThemeId(e.target.value)} className={fieldCls}>
              <option value="">默认版式</option>
              {themes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className={labelCls}>描述</label>
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="一句话介绍该分级的收录范围" className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>排序（数字越小越靠前）</label>
            <input type="number" value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} className={fieldCls} />
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

      <div className="mb-4 flex items-center gap-3">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={`查找分级（名称 / Slug / 描述）…（共 ${list.length} 个，显示 ${filtered.length} 个）`}
          className="flex-1 p-3 border border-archive-border bg-archive-paper outline-none focus:border-archive-accent transition-colors text-sm tracking-widest"
        />
      </div>

      <div className="space-y-3">
        {filtered.map(s => {
          const parent = list.find(p => p.id === s.parent_id);
          const theme = themes.find(t => t.id === s.theme_id);
          const isChild = !!parent;
          const isEditing = editing?.id === s.id;
          return (
            <div key={s.id} className={`bg-archive-paper border p-4 ${isEditing ? 'border-archive-accent' : 'border-archive-border'}`}>
              {!isEditing ? (
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-serif text-lg text-archive-text">
                      {isChild ? <span className="text-archive-muted text-sm">⊢ </span> : ''}{s.name}{' '}
                      <span className="text-xs text-archive-muted tracking-widest">/ {s.slug}{isChild ? ` / 父级：${parent.name}` : ''}{theme ? ` / 版式：${theme.name}` : ''} / 排序 {s.sort_order}</span>
                    </p>
                    <p className="text-sm text-archive-muted mt-1">{s.description || '暂无描述'}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <select value={s.theme_id ?? ''} onChange={e => onChangeTheme(s.id, e.target.value)}
                      className="p-2 border border-archive-border bg-archive-paper outline-none text-xs tracking-widest">
                      <option value="">默认版式</option>
                      {themes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <button onClick={() => startEdit(s)} disabled={busy}
                      className="text-xs tracking-widest border border-archive-border px-3 py-1 text-archive-muted hover:text-archive-accent hover:border-archive-accent transition-colors disabled:opacity-50">
                      编辑
                    </button>
                    <button onClick={() => onDelete(s.id, s.name)} disabled={busy}
                      className="text-xs tracking-widest text-archive-accent border border-archive-accent/40 px-3 py-1 hover:bg-archive-accent hover:text-archive-paper transition-colors disabled:opacity-50">
                      删除
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs tracking-widest text-archive-accent">编辑「{s.name}」</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>分级名称 *</label>
                      <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={fieldCls} />
                    </div>
                    <div>
                      <label className={labelCls}>分级标识 Slug *</label>
                      <input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5-]/g, '-') })} className={fieldCls} />
                    </div>
                    <div>
                      <label className={labelCls}>父分级（可选）</label>
                      <select value={form.parent_id} onChange={e => setForm({ ...form, parent_id: e.target.value })} className={fieldCls}>
                        <option value="">顶级分级（不挂靠）</option>
                        {parentOptions(s.id).map(p => <option key={p.id} value={p.id}>{labelOf(p)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>版式主题（可选）</label>
                      <select value={form.theme_id} onChange={e => setForm({ ...form, theme_id: e.target.value })} className={fieldCls}>
                        <option value="">默认版式</option>
                        {themes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>排序（数字越小越靠前）</label>
                      <input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })} className={fieldCls} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>描述</label>
                    <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={fieldCls} />
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={saveEdit} disabled={busy}
                      className="px-5 py-2.5 bg-archive-text text-archive-paper text-sm tracking-widest hover:bg-archive-accent transition-colors disabled:opacity-50">
                      {busy ? '保存中…' : '保存'}
                    </button>
                    <button onClick={cancelEdit} disabled={busy}
                      className="px-5 py-2.5 border border-archive-border text-sm tracking-widest text-archive-muted hover:text-archive-accent transition-colors disabled:opacity-50">
                      取消
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-archive-muted">{list.length === 0 ? '还没有分级，可先创建第一个。' : `没有匹配「${query}」的分级。`}</p>
        )}
      </div>
    </section>
  );
}