import Link from 'next/link';

export default function Navigation() {
  const links = [
    { name: '国家', path: '/nations' }, { name: '人物', path: '/people' },
    { name: '战争', path: '/wars' }, { name: '建筑', path: '/buildings' },
    { name: '事件', path: '/events' }, { name: '编年史', path: '/chronicle' },
    { name: '关于', path: '/about' },
  ];
  return (
    <header className="sticky top-0 z-50 bg-archive-bg/95 backdrop-blur-md border-b border-archive-border">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/" className="group">
          <h1 className="font-serif text-2xl font-bold tracking-widest text-archive-text group-hover:text-archive-accent transition-colors">KRTPEDIA</h1>
          <p className="text-[10px] tracking-[0.2em] text-archive-muted uppercase mt-0.5">Digital Archive</p>
        </Link>
        <nav className="hidden md:flex space-x-8">
          {links.map(link => (
            <Link key={link.path} href={link.path} className="text-sm tracking-widest text-archive-text hover:text-archive-accent transition-colors">{link.name}</Link>
          ))}
          <Link href="/search" className="text-sm tracking-widest text-archive-muted hover:text-archive-accent transition-colors">检索</Link>
        </nav>
      </div>
    </header>
  );
}
