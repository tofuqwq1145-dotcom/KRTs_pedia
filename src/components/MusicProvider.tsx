'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { usePathname } from 'next/navigation';
import { PLAYLIST_OPTIONS, playlistForPath, playlistLabel } from '@/data/music';
import { mascotForPath } from '@/data/mascot';
import SiteMascot from '@/components/SiteMascot';
import Markdown from '@/components/Markdown';
import { downloadAudio, isAudioCached, cachedAudioObjectUrl, isAudioCacheSupported } from '@/lib/audioCache';

interface Song { id: string; title: string; artist: string; url: string; playlist: string; unlock_type?: string; unlock_goal?: number }

interface QueueItem { title: string; artist: string; url: string }

const WRITE_EXAMPLES: { title: string; md: string }[] = [
  { title: '标题', md: '## 章节标题\n\n### 小节标题\n\n#### 更小标题' },
  { title: '强调', md: '**加粗文字**、*斜体文字*、~~删除线~~ 与 `行内代码`。' },
  { title: '引用', md: '> 这是一段引用，用于强调某句话或史料原文。' },
  { title: '列表', md: '- 无序项目一\n- 无序项目二\n\n1. 有序项目一\n2. 有序项目二' },
  { title: '代码块', md: '```ts\nconst era = "KRTP";\nconsole.log(era);\n```' },
  { title: '表格', md: '| 国名 | 首都 |\n| --- | --- |\n| 甲国 | 王城 |\n| 乙国 | 圣殿 |' },
  { title: '链接', md: '[点击访问外部史料](https://example.com)' },
  { title: '折叠块', md: ':::collapsible\n## 小节标题\n\n正文默认折叠，读者点击标题即可展开阅读。\n:::' },
  { title: '分割线', md: '---' },
];

