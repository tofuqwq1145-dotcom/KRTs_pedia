'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Notice { id: string; title: string; body: string; is_active: boolean; created_at: string }

export default function Announcements() {
  const [list, setList] = useState<Notice[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function load(supabase: any) {
    const { data } = await supabase.from('announcements').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: false });
    if (data) setList(data as Notice[]);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      await load(supabase);
      if (cancelled) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
        setIsAdmin(!!profile?.is_admin);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  function beginAdd() { setEditId(null); setTitle(''); setBody(''); setEditing(true); setError(''); }

  function beginEdit(n: Notice) { setEditId(n.id); setTitle(n.title); setBody(n.body); setEditing(true); setError(''); }

  async function save() {
    setError('');
    if (!title.trim()) return setError('请填写公告标题。');
    setBusy(true);
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      if (editId) {
        const { error: err } = await supabase.from('announcements').update({ title: title.trim(), body: body.trim(), updated_at: new Date().toISOString() }).eq('id', editId);
        if (err) throw new Error(err.message);
      } else {
        const { error: err } = await supabase.from('announcements').insert({ title: title.trim(), body: body.trim(), sort_order: list.length + 1 });
        if (err) throw new Error(err.message);
      }
      await load(supabase);
      setEditing(false);
    } catch (e: any) {
      setError(e.message || '保存失败。');
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(n: Notice) {
    const supabase = createClient();
    await supabase.from('announcements').update({ is_active: !n.is_active, updated_at: new Date().toISOString() }).eq('id', n.id);
    load(supabase);
  }

  async function remove(n: Notice) {
    if (!window.confirm(`确定删除公告「${n.title}」？`)) return;
    const supabase = createClient();
    await supabase.from('announcements').delete().eq('id', n.id);
    load(supabase);
  }

  const active = list.filter(n => n.is_active);

  return (
    <div className="border border-archive-border bg-archive-paper h-full flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-archive-border">
        <h2 className="font-serif text-xl text-archive-text tracking-widest">公告栏</h2>
        {isAdmin && !editing && (
          <button onClick={beginAdd} className="text-xs tracking-widest text-archive-accent border border-archive-accent/40 px-3 py-1 hover:bg-archive-accent hover:text-archive-paper transition-colors">+ 新增</button>
        )}
      </div>

      {editing && isAdmin && (
        <div className="px-6 py-4 border-b border-archive-border space-y-3 bg-archive-bg/40">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="公告标题，例如：XX 写作大赛开始！"
            className="w-full p-3 border border-archive-border bg-archive-paper outline-none focus:border-archive-accent transition-colors text-sm tracking-widest" />
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={3} placeholder="公告内容（支持换行）"
            className="w-full p-3 border border-archive-border bg-archive-paper outline-none focus:border-archive-accent transition-colors text-sm tracking-widest resize-y" />
          {error && <p className="text-xs text-archive-accent">{error}</p>}
          <div className="flex gap-3">
            <button onClick={save} disabled={busy}
              className="px-4 py-2 bg-archive-text text-archive-paper text-xs tracking-widest hover:bg-archive-accent transition-colors disabled:opacity-50">
              {busy ? '保存中…' : '保存'}
            </button>
            <button onClick={() => setEditing(false)}
              className="px-4 py-2 border border-archive-border text-xs tracking-widest text-archive-muted hover:border-archive-text transition-colors">取消</button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[520px]">
        {active.length === 0 && <p className="text-sm text-archive-muted tracking-widest">暂无公告。</p>}
        {active.map(n => (
          <div key={n.id} className="border-l-2 pl-4" style={{ borderColor: '#8a5a2b' }}>
            <p className="font-serif text-base text-archive-text mb-1">{n.title}</p>
            {n.body && <p className="text-sm text-archive-muted leading-relaxed whitespace-pre-wrap">{n.body}</p>}
            <p className="text-[10px] text-archive-muted tracking-widest mt-2">{new Date(n.created_at).toLocaleDateString('zh-CN')}</p>
            {isAdmin && (
              <div className="flex items-center gap-3 mt-2">
                <button onClick={() => beginEdit(n)} className="text-[11px] tracking-widest text-archive-accent hover:underline">编辑</button>
                <button onClick={() => toggleActive(n)} className="text-[11px] tracking-widest text-archive-muted hover:text-archive-accent">{n.is_active ? '隐藏' : '显示'}</button>
                <button onClick={() => remove(n)} className="text-[11px] tracking-widest text-[#b91c1c] hover:underline">删除</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}