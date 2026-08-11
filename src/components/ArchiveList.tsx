import Link from 'next/link';
import type { PageSummary } from '@/data/types';
import { fmtDate, TYPE_LABELS } from '@/lib/pages';

export const categoryTitle: Record<string, string> = {
  nation: '国家档案 (Nations)',
  person: '人物档案 (Figures)',
  event: '历史事件 (Events)',
  war: '战争与冲突 (Wars)',
  building: '建筑档案 (Buildings)',
  chronicle: 'KRT 编年史 (Chronicle)',
  article: '档案检索 (Search)',
};

function cardClass(type: string) {
  switch (type) {
    case 'person': return 'bg-archive-paper border border-archive-border p-6 hover:border-archive-accent transition-colors';
    case 'chronicle': return 'bg-archive-paper border border-archive-border p-8 hover:border-archive-accent transition-colors shadow-sm';
    default: return 'bg-archive-paper border border-archive-border p-8 hover:shadow-xl transition-all relative overflow-hidden';
  }
}

export default function ArchiveList({ items, layout }: { items: PageSummary[]; layout?: 'grid' | 'list' | 'timeline' }) {
  if (items.length === 0) {
    return (
      <div className="py-24 text-center border border-archive-border bg-archive-paper">
        <p className="font-serif text-2xl text-archive-muted mb-2">暂无记录</p>
        <p className="text-sm text-archive-muted tracking-widest">当前资料库中尚未收录相关档案。</p>
      </div>
    );
  }

  const mode = layout ?? 'grid';

  if (mode === 'list') {
    return (
      <div className="space-y-8">
        {items.map(item => (
          <Link href={`/pages/${item.slug}`} key={item.slug} className="block bg-archive-paper border border-archive-border p-8 hover:border-archive-accent transition-colors">
            <div className="flex justify-between items-start mb-4 border-b border-archive-border pb-4">
              <p className="text-xs text-archive-accent tracking-widest font-bold">{fmtDate(item.created_at)}</p>
            </div>
            <h3 className="font-serif text-2xl mb-4 text-archive-text">{item.title}</h3>
            <p className="text-sm text-archive-text leading-relaxed mb-6 line-clamp-3">{item.excerpt}</p>
            <p className="text-xs text-archive-muted tracking-widest">撰稿人：{item.author_name}</p>
          </Link>
        ))}
      </div>
    );
  }

  if (mode === 'timeline') {
    return (
      <div className="relative border-l border-archive-border ml-[5px] md:ml-4 space-y-16">
        {items.map(item => (
          <Link key={item.slug} href={`/pages/${item.slug}`} className="relative pl-8 md:pl-12 block group">
            <span className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-archive-bg border-2 border-archive-accent"></span>
            <div className="text-archive-accent text-sm tracking-[0.2em] mb-2 font-bold">{fmtDate(item.created_at)}</div>
            <h3 className="font-serif text-2xl mb-4 text-archive-text group-hover:text-archive-accent transition-colors">{item.title}</h3>
            <div className={cardClass(item.type)}>
              <p className="text-sm text-archive-text leading-loose line-clamp-4">{item.excerpt}</p>
              <p className="mt-4 text-xs text-archive-muted tracking-widest">撰稿人：{item.author_name}</p>
            </div>
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {items.map(item => (
        <Link href={`/pages/${item.slug}`} key={item.slug} className="group bg-archive-paper border border-archive-border hover:border-archive-accent hover:shadow-xl transition-all overflow-hidden flex flex-col">
          <div className="aspect-[16/9] overflow-hidden bg-archive-text/90 relative">
            {item.cover_url ? (
              <img src={item.cover_url} alt={item.title} loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="font-serif text-xl tracking-[0.3em] text-archive-paper/80">{TYPE_LABELS[item.type] ?? item.type}</span>
              </div>
            )}
          </div>
          <div className="p-6 flex flex-col flex-1">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs text-archive-accent tracking-widest uppercase">
                {item.type !== 'person' ? fmtDate(item.created_at) : TYPE_LABELS[item.type]}
              </span>
              {item.tags && item.tags.length > 0 && (
                <span className="text-xs text-archive-muted truncate"># {item.tags[0]}</span>
              )}
            </div>
            <h2 className="font-serif text-xl mb-3 text-archive-text group-hover:text-archive-accent transition-colors leading-snug">{item.title}</h2>
            <p className="text-sm text-archive-text leading-relaxed line-clamp-3 mb-4">{item.excerpt}</p>
            <p className="mt-auto text-xs text-archive-muted tracking-widest">撰稿人：{item.author_name}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}