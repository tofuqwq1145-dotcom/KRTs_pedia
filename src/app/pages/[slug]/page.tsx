import { getPageBySlug, getSeriesName, fmtDate, resolveThemeForPage } from '@/lib/pages';
import { notFound } from 'next/navigation';
import Breadcrumb from '@/components/Breadcrumb';
import Markdown from '@/components/Markdown';
import RatingBox from '@/components/RatingBox';
import Discussion from '@/components/Discussion';
import { fontFamily, headerBackground, animationClass } from '@/data/themes';
import { TYPE_LABELS, TYPE_ROUTES } from '@/lib/pages';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

function rgbTrip(hex: string): string {
  let h = (hex || '').replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  if (isNaN(n) || h.length !== 6) return '8 11 15';
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

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
  const grad = theme ? headerBackground(theme) : undefined;
  const banner = grad ?? accent;
  const bodyFont = fontFamily(theme?.body_font);

  const infoRows = [
    { label: '分类', value: `${TYPE_LABELS[page.type] ?? page.type}（${TYPE_ROUTES[page.type] ? '列表页可见' : '自由档案'}）` },
    ...(seriesName ? [{ label: '所属分级', value: seriesName }] : []),
    ...(theme ? [{ label: '版式', value: theme.name }] : []),
    { label: '撰稿人', value: page.author_name || '佚名' },
    { label: '收录时间', value: fmtDate(page.created_at) },
  ];

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 fade-in"
      style={theme?.bg_image ? { backgroundImage: `url(${theme.bg_image})`, backgroundSize: 'cover', backgroundAttachment: 'fixed', backgroundPosition: 'center' } : undefined}>
      {theme && (
        <style>{`:root {
          --archive-accent: ${rgbTrip(theme.accent || '#7FB8E4')};
          --archive-bg: ${rgbTrip(theme.bg || '#080B0F')};
          --archive-paper: ${rgbTrip(theme.bg || '#10151B')};
          --archive-text: ${rgbTrip(theme.body_color || '#E7EDF4')};
        }`}</style>
      )}
      <Breadcrumb items={[{ label: TYPE_LABELS[page.type], path: TYPE_ROUTES[page.type] }, { label: page.title }]} />
      <div className="bg-archive-paper border border-archive-border" style={theme?.bg ? { background: theme.bg } : undefined}>
        <div className={`px-8 md:px-12 pt-10 text-center ${animationClass(theme?.header_animation)}`} style={{ background: banner }}>
          {theme?.logo_url && <img src={theme.logo_url} alt="" className="mx-auto mb-3 h-16 w-auto object-contain" />}
          <p className="text-xs tracking-[0.25em] uppercase mb-3 text-white/80">
            {seriesName ? `${seriesName} · ` : ''}档案编号 {page.slug}
          </p>
          <h1 className="font-serif text-4xl md:text-5xl text-white mb-4" style={{ fontFamily: fontFamily(theme?.title_font) }}>
            {page.title}
          </h1>
          <p className="text-xs tracking-widest text-white/80">
            撰稿人：{page.author_name} ／ 收录于 {fmtDate(page.created_at)}
          </p>
          {theme?.slogan && (
            <p className="mt-4 mx-auto max-w-xl italic text-sm tracking-[0.2em] text-white/90 border-t border-b border-white/30 py-3">
              「{theme.slogan}」
            </p>
          )}
        </div>

        <div className="p-8 md:p-12 pt-8" style={{ color: theme?.body_color || undefined, fontFamily: bodyFont }}>
          <div className="border mb-8" style={{ borderColor: accent, borderWidth: theme?.style === 'classic' ? 3 : 1 }}>
            {infoRows.map((row, i) => (
              <div key={row.label} className={`flex items-center text-sm ${i !== infoRows.length - 1 ? 'border-b border-archive-border' : ''}`}>
                <div className="w-32 shrink-0 px-4 py-3 text-archive-muted tracking-widest" style={{ background: `${accent}14`, color: accent }}>{row.label}</div>
                <div className="px-4 py-3">{row.value}</div>
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

          <Markdown content={page.body} />

          <RatingBox pageId={page.id} slug={page.slug} />

          <Discussion pageId={page.id} slug={page.slug} />
        </div>
      </div>
    </div>
  );
}