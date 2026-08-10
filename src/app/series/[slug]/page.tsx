import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSeriesBySlug, listPagesBySeries, TYPE_LABELS } from '@/lib/pages';
import { fmtDate } from '@/lib/pages';
import Breadcrumb from '@/components/Breadcrumb';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const series = await getSeriesBySlug(params.slug);
  return {
    title: series ? `${series.name} | KRTPedia` : '分级 | KRTPedia',
  } satisfies Metadata;
}

export default async function SeriesDetail({ params }: { params: { slug: string } }) {
  const series = await getSeriesBySlug(params.slug);
  if (!series) notFound();
  const pages = await listPagesBySeries(series.id);

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 fade-in">
      <Breadcrumb items={[{ label: '分级目录', path: '/series' }, { label: series.name }]} />
      <h1 className="font-serif text-4xl mb-3 text-archive-text border-b border-archive-border pb-6">{series.name}</h1>
      <p className="text-sm tracking-widest text-archive-muted mb-10">{series.description || '暂无描述'} · 共 {pages.length} 条档案</p>

      <div className="space-y-4">
        {pages.map(p => (
          <Link key={p.slug} href={`/pages/${p.slug}`} className="group block">
            <div className="bg-archive-paper border border-archive-border p-6 hover:border-archive-accent transition-colors">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-archive-accent tracking-widest mb-2">
                    {TYPE_LABELS[p.type]} · 收录于 {fmtDate(p.created_at)}
                  </p>
                  <h2 className="font-serif text-xl text-archive-text group-hover:text-archive-accent transition-colors">{p.title}</h2>
                </div>
                <span className="text-xs tracking-widest text-archive-accent shrink-0">阅读 →</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {pages.length === 0 && (
        <div className="py-16 text-center border border-archive-border bg-archive-paper">
          <p className="font-serif text-xl text-archive-muted">该分级下还没有档案</p>
        </div>
      )}
    </div>
  );
}