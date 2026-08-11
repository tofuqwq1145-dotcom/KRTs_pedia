import { getPageBySlug, getSeriesName, fmtDate, resolveThemeForPage } from '@/lib/pages';
import { notFound } from 'next/navigation';
import Breadcrumb from '@/components/Breadcrumb';
import Markdown from '@/components/Markdown';
import { TYPE_LABELS, TYPE_ROUTES } from '@/lib/pages';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const page = await getPageBySlug(params.slug);
  if (!page) return {};
  return {
    title: page.title,
    description: page.body.slice(0, 120),
  } satisfies Metadata;
}

export default async function PageDetail({ params }: { params: { slug: string } }) {
  const page = await getPageBySlug(params.slug);
  if (!page) notFound();
  const seriesName = await getSeriesName(page.series_id);
  const tags = page.tags ?? [];
  const theme = await resolveThemeForPage(page);
  const accent = theme?.accent ?? '#8a5a2b';

  const infoRows = [
    { label: '分类', value: `${TYPE_LABELS[page.type] ?? page.type}（${TYPE_ROUTES[page.type] ? '列表页可见' : '自由档案'}）` },
    ...(seriesName ? [{ label: '所属分级', value: seriesName }] : []),
    { label: '撰稿人', value: page.author_name || '佚名' },
    { label: '收录时间', value: fmtDate(page.created_at) },
  ];

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 fade-in">
      <Breadcrumb items={[{ label: TYPE_LABELS[page.type], path: TYPE_ROUTES[page.type] }, { label: page.title }]} />
      <div className="bg-archive-paper border border-archive-border">
        <div className="p-8 md:p-12 pb-0">
          <div className="text-center mb-8">
            <p className="text-xs text-archive-accent tracking-[0.25em] uppercase mb-3">
              {seriesName ? `${seriesName} · ` : ''}档案编号 {page.slug}
            </p>
            <h1 className="font-serif text-4xl md:text-5xl text-archive-text mb-4">{page.title}</h1>
            <p className="text-xs text-archive-muted tracking-widest">
              撰稿人：{page.author_name} ／ 收录于 {fmtDate(page.created_at)}
            </p>
            {theme?.slogan && (
              <p className="mt-4 mx-auto max-w-xl italic text-sm tracking-[0.2em]" style={{ color: accent, borderTop: `1px solid ${accent}55`, borderBottom: `1px solid ${accent}55`, padding: '0.75rem 0' }}>
                「{theme.slogan}」
              </p>
            )}
          </div>

          <div className="border mb-8" style={{ borderColor: accent }}>
            {infoRows.map((row, i) => (
              <div key={row.label} className={`flex items-center text-sm ${i !== infoRows.length - 1 ? 'border-b border-archive-border' : ''}`}>
                <div className="w-32 shrink-0 px-4 py-3 text-archive-muted tracking-widest" style={{ background: `${accent}14` }}>{row.label}</div>
                <div className="px-4 py-3 text-archive-text">{row.value}</div>
              </div>
            ))}
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {tags.map(t => (
                <span key={t} className="px-3 py-1 border text-xs tracking-widest" style={{ borderColor: `${accent}66`, color: accent }}># {t}</span>
              ))}
            </div>
          )}

          {page.cover_url && (
            <div className="mb-8 aspect-[21/9] overflow-hidden border border-archive-border">
              <img src={page.cover_url} alt={page.title} className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        <div className="px-8 md:px-12 pb-10">
          <Markdown content={page.body} />
        </div>
      </div>
    </div>
  );
}