'use client';

import type { CSSProperties } from 'react';
import Markdown from '@/components/Markdown';
import { fontFamily, headerBackground, animationClass } from '@/data/themes';
import { TYPE_LABELS, TYPE_ROUTES, fmtDate } from '@/lib/labels';
import { isLight, themeCssVars } from '@/lib/themeUi';
import type { Theme } from '@/data/types';

export interface PageDocProps {
  theme: Theme | null;
  title: string;
  slug: string;
  type: string;
  body: string;
  tags?: string[];
  coverUrl?: string;
  seriesName?: string;
  authorName?: string;
  createdAt?: string;
  extraInfo?: { label: string; value: string }[];
}

export default function PageDoc(props: PageDocProps) {
  const { theme } = props;
  const accent = theme?.accent ?? '#8a5a2b';
  const grad = theme ? headerBackground(theme) : undefined;
  const banner = grad ?? accent;
  const bodyFont = fontFamily(theme?.body_font);

  const lightBg = theme ? isLight(theme.bg || '') : false;
  const bannerLight = theme ? isLight(theme.header_from || theme.accent) : false;
  const bannerTitleColor = theme?.title_color || (bannerLight ? '#111827' : '#ffffff');
  const autoBodyColor = lightBg && (!theme?.body_color || isLight(theme.body_color))
    ? '#111827'
    : (theme?.body_color || undefined);

  const tags = props.tags ?? [];
  const infoRows = [
    { label: '分类', value: `${TYPE_LABELS[props.type as keyof typeof TYPE_LABELS] ?? props.type}（${TYPE_ROUTES[props.type as keyof typeof TYPE_ROUTES] ? '列表页可见' : '自由档案'}）` },
    ...(props.seriesName ? [{ label: '所属分级', value: props.seriesName }] : []),
    ...(theme ? [{ label: '版式', value: theme.name }] : []),
    ...(props.extraInfo ?? []),
    { label: '撰稿人', value: props.authorName || '佚名' },
    { label: '收录时间', value: props.createdAt ? fmtDate(props.createdAt) : '—' },
  ];

  return (
    <div
      className="bg-archive-paper border border-archive-border"
      style={{ ...(themeCssVars(theme) as CSSProperties), background: theme?.bg || undefined }}
    >
      <div className={`px-8 md:px-12 pt-10 text-center ${animationClass(theme?.header_animation)}`} style={{ background: banner }}>
        {theme?.logo_url && <img src={theme.logo_url} alt="" className="mx-auto mb-3 h-16 w-auto object-contain" />}
        <p className={`text-xs tracking-[0.25em] uppercase mb-3 ${bannerLight ? 'text-black/70' : 'text-white/80'}`}>
          {props.seriesName ? `${props.seriesName} · ` : ''}档案编号 {props.slug}
        </p>
        <h1 className="font-serif text-4xl md:text-5xl mb-4" style={{ fontFamily: fontFamily(theme?.title_font), color: bannerTitleColor }}>
          {props.title}
        </h1>
        <p className={`text-xs tracking-widest ${bannerLight ? 'text-black/70' : 'text-white/80'}`}>
          撰稿人：{props.authorName || '佚名'} ／ 收录于 {props.createdAt ? fmtDate(props.createdAt) : '—'}
        </p>
        {theme?.slogan && (
          <p className={`mt-4 mx-auto max-w-xl italic text-sm tracking-[0.2em] py-3 border-t border-b ${bannerLight ? 'text-black/80 border-black/40' : 'text-white/90 border-white/30'}`}>
            「{theme.slogan}」
          </p>
        )}
      </div>

      <div className="p-8 md:p-12 pt-8" style={{ color: autoBodyColor, fontFamily: bodyFont }}>
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

        {props.coverUrl && (
          <div className="mb-8 aspect-[21/9] overflow-hidden border border-archive-border">
            <img src={props.coverUrl} alt={props.title} className="w-full h-full object-cover" />
          </div>
        )}

        <Markdown content={props.body} />
      </div>
    </div>
  );
}