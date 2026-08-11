'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { usePathname } from 'next/navigation';
import { PLAYLIST_OPTIONS, playlistForPath, playlistLabel } from '@/data/music';
import { mascotForPath } from '@/data/mascot';
import SiteMascot from '@/components/SiteMascot';
import Markdown from '@/components/Markdown';

interface Song { id: string; title: string; artist: string; url: string; playlist: string }

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
  const [showTracks, setShowTracks] = useState(false);
  const [showWrite, setShowWrite] = useState(false);
  const [browseTab, setBrowseTab] = useState<'pl' | 'q'>('pl');
  const [browseKey, setBrowseKey] = useState<string | null>(null);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fadeTimer = useRef<number | null>(null);
  const appliedSrc = useRef<string | null>(null);

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
    const audio = audioRef.current;
    if (!audio) return;
    const url = current?.url;
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
    audio.volume = 0;
    if (playing) {
      audio.play().then(() => fadeToVolume(audio, 1, 300)).catch(() => setPlaying(false));
    }
  }, [current?.url]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current?.url) return;
    if (playing) {
      audio.play().then(() => fadeToVolume(audio, 1, 300)).catch(() => setPlaying(false));
    } else {
      fadeToVolume(audio, 0, 300, () => audio.pause());
    }
  }, [playing]);

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
        playQueue([{ title: data.song_title || '文档配乐', artist: '', url: data.song_url }], 0, '本文档配乐');
        return;
      }
      const key = TYPE_PLAYLIST[data?.type ?? ''] ?? playlistForPath(path);
      const list = songs.filter(s => s.playlist === key).map(s => ({ title: s.title, artist: s.artist, url: s.url }));
      if (list.length > 0) {
        const q = shuffled(list);
        setLoopOne(false);
        setShuffle(true);
        playQueue(q, Math.floor(Math.random() * q.length), playlistLabel(key));
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
    const list = songs.filter(s => s.playlist === key).map(s => ({ title: s.title, artist: s.artist, url: s.url }));
    if (list.length > 0) {
      playQueue(list, 0, playlistLabel(key));
    } else {
      setLabel(playlistLabel(key));
    }
  }, [playQueue, songs]);

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

  function manualPickAt(key: string, i: number) {
    setLocked(true);
    setShuffle(false);
    setLoopOne(false);
    const list = songs.filter(s => s.playlist === key).map(s => ({ title: s.title, artist: s.artist, url: s.url }));
    if (list.length > 0) {
      playQueue(list, i, playlistLabel(key));
      playNow();
    }
  }

  function manualPick(key: string) {
    setLocked(true);
    setShuffle(false);
    setLoopOne(false);
    const list = songs.filter(s => s.playlist === key).map(s => ({ title: s.title, artist: s.artist, url: s.url }));
    if (list.length > 0) {
      playQueue(list, 0, playlistLabel(key));
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
    setShuffle(false);
    setLoopOne(false);
    setIndex(i);
    setPlaying(true);
    playNow();
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

  const tabBtn = (tab: 'pl' | 'q', text: string) => (
    <button onClick={() => setBrowseTab(tab)}
      className={`flex-1 py-1.5 rounded text-[10px] font-mono tracking-[0.15em] transition-colors ${browseTab === tab ? 'bg-[#7FB8E4]/20 text-[#7FB8E4]' : 'text-[#8a8069] hover:text-[#d6cbb4]'}`}>
      {text}
    </button>
  );

  const rowCls = (active: boolean) =>
    `w-full flex items-center gap-3 px-4 py-1.5 text-left text-xs transition-colors ${active ? 'bg-[#7FB8E4]/10 text-[#7FB8E4]' : 'text-[#d6cbb4] hover:bg-[#7FB8E4]/10 hover:text-[#7FB8E4]'}`;

  return (
    <>
      <audio ref={audioRef} onEnded={onEnded} playsInline preload="auto" />
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
            </div>

            <div className="flex items-center justify-center gap-3 py-2">
              <button onClick={() => step(-1)} disabled={!current} className="w-8 h-8 rounded-full border border-white/10 text-[#cec2a9] disabled:opacity-25 hover:text-[#7FB8E4] hover:border-[#7FB8E4]/50 hover:shadow-[0_0_10px_rgba(127,184,228,0.35)] transition-all text-sm" title="上一首">⏮</button>
              <button onClick={toggle} disabled={!current} className="w-11 h-11 rounded-full bg-[#7FB8E4] text-[#0c1521] flex items-center justify-center disabled:opacity-30 text-base shadow-[0_0_18px_rgba(127,184,228,0.4)] hover:shadow-[0_0_26px_rgba(127,184,228,0.6)] transition-shadow" title="播放 / 暂停">
                {playing ? '❚❚' : '▶'}
              </button>
              <button onClick={() => step(1)} disabled={!current} className="w-8 h-8 rounded-full border border-white/10 text-[#cec2a9] disabled:opacity-25 hover:text-[#7FB8E4] hover:border-[#7FB8E4]/50 hover:shadow-[0_0_10px_rgba(127,184,228,0.35)] transition-all text-sm" title="下一首">⏭</button>
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
                    <p className="mb-2 font-mono text-[9px] tracking-[0.22em] text-[#7FB8E4]/80">{ex.title}</p>
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
                  {locked && (
                    <button onClick={release} className="shrink-0 px-2 py-1.5 rounded text-[9px] font-mono tracking-[0.12em] text-[#7FB8E4] hover:text-white transition-colors" title="恢复跟随页面">↻ AUTO</button>
                  )}
                </div>

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
                        <button key={s.id} onClick={() => manualPickAt(browseKey, i)} className={rowCls(s.url === current?.url)}>
                          <span className="w-5 font-mono text-[9px] text-[#7a7059]">{i + 1}</span>
                          <span className="min-w-0 flex-1 truncate">{s.title}</span>
                          <span className="text-[10px]">{s.url === current?.url && playing ? '▶' : ''}</span>
                        </button>
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
