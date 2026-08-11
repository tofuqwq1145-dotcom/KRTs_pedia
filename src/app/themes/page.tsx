import Link from 'next/link';
import { listThemes } from '@/lib/pages';
import { fontFamily, headerBackground, animationClass } from '@/data/themes';
import Breadcrumb from '@/components/Breadcrumb';
import type { Theme } from '@/data/types';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: '版式主题 | KRTPedia' };
export const dynamic = 'force-dynamic';

function ThemeCard({ t }: { t: Theme }) {
  const grad = headerBackground(t);
  const label = t.style === 'scp' ? 'SCP 式深色' : t.style === 'classic' ? '复古羊皮纸' : '现代档案馆';
  return (
    <div className="bg-archive-paper border border-archive-border overflow-hidden flex flex-col">
      <div className={`px-6 py-10 text-center ${animationClass(t.header_animation)}`}
        style={grad ? { background: grad } : { background: t.accent }}>
        {t.logo_url && <img src={t.logo_url} alt="" className="mx-auto mb-3 h-14 w-auto object-contain" />}
        <p className="font-serif text-2xl tracking-widest text-white" style={{ fontFamily: fontFamily(t.title_font) }}>{t.name}</p>
        {t.slogan && <p className="mt-2 text-xs italic tracking-[0.2em] text-white/90">「{t.slogan}」</p>}
      </div>
      <div className="p-6 flex-1 flex flex-col" style={{ background: t.bg, color: t.body_color || undefined, fontFamily: fontFamily(t.body_font) }}>
        <p className="text-xs tracking-widest text-archive-muted break-all">/ {t.slug}</p>
        <div className="mt-4 border" style={{ borderColor: t.accent, borderWidth: t.style === 'classic' ? 3 : 1 }}>
          {[['所属分级', '示例分级'], ['撰稿人', '佚名记录者']].map(([k, v], i, arr) => (
            <div key={k} className={`flex items-center text-sm ${i !== arr.length - 1 ? 'border-b border-archive-border' : ''}`}>
              <div className="w-20 shrink-0 px-3 py-2 tracking-widest" style={{ background: `${t.accent}14`, color: t.accent }}>{k}</div>
              <div className="px-3 py-2">{v}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs tracking-widest text-archive-muted">
          <span className="border border-archive-border px-3 py-1">{label}</span>
          {t.header_style !== 'none' && <span className="border border-archive-border px-3 py-1">头图渐变</span>}
          {t.title_font !== 'default' && <span className="border border-archive-border px-3 py-1">标题{fontFamily(t.title_font) ? '自定义字体' : ''}</span>}
        </div>
      </div>
    </div>
  );
}

export default async function ThemesIndex() {
  const themes = await listThemes();
  const approved = themes.filter(t => t.status === 'approved');

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 fade-in">
      <Breadcrumb items={[{ label: '版式主题' }]} />
      <div className="flex items-end justify-between gap-4 mb-10 border-b border-archive-border pb-6">
        <div>
          <h1 className="font-serif text-4xl mb-4 text-archive-text">版式主题</h1>
          <p className="text-sm tracking-widest text-archive-muted">每位 KRT 记录者都能设计自己的版式 —— 通过审核后，投稿时即可选用。</p>
        </div>
        <Link href="/themes/new" className="shrink-0 px-5 py-3 bg-archive-text text-archive-paper text-sm tracking-widest hover:bg-archive-accent transition-colors">
          提交我的版式 →
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {approved.map(t => <ThemeCard key={t.id} t={t} />)}
      </div>

      {approved.length === 0 && (
        <div className="py-16 text-center border border-archive-border bg-archive-paper">
          <p className="font-serif text-xl text-archive-muted">还没有已通过的版式，等待站主审核后展示于此</p>
        </div>
      )}
    </div>
  );
}