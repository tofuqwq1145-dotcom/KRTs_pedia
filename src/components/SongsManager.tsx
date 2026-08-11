'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { uploadAudio } from '@/lib/supabase/upload';
import { PLAYLIST_OPTIONS, playlistLabel } from '@/data/music';

interface SongRow { id: string; title: string; artist: string; url: string; playlist: string; sort_order: number }

const inputCls = 'w-full p-3 border border-archive-border bg-archive-paper outline-none focus:border-archive-accent transition-colors text-sm tracking-widest';
const labelCls = 'block text-xs tracking-widest text-archive-muted mb-2';

export default function SongsManager() {
  const [list, setList] = useState<SongRow[]>([]);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [playlist, setPlaylist] = useState('home');
  const [url, setUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.from('songs').select('*').order('sort_order', { ascending: true }).then((r: any) => {
      if (!r.error) setList(r.data ?? []);
    });
  }, []);

  async function onUpload(file: File) {
    setError('');
    setUploading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('请先登录');
      const u = await uploadAudio(supabase, user.id, file);
      setUrl(u);
      setFileName(file.name);
    } catch (e: any) {
      setError(e.message || '上传失败。');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function onAdd() {
    setError('');
    setNotice('');
    if (!title.trim() || !url) return setError('请填写曲名并上传音频。');
    setBusy(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.from('songs').insert({
        title: title.trim(),
        artist: artist.trim(),
        url,
        playlist,
        sort_order: list.length + 1,
      });
      if (err) throw new Error(err.message);
      setNotice('已加入曲库。');
      setTitle(''); setArtist(''); setUrl(''); setFileName('');
      const { data } = await supabase.from('songs').select('*').order('sort_order', { ascending: true });
      if (data) setList(data as SongRow[]);
    } catch (e: any) {
      setError(e.message || '添加失败。');
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string, nm: string) {
    if (!window.confirm(`确定删除「${nm}」？`)) return;
    setError('');
    setNotice('');
    const supabase = createClient();
    const { error: err } = await supabase.from('songs').delete().eq('id', id);
    if (err) return setError(err.message);
    setList(prev => prev.filter(s => s.id !== id));
    setNotice('已删除。');
  }

  const groups = PLAYLIST_OPTIONS.map(p => ({
    ...p,
    items: list.filter(s => s.playlist === p.key),
  })).filter(g => g.items.length > 0);

  return (
    <section className="mt-0">
      <h2 className="font-serif text-2xl mb-2 text-archive-text border-b border-archive-border pb-4">站内配乐曲库</h2>
      <p className="text-sm tracking-widest text-archive-muted mt-4 mb-6">为不同页面分类添加背景音乐。上传后访客会随页面自动播放对应歌单，也可在播放器里手动切换。</p>

      <div className="bg-archive-paper border border-archive-border p-6 mb-8 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>曲名 *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="例如：硅基之梦" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>艺术家 / 来源（可选）</label>
            <input value={artist} onChange={e => setArtist(e.target.value)} placeholder="例如：佚名" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>归属歌单</label>
            <select value={playlist} onChange={e => setPlaylist(e.target.value)} className={inputCls}>
              {PLAYLIST_OPTIONS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>音频文件 *（MP3 等，30MB 内）</label>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className="px-4 py-3 text-xs tracking-widest text-archive-accent border border-archive-accent/40 hover:bg-archive-accent hover:text-archive-paper transition-colors disabled:opacity-50">
              {uploading ? '上传中…' : '上传音频'}
            </button>
            <input ref={fileRef} type="file" accept="audio/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
            {url ? (
              <div className="flex items-center gap-2">
                <audio controls src={url} className="h-10 w-64" />
                <span className="text-xs text-archive-muted truncate max-w-[120px]">{fileName}</span>
                <button type="button" onClick={() => { setUrl(''); setFileName(''); }} className="text-xs text-archive-muted hover:text-archive-accent">移除</button>
              </div>
            ) : <span className="text-xs text-archive-muted">未上传</span>}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={onAdd} disabled={busy}
            className="px-6 py-3 bg-archive-text text-archive-paper text-sm tracking-widest hover:bg-archive-accent transition-colors disabled:opacity-50">
            {busy ? '处理中…' : '加入曲库'}
          </button>
          {error && <p className="text-sm text-archive-accent">{error}</p>}
          {notice && <p className="text-sm text-emerald-700">{notice}</p>}
        </div>
      </div>

      <div className="space-y-8">
        {groups.length === 0 && <p className="text-sm text-archive-muted">曲库还是空的，先上传几首吧。</p>}
        {groups.map(g => (
          <div key={g.key}>
            <h3 className="font-serif text-lg mb-3 text-archive-text">{g.label} <span className="text-archive-muted text-sm">({g.items.length})</span></h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {g.items.map(s => (
                <div key={s.id} className="border border-archive-border bg-archive-paper px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-archive-text truncate">{s.title}</p>
                    <p className="text-[11px] text-archive-muted tracking-widest truncate">{s.artist || playlistLabel(s.playlist)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <audio controls src={s.url} className="h-9 w-48" />
                    <button onClick={() => onDelete(s.id, s.title)}
                      className="text-xs tracking-widest text-archive-accent border border-archive-accent/40 px-2 py-1 hover:bg-archive-accent hover:text-archive-paper transition-colors">删除</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}