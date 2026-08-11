'use client';

import { useRef, useState } from 'react';
import { uploadMedia } from '@/lib/supabase/upload';

export default function HeroBackground({ initialUrl }: { initialUrl: string }) {
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('请先登录');
      const publicUrl = await uploadMedia(supabase, 'hero', user.id, file);
      const { error: err } = await supabase
        .from('site_settings')
        .upsert({ key: 'hero_image_url', value: publicUrl }, { onConflict: 'key' });
      if (err) throw new Error(err.message);
      setUrl(publicUrl);
      setNotice('背景图已更新，首页刷新即可看到。');
    } catch (err: any) {
      setError(err.message || '上传失败。');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function onClear() {
    if (!window.confirm('确定恢复默认背景（深蓝辉光）？')) return;
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { error: err } = await supabase
        .from('site_settings')
        .delete()
        .eq('key', 'hero_image_url');
      if (err) throw new Error(err.message);
      setUrl('');
      setNotice('已恢复默认背景。');
    } catch (err: any) {
      setError(err.message || '操作失败。');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-0">
      <h2 className="font-serif text-2xl mb-2 text-archive-text border-b border-archive-border pb-4">首页背景图</h2>
      <p className="text-xs tracking-widest text-archive-muted mb-6">设置首页标题区的半透明背景图（建议横向大图，如中世纪城堡/水墨/星云）。上传后立即生效。</p>

      <div className="border border-archive-border bg-archive-paper p-6">
        <div className="flex items-start gap-6 flex-wrap">
          <div className="w-64 h-36 border border-archive-border overflow-hidden bg-archive-bg/50">
            {url ? (
              <img src={url} alt="首页背景预览" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full grid place-items-center text-[11px] tracking-widest text-archive-muted">默认背景（深蓝辉光）</div>
            )}
          </div>
          <div className="flex flex-col gap-4">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={onFile}
              className="block text-xs text-archive-muted file:mr-4 file:px-4 file:py-2 file:border file:border-archive-border file:bg-archive-bg file:text-archive-text file:text-xs file:tracking-widest hover:file:border-archive-accent"
            />
            {url && (
              <button onClick={onClear} disabled={busy}
                className="self-start px-4 py-2 border border-[#b91c1c]/50 text-[#b91c1c] text-xs tracking-widest hover:bg-[#b91c1c] hover:text-white transition-colors disabled:opacity-50">
                恢复默认
              </button>
            )}
            <p className="text-sm">
              {error && <span className="text-archive-accent">{error}</span>}
              {notice && <span className="text-emerald-600">{notice}</span>}
              {busy && <span className="text-archive-muted">处理中…</span>}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