function fmt(s: number): string {
  if (!isFinite(s) || s < 0) return '00:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

const TYPE_PLAYLIST: Record<string, string> = {
  war: 'war',
  nation: 'nation',
  person: 'person',
  event: 'event',
  building: 'building',
  chronicle: 'chronicle',
  series: 'series',
};

function fmtSize(bytes: number | null): string {
  if (!bytes || bytes <= 0) return '未知';
  const mb = bytes / (1024 * 1024);
  if (mb >= 100) return `${Math.round(mb)} MB`;
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.max(Math.round(bytes / 1024), 1)} KB`;
}

function shuffled<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function MusicProvider() {
  const pathname = usePathname();
  const [songs, setSongs] = useState<Song[]>([]);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const saved = window.localStorage.getItem('krt-sci-panel');
      if (saved === '1') return true;
      if (saved === '0') return false;
    } catch { /* 忽略读取失败 */ }
    return window.matchMedia('(max-width: 767px)').matches;
  });
  const [playing, setPlaying] = useState(false);
  const [label, setLabel] = useState('');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [index, setIndex] = useState(0);
  const [locked, setLocked] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [loopOne, setLoopOne] = useState(false);
  const playMode: 'seq' | 'shuffle' | 'one' = loopOne ? 'one' : shuffle ? 'shuffle' : 'seq';
  const [showTracks, setShowTracks] = useState(false);
  const [showWrite, setShowWrite] = useState(false);
  const [browseTab, setBrowseTab] = useState<'pl' | 'q'>('pl');
  const [browseKey, setBrowseKey] = useState<string | null>(null);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [online, setOnline] = useState<number | null>(null);
  const [caption, setCaption] = useState<{ title: string; artist: string } | null>(null);
  const [cacheOn, setCacheOn] = useState(false);
  const [srcUrl, setSrcUrl] = useState<string | null>(null);
  const [dl, setDl] = useState<Record<string, number>>({});
  const [dlModal, setDlModal] = useState<'hidden' | 'prompt' | 'downloading' | 'done'>('hidden');
  const [dlScope, setDlScope] = useState<string[]>([]);
  const [dlTotalBytes, setDlTotalBytes] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [petiaCount, setPetiaCount] = useState(0);
  const [countReady, setCountReady] = useState(false);
  const [lockMsg, setLockMsg] = useState('');
  const lockMsgTimer = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fadeTimer = useRef<number | null>(null);
  const appliedSrc = useRef<string | null>(null);
  const captionTimer = useRef<number | null>(null);
  const startedRef = useRef(false);
  const objUrlRef = useRef<string | null>(null);
  const latestUrlRef = useRef<string | null>(null);
  const dlBusyRef = useRef<Set<string>>(new Set());

  const current = queue[index];

  function cancelFade() {
    if (fadeTimer.current !== null) {
      cancelAnimationFrame(fadeTimer.current);
      fadeTimer.current = null;
    }
  }

  function fadeToVolume(audio: HTMLAudioElement, to: number, durMs: number, onDone?: () => void) {
    cancelFade();
    const from = audio.volume;
    if (from === to) {
      onDone?.();
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / durMs, 1);
      audio.volume = from + (to - from) * p;
      if (p < 1) {
        fadeTimer.current = requestAnimationFrame(tick);
      } else {
        fadeTimer.current = null;
        onDone?.();
      }
    };
    fadeTimer.current = requestAnimationFrame(tick);
  }

  const playQueue = useCallback((q: QueueItem[], start: number, lbl: string, shouldPlay = true) => {
    setQueue(q);
    setIndex(Math.min(start, Math.max(q.length - 1, 0)));
    setLabel(lbl);
    if (shouldPlay && q.length > 0) {
      setPlaying(true);
    }
  }, []);

  const applySource = useCallback(async (url: string) => {
    const cached = await cachedAudioObjectUrl(url);
    if (latestUrlRef.current !== url) return;
    if (objUrlRef.current) { URL.revokeObjectURL(objUrlRef.current); objUrlRef.current = null; }
    if (cached) objUrlRef.current = cached;
    setSrcUrl(cached ?? url);
  }, []);

  const unlockRef = useRef<EventListener | null>(null);
  const tryPlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !current?.url) return;
    audio.volume = 1;
    audio.play().then(() => {
      if (unlockRef.current) {
        window.removeEventListener('pointerdown', unlockRef.current);
        window.removeEventListener('touchstart', unlockRef.current);
        window.removeEventListener('keydown', unlockRef.current);
        unlockRef.current = null;
      }
      fadeToVolume(audio, 1, 300);
    }).catch(() => {
      setPlaying(false);
      if (!unlockRef.current) {
        const unlock: EventListener = () => {
          window.removeEventListener('pointerdown', unlock);
          window.removeEventListener('touchstart', unlock);
          window.removeEventListener('keydown', unlock);
          if (unlockRef.current === unlock) unlockRef.current = null;
          audio.play().then(() => fadeToVolume(audio, 1, 300)).catch(() => {});
        };
        unlockRef.current = unlock;
        window.addEventListener('pointerdown', unlock);
        window.addEventListener('touchstart', unlock);
        window.addEventListener('keydown', unlock);
      }
    });
  }, [current?.url]);

  useEffect(() => () => {
    if (unlockRef.current) {
      window.removeEventListener('pointerdown', unlockRef.current);
      window.removeEventListener('touchstart', unlockRef.current);
      window.removeEventListener('keydown', unlockRef.current);
    }
  }, []);

  const doDownload = useCallback(async (url: string) => {
    if (dlBusyRef.current.has(url)) return;
    dlBusyRef.current.add(url);
    setDl(prev => ({ ...prev, [url]: -1 }));
    try {
      await downloadAudio(url, p => setDl(prev => ({ ...prev, [url]: Math.round(p * 100) })));
      setDl(prev => ({ ...prev, [url]: 100 }));
      if (latestUrlRef.current === url) applySource(url);
    } catch {
      setDl(prev => { const n = { ...prev }; delete n[url]; return n; });
    } finally {
      dlBusyRef.current.delete(url);
    }
  }, [applySource]);

  const downloadAll = useCallback((urls: string[]) => {
    (async () => {
      for (const u of urls) {
        if (u) await doDownload(u);
      }
    })();
  }, [doDownload]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data } = await supabase.from('songs').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: true });
      if (!cancelled && data) setSongs(data as Song[]);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let iv: number | null = null;
    async function refresh() {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      setUserId(user?.id ?? null);
      if (!user) {
        setPetiaCount(0);
        setCountReady(true);
        return;
      }
      const { count } = await supabase
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('author_name', 'SCI-Petia')
        .eq('user_id', user.id);
      if (!cancelled) {
        setPetiaCount(count ?? 0);
        setCountReady(true);
      }
    }
    refresh();
    iv = window.setInterval(refresh, 25000);
    return () => { cancelled = true; if (iv !== null) window.clearInterval(iv); };
  }, []);

  const isLocked = useCallback((s: Song) => {
    if (s.unlock_type !== 'petia_chats') return false;
    const goal = s.unlock_goal || 0;
    if (goal <= 0) return false;
    return !userId || petiaCount < goal;
  }, [userId, petiaCount]);

  const unlockedSongs = useMemo(() => songs.filter(s => !isLocked(s)), [songs, isLocked]);

  const [celebrate, setCelebrate] = useState<{ title: string; text: string } | null>(null);
  const prevPetiaCountRef = useRef<number | null>(null);
  const armedIdRef = useRef<string | null>(null);

  function readSeenUnlocks(): string[] {
    try {
      return JSON.parse(window.localStorage.getItem('krt-unlock-seen') || '[]');
    } catch {
      return [];
    }
  }

  function markSeenUnlock(url: string) {
    try {
      const seen = readSeenUnlocks();
      if (!seen.includes(url)) {
        seen.push(url);
        window.localStorage.setItem('krt-unlock-seen', JSON.stringify(seen));
      }
    } catch { /* 忽略 */ }
  }

  async function fetchCelebration(songTitle: string): Promise<string> {
    try {
      const r = await fetch('/api/chat/bot/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songTitle }),
        cache: 'no-store',
      });
      const j = await r.json().catch(() => null);
      if (j?.text) return j.text as string;
    } catch { /* 忽略 */ }
    return `「${songTitle}」已解锁。谢谢这段时间陪我聊了这么多……以后也继续一起记录下去吧。`;
  }

  useEffect(() => {
    if (songs.length === 0 || !countReady) return;
    const prev = prevPetiaCountRef.current ?? petiaCount;
    if (armedIdRef.current !== userId) {
      armedIdRef.current = userId;
      prevPetiaCountRef.current = petiaCount;
      return;
    }
    if (petiaCount > prev) {
      const song = songs.find(s =>
        s.unlock_type === 'petia_chats' &&
        (s.unlock_goal || 0) > prev &&
        (s.unlock_goal || 0) <= petiaCount,
      );
      if (song && !readSeenUnlocks().includes(song.url)) {
        markSeenUnlock(song.url);
        setLocked(true);
        setShuffle(false);
        setLoopOne(false);
        playQueue([{ title: song.title, artist: song.artist, url: song.url }], 0, playlistLabel(song.playlist), true);
        startedRef.current = true;
        setCelebrate({ title: song.title, text: '……' });
        fetchCelebration(song.title).then(text => setCelebrate({ title: song.title, text }));
      }
    }
    prevPetiaCountRef.current = petiaCount;
  }, [petiaCount, songs, countReady, userId, playQueue]);

  function showLockHint(s: Song) {
    const goal = s.unlock_goal || 0;
    setLockMsg(`🔒 与佩蒂娅交流 ${goal} 次解锁（当前 ${petiaCount} 次）`);
    if (lockMsgTimer.current !== null) window.clearTimeout(lockMsgTimer.current);
    lockMsgTimer.current = window.setTimeout(() => setLockMsg(''), 4000);
  }

  useEffect(() => () => {
    if (lockMsgTimer.current !== null) window.clearTimeout(lockMsgTimer.current);
  }, []);

  useEffect(() => {
    isAudioCacheSupported().then(ok => { if (!ok) setCacheOn(false); else setCacheOn(true); });
  }, []);

  useEffect(() => {
    if (!current?.url) {
      latestUrlRef.current = null;
      if (objUrlRef.current) { URL.revokeObjectURL(objUrlRef.current); objUrlRef.current = null; }
      setSrcUrl(null);
      return;
    }
    latestUrlRef.current = current.url;
    applySource(current.url);
  }, [current?.url, applySource]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const url = srcUrl;
    if (!url) {
      cancelFade();
      appliedSrc.current = null;
      audio.pause();
      audio.volume = 1;
      setPlaying(false);
      return;
    }
    if (appliedSrc.current === url && !audio.paused) return;
    appliedSrc.current = url;
    cancelFade();
    audio.src = url;
    audio.volume = 0.6;
    if (playing) tryPlay();
  }, [srcUrl, tryPlay]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !srcUrl) return;
    if (playing) {
      audio.play().then(() => fadeToVolume(audio, 1, 300)).catch(() => setPlaying(false));
    } else {
      fadeToVolume(audio, 0, 300, () => audio.pause());
    }
  }, [playing]);

  useEffect(() => () => {
    if (objUrlRef.current) URL.revokeObjectURL(objUrlRef.current);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const s of songs) {
        if (cancelled || !s.url) break;
        if (dl[s.url] === undefined && await isAudioCached(s.url)) {
          setDl(prev => prev[s.url] === undefined ? { ...prev, [s.url]: 100 } : prev);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [songs]);

  useEffect(() => {
    if (songs.length === 0) return;
    let cancelled = false;
    (async () => {
      if (!(await isAudioCacheSupported())) return;
      let skip = false;
      let done = false;
      try { skip = window.localStorage.getItem('krt-music-dl-skip') === '1'; } catch { /* 忽略 */ }
      try { done = window.localStorage.getItem('krt-music-dl-done') === '1'; } catch { /* 忽略 */ }
      if (skip || done) return;

      const uniq: string[] = [];
      for (const s of unlockedSongs) {
        if (s.url && !uniq.includes(s.url)) uniq.push(s.url);
      }
      const cached = await Promise.all(uniq.map(u => isAudioCached(u)));
      const uncached = uniq.filter((_, i) => !cached[i]);
      if (cancelled || uncached.length === 0) return;

      const sizes: number[] = await Promise.all(uncached.map(async u => {
        try {
          const r = await fetch(u, { method: 'HEAD', cache: 'no-store' });
          if (!r.ok) return 0;
          const cr = r.headers.get('content-range');
          const cl = r.headers.get('content-length');
          if (cr) {
            const m = cr.match(/\/(\d+)$/);
            if (m) return Number(m[1]) || 0;
          }
          if (cl) return Number(cl) || 0;
        } catch { /* 大小未知 */ }
        return 0;
      }));
      if (cancelled) return;
      setDlScope(uncached);
      setDlTotalBytes(sizes.reduce((a, b) => a + b, 0) || null);
      setDlModal('prompt');
    })();
    return () => { cancelled = true; };
  }, [unlockedSongs]);

  useEffect(() => {
    try {
      window.localStorage.setItem('krt-sci-panel', collapsed ? '1' : '0');
    } catch { /* 忽略写入失败 */ }
  }, [collapsed]);

  async function startFullDownload() {
    setDlModal('downloading');
    for (const u of dlScope) {
      await doDownload(u);
    }
    try { window.localStorage.setItem('krt-music-dl-done', '1'); } catch { /* 忽略 */ }
    if (current?.url) applySource(current.url);
    setDlModal('done');
  }

  function dismissDlPrompt() {
    try { window.localStorage.setItem('krt-music-dl-skip', '1'); } catch { /* 忽略 */ }
    setDlModal('hidden');
  }

  const dlDoneCount = dlScope.filter(u => dl[u] === 100).length;
  const dlProgress = dlScope.length
    ? dlScope.reduce((acc, u) => acc + Math.min((dl[u] ?? 0), 100), 0) / dlScope.length
    : 0;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current?.url) return;
    if (playing) {
      tryPlay();
    } else {
      fadeToVolume(audio, 0, 300, () => audio.pause());
    }
  }, [playing, tryPlay]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setTime(audio.currentTime);
    const onMeta = () => setDur(isFinite(audio.duration) ? audio.duration : 0);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem('krt-sci-panel', collapsed ? '1' : '0');
    } catch { /* 忽略写入失败 */ }
  }, [collapsed]);

  useEffect(() => {
    let stop = false;
    async function tick() {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { count } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .gte('last_seen', new Date(Date.now() - 5 * 60 * 1000).toISOString());
        if (!stop && count !== null) setOnline(count);
      } catch { /* last_seen 未创建或不可读时忽略 */ }
    }
    tick();
    const iv = setInterval(tick, 30000);
    return () => { stop = true; clearInterval(iv); };
  }, []);

  useEffect(() => {
    if (!current?.url || !playing) {
      setCaption(null);
      return;
    }
    setCaption({ title: current.title, artist: current.artist || '' });
    if (captionTimer.current !== null) window.clearTimeout(captionTimer.current);
    captionTimer.current = window.setTimeout(() => setCaption(null), 3000);
    return () => {
      if (captionTimer.current !== null) {
        window.clearTimeout(captionTimer.current);
        captionTimer.current = null;
      }
    };
  }, [current?.url, playing]);

  useEffect(() => () => cancelFade(), []);

  const applyAuto = useCallback(async (path: string) => {
    if (path.startsWith('/pages/')) {
      const slug = path.slice('/pages/'.length);
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data } = await supabase.from('pages').select('song_title, song_url, type').eq('slug', slug).maybeSingle();
      if (data?.song_url) {
        setLoopOne(true);
        setShuffle(false);
        playQueue([{ title: data.song_title || '文档配乐', artist: '', url: data.song_url }], 0, '本文档配乐', true);
        return;
      }
      const key = TYPE_PLAYLIST[data?.type ?? ''] ?? playlistForPath(path);
      const list = unlockedSongs.filter(s => s.playlist === key).map(s => ({ title: s.title, artist: s.artist, url: s.url }));
      if (list.length > 0) {
        const q = shuffled(list);
        setLoopOne(false);
        setShuffle(true);
        playQueue(q, Math.floor(Math.random() * q.length), playlistLabel(key), true);
      } else {
        setLoopOne(false);
        setShuffle(false);
        setLabel(playlistLabel(key));
      }
      return;
    }
    setLoopOne(false);
    setShuffle(false);
    const key = playlistForPath(path);
    const list = unlockedSongs.filter(s => s.playlist === key).map(s => ({ title: s.title, artist: s.artist, url: s.url }));
    if (list.length > 0) {
      playQueue(list, 0, playlistLabel(key), true);
    } else {
      setLabel(playlistLabel(key));
    }
  }, [playQueue, unlockedSongs]);

  useEffect(() => {
    if (locked) return;
    applyAuto(pathname);
  }, [pathname, songs, locked, applyAuto]);

  function onEnded() {
    setTime(0);
    if (loopOne && current) {
      const audio = audioRef.current;
      if (audio) audio.play().catch(() => setPlaying(false));
      return;
    }
    if (queue.length <= 1) {
      setPlaying(false);
      return;
    }
    if (shuffle) {
      let n = index;
      while (n === index) n = Math.floor(Math.random() * queue.length);
      setIndex(n);
      setPlaying(true);
      return;
    }
    const n = (index + 1) % queue.length;
    setIndex(n);
    setPlaying(true);
  }

  function manualPickAt(key: string, url: string) {
    const unlocked = unlockedSongs.filter(s => s.playlist === key);
    const i = unlocked.findIndex(s => s.url === url);
    if (i < 0) return;
    setLocked(true);
    const list = unlocked.map(s => ({ title: s.title, artist: s.artist, url: s.url }));
    playQueue(list, i, playlistLabel(key));
    startedRef.current = true;
    playNow();
  }

  function manualPick(key: string) {
    setLocked(true);
    const list = unlockedSongs.filter(s => s.playlist === key).map(s => ({ title: s.title, artist: s.artist, url: s.url }));
    if (list.length > 0) {
      playQueue(list, 0, playlistLabel(key));
      startedRef.current = true;
      playNow();
    } else {
      setQueue([]);
      setLabel(playlistLabel(key));
      setIndex(0);
      setPlaying(false);
    }
  }

  function playQueueAt(i: number) {
    if (!queue[i]) return;
    setLocked(true);
    setIndex(i);
    setPlaying(true);
    startedRef.current = true;
    playNow();
  }

  function chooseMode(m: 'seq' | 'shuffle' | 'one') {
    setLocked(true);
    setShuffle(m === 'shuffle');
    setLoopOne(m === 'one');
  }

  function release() {
    setLocked(false);
  }

  const step = (dir: 1 | -1) => {
    if (queue.length <= 1) return;
    let n: number;
    if (shuffle && dir === 1) {
      do { n = Math.floor(Math.random() * queue.length); } while (n === index);
    } else {
      n = (index + dir + queue.length) % queue.length;
    }
    setIndex(n);
    setPlaying(true);
    startedRef.current = true;
    playNow();
  };

  function playNow() {
    const audio = audioRef.current;
    const url = current?.url;
    if (!audio || !url) return;
    cancelFade();
    audio.volume = 1;
    audio.play().then(() => fadeToVolume(audio, 1, 300)).catch(() => {});
  }

  const toggle = () => {
    if (!current) return;
    if (playing) {
      const audio = audioRef.current;
      setPlaying(false);
      if (audio) fadeToVolume(audio, 0, 200, () => audio.pause());
    } else {
      setPlaying(true);
      startedRef.current = true;
      playNow();
    }
  };

  function seek(e: MouseEvent<HTMLDivElement>) {
    if (!current || !dur) return;
    const audio = audioRef.current;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    const t = ratio * dur;
    setTime(t);
    if (audio && isFinite(audio.duration)) audio.currentTime = t;
  }

  const mood = mascotForPath(pathname);
  const pct = dur ? Math.min((time / dur) * 100, 100) : 0;
  const eqClass = playing ? 'krt-eq text-[#7FB8E4]' : 'krt-eq paused text-[#7FB8E4]';
  const playlistSongs = browseKey ? songs.filter(s => s.playlist === browseKey) : [];
  const unlockedPlaylist = browseKey ? unlockedSongs.filter(s => s.playlist === browseKey) : [];

  const tabBtn = (tab: 'pl' | 'q', text: string) => (
    <button onClick={() => setBrowseTab(tab)}
      className={`flex-1 py-1.5 rounded text-[10px] font-mono tracking-[0.15em] transition-colors ${browseTab === tab ? 'bg-[#7FB8E4]/20 text-[#7FB8E4]' : 'text-[#8a8069] hover:text-[#d6cbb4]'}`}>
      {text}
    </button>
  );

  const rowCls = (active: boolean) =>
    `w-full flex items-center gap-3 px-4 py-1.5 text-left text-xs transition-colors ${active ? 'bg-[#7FB8E4]/10 text-[#7FB8E4]' : 'text-[#d6cbb4] hover:bg-[#7FB8E4]/10 hover:text-[#7FB8E4]'}`;

  if (pathname.startsWith('/world')) return null;

  return (
    <>
      {celebrate && (
        <div className="fixed inset-0 z-[90] overflow-hidden bg-[#05080e] text-[#efe6d5]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(127,184,228,0.22),transparent_62%)]" />
          <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(127,184,228,0.04)_2px,rgba(127,184,228,0.04)_3px)]" />
          <span className="absolute top-5 left-5 w-16 h-16 border-t-2 border-l-2 border-[#7FB8E4]/60" />
          <span className="absolute top-5 right-5 w-16 h-16 border-t-2 border-r-2 border-[#7FB8E4]/60" />
          <span className="absolute bottom-5 left-5 w-16 h-16 border-b-2 border-l-2 border-[#7FB8E4]/60" />
          <span className="absolute bottom-5 right-5 w-16 h-16 border-b-2 border-r-2 border-[#7FB8E4]/60" />
          <span className="absolute top-1/2 left-6 w-px h-24 bg-gradient-to-b from-transparent via-[#7FB8E4]/40 to-transparent" />
          <span className="absolute top-1/2 right-6 w-px h-24 bg-gradient-to-b from-transparent via-[#7FB8E4]/40 to-transparent" />

          <div className="relative h-full w-full flex flex-col items-center justify-center text-center px-6">
            <div className="rounded-full shadow-[0_0_80px_rgba(127,184,228,0.55)]">
              <SiteMascot mood="chat" active size={150} />
            </div>
            <p className="mt-7 font-mono text-xs tracking-[0.5em] text-[#7FB8E4]">— ACHIEVEMENT UNLOCKED —</p>
            <p className="mt-4 font-serif text-4xl text-[#f3ead8]">「{celebrate.title}」</p>
            <p className="mt-6 max-w-2xl text-base text-[#bcdcf5] leading-loose">{celebrate.text}</p>
            <button onClick={() => setCelebrate(null)}
              className="mt-10 px-10 py-3 bg-[#7FB8E4] text-[#0c1521] text-sm font-mono tracking-[0.25em] rounded hover:bg-[#9ecfe9] transition-colors">
              继续
            </button>
          </div>
        </div>
      )}
      {dlModal !== 'hidden' && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="krt-panel relative w-full max-w-sm rounded-2xl text-[#efe6d5] p-6">
            <span className="krt-corner top-1.5 left-1.5 border-t border-l rounded-tl" />
            <span className="krt-corner top-1.5 right-1.5 border-t border-r rounded-tr" />
            <span className="krt-corner bottom-1.5 left-1.5 border-b border-l rounded-bl" />
            <span className="krt-corner bottom-1.5 right-1.5 border-b border-r rounded-br" />

            <p className="font-mono text-[10px] tracking-[0.28em] text-[#7FB8E4]">SCI-PETIA · 音频预载</p>

            {dlModal === 'prompt' && (
              <>
                <p className="mt-4 text-sm text-[#f3ead8] leading-relaxed">
                  检测到 <span className="text-[#7FB8E4]">{dlScope.length} 首</span> 音频尚未缓存。下载后共约
                  <span className="text-[#7FB8E4]"> {fmtSize(dlTotalBytes)}</span>，可保证全站音乐的流畅播放体验（支持离线）。
                </p>
                <p className="mt-2 text-[11px] text-[#9a8f7a] leading-relaxed">仅在首次进入或缓存被清除时提示一次，可随时在播放器里「⬇ 全部」补下。</p>
                <div className="mt-5 flex items-center gap-2">
                  <button onClick={startFullDownload} className="flex-1 py-2.5 bg-[#7FB8E4] text-[#0c1521] text-xs font-mono tracking-[0.2em] rounded hover:bg-[#9ecfe9] transition-colors">
                    开始下载
                  </button>
                  <button onClick={dismissDlPrompt} className="flex-1 py-2.5 border border-[#7FB8E4]/30 text-[#9a8f7a] text-xs font-mono tracking-[0.2em] rounded hover:text-white transition-colors">
                    以后再说
                  </button>
                </div>
              </>
            )}

            {dlModal !== 'prompt' && (
              <>
                <p className="mt-4 text-sm text-[#f3ead8]">
                  {dlModal === 'downloading' ? '正在预载全部音频……' : '全部音频已缓存完成 ✓'}
                </p>
                <div className="mt-3">
                  <div className="relative h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-[#7FB8E4] transition-all duration-200" style={{ width: `${dlProgress}%` }} />
                  </div>
                  <p className="mt-1.5 flex justify-between font-mono text-[10px] text-[#9a8f7a]">
                    <span>{dlModal === 'downloading' ? `${dlDoneCount} / ${dlScope.length} 首` : 'COMPLETE'}</span>
                    <span>{dlModal === 'downloading' ? `${Math.round(dlProgress)}%` : '✓'}</span>
                  </p>
                </div>
                <div className="mt-5">
                  {dlModal === 'downloading' ? (
                    <button onClick={() => setDlModal('hidden')} className="w-full py-2.5 border border-[#7FB8E4]/30 text-[#9a8f7a] text-xs font-mono tracking-[0.2em] rounded hover:text-white transition-colors">
                      后台进行，先干别的
                    </button>
                  ) : (
                    <button onClick={() => setDlModal('hidden')} className="w-full py-2.5 bg-[#7FB8E4] text-[#0c1521] text-xs font-mono tracking-[0.2em] rounded hover:bg-[#9ecfe9] transition-colors">
                      完成，关闭
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <audio ref={audioRef} onEnded={onEnded} playsInline preload="auto" />
      {caption && (
        <div className="krt-toast">
          <div>
            <p className="font-serif text-sm text-[#f3ead8] truncate text-center">{caption.title}</p>
            {caption.artist && <p className="mt-0.5 text-[10px] text-[#9a8f7a] tracking-wider text-center">{caption.artist}</p>}
          </div>
        </div>
      )}
      {collapsed ? (
        <button
          onClick={() => setCollapsed(false)}
          className={`fixed bottom-6 right-6 z-50 p-0.5 rounded-full transition-transform hover:scale-105 ${playing ? 'shadow-[0_0_22px_rgba(127,184,228,0.55)] ring-1 ring-[#7FB8E4]/70' : 'shadow-xl ring-1 ring-white/10'}`}
          title={label || '打开音乐'}
          aria-label={label || '打开音乐'}
        >
          <span className="block rounded-full overflow-hidden">
            <SiteMascot mood={mood} active={playing} size={72} />
          </span>
        </button>
      ) : (
        <div className={`krt-panel fixed bottom-6 right-6 z-50 rounded-2xl overflow-hidden text-[#efe6d5] ${showWrite ? 'w-72 md:w-96' : 'w-60'}`}>
          <span className="krt-corner top-1.5 left-1.5 border-t border-l rounded-tl" />
          <span className="krt-corner top-1.5 right-1.5 border-t border-r rounded-tr" />
          <span className="krt-corner bottom-1.5 left-1.5 border-b border-l rounded-bl" />
          <span className="krt-corner bottom-1.5 right-1.5 border-b border-r rounded-br" />

          <div className="relative flex items-center justify-between px-4 pt-3 pb-2 border-b border-[#7FB8E4]/20">
            <p className="font-mono text-[11px] tracking-[0.28em] text-[#7FB8E4]">
              SCI-Petia<span className="krt-cursor">▌</span>
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-mono text-[9px] tracking-[0.18em] px-2 py-0.5 rounded-sm border border-[#7FB8E4]/30 text-[#7FB8E4]/90">
                {locked ? 'MANUAL' : shuffle ? 'SHUF' : 'AUTO'}
              </span>
              <button onClick={() => setCollapsed(true)} className="text-sm text-[#9a8f7a] hover:text-white transition-colors" title="收起">▁</button>
            </div>
          </div>

          {online !== null && (
            <div className="px-4 pt-2 flex items-center gap-2 font-mono text-[9px] tracking-[0.22em] text-[#7FB8E4]/85">
              <span className="relative flex w-1.5 h-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
                <span className="relative inline-flex rounded-full w-1.5 h-1.5 bg-emerald-400" />
              </span>
              ONLINE {online}
            </div>
          )}

          <div className="relative px-4 pt-3 pb-1">
            <button onClick={toggle} disabled={!current} className="relative mx-auto block disabled:opacity-40 hover:scale-105 transition-transform" title="点击播放 / 暂停">
              <SiteMascot mood={mood} active={playing} size={64} />
            </button>

            <div className="mt-2 text-center min-w-0">
              <p className="text-sm text-[#f3ead8] truncate">{current?.title || '—'}</p>
              <p className="text-[10px] text-[#9a8f7a] tracking-wider truncate">{current?.artist || 'NO SIGNAL'}</p>
            </div>

            <div className="mt-2 flex items-center justify-center">
              {playing ? (
                <div className={eqClass}><span /><span /><span /><span /><span /></div>
              ) : (
                <span className="font-mono text-[9px] tracking-[0.2em] text-[#7a7059]">STANDBY</span>
              )}
            </div>

            <div className="mt-2">
              <div onClick={seek} className="relative h-1.5 rounded-full bg-white/10 cursor-pointer overflow-hidden group" title="点击定位">
                <div className="absolute inset-y-0 left-0 bg-[#7FB8E4]/85 group-hover:bg-[#7FB8E4] transition-colors" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex justify-between mt-1 font-mono text-[9px] text-[#8a8069]">
                <span>{fmt(time)}</span>
                <span>{dur ? fmt(dur) : '--:--'}</span>
              </div>
              {cacheOn && current?.url && dl[current.url] !== undefined && (
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="font-mono text-[8px] tracking-[0.2em] text-[#7FB8E4]/90">{dl[current.url] === 100 ? 'CACHED' : '⬇'}</span>
                  <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-[#7FB8E4]" style={{ width: `${Math.min(dl[current.url], 100)}%` }} />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-3 py-2">
              <button onClick={() => step(-1)} disabled={!current} className="w-8 h-8 rounded-full border border-white/10 text-[#cec2a9] disabled:opacity-25 hover:text-[#7FB8E4] hover:border-[#7FB8E4]/50 hover:shadow-[0_0_10px_rgba(127,184,228,0.35)] transition-all text-sm" title="上一首">⏮</button>
              <button onClick={toggle} disabled={!current} className="w-11 h-11 rounded-full bg-[#7FB8E4] text-[#0c1521] flex items-center justify-center disabled:opacity-30 text-base shadow-[0_0_18px_rgba(127,184,228,0.4)] hover:shadow-[0_0_26px_rgba(127,184,228,0.6)] transition-shadow" title="播放 / 暂停">
                {playing ? '❚❚' : '▶'}
              </button>
              <button onClick={() => step(1)} disabled={!current} className="w-8 h-8 rounded-full border border-white/10 text-[#cec2a9] disabled:opacity-25 hover:text-[#7FB8E4] hover:border-[#7FB8E4]/50 hover:shadow-[0_0_10px_rgba(127,184,228,0.35)] transition-all text-sm" title="下一首">⏭</button>
            </div>

            <div className="flex items-center justify-center gap-1.5 pb-1">
              {(['seq', 'shuffle', 'one'] as const).map(m => (
                <button key={m} onClick={() => chooseMode(m)}
                  className={`px-2.5 py-1 rounded text-[9px] font-mono tracking-[0.15em] transition-colors ${playMode === m ? 'bg-[#7FB8E4]/20 text-[#7FB8E4] border border-[#7FB8E4]/40' : 'text-[#8a8069] border border-white/10 hover:text-[#d6cbb4]'}`}>
                  {m === 'seq' ? '顺序' : m === 'shuffle' ? '随机' : '单曲'}
                </button>
              ))}
            </div>
          </div>

          <div className="relative border-t border-[#7FB8E4]/20">
            <div className="flex items-center">
              <button onClick={() => { setShowWrite(false); setShowTracks(p => !p); }}
                className={`flex-1 px-4 py-2.5 flex items-center justify-between text-left ${showTracks ? 'bg-[#7FB8E4]/10' : ''}`}>
                <span className="font-mono text-[10px] tracking-[0.22em] text-[#7FB8E4]/90">SEL / 选曲</span>
                <span className="text-[#9a8f7a] text-xs">{showTracks ? '▲' : '▼'}</span>
              </button>
              <span className="w-px h-6 bg-[#7FB8E4]/20" />
              <button onClick={() => { setShowTracks(false); setShowWrite(p => !p); }}
                className={`flex-1 px-4 py-2.5 flex items-center justify-between text-left ${showWrite ? 'bg-[#7FB8E4]/10' : ''}`}>
                <span className="font-mono text-[10px] tracking-[0.22em] text-[#7FB8E4]/90">WRITE / 写作助手</span>
                <span className="text-[#9a8f7a] text-xs">{showWrite ? '▲' : '▼'}</span>
              </button>
            </div>

            {showWrite && (
              <div className="border-t border-[#7FB8E4]/20 max-h-72 overflow-y-auto px-4 py-3 space-y-5">
                {WRITE_EXAMPLES.map(ex => (
                  <div key={ex.title}>
                    <p className="mb-1.5 font-mono text-[9px] tracking-[0.22em] text-[#7FB8E4]/80">{ex.title}</p>
                    <pre className="mb-3 text-[10px] leading-relaxed whitespace-pre-wrap break-words bg-black/30 border border-[#7FB8E4]/20 px-3 py-2 rounded-sm text-[#bcdcf5] font-mono">{ex.md}</pre>
                    <div className="krt-md"><Markdown content={ex.md} /></div>
                  </div>
                ))}
              </div>
            )}

            {showTracks && (
              <div className="border-t border-[#7FB8E4]/20">
                <div className="flex items-center gap-1 p-1.5">
                  {tabBtn('pl', '歌单')}
                  {tabBtn('q', '当前队列')}
                  <span className="flex-1" />
                  {cacheOn && browseKey && unlockedPlaylist.length > 0 && (
                    <button onClick={() => downloadAll(unlockedPlaylist.map(s => s.url).filter(Boolean))} className="shrink-0 px-2 py-1.5 rounded text-[9px] font-mono tracking-[0.12em] text-[#7FB8E4] hover:text-white transition-colors" title="缓存整张歌单，供离线或快速播放">
                      {unlockedPlaylist.every(s => !s.url || dl[s.url] === 100) ? 'CACHED' : '⬇ 全部'}
                    </button>
                  )}
                  {locked && (
                    <button onClick={release} className="shrink-0 px-2 py-1.5 rounded text-[9px] font-mono tracking-[0.12em] text-[#7FB8E4] hover:text-white transition-colors" title="恢复跟随页面">↻ AUTO</button>
                  )}
                </div>
                {lockMsg && (
                  <p className="px-4 pb-1.5 text-[10px] tracking-widest text-[#9ecfe9]">{lockMsg}</p>
                )}

                {browseTab === 'q' ? (
                  queue.length === 0 ? (
                    <p className="px-4 py-3 text-xs text-[#7a7059]">暂无曲目</p>
                  ) : (
                    <div className="max-h-56 overflow-y-auto pb-1">
                      {queue.map((s, i) => (
                        <button key={`${i}-${s.url}`} onClick={() => playQueueAt(i)} className={rowCls(i === index)}>
                          <span className="w-5 font-mono text-[9px] text-[#7a7059]">{i + 1}</span>
                          <span className="min-w-0 flex-1 truncate">{s.title}</span>
                          <span className="text-[10px]">{i === index && playing ? '▶' : ''}</span>
                        </button>
                      ))}
                    </div>
                  )
                ) : browseKey ? (
                  <>
                    <button onClick={() => setBrowseKey(null)} className="w-full px-4 py-1.5 text-left font-mono text-[10px] tracking-[0.12em] text-[#9a8f7a] hover:text-[#7FB8E4] transition-colors">← {playlistLabel(browseKey)}</button>
                    <div className="max-h-52 overflow-y-auto pb-1">
                      {playlistSongs.length === 0 ? (
                        <p className="px-4 py-3 text-xs text-[#7a7059]">此歌单暂无曲目</p>
                      ) : playlistSongs.map((s, i) => (
                        isLocked(s) ? (
                          <button key={s.id} onClick={() => showLockHint(s)} className={`${rowCls(false)} opacity-50`} title="未解锁">
                            <span className="w-5 font-mono text-[9px] text-[#7a7059]">{i + 1}</span>
                            <span className="min-w-0 flex-1 truncate">🔒 {s.title}</span>
                            <span className="text-[10px] text-[#7a7059]">交流{s.unlock_goal || 0}次</span>
                          </button>
                        ) : (
                          <button key={s.id} onClick={() => manualPickAt(browseKey, s.url)} className={rowCls(s.url === current?.url)}>
                            <span className="w-5 font-mono text-[9px] text-[#7a7059]">{i + 1}</span>
                            <span className="min-w-0 flex-1 truncate">{s.title}</span>
                            <span className="text-[10px]">{s.url === current?.url && playing ? '▶' : ''}</span>
                          </button>
                        )
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="max-h-56 overflow-y-auto pb-1">
                    {PLAYLIST_OPTIONS.map(p => {
                      const c = songs.filter(s => s.playlist === p.key).length;
                      return (
                        <button key={p.key} onClick={() => setBrowseKey(p.key)} className="w-full flex items-center gap-3 px-4 py-1.5 text-left text-xs text-[#d6cbb4] hover:bg-[#7FB8E4]/10 hover:text-[#7FB8E4] transition-colors">
                          <span className="min-w-0 flex-1 truncate">{p.label}</span>
                          <span className="shrink-0 font-mono text-[9px] text-[#7a7059]">{c}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
