import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { supabaseConfigured } from '@/lib/supabase/server';

export default async function Navigation() {
  const links = [
    { name: '国家', path: '/nations' }, { name: '人物', path: '/people' },
    { name: '战争', path: '/wars' }, { name: '建筑', path: '/buildings' },
    { name: '事件', path: '/events' }, { name: '编年史', path: '/chronicle' },
    { name: '分级', path: '/series' }, { name: '写作指导', path: '/guide' },
    { name: '聊天室', path: '/chat' }, { name: '关于', path: '/about' },
  ];

  let user: { email?: string } | null = null;
  let avatarUrl = '';
  if (supabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data: { user: u } } = await supabase.auth.getUser();
      user = u;
      if (u) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', u.id)
          .maybeSingle();
        avatarUrl = profile?.avatar_url ?? '';
      }
    } catch {
      user = null;
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-archive-bg/95 backdrop-blur-md border-b border-archive-border">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/" className="group">
          <h1 className="font-serif text-2xl font-bold tracking-widest text-archive-text group-hover:text-archive-accent transition-colors">KRTPEDIA</h1>
          <p className="text-[10px] tracking-[0.2em] text-archive-muted uppercase mt-0.5">Digital Archive</p>
        </Link>
        <nav className="hidden md:flex space-x-8 items-center">
          {links.map(link => (
            <Link key={link.path} href={link.path} className="text-sm tracking-widest text-archive-text hover:text-archive-accent transition-colors">{link.name}</Link>
          ))}
          <Link href="/search" className="text-sm tracking-widest text-archive-muted hover:text-archive-accent transition-colors">检索</Link>
          <span className="w-px h-5 bg-archive-border" />
          <Link href="/submit" className="text-sm tracking-widest text-archive-accent hover:underline">撰写投稿</Link>
          {user ? (
            <Link href="/account" className="flex items-center gap-2 text-sm tracking-widest text-archive-text hover:text-archive-accent transition-colors">
              {avatarUrl && (
                <img src={avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover border border-archive-border" />
              )}
              我的账号
            </Link>
          ) : (
            <Link href="/auth/login" className="text-sm tracking-widest text-archive-text hover:text-archive-accent transition-colors">登录</Link>
          )}
        </nav>
      </div>
    </header>
  );
}