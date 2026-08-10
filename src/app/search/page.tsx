'use client';
import { useState } from 'react';
import Breadcrumb from '@/components/Breadcrumb';
import { nations } from '@/data/nations';
import { people } from '@/data/people';
import { events } from '@/data/events';
import Link from 'next/link';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const results = [...nations, ...people, ...events].filter(item => {
    if (!query) return false;
    const q = query.toLowerCase();
    return ('name' in item && item.name.toLowerCase().includes(q)) || ('title' in item && item.title.toLowerCase().includes(q));
  });

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 fade-in">
      <Breadcrumb items={[{ label: '检索' }]} />
      <h1 className="font-serif text-4xl mb-8 text-archive-text">全站检索</h1>
      <input type="text" placeholder="输入关键字搜索国家、人物、事件..." className="w-full p-4 border border-archive-border bg-archive-paper outline-none focus:border-archive-accent transition-colors text-sm tracking-widest mb-12 shadow-sm" value={query} onChange={e => setQuery(e.target.value)} />
      {query && (
        <div className="space-y-4">
          <p className="text-xs tracking-widest text-archive-muted mb-4">搜索结果 ({results.length})</p>
          {results.length === 0 ? <div className="py-12 text-center text-archive-muted border border-archive-border bg-archive-paper tracking-widest text-sm">暂无匹配记录</div> : results.map((item: any) => {
              const isNation = 'status' in item && 'alignment' in item;
              const isPerson = 'role' in item;
              const type = isNation ? 'nations' : isPerson ? 'people' : 'events';
              const typeName = isNation ? '国家' : isPerson ? '人物' : '事件';
              return (
                <Link href={isNation ? `/${type}/${item.id}` : `/${type}`} key={item.id} className="block bg-archive-paper border border-archive-border p-6 hover:border-archive-accent transition-colors">
                  <p className="text-xs text-archive-accent tracking-widest mb-1 uppercase">{typeName}</p>
                  <h3 className="font-serif text-xl">{item.name || item.title}</h3>
                </Link>
              );
            })}
        </div>
      )}
    </div>
  );
}
