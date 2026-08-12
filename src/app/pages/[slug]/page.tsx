import { getPageBySlug, getSeriesName, resolveThemeForPage } from '@/lib/pages';
import { notFound } from 'next/navigation';
import Breadcrumb from '@/components/Breadcrumb';
import PageDoc from '@/components/PageDoc';
import RatingBox from '@/components/RatingBox';
import Discussion from '@/components/Discussion';
import { themeCssText } from '@/lib/themeUi';
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
  const theme = await resolveThemeForPage(page);

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 fade-in"
      style={theme?.bg_image ? { backgroundImage: `url(${theme.bg_image})`, backgroundSize: 'cover', backgroundAttachment: 'fixed', backgroundPosition: 'center' } : undefined}>
      {theme && (
        <style>{`:root { ${themeCssText(theme)} }`}</style>
      )}
      <Breadcrumb items={[{ label: TYPE_LABELS[page.type], path: TYPE_ROUTES[page.type] }, { label: page.title }]} />
      <PageDoc
        theme={theme}
        title={page.title}
        slug={page.slug}
        type={page.type}
        body={page.body}
        tags={page.tags ?? []}
        coverUrl={page.cover_url}
        seriesName={seriesName ?? undefined}
        authorName={page.author_name}
        createdAt={page.created_at}
      />
      <div className="mt-8">
        <RatingBox pageId={page.id} slug={page.slug} />
        <Discussion pageId={page.id} slug={page.slug} />
      </div>
    </div>
  );
}