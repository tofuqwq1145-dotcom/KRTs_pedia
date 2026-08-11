'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { uploadMedia } from '@/lib/supabase/upload';
import { MASCOTS, type MascotMood } from '@/data/mascot';
import SiteMascot from '@/components/SiteMascot';

interface ImageRow { key: string; image_url: string }

const STATES: [state: 'play' | 'pause', label: string][] = [
  ['play', '播放'],
  ['pause', '暂停'],
];

export default function MascotManager() {
  const [imgs, setImgs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    const supabase = createClient();
    supabase.from('mascot_images').select('key, image_url').then((r: any) => {
      if (r.error) return;
      const map: Record<string, string> = {};
      for (const row of r.data ?? []) map[row.key] = row.image_url;
      setImgs(map);
    });
  }, []);

  async function onPick(key: string, state: 'play' | 'pause', file: File) {
    const full = `${key}-${state}`;
    setError('');
    setNotice('');
    setBusy(full);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('请先登录');
      const url = await uploadMedia(supabase, 'mascots', user.id, file);
      const { error: err } = await supabase.from('mascot_images').upsert(
        { key: full, image_url: url, updated_at: new Date().toISOString() },
        { onConflict: 'key' },
      );
      if (err) throw new Error(err.message);
      setImgs(prev => ({ ...prev, [full]: url }));
      setNotice(`已更新「${MASCOTS[key as MascotMood].label} · ${state === 'play' ? '播放' : '暂停'}」动图。`);
    } catch (e: any) {
      setError(e.message || '上传失败。');
    } finally {
      setBusy(null);
      const el = fileRefs.current[full];
      if (el) el.value = '';
    }
  }

  async function onRemove(key: string, state: 'play' | 'pause') {
    const full = `${key}-${state}`;
    if (!window.confirm(`移除「${MASCOTS[key as MascotMood].label} · ${state === 'play' ? '播放' : '暂停'}」动图？移除后将回退为内置站娘。`)) return;
    const supabase = createClient();
    const { error: err } = await supabase.from('mascot_images').delete().eq('key', full);
    if (err) return setError(err.message);
    setImgs(prev => { const next = { ...prev }; delete next[full]; return next; });
    setNotice('已移除，回退为内置动效。');
  }

  const moods = Object.entries(MASCOTS) as [MascotMood, (typeof MASCOTS)[MascotMood]][];

  return (
    <section className="mt-14">
      <h2 className="font-serif text-2xl mb-2 text-archive-text border-b border-archive-border pb-4">站娘动图</h2>
      <p className="text-sm tracking-widest text-archive-muted mt-4 mb-6">为每个页面形态分别上传「播放 / 暂停」两张动图（GIF/WebP/APNG）。聊天室表情复用播放动图。未上传的形态会使用内置动效。</p>

      {error && <p className="text-sm text-archive-accent mb-4">{error}</p>}
      {notice && <p className="text-sm text-emerald-700 mb-4">{notice}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {moods.map(([mood, def]) => (
          <div key={mood} className="border border-archive-border bg-archive-paper p-5">
            <div className="flex items-center gap-4 mb-4">
              <SiteMascot mood={mood} active size={64} />
              <div>
                <p className="font-serif text-lg text-archive-text">{def.label}</p>
                <p className="text-[11px] text-archive-muted tracking-widest">/ {mood}</p>
              </div>
            </div>
            <div className="space-y-3">
              {STATES.map(([state, slabel]) => {
                const full = `${mood}-${state}`;
                const cur = imgs[full];
                return (
                  <div key={state} className="flex items-center gap-3">
                    {cur ? (
                      <img src={cur} alt={`${def.label}·${slabel}`} className="w-14 h-14 object-cover border border-archive-border rounded-full" />
                    ) : (
                      <span className="w-14 h-14 flex items-center justify-center border border-dashed border-archive-border rounded-full text-xs text-archive-muted">未设置</span>
                    )}
                    <button type="button" onClick={() => fileRefs.current[full]?.click()} disabled={busy === full}
                      className="text-xs tracking-widest text-archive-accent border border-archive-accent/40 px-3 py-1.5 hover:bg-archive-accent hover:text-archive-paper transition-colors disabled:opacity-50">
                      {busy === full ? '上传中…' : `上传${slabel}动图`}
                    </button>
                    <input
                      ref={el => { fileRefs.current[full] = el; }}
                      type="file" accept="image/*,.gif,.webp,.apng" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) onPick(mood, state, f); }}
                    />
                    {cur && (
                      <button type="button" onClick={() => onRemove(mood, state)}
                        className="text-xs tracking-widest text-archive-muted hover:text-archive-accent">移除</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}