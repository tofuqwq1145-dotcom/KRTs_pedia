import { getPageBySlug, fmtDate } from '@/lib/pages';
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

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 fade-in">
      <Breadcrumb items={[{ label: TYPE_LABELS[page.type], path: TYPE_ROUTES[page.type] }, { label: page.title }]} />
      <div className="bg-archive-paper border border-archive-border p-8 md:p-12">
        <div className="border-b border-archive-border pb-8 mb-8 text-center">
          <p className="text-xs text-archive-muted tracking-[0.25em] uppercase mb-3">
            {TYPE_LABELS[page.type]} · 档案编号 {page.slug}
          </p>
          <h1 className="font-serif text-4xl md:text-5xl text-archive-text mb-4">{page.title}</h1>
          <p className="text-xs text-archive-muted tracking-widest">
            撰稿人：{page.author_name} ／ 收录于 {fmtDate(page.created_at)}
          </p>
        </div>
        <Markdown content={page.body} />
      </div>
    </div>
  );
}