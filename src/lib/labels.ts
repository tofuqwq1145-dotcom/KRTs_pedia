import type { PageType } from '@/data/types';

export const TYPE_LABELS: Record<PageType, string> = {
  nation: '国家',
  person: '人物',
  event: '事件',
  war: '战争',
  building: '建筑',
  chronicle: '编年史',
  article: '档案',
};

export const TYPE_ROUTES: Record<PageType, string> = {
  nation: '/nations',
  person: '/people',
  event: '/events',
  war: '/wars',
  building: '/buildings',
  chronicle: '/chronicle',
  article: '/search',
};

// 把 '2026.8.6' / '2026-08-06T...' / '暂无资料' 统一成站点展示格式
export function fmtDate(iso: string): string {
  if (!iso || iso === '暂无资料') return '暂无资料';
  const m = iso.match(/^(\d{4})\.?(\d{1,2})\.?(\d{1,2})/);
  if (m) return `${m[1]}.${Number(m[2])}.${Number(m[3])}`;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
}