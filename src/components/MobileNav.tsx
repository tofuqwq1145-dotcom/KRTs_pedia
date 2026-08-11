'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_GROUPS } from '@/data/nav';

export default function MobileNav({ hasUser, avatarUrl }: { hasUser: boolean; avatarUrl: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? '关闭菜单' : '打开菜单'}
        aria-expanded={open}
        className="lg:hidden text-archive-text hover:text-archive-accent transition-colors p-2 text-2xl leading-none"
      >
        {open ? '✕' : '☰'}
      </button>

      {open && (
        <div className="lg:hidden absolute left-0 right-0 top-full bg-archive-bg/98 backdrop-blur-md border-b border-archive-border shadow-2xl max-h-[calc(100vh-5rem)] overflow-y-auto z-50">
          <nav className="max-w-7xl mx-auto px-6 py-4">
            {NAV_GROUPS.map(g => (
              <div key={g.label}>
                <p className="pt-4 pb-1 text-xs tracking-[0.3em] text-archive-muted uppercase">{g.label}</p>
                <div className="grid grid-cols-2 gap-x-4">
                  {g.items.map(i => (
                    <Link key={i.path} href={i.path}
                      className="block py-2.5 text-sm tracking-widest text-archive-text hover:text-archive-accent transition-colors">
                      {i.name}
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            <div className="pt-4 mt-3 border-t border-archive-border flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link href="/search" className="text-sm tracking-widest text-archive-muted hover:text-archive-accent transition-colors">检索</Link>
              <Link href="/submit" className="text-sm tracking-widest text-archive-accent hover:underline">撰写投稿</Link>
              {hasUser ? (
                <Link href="/account" className="flex items-center gap-2 text-sm tracking-widest text-archive-text hover:text-archive-accent transition-colors">
                  {avatarUrl && (
                    <img src={avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover border border-archive-border" />
                  )}
                  我的账号
                </Link>
              ) : (
                <Link href="/auth/login" className="text-sm tracking-widest text-archive-text hover:text-archive-accent transition-colors">登录</Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
