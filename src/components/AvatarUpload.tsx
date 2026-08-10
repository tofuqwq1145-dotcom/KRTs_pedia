'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { uploadMedia } from '@/lib/supabase/upload';

export default function AvatarUpload({ userId, avatarUrl }: { userId: string; avatarUrl: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function onPick(file: File) {
    setError('');
    setBusy(true);
    try {
      const supabase = createClient();
      const url = await uploadMedia(supabase, 'avatars', userId, file);
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('id', userId);
      if (updateError) throw new Error(updateError.message);
      router.refresh();
    } catch (e: any) {
      setError(e.message || '上传失败。');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-5 mt-4">
      <div className="w-20 h-20 rounded-full overflow-hidden border border-archive-border bg-archive-bg flex items-center justify-center text-archive-muted shrink-0">
        {avatarUrl ? (
          <img src={avatarUrl} alt="头像" className="w-full h-full object-cover" />
        ) : (
          <span className="text-2xl font-serif">?</span>
        )}
      </div>
      <div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="px-4 py-2 border border-archive-accent text-archive-accent text-xs tracking-widest hover:bg-archive-accent hover:text-archive-paper transition-colors disabled:opacity-50"
        >
          {busy ? '上传中…' : '设置头像'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) onPick(f); }}
        />
        {error && <p className="text-xs text-archive-accent mt-2">{error}</p>}
      </div>
    </div>
  );
}