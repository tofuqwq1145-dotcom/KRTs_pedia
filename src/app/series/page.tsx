import Link from 'next/link';
import { listSeries } from '@/lib/pages';
import Breadcrumb from '@/components/Breadcrumb';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: '分级目录 | KRTPedia' };

export default async function SeriesIndex() {
  const series = await listSeries();

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 fade-in">
      <Breadcrumb items={[{ label: '分级目录' }]} />
      <h1 className="font-serif text-4xl mb-4 text-archive-text border-b border-archive-border pb-6">分级目录</h1>
      <p className="text-sm tracking-widest text-archive-muted mb-10">站主按内容主题划分的档案系列。点击进入对应分级的条目列表。</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {series.map(s => (
          <Link key={s.id} href={`/series/${s.slug}`} className="group">
            <div className="bg-archive-paper border border-archive-border p-8 hover:border-archive-accent transition-colors">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-serif text-2xl text-archive-text group-hover:text-archive-accent transition-colors">{s.name}</h2>
                <span className="text-xs tracking-widest text-archive-accent">进入 →</span>
              </div>
              <p className="text-sm text-archive-muted leading-relaxed">{s.description || '暂无描述'}</p>
            </div>
          </Link>
        ))}
      </div>

      {series.length === 0 && (
        <div className="py-16 text-center border border-archive-border bg-archive-paper">
          <p className="font-serif text-xl text-archive-muted">暂无分级，可由站主在审核面板创建</p>
        </div>
      )}
    </div>
  );
}