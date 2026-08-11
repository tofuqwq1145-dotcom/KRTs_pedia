export const FONT_OPTIONS = [
  { key: 'default', label: '默认字体', font: '' },
  { key: 'serif', label: '衬线（宋体）', font: '"Iowan Old Style", Georgia, "Songti SC", "SimSun", serif' },
  { key: 'sans', label: '非衬线（黑体）', font: '-apple-system, "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif' },
  { key: 'kai', label: '楷体', font: '"Kaiti SC", "STKaiti", "KaiTi", cursive' },
  { key: 'mono', label: '等宽', font: '"SF Mono", "Consolas", "Courier New", monospace' },
];

const FONT_MAP: Record<string, string> = Object.fromEntries(FONT_OPTIONS.map(f => [f.key, f.font]));

export function fontFamily(value?: string | null): string {
  return (value && FONT_MAP[value]) || '';
}

export function headerBackground(t: { header_style?: string; header_from?: string; header_to?: string }): string | undefined {
  switch (t.header_style) {
    case 'linear':
      return `linear-gradient(180deg, ${t.header_from || '#1a1a1a'}, ${t.header_to || '#3a3a3a'})`;
    case 'linear-diag':
      return `linear-gradient(135deg, ${t.header_from || '#1a1a1a'}, ${t.header_to || '#3a3a3a'})`;
    case 'radial':
      return `radial-gradient(circle at 50% 30%, ${t.header_from || '#1a1a1a'}, ${t.header_to || '#3a3a3a'})`;
    default:
      return undefined;
  }
}

export function animationClass(value?: string | null): string {
  switch (value) {
    case 'float': return 'theme-float';
    case 'pulse': return 'theme-pulse';
    case 'glow': return 'theme-glow';
    case 'scan': return 'theme-scan';
    case 'grid': return 'theme-grid';
    case 'ripple': return 'theme-ripple';
    default: return '';
  }
}