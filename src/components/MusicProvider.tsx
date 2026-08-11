'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { PLAYLIST_OPTIONS, playlistForPath, playlistLabel } from '@/data/music';
import { mascotForPath } from '@/data/mascot';
import SiteMascot from '@/components/SiteMascot';

interface Song { id: string; title: string; artist: string; url: string; playlist: string }

interface QueueItem { title: string; artist: string; url: string }

export default function MusicProvider() {
  const pathname = usePathname();
  const [songs, setSongs] = useState<Song[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [label, setLabel] = useState('');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [index, setIndex] = useState(0);
  const [locked, setLocked] = useState(false);
  const [showPlaylists, setShowPlaylists] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const current = queue[index];

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
      audio.pause();
      setPlaying(false);
      return;
    }
    audio.src = url;
    if (playing) {
      audio.play().catch(() => setPlaying(false));
    }
  }, [current?.url]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) audio.play().catch(() => setPlaying(false));
    else audio.pause();
  }, [playing]);

  const applyAuto = useCallback(async (path: string) => {
    if (path.startsWith('/pages/')) {
      const slug = path.slice('/pages/'.length);
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data } = await supabase.from('pages').select('song_title, song_url').eq('slug', slug).maybeSingle();
      if (data?.song_url) {
        playQueue([{ title: data.song_title || '文档配乐', artist: '', url: data.song_url }], 0, '本文档配乐');
        return;
      }
    }
    const key = playlistForPath(path);
    const list = songs.filter(s => s.playlist === key).map(s => ({ title: s.title, artist: s.artist, url: s.url }));
    if (list.length > 0) {
      playQueue(list, 0, playlistLabel(key));
    } else {
      setQueue([]);
      setLabel(playlistLabel(key));
      setIndex(0);
    }
  }, [playQueue, songs]);

  useEffect(() => {
    if (locked) return;
    applyAuto(pathname);
  }, [pathname, songs, locked, applyAuto]);

  function onEnded() {
    if (queue.length <= 1) {
      setPlaying(false);
      return;
    }
    const n = (index + 1) % queue.length;
    setIndex(n);
    setPlaying(true);
  }

  function manualPick(key: string) {
    setLocked(true);
    setShowPlaylists(false);
    const list = songs.filter(s => s.playlist === key).map(s => ({ title: s.title, artist: s.artist, url: s.url }));
    if (list.length > 0) {
      playQueue(list, 0, playlistLabel(key));
    } else {
      setQueue([]);
      setLabel(playlistLabel(key));
      setIndex(0);
      setPlaying(false);
    }
  }

  function release() {
    setLocked(false);
  }

  const step = (dir: 1 | -1) => {
    if (queue.length <= 1) return;
    const n = (index + dir + queue.length) % queue.length;
    setIndex(n);
    setPlaying(true);
  };

  const toggle = () => {
    if (!current) return;
    setPlaying(p => !p);
  };

  const mood = mascotForPath(pathname);

  return (
    <>
      <audio ref={audioRef} onEnded={onEnded} />
      {collapsed ? (
        <button
          onClick={() => setCollapsed(false)}
          className="fixed bottom-6 right-6 z-50 p-0 rounded-full overflow-hidden shadow-xl hover:scale-105 transition-transform"
          title={label || '打开音乐'}
          aria-label={label || '打开音乐'}
        >
          <SiteMascot mood={mood} active={playing} size={64} />
        </button>
      ) : (
        <div className="fixed bottom-6 right-6 z-50 w-72 bg-archive-paper border border-archive-border shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 bg-archive-text text-archive-paper">
            <div className="flex items-center gap-3 min-w-0 mr-2">
              <button onClick={toggle} disabled={!current} title="点击播放 / 暂停"
                className="shrink-0 disabled:opacity-40 hover:scale-105 transition-transform">
                <SiteMascot mood={mood} active={playing} size={40} />
              </button>
              <div className="min-w-0">
                <p className="text-[10px] tracking-[0.2em] uppercase opacity-70">KRTPedia Player</p>
                <p className="text-xs tracking-widest truncate">{label || '本页暂无配乐'}</p>
              </div>
            </div>
            <button onClick={() => setCollapsed(true)} className="shrink-0 text-sm opacity-80 hover:opacity-100">收起</button>
          </div>

          <div className="px-5 py-4">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="min-w-0">
                <p className="text-sm font-serif text-archive-text truncate">{current?.title || '—'}</p>
                <p className="text-[11px] text-archive-muted tracking-widest truncate">{current?.artist || '\u00A0'}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => step(-1)} disabled={!current} className="text-archive-accent disabled:opacity-30 text-sm" title="上一首">⏮</button>
                <button onClick={toggle} disabled={!current}
                  className="w-9 h-9 rounded-full bg-archive-accent text-archive-paper flex items-center justify-center disabled:opacity-30 text-sm">
                  {playing ? '❚❚' : '▶'}
                </button>
                <button onClick={() => step(1)} disabled={!current} className="text-archive-accent disabled:opacity-30 text-sm" title="下一首">⏭</button>
              </div>
            </div>
          </div>

          <div className="border-t border-archive-border">
            <button
              onClick={() => setShowPlaylists(p => !p)}
              className="w-full px-5 py-3 text-left text-xs tracking-widest text-archive-muted hover:text-archive-accent transition-colors flex items-center justify-between"
            >
              <span>{locked ? '已手动选歌单' : '跟随当前页面'}</span>
              <span>{showPlaylists ? '▲' : '▼'}</span>
            </button>
            {showPlaylists && (
              <div className="max-h-52 overflow-y-auto border-t border-archive-border py-1">
                {PLAYLIST_OPTIONS.map(p => (
                  <button key={p.key} onClick={() => manualPick(p.key)}
                    className="w-full px-5 py-2 text-left text-xs tracking-widest text-archive-text hover:bg-archive-bg hover:text-archive-accent transition-colors">
                    {p.label}
                  </button>
                ))}
                {locked && (
                  <button onClick={release}
                    className="w-full px-5 py-2 text-left text-xs tracking-widest text-archive-accent hover:bg-archive-bg transition-colors">
                    ↻ 恢复跟随页面
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}