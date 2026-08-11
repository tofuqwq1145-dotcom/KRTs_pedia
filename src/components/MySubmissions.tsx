'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Submission {
  id: string;
  slug: string;
  title: string;
  type: string;
  status: 'pending' | 'approved' | 'rejected';
  updated_at: string;
  typeLabel: string;
}

const statusStyle: Record<Submission['status'], string> = {
  pending: 'text-amber-700 bg-amber-50 border-amber-300',
  approved: 'text-emerald-700 bg-emerald-50 border-emerald-300',
  rejected: 'text-archive-accent bg-red-50 border-red-200',
};
const statusText: Record<Submission['status'], string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
};

export default function MySubmissions({ pages }: { pages: Submission[] }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Submission['status']>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  async function onDelete(p: Submission) {
    if (!window.confirm(`确定永久删除「${p.title}」？该操作不可恢复。`)) return;
    setBusyId(p.id);
    const res = await fetch(`/api/pages/${p.id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok) alert(json.error || '删除失败');
    setBusyId(null);
    router.refresh();
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pages.filter(p => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (!q) return true;
      return p.title.toLowerCase().includes(q) || p.typeLabel.includes(query.trim());
    });
  }, [pages, query, statusFilter]);

  if (pages.length === 0) {
    return (
      <div className="py-16 text-center border border-archive-border bg-archive-paper">
        <p className="font-serif text-xl text-archive-muted mb-2">还没有投稿</p>
        <p className="text-sm text-archive-muted tracking-widest mb-6">成为档案馆的第一位撰稿人吧。</p>
        <Link href="/submit" className="px-6 py-3 bg-archive-text text-archive-paper text-sm tracking-widest hover:bg-archive-accent transition-colors">撰写第一篇</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="搜索标题 / 关键词…"
          className="flex-1 p-3 border border-archive-border bg-archive-paper outline-none focus:border-archive-accent transition-colors text-sm tracking-widest"
        />
        <div className="flex gap-2">
          {(['all', 'pending', 'approved', 'rejected'] as const).map(k => (
            <button key={k}
              onClick={() => setStatusFilter(k)}
              className={`px-4 py-2 text-xs tracking-widest border transition-colors ${statusFilter === k ? 'bg-archive-text text-archive-paper border-archive-text' : 'border-archive-border text-archive-muted hover:border-archive-accent'}`}>
              {k === 'all' ? '全部' : statusText[k]}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs tracking-widest text-archive-muted mb-4">共 {filtered.length} 条</p>

      {filtered.length === 0 ? (
        <div className="py-12 text-center border border-archive-border bg-archive-paper">
          <p className="font-serif text-xl text-archive-muted">没有匹配的记录</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(p => (
            <div key={p.id} className="bg-archive-paper border border-archive-border p-5 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2 py-0.5 text-xs tracking-widest border ${statusStyle[p.status]}`}>{statusText[p.status]}</span>
                <span className="text-xs text-archive-accent tracking-widest">{p.typeLabel}</span>
              </div>
              <h3 className="font-serif text-lg text-archive-text mb-4">{p.title}</h3>
              <div className="mt-auto flex gap-3">
                {p.status === 'approved' && <Link href={`/pages/${p.slug}`} className="text-sm tracking-widest text-archive-muted hover:text-archive-accent">查看</Link>}
                <Link href={`/submit?edit=${p.id}`} className="text-sm tracking-widest text-archive-accent hover:underline">
                  {p.status === 'approved' ? '编辑' : p.status === 'rejected' ? '重新编辑' : '修改'}
                </Link>
                <button onClick={() => onDelete(p)} disabled={busyId === p.id}
                  className="text-sm tracking-widest text-[#b91c1c] hover:underline disabled:opacity-50">
                  {busyId === p.id ? '删除…' : '删除'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}