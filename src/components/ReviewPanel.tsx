'use client';

import { useMemo, useState } from 'react';
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
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<ReviewItem | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i =>
      i.title.toLowerCase().includes(q) ||
      i.author_name.toLowerCase().includes(q) ||
      i.typeLabel.toLowerCase().includes(q),
    );
  }, [items, query]);

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
    setSelected(null);
    router.refresh();
  }

  async function onDelete(item: ReviewItem) {
    if (!window.confirm(`确定永久删除「${item.title}」？该操作不可恢复。`)) return;
    setBusy(item.id);
    const res = await fetch(`/api/pages/${item.id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok) alert(json.error || '删除失败');
    setBusy(null);
    setSelected(null);
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
      <div className="flex items-center gap-4 mb-6">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={`检索标题 / 作者 / 分类（共 ${items.length} 条）`}
          className="flex-1 p-3 border border-archive-border bg-archive-paper outline-none focus:border-archive-accent transition-colors text-sm tracking-widest"
        />
        <span className="text-xs tracking-widest text-archive-muted shrink-0">显示 {filtered.length} 条</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-10 gap-2">
        {filtered.map(item => (
          <button
            key={item.id}
            onClick={() => setSelected(item)}
            className="text-left bg-archive-paper border border-archive-border px-3 py-3 flex flex-col gap-1.5 hover:border-archive-accent transition-colors min-w-0"
            title="点击查看详情并审核"
          >
            <span className={`self-start px-2 py-0.5 text-[10px] tracking-widest border whitespace-nowrap ${statusStyle[item.status]}`}>{statusText[item.status]}</span>
            <p className="font-serif text-sm text-archive-text truncate">{item.title}</p>
            <p className="text-[10px] text-archive-muted tracking-widest truncate">{item.typeLabel} / {item.author_name}</p>
            <p className="text-[10px] text-archive-muted tracking-widest">{new Date(item.created_at).toLocaleDateString('zh-CN')}</p>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-16 text-center text-sm text-archive-muted tracking-widest">没有匹配「{query}」的投稿</p>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6" onClick={() => setSelected(null)}>
          <div className="bg-archive-paper border border-archive-border max-w-3xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-archive-border">
              <div className="min-w-0">
                <p className="text-xs text-archive-accent tracking-widest mb-1 uppercase truncate">
                  {selected.typeLabel} <span className="text-archive-muted normal-case">/ {selected.author_name} / {new Date(selected.created_at).toLocaleString('zh-CN')}</span>
                </p>
                <h2 className="font-serif text-xl text-archive-text truncate">{selected.title}</h2>
              </div>
              <button onClick={() => setSelected(null)} className="shrink-0 text-sm tracking-widest text-archive-muted hover:text-archive-accent">关闭 ✕</button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 border-b border-archive-border">
              <Markdown content={selected.body} />
            </div>

            <div className="px-6 py-4 bg-archive-bg/50">
              <div className="flex items-end gap-4 flex-wrap">
                <input
                  type="text"
                  value={notes[selected.id] ?? ''}
                  onChange={e => setNotes({ ...notes, [selected.id]: e.target.value })}
                  placeholder={selected.status === 'rejected' ? (selected.review_note || '驳回理由（会展示给作者）') : '审核备注（可选）'}
                  className="flex-1 min-w-[220px] p-3 border border-archive-border bg-archive-paper outline-none focus:border-archive-accent transition-colors text-sm tracking-widest"
                />
                {selected.status !== 'approved' && (
                  <button
                    onClick={() => act(selected.id, 'approve')}
                    disabled={busy === selected.id}
                    className="px-6 py-3 bg-emerald-700 text-white text-sm tracking-widest hover:bg-emerald-800 transition-colors disabled:opacity-50"
                  >
                    通过
                  </button>
                )}
                {selected.status !== 'rejected' && (
                  <button
                    onClick={() => act(selected.id, 'reject')}
                    disabled={busy === selected.id}
                    className="px-6 py-3 border border-archive-accent text-archive-accent text-sm tracking-widest hover:bg-archive-accent hover:text-archive-paper transition-colors disabled:opacity-50"
                  >
                    驳回
                  </button>
                )}
                <button
                  onClick={() => onDelete(selected)}
                  disabled={busy === selected.id}
                  className="px-6 py-3 bg-[#b91c1c] text-white text-sm tracking-widest hover:bg-[#8f1414] transition-colors disabled:opacity-50"
                >
                  删除
                </button>
              </div>
              {selected.review_note && selected.status === 'rejected' && (
                <p className="mt-3 text-xs text-archive-accent tracking-widest">已填驳回理由：{selected.review_note}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}