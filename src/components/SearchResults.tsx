'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { TYPE_LABELS } from '@/lib/labels';
import type { PageSummary } from '@/data/types';

export default function SearchResults({ items }: { items: PageSummary[] }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return items.filter(item =>
      item.title.toLowerCase().includes(q) || item.excerpt.toLowerCase().includes(q)
    );
  }, [items, query]);

  return (
    <>
      <input
        type="text"
        placeholder="输入关键字搜索国家、人物、事件..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="w-full p-4 border border-archive-border bg-archive-paper outline-none focus:border-archive-accent transition-colors text-sm tracking-widest mb-12 shadow-sm"
      />
      {query && (
        <div className="space-y-4">
          <p className="text-xs tracking-widest text-archive-muted mb-4">搜索结果 ({filtered.length})</p>
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-archive-muted border border-archive-border bg-archive-paper tracking-widest text-sm">暂无匹配记录</div>
          ) : (
            filtered.map(item => (
              <Link href={`/pages/${item.slug}`} key={item.slug} className="block bg-archive-paper border border-archive-border p-6 hover:border-archive-accent transition-colors">
                <p className="text-xs text-archive-accent tracking-widest mb-1 uppercase">{TYPE_LABELS[item.type]}</p>
                <h3 className="font-serif text-xl">{item.title}</h3>
              </Link>
            ))
          )}
        </div>
      )}
    </>
  );
}