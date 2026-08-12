'use client';

import { useEffect, useState } from 'react';

export default function BanGuard() {
  const [banned, setBanned] = useState(false);

  useEffect(() => {
    let stop = false;
    async function check() {
      try {
        const r = await fetch('/api/me/banned', { cache: 'no-store' });
        const j = await r.json();
        if (!stop && j?.banned) {
          setBanned(true);
          const { createClient } = await import('@/lib/supabase/client');
          const supabase = createClient();
          await supabase.auth.signOut().catch(() => {});
        }
      } catch { /* 忽略 */ }
    }
    check();
    const t = window.setInterval(check, 15000);
    return () => {
      stop = true;
      window.clearInterval(t);
    };
  }, []);

  if (!banned) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0c1521]/95 backdrop-blur-sm">
      <div className="max-w-md w-full mx-6 border border-red-700/40 bg-[#0c1521] p-8 text-center shadow-[0_0_40px_rgba(185,28,28,0.25)]">
        <p className="font-serif text-2xl text-[#f3ead8] mb-3">ACCOUNT SUSPENDED</p>
        <p className="text-sm tracking-widest text-[#d6cbb4] leading-relaxed mb-6">该账号已被封禁，无法继续发言、投稿、评论或进入聊天室。如有疑问请联系站主。</p>
        <p className="font-mono text-[10px] tracking-[0.2em] text-[#8a8069]">SESSION TERMINATED · 登录会话已失效</p>
      </div>
    </div>
  );
}
