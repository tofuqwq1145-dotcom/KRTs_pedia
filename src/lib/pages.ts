import { createClient } from '@/lib/supabase/server';
import { supabaseConfigured } from '@/lib/supabase/server';
import { nations } from '@/data/nations';
import { people } from '@/data/people';
import { events } from '@/data/events';
import { wars } from '@/data/wars';
import { buildings } from '@/data/buildings';
import { chronicle } from '@/data/chronicle';
import type { PageType, PageSummary, WikiPage, Series, Theme } from '@/data/types';
import { TYPE_LABELS } from '@/lib/labels';

export { TYPE_LABELS, TYPE_ROUTES, fmtDate } from '@/lib/labels';

function excerptOf(body: string, max = 120): string {
  const text = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? text.slice(0, max) + '…' : text;
}

export function coverOf(body: string): string {
  const markdown = /!\[[^\]]*\]\(([^)]+)\)/.exec(body);
  if (markdown) return markdown[1];
  const html = /<img[^>]+src=["']([^"']+)["']/i.exec(body);
  return html ? html[1] : '';
}

function pagesToSummaries(rows: WikiPage[]): PageSummary[] {
  return rows
    .filter(r => r.status === 'approved')
    .map(r => ({
      slug: r.slug,
      title: r.title,
      type: r.type,
      status: r.status,
      author_name: r.author_name,
      created_at: r.created_at,
      excerpt: excerptOf(r.body),
      cover_url: r.cover_url || coverOf(r.body) || undefined,
      tags: r.tags ?? [],
      series_id: r.series_id ?? null,
      theme_id: r.theme_id ?? null,
    }));
}

type StaticEntry = PageSummary & { body: string };

let staticCache: StaticEntry[] | null = null;

function nationMd(n: (typeof nations)[number]): string {
  return `## 基本信息\n\n- **存在时间**：${n.time}\n- **状态**：${n.status}\n- **国家定位**：${n.alignment}\n\n## 外交与战史\n\n- **外交关系**：友好 ${n.diplomacy.friendly} / 敌对 ${n.diplomacy.hostile} / 中立 ${n.diplomacy.neutral}\n- **战争总数**：${n.warStats.wars}\n- **胜负记录**：胜 ${n.warStats.wins} / 败 ${n.warStats.losses}\n`;
}

function personMd(p: (typeof people)[number]): string {
  return `## 基本信息\n\n- **别名**：${p.aliases.length ? p.aliases.join('、') : '暂无资料'}\n- **所属国家**：${p.nationId}\n- **身份**：${p.role}\n- **状态**：${p.status}\n- **分类**：${p.category}\n\n${p.motto && p.motto !== '暂无资料' ? `> ${p.motto}\n` : ''}`;
}

function eventMd(e: (typeof events)[number]): string {
  return `## 事件信息\n\n- **时间**：${e.date}\n- **类型**：${e.type}\n- **发生地点**：${e.location}\n- **状态**：${e.status}\n- **参与国家**：${e.relatedNations.join('、')}\n\n## 事件经过\n\n${e.description}\n`;
}

function staticSummaries(): StaticEntry[] {
  if (staticCache) return staticCache;
  const items: StaticEntry[] = [
    ...nations.map(n => ({ slug: n.id, title: n.name, type: 'nation' as PageType, status: 'approved' as const, author_name: '站主', created_at: '2026-08-05T00:00:00Z', excerpt: `国家定位：${n.alignment} · 状态：${n.status}`, body: nationMd(n) })),
    ...people.map(p => ({ slug: p.id, title: p.name, type: 'person' as PageType, status: 'approved' as const, author_name: '站主', created_at: '2026-08-05T00:00:00Z', excerpt: `${p.role} · 所属：${p.nationId}`, body: personMd(p) })),
    ...events.map(e => ({ slug: e.id, title: e.title, type: 'event' as PageType, status: 'approved' as const, author_name: '站主', created_at: e.date.replaceAll('.', '-'), excerpt: e.description, body: eventMd(e) })),
    ...chronicle.map(c => ({ slug: c.id, title: c.title, type: 'chronicle' as PageType, status: 'approved' as const, author_name: '站主', created_at: c.date === '暂无资料' ? '2026-08-06T00:00:00Z' : c.date.replaceAll('.', '-'), excerpt: c.description, body: c.description })),
    ...wars.map(w => ({ slug: w.id, title: w.name, type: 'war' as PageType, status: 'approved' as const, author_name: '站主', created_at: '2026-08-05T00:00:00Z', excerpt: '战争记录（待补充）', body: `## 战争记录\n\n该条目的战争经过仍在整理中。` })),
    ...buildings.map(b => ({ slug: b.id, title: b.name, type: 'building' as PageType, status: 'approved' as const, author_name: '站主', created_at: '2026-08-05T00:00:00Z', excerpt: '建筑档案（待补充）', body: `## 建筑档案\n\n该建筑的资料仍在整理中。` })),
  ];
  staticCache = items;
  return items;
}

