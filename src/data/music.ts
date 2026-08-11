export const PLAYLIST_OPTIONS: { key: string; label: string }[] = [
  { key: 'home', label: '首页 · 安眠曲' },
  { key: 'war', label: '战争 · 战火' },
  { key: 'nation', label: '国家 · 列国风云' },
  { key: 'person', label: '人物 · 列传' },
  { key: 'event', label: '事件 · 回响' },
  { key: 'building', label: '建筑 · 余晖' },
  { key: 'chronicle', label: '编年史' },
  { key: 'series', label: '分级档案' },
  { key: 'themes', label: '版式主题' },
  { key: 'rank', label: '排行榜' },
  { key: 'chat', label: '聊天室' },
  { key: 'guide', label: '写作指导' },
  { key: 'about', label: '关于本站' },
  { key: 'thanks', label: '致谢 · 归途' },
  { key: 'search', label: '检索' },
  { key: 'account', label: '我的账号' },
  { key: 'submit', label: '投稿' },
];

const SECTION_PLAYLIST: [prefix: string, key: string][] = [
  ['/wars', 'war'],
  ['/nations', 'nation'],
  ['/people', 'person'],
  ['/events', 'event'],
  ['/buildings', 'building'],
  ['/chronicle', 'chronicle'],
  ['/series', 'series'],
  ['/themes', 'themes'],
  ['/rankings', 'rank'],
  ['/chat', 'chat'],
  ['/guide', 'guide'],
  ['/about', 'about'],
  ['/thanks', 'thanks'],
  ['/search', 'search'],
  ['/account', 'account'],
  ['/submit', 'submit'],
  ['/auth', 'home'],
];

export function playlistForPath(path: string): string {
  if (!path || path === '/' || path.startsWith('/pages/') || path.startsWith('/admin')) return 'home';
  for (const [prefix, key] of SECTION_PLAYLIST) {
    if (path.startsWith(prefix)) return key;
  }
  return 'home';
}

export function playlistLabel(key: string): string {
  return PLAYLIST_OPTIONS.find(p => p.key === key)?.label ?? key;
}