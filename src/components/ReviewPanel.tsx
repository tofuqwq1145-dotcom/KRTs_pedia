'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Markdown from '@/components/Markdown';

interface ReviewItem {
  id: string;
  title: string;
  type: string;
  body: string;
  author_name: string;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
  review_note: string;
  typeLabel: string;
}

const statusStyle: Record<ReviewItem['status'], string> = {
  pending: 'text-amber-700 bg-amber-50 border-amber-300',
  approved: 'text-emerald-700 bg-emerald-50 border-emerald-300',
  rejected: 'text-archive-accent bg-red-50 border-red-200',
};
const statusText: Record<ReviewItem['status'], string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
};

export default function ReviewPanel({ items }: { items: ReviewItem[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const allOpen = items.length > 0 && items.every(i => open[i.id]);

  function toggleAll() {
    const next: Record<string, boolean> = {};
    for (const i of items) next[i.id] = !allOpen;
    setOpen(next);
  }

  function toggle(id: string) {
    setOpen(prev => ({ ...prev, [id]: !prev[id] }));
  }

  async function act(id: string, action: 'approve' | 'reject') {
    setBusy(id);
    const res = await fetch('/api/admin/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action, note: notes[id] ?? '' }),
    });
    const json = await res.json();
    if (!res.ok) alert(json.error || '操作失败');
    setBusy(null);
    router.refresh();
  }

  if (items.length === 0) {
    return (
      <div className="py-16 text-center border border-archive-border bg-archive-paper">
        <p className="font-serif text-xl text-archive-muted">暂无投稿</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={toggleAll}
          className="px-4 py-2 text-xs tracking-widest border border-archive-border text-archive-muted hover:border-archive-accent transition-colors">
          {allOpen ? '全部折叠' : '全部展开'}
        </button>
      </div>

      <div className="space-y-4">
        {items.map((item) => {
          const isOpen = !!open[item.id];
          return (
            <article key={item.id} className="bg-archive-paper border border-archive-border">
              <button
                onClick={() => toggle(item.id)}
                className="w-full text-left px-6 py-4 flex items-center justify-between gap-4 hover:bg-archive-bg/40 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-xs text-archive-accent tracking-widest mb-1 uppercase truncate">
                    {item.typeLabel} <span className="text-archive-muted normal-case">/ {item.author_name} / {new Date(item.created_at).toLocaleDateString('zh-CN')}</span>
                  </p>
                  <h2 className="font-serif text-lg text-archive-text truncate">{item.title}</h2>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`px-3 py-1 text-xs tracking-widest border ${statusStyle[item.status]}`}>{statusText[item.status]}</span>
                  <span className="text-xs tracking-widest text-archive-muted">{isOpen ? '收起 ▲' : '展开 ▼'}</span>
                </div>
              </button>

              {isOpen && (
                <div className="px-6 pt-2 pb-0 border-t border-archive-border">
                  <div className="pt-6">
                    <Markdown content={item.body} />
                  </div>
                </div>
              )}

              <div className="px-6 py-4 border-t border-archive-border bg-archive-bg/50">
                <div className="flex items-end gap-4 flex-wrap">
                  <input
                    type="text"
                    value={notes[item.id] ?? ''}
                    onChange={e => setNotes({ ...notes, [item.id]: e.target.value })}
                    placeholder={item.status === 'rejected' ? (item.review_note || '驳回理由（会展示给作者）') : '审核备注（可选）'}
                    className="flex-1 min-w-[240px] p-3 border border-archive-border bg-archive-paper outline-none focus:border-archive-accent transition-colors text-sm tracking-widest"
                  />
                  {item.status !== 'approved' && (
                    <button
                      onClick={() => act(item.id, 'approve')}
                      disabled={busy === item.id}
                      className="px-6 py-3 bg-emerald-700 text-white text-sm tracking-widest hover:bg-emerald-800 transition-colors disabled:opacity-50"
                    >
                      通过
                    </button>
                  )}
                  {item.status !== 'rejected' && (
                    <button
                      onClick={() => act(item.id, 'reject')}
                      disabled={busy === item.id}
                      className="px-6 py-3 border border-archive-accent text-archive-accent text-sm tracking-widest hover:bg-archive-accent hover:text-archive-paper transition-colors disabled:opacity-50"
                    >
                      驳回
                    </button>
                  )}
                </div>
                {item.review_note && item.status === 'rejected' && (
                  <p className="mt-3 text-xs text-archive-accent tracking-widest">已填驳回理由：{item.review_note}</p>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}