export async function listPages(type?: PageType): Promise<PageSummary[]> {
  if (!supabaseConfigured()) return type ? staticSummaries().filter(p => p.type === type) : staticSummaries();

  try {
    const supabase = createClient();
    let query = supabase.from('pages').select('*').eq('status', 'approved');
    if (type) query = query.eq('type', type);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return pagesToSummaries((data ?? []) as WikiPage[]);
  } catch (err) {
    console.error('listPages fallback → static:', err);
    return type ? staticSummaries().filter(p => p.type === type) : staticSummaries();
  }
}

export async function getPageBySlug(slug: string): Promise<WikiPage | null> {
  if (supabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'approved')
        .maybeSingle();
      if (!error && data) return data as WikiPage;
    } catch (err) {
      console.error('getPageBySlug error:', err);
    }
  }

  const found = staticSummaries().find(p => p.slug === slug);
  if (!found) return null;
  return {
    id: `static-${slug}`,
    slug: found.slug,
    title: found.title,
    type: found.type,
    body: found.body,
    status: 'approved',
    author_id: 'static',
    author_name: found.author_name,
    review_note: '',
    reviewed_by: null,
    reviewed_at: null,
    created_at: found.created_at,
    updated_at: found.created_at,
  };
}

export async function getLatestPages(limit = 4): Promise<PageSummary[]> {
  const all = await listPages('event');
  return all.slice(0, limit);
}

export async function listSeries(): Promise<Series[]> {
  if (!supabaseConfigured()) return [];
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('series')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return (data ?? []) as Series[];
  } catch (err) {
    console.error('listSeries error:', err);
    return [];
  }
}

export async function getSeriesBySlug(slug: string): Promise<Series | null> {
  const all = await listSeries();
  return all.find(s => s.slug === slug) ?? null;
}

export async function getSeriesName(id: string | null | undefined): Promise<string | null> {
  if (!id) return null;
  const all = await listSeries();
  return all.find(s => s.id === id)?.name ?? null;
}

export async function listPagesBySeries(seriesId: string): Promise<PageSummary[]> {
  if (!supabaseConfigured()) return [];
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('pages')
      .select('*')
      .eq('series_id', seriesId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return pagesToSummaries((data ?? []) as WikiPage[]);
  } catch (err) {
    console.error('listPagesBySeries error:', err);
    return [];
  }
}

export async function getSeriesChildren(parentId: string): Promise<Series[]> {
  const all = await listSeries();
  return all.filter(s => s.parent_id === parentId);
}

export async function getSeriesAncestors(series: Series): Promise<Series[]> {
  const all = await listSeries();
  const byId = new Map(all.map(s => [s.id, s]));
  const chain: Series[] = [];
  let cur = byId.get(series.parent_id ?? '');
  let guard = 0;
  while (cur && guard < 20) {
    chain.unshift(cur);
    cur = byId.get(cur.parent_id ?? '');
    guard++;
  }
  return chain;
}

export async function listPagesByAuthor(authorId: string): Promise<PageSummary[]> {
  if (!supabaseConfigured()) return [];
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('pages')
      .select('*')
      .eq('author_id', authorId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return pagesToSummaries((data ?? []) as WikiPage[]);
  } catch (err) {
    console.error('listPagesByAuthor error:', err);
    return [];
  }
}

export async function listThemes(): Promise<Theme[]> {
  if (!supabaseConfigured()) return [];
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('themes')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []) as Theme[];
  } catch (err) {
    console.error('listThemes error:', err);
    return [];
  }
}

export async function getThemeById(id: string | null | undefined): Promise<Theme | null> {
  if (!id) return null;
  const all = await listThemes();
  return all.find(t => t.id === id) ?? null;
}

export async function resolveThemeForPage(page: Pick<WikiPage, 'theme_id' | 'series_id'>): Promise<Theme | null> {
  const pageTheme = await getThemeById(page.theme_id);
  if (pageTheme) return pageTheme;
  if (page.series_id) {
    const all = await listSeries();
    const series = all.find(s => s.id === page.series_id);
    if (series?.theme_id) return getThemeById(series.theme_id);
  }
  return null;
}

export async function getStats() {
  if (supabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from('pages').select('type, status');
      if (!error) {
        const byType = (data ?? []).filter(p => p.status === 'approved').reduce<Record<string, number>>((acc, p) => {
          acc[p.type] = (acc[p.type] ?? 0) + 1;
          return acc;
        }, {});
        return {
          nation: byType.nation ?? 0,
          person: byType.person ?? 0,
          event: byType.event ?? 0,
          war: byType.war ?? 0,
          building: byType.building ?? 0,
          chronicle: byType.chronicle ?? 0,
        };
      }
    } catch (err) {
      console.error('getStats error:', err);
    }
  }
  const s = staticSummaries();
  return {
    nation: s.filter(p => p.type === 'nation').length,
    person: s.filter(p => p.type === 'person').length,
    event: s.filter(p => p.type === 'event').length,
    war: s.filter(p => p.type === 'war').length,
    building: s.filter(p => p.type === 'building').length,
    chronicle: s.filter(p => p.type === 'chronicle').length,
  };
}