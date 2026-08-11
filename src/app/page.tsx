import Link from 'next/link';
import { getLatestPages, TYPE_LABELS, fmtDate } from '@/lib/pages';
import ChatRoom from '@/components/ChatRoom';
import Announcements from '@/components/Announcements';

export default async function Home() {
  const latest = await getLatestPages(4);

  return (
    <div className="fade-in">
      <section className="relative overflow-hidden border-b border-archive-border">
        <div className="hero-bg absolute inset-0" aria-hidden="true" />
        <div className="hero-grid absolute inset-0" aria-hidden="true" />
        <div className="hero-scan absolute inset-0" aria-hidden="true" />
        <div className="absolute inset-0 bg-archive-bg/60" aria-hidden="true" />
        <div className="relative max-w-5xl mx-auto px-6 py-32 md:py-40 text-center">
          <div className="hero-breathe" aria-hidden="true" />
          <div className="relative inline-block px-10 py-6">
            <span className="hud-cr hud-cr-tl" aria-hidden="true" />
            <span className="hud-cr hud-cr-tr" aria-hidden="true" />
            <span className="hud-cr hud-cr-bl" aria-hidden="true" />
            <span className="hud-cr hud-cr-br" aria-hidden="true" />
            <p className="anim-rise anim-d1 font-mono text-xs md:text-sm tracking-[0.45em] text-archive-accent uppercase mb-8">Medieval Digital Archive</p>
            <h1 className="hero-title-glow font-serif text-5xl md:text-8xl font-bold tracking-tight text-archive-text">
              <span className="anim-rise anim-d2 block">KRTPEDIA</span>
              <span className="anim-rise anim-d3 text-archive-accent font-normal italic text-3xl md:text-5xl mt-5 block">Archive of KRT Medieval</span>
            </h1>
            <p className="anim-rise anim-d4 font-serif text-xl text-archive-muted mb-12 tracking-[0.3em]">« 记录一个世界的诞生、战争、国家与文明。 »</p>
            <div className="anim-rise anim-d5 flex justify-center gap-6">
              <Link href="/nations" className="px-8 py-3 bg-archive-accent text-archive-paper text-sm tracking-widest hover:bg-[#A9D4F0] transition-colors">进入档案馆</Link>
              <Link href="/submit" className="px-8 py-3 border border-archive-accent/40 text-archive-text text-sm tracking-widest hover:border-archive-accent hover:text-archive-accent transition-colors">撰写投稿</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-archive-border bg-archive-bg/40">
        <div className="max-w-6xl mx-auto px-6 py-20 grid grid-cols-1 lg:grid-cols-5 gap-10">
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-3xl text-archive-text">实时聊天室</h2>
              <Link href="/chat" className="text-sm tracking-widest text-archive-accent hover:underline">进入聊天室 →</Link>
            </div>
            <ChatRoom />
          </div>
          <div className="lg:col-span-2">
            <div className="mb-6">
              <h2 className="font-serif text-3xl text-archive-text">站内公告</h2>
            </div>
            <Announcements />
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-24">
        <div className="flex justify-between items-end mb-12 border-b border-archive-border pb-4">
          <h2 className="font-serif text-3xl text-archive-text">最新历史记录</h2>
          <Link href="/events" className="text-sm tracking-widest text-archive-accent hover:underline">查看全部 →</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {latest.map(item => (
            <Link href={`/pages/${item.slug}`} key={item.slug} className="group block bg-archive-paper p-8 border border-archive-border hover:border-archive-accent transition-colors">
              <p className="text-xs text-archive-muted tracking-widest mb-3 uppercase">{fmtDate(item.created_at)} / {TYPE_LABELS[item.type]}</p>
              <h3 className="font-serif text-xl mb-4 group-hover:text-archive-accent transition-colors line-clamp-1">{item.title}</h3>
              <p className="text-sm text-archive-text leading-relaxed line-clamp-2">{item.excerpt}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}