'use client';

import { useState } from 'react';

export interface AdminUser {
  id: string;
  display_name: string | null;
  title: string | null;
  is_admin: boolean | null;
  created_at: string | null;
  last_seen: string | null;
}

const ONLINE_WINDOW = 5 * 60 * 1000;

function fmtTime(iso: string | null): string {
  if (!iso) return '从未在线';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '从未在线';
  return d.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function UserManager({ users: initial }: { users: AdminUser[] }) {
  const [users, setUsers] = useState<AdminUser[]>(initial);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  async function onSaveTitle(id: string) {
    setError('');
    setNotice('');
    setBusyId(id);
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const title = (drafts[id] ?? '').trim();
      const { error: err } = await supabase.from('profiles').update({ title }).eq('id', id);
      if (err) throw new Error(err.message);
      setUsers(prev => prev.map(u => (u.id === id ? { ...u, title } : u)));
      setNotice('称号已保存。');
    } catch (e: any) {
      setError(e.message || '保存失败。');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="mt-16">
      <h2 className="font-serif text-2xl mb-2 text-archive-text border-b border-archive-border pb-4">用户管理 · 称号授予</h2>
      <p className="text-xs tracking-widest text-archive-muted mb-6">授予/修改用户称号，称号会展示在聊天室与讨论区。在线 = 最近 5 分钟内有活动。</p>

      <div className="overflow-x-auto border border-archive-border bg-archive-paper">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-archive-border text-[11px] tracking-[0.2em] uppercase text-archive-muted">
              <th className="px-4 py-3 font-normal">用户</th>
              <th className="px-4 py-3 font-normal">称号</th>
              <th className="px-4 py-3 font-normal">在线状态</th>
              <th className="px-4 py-3 font-normal">注册时间</th>
              <th className="px-4 py-3 font-normal">权限</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const online = u.last_seen && Date.now() - new Date(u.last_seen).getTime() < ONLINE_WINDOW;
              return (
                <tr key={u.id} className="border-b border-archive-border last:border-0 align-middle">
                  <td className="px-4 py-3 tracking-widest">{u.display_name || '（未设置昵称）'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <input
                        value={drafts[u.id] ?? u.title ?? ''}
                        onChange={e => setDrafts(d => ({ ...d, [u.id]: e.target.value }))}
                        placeholder="授予称号…"
                        maxLength={30}
                        className="w-36 px-2 py-1.5 border border-archive-border bg-archive-bg/40 outline-none focus:border-archive-accent transition-colors text-sm"
                      />
                      <button
                        onClick={() => onSaveTitle(u.id)}
                        disabled={busyId === u.id}
                        className="px-3 py-1.5 bg-archive-text text-archive-paper text-xs tracking-widest hover:bg-archive-accent transition-colors disabled:opacity-50"
                      >
                        {busyId === u.id ? '保存…' : '保存'}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs tracking-widest ${online ? 'text-emerald-700' : 'text-archive-muted'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-600' : 'bg-archive-border'}`} />
                      {online ? '在线' : fmtTime(u.last_seen)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs tracking-widest text-archive-muted">{u.created_at ? new Date(u.created_at).toLocaleDateString('zh-CN') : '—'}</td>
                  <td className="px-4 py-3 text-xs tracking-widest">{u.is_admin ? <span className="text-archive-accent">站主</span> : <span className="text-archive-muted">成员</span>}</td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-archive-muted tracking-widest">暂无注册用户</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-sm">
        {error && <p className="text-archive-accent">{error}</p>}
        {notice && <p className="text-emerald-700">{notice}</p>}
      </div>
    </section>
  );
}
