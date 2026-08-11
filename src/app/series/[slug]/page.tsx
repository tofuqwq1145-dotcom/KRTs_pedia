import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSeriesBySlug, getSeriesAncestors, getSeriesChildren, listPagesBySeries, getThemeById } from '@/lib/pages';
import Breadcrumb from '@/components/Breadcrumb';
import ArchiveList from '@/components/ArchiveList';
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
  const [ancestors, children, pages, theme] = await Promise.all([
    getSeriesAncestors(series),
    getSeriesChildren(series.id),
    listPagesBySeries(series.id),
    getThemeById(series.theme_id),
  ]);

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 fade-in">
      <Breadcrumb items={[...ancestors.map(a => ({ label: a.name, path: `/series/${a.slug}` })), { label: series.name }]} />
      <h1 className="font-serif text-4xl mb-3 text-archive-text border-b border-archive-border pb-6">{series.name}</h1>
      <p className="text-sm tracking-widest text-archive-muted mb-10">
        {series.description || '暂无描述'} · 共 {pages.length} 条档案
        {theme && <span className="ml-3 text-xs border border-archive-border px-3 py-1">版式：{theme.name}</span>}
      </p>

      {children.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          {children.map(c => (
            <Link key={c.id} href={`/series/${c.slug}`} className="group">
              <div className="bg-archive-paper border border-archive-border p-6 h-full hover:border-archive-accent transition-colors">
                <h2 className="font-serif text-xl text-archive-text group-hover:text-archive-accent transition-colors">{c.name}</h2>
                <p className="text-sm text-archive-muted mt-2 line-clamp-2">{c.description || '暂无描述'}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {pages.length > 0 ? (
        <ArchiveList items={pages} />
      ) : (
        <div className="py-16 text-center border border-archive-border bg-archive-paper">
          <p className="font-serif text-xl text-archive-muted">该分级下还没有档案</p>
        </div>
      )}
    </div>
  );
}