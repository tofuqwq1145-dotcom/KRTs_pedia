export type MascotMood = 'home' | 'explore' | 'war' | 'rank' | 'write' | 'chat';

export interface MascotDef {
  label: string;
  bgA: string;
  bgB: string;
  hair: string;
  dress: string;
  overlay: 'none' | 'bars' | 'embers' | 'bubble' | 'pen';
}

export const MASCOTS: Record<MascotMood, MascotDef> = {
  home:    { label: '安眠 · 摇曳', bgA: '#8a5a2b', bgB: '#c99a5b', hair: '#4a3a28', dress: '#f0e6d2', overlay: 'none' },
  explore: { label: '探索 · 漂浮', bgA: '#7a6a50', bgB: '#b3a688', hair: '#3f3a30', dress: '#efe7d8', overlay: 'none' },
  war:     { label: '战火 · 余烬', bgA: '#6e1f23', bgB: '#a5443a', hair: '#2e2520', dress: '#5c2b2b', overlay: 'embers' },
  rank:    { label: '排行 · 攀升', bgA: '#8a6f1f', bgB: '#caa94f', hair: '#4a3a28', dress: '#f2e5c0', overlay: 'bars' },
  write:   { label: '落笔 · 著史', bgA: '#3f7a5f', bgB: '#7fb49a', hair: '#2e4036', dress: '#e9f1ea', overlay: 'pen' },
  chat:    { label: '闲聊 · 挥袖', bgA: '#4e6e8f', bgB: '#87a5c4', hair: '#33445c', dress: '#e8eef5', overlay: 'bubble' },
};

const SECTION_MOOD: [string, MascotMood][] = [
  ['/wars', 'war'],
  ['/rankings', 'rank'],
  ['/submit', 'write'],
  ['/guide', 'write'],
  ['/chat', 'chat'],
];

export function mascotForPath(path: string): MascotMood {
  if (!path || path === '/') return 'home';
  for (const [prefix, mood] of SECTION_MOOD) {
    if (path.startsWith(prefix)) return mood;
  }
  return 'explore';
}

export const STICKER_MOODS: { mood: MascotMood; label: string }[] = [
  { mood: 'home', label: '安眠' },
  { mood: 'chat', label: '闲聊' },
  { mood: 'war', label: '战火' },
  { mood: 'rank', label: '排行' },
  { mood: 'write', label: '著史' },
  { mood: 'explore', label: '探索' },
];

export function isMascotMood(v: string): v is MascotMood {
  return v in MASCOTS;
}