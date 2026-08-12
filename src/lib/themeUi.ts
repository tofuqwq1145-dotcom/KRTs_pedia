import type { Theme } from '@/data/types';

export function hexRgb(hex: string): [number, number, number] | null {
  let h = (hex || '').replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  if (isNaN(n) || h.length !== 6) return null;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbTrip(hex: string): string {
  const c = hexRgb(hex);
  return c ? `${c[0]} ${c[1]} ${c[2]}` : '8 11 15';
}

export function isLight(hex: string): boolean {
  const c = hexRgb(hex);
  if (!c) return false;
  return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) > 180;
}

export function themeCssVars(theme: Theme | null): Record<string, string> {
  if (!theme) return {};
  const light = isLight(theme.bg || '');
  return {
    '--archive-accent': rgbTrip(theme.accent || '#7FB8E4'),
    '--archive-bg': rgbTrip(theme.bg || '#080B0F'),
    '--archive-paper': rgbTrip(theme.bg || '#10151B'),
    '--archive-text': rgbTrip(light ? '#111827' : theme.body_color || '#E7EDF4'),
    ...(light ? { '--archive-muted': '75 85 99', '--archive-border': '148 155 165' } : {}),
  };
}

export function themeCssText(theme: Theme | null): string {
  return Object.entries(themeCssVars(theme)).map(([k, v]) => `${k}: ${v};`).join(' ');
}