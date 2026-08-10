'use client';

import Link from 'next/link';

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
    <div className="space-y-4">
      {pages.map(p => (
        <div key={p.id} className="bg-archive-paper border border-archive-border p-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-archive-accent tracking-widest mb-2">{p.typeLabel}</p>
            <h3 className="font-serif text-lg text-archive-text">{p.title}</h3>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <span className={`px-3 py-1 text-xs tracking-widest border ${statusStyle[p.status]}`}>{statusText[p.status]}</span>
            {p.status === 'pending' && (
              <Link href={`/submit?edit=${p.id}`} className="text-sm tracking-widest text-archive-accent hover:underline">修改</Link>
            )}
            {p.status === 'rejected' && (
              <Link href={`/submit?edit=${p.id}`} className="text-sm tracking-widest text-archive-accent hover:underline">重新编辑</Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}