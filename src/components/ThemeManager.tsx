'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ThemeRow {
  id: string;
  slug: string;
  name: string;
  slogan: string;
  accent: string;
  accent_soft: string;
  bg: string;
  style: string;
}

const STYLE_OPTIONS = [
  { value: 'modern', label: '现代档案馆' },
  { value: 'scp', label: 'SCP 式深色' },
  { value: 'classic', label: '复古羊皮纸' },
];

const inputCls = 'w-full p-3 border border-archive-border bg-archive-paper outline-none focus:border-archive-accent transition-colors text-sm tracking-widest';
const labelCls = 'block text-xs tracking-widest text-archive-muted mb-2';

export default function ThemeManager() {
  const [list, setList] = useState<ThemeRow[]>([]);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [accent, setAccent] = useState('#8a5a2b');
  const [bg, setBg] = useState('#f7f3ec');
  const [style, setStyle] = useState('modern');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [slogan, setSlogan] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase.from('themes').select('*').order('created_at', { ascending: true }).then((r: any) => {
      if (!r.error) setList(r.data ?? []);
    });
  }, []);

  async function onCreate() {
    setError('');
    setNotice('');
    if (!name.trim() || !slug.trim()) {
      setError('请填写主题名称与标识（Slug）。');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim(), slogan: slogan.trim(), accent, bg, style }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? '创建失败');
      setNotice(`已创建版式「${json.name}」`);
      setList(prev => [...prev, json]);
      setName('');
      setSlug('');
      setSlogan('');
      setAccent('#8a5a2b');
      setBg('#f7f3ec');
      setStyle('modern');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string, nm: string) {
    if (!window.confirm(`确定删除版式「${nm}」？使用该版式的分级/条目将回到默认版式。`)) return;
    setBusy(true);
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
      setBusy(false);
    }
  }

  return (
    <section className="mt-14">
      <h2 className="font-serif text-2xl mb-6 text-archive-text border-b border-archive-border pb-4">版式主题管理</h2>

      <div className="bg-archive-paper border border-archive-border p-6 mb-8 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>主题名称 *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="例如：玩家组织·黎明骑士团" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>主题标识 Slug *</label>
            <input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5-]/g, '-'))} placeholder="knights" className={inputCls} />
          </div>
        </div>
<div>
          <label className={labelCls}>宣言 / 座右铭（可选，会显示在条目页头）</label>
          <input value={slogan} onChange={e => setSlogan(e.target.value)} placeholder="例如：守护记忆，以正视听" className={inputCls} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>主色（信息栏边框/强调色）</label>
            <div className="flex items-center gap-2">
              <input type="color" value={accent} onChange={e => setAccent(e.target.value)} className="w-12 h-10 border border-archive-border bg-archive-paper cursor-pointer" />
              <input value={accent} onChange={e => setAccent(e.target.value)} placeholder="#RRGGBB" className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>纸张底色（可选）</label>
            <div className="flex items-center gap-2">
              <input type="color" value={bg} onChange={e => setBg(e.target.value)} className="w-12 h-10 border border-archive-border bg-archive-paper cursor-pointer" />
              <input value={bg} onChange={e => setBg(e.target.value)} placeholder="#RRGGBB" className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>信息栏风格</label>
            <select value={style} onChange={e => setStyle(e.target.value)} className={inputCls}>
              {STYLE_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>实时预览（版式效果）</label>
          <div className="bg-archive-paper border border-archive-border p-6">
            <div style={{ background: bg }}>
              <div className="px-6 py-5 text-center" style={style === 'scp' ? { background: accent } : undefined}>
                <p className="font-serif text-2xl tracking-widest" style={{ color: style === 'scp' ? '#f5f2ea' : accent }}>{name || '示例主题'}</p>
                {slogan && (
                  <p className="mt-2 text-xs italic tracking-[0.2em]" style={{ color: style === 'scp' ? '#f5f2ea' : accent }}>
                    「{slogan}」
                  </p>
                )}
              </div>
              <div className="px-6 pb-6">
                <div className="border" style={{ borderColor: accent, borderWidth: style === 'classic' ? 3 : 1 }}>
                  {[
                    ['所属分级', '示例分级'],
                    ['撰稿人', '佚名记录者'],
                    ['收录时间', '2026.08.11'],
                  ].map(([k, v], i) => (
                    <div key={k} className={`flex items-center text-sm ${i < 2 ? 'border-b border-archive-border' : ''}`}>
                      <div className="w-24 shrink-0 px-3 py-2 tracking-widest" style={{ background: `${accent}14`, color: accent }}>{k}</div>
                      <div className="px-3 py-2">{v}</div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-sm text-archive-text leading-relaxed">
                  正文将以该底纸与主色呈现。这是一段示例正文，用于预览版式在条目详情中的实际观感。
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={onCreate} disabled={busy}
            className="px-6 py-3 bg-archive-text text-archive-paper text-sm tracking-widest hover:bg-archive-accent transition-colors disabled:opacity-50 shrink-0">
            {busy ? '处理中…' : '创建版式'}
          </button>
          <div className="text-sm">
            {error && <p className="text-archive-accent">{error}</p>}
            {notice && <p className="text-emerald-700">{notice}</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {list.map(t => (
          <div key={t.id} className="border p-5 bg-archive-paper flex flex-col" style={{ borderColor: t.accent }}>
            <p className="font-serif text-lg text-archive-text">{t.name} <span className="text-xs text-archive-muted tracking-widest">/ {t.slug}</span></p>
            {t.slogan && <p className="mt-1 text-xs italic tracking-widest" style={{ color: t.accent }}>「{t.slogan}」</p>}
            <div className="mt-3 space-y-1.5 text-xs tracking-widest text-archive-muted">
              <div className="flex items-center gap-2"><span className="w-4 h-4 border" style={{ background: t.accent }}></span>主色 {t.accent}</div>
              <div className="flex items-center gap-2"><span className="w-4 h-4 border" style={{ background: t.bg }}></span>底纸 {t.bg}</div>
              <p>风格：{STYLE_OPTIONS.find(s => s.value === t.style)?.label ?? t.style}</p>
            </div>
            <button onClick={() => onDelete(t.id, t.name)} disabled={busy}
              className="mt-4 self-start text-xs tracking-widest text-archive-accent border border-archive-accent/40 px-3 py-1 hover:bg-archive-accent hover:text-archive-paper transition-colors disabled:opacity-50">
              删除
            </button>
          </div>
        ))}
        {list.length === 0 && <p className="text-sm text-archive-muted">还没有版式主题，可先创建。</p>}
      </div>
    </section>
  );
}