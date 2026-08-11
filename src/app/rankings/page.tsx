import { createClient } from '@/lib/supabase/server';
import { supabaseConfigured } from '@/lib/supabase/server';
import Link from 'next/link';
import Breadcrumb from '@/components/Breadcrumb';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: '排行榜 | KRTPedia' };
export const dynamic = 'force-dynamic';

function Stars({ n }: { n: number }) {
  const filled = Math.round(n);
  return <span className="tracking-[0.15em] text-archive-accent">{"★".repeat(filled)}<span className="text-archive-border">{"★".repeat(5 - filled)}</span></span>;
}

function List({ title, rows }: { title: string; rows: { slug: string; title: string; avg: number; count: number }[] }) {
  return (
    <section>
      <h2 className="font-serif text-2xl mb-6 text-archive-text border-b border-archive-border pb-4">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-archive-muted tracking-widest">暂无数据，等第一篇被评分的档案出现吧。</p>
      ) : (
        <ol className="space-y-2">
          {rows.map((r, i) => (
            <li key={r.slug}>
              <Link href={`/pages/${r.slug}`} className="group flex items-center gap-4 bg-archive-paper border border-archive-border px-5 py-3 hover:border-archive-accent transition-colors">
                <span className="w-8 shrink-0 text-center font-serif text-lg text-archive-accent">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-archive-text truncate group-hover:text-archive-accent transition-colors">{r.title}</p>
                  <p className="text-[11px] text-archive-muted tracking-widest">/ {r.slug}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Stars n={r.avg} />
                  <span className="text-sm font-serif text-archive-text w-9 text-right">{r.avg.toFixed(1)}</span>
                  <span className="text-xs text-archive-muted tracking-widest w-14 text-right">{r.count} 人评分</span>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default async function RankingsPage() {
  let rows: { slug: string; title: string; avg: number; count: number }[] = [];
  if (supabaseConfigured()) {
    const supabase = createClient();
    const { data } = await supabase
      .from('ratings')
      .select('page_id, value, pages(slug, title)');

    const map = new Map<string, { slug: string; title: string; sum: number; count: number }>();
    for (const r of (data ?? []) as unknown as { page_id: string; value: number; pages: { slug: string; title: string } | null }[]) {
      if (!r.pages) continue;
      const cur = map.get(r.page_id);
      if (cur) {
        cur.sum += r.value;
        cur.count += 1;
      } else {
        map.set(r.page_id, { slug: r.pages.slug, title: r.pages.title, sum: r.value, count: 1 });
      }
    }
    rows = Array.from(map.values()).map(x => ({ slug: x.slug, title: x.title, avg: x.sum / x.count, count: x.count }));
  }

  const top = rows.filter(r => r.avg >= 3).sort((a, b) => b.avg - a.avg || b.count - a.count).slice(0, 20);
  const worst = rows.filter(r => r.avg < 3).sort((a, b) => a.avg - b.avg || b.count - a.count).slice(0, 20);

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 fade-in">
      <Breadcrumb items={[{ label: '排行榜' }]} />
      <h1 className="font-serif text-4xl mb-4 text-archive-text border-b border-archive-border pb-6">排行榜</h1>
      <p className="text-sm tracking-widest text-archive-muted mb-10">依据读者评分（每账号一票）统计：最受欢迎的文档（均分 ≥3），与差评最多的文档（均分 &lt;3）。</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <List title="最受欢迎的文档" rows={top} />
        <List title="差评最多的文档" rows={worst} />
      </div>
    </div>
  );
}