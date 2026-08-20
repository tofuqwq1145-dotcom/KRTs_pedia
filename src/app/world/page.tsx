import type { Metadata } from 'next';
import WorldMap from '@/components/WorldMap';
import { NATION_ALIASES } from '@/data/nationAliases';
import { listPages } from '@/lib/pages';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: '世界地图 | KRTPedia' };

export default async function WorldPage() {
  const all = await listPages();
  const counts: Record<string, number> = {};
  for (const nationId of Object.keys(NATION_ALIASES)) {
    const aliases = NATION_ALIASES[nationId];
    counts[nationId] = all.filter(p =>
      aliases.some(a => p.title.includes(a) || p.excerpt.includes(a))
    ).length;
  }
  return <WorldMap counts={counts} />;
}