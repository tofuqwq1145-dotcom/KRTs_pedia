import Link from 'next/link';
import { getStats, getLatestPages, TYPE_LABELS, fmtDate } from '@/lib/pages';
import ChatRoom from '@/components/ChatRoom';
import Announcements from '@/components/Announcements';

export default async function Home() {
  const stats = await getStats();
  const latest = await getLatestPages(4);

  const statItems = [
    { n: stats.nation, label: '收录国家' },
    { n: stats.person, label: '人物档案' },
    { n: stats.event, label: '历史事件' },
    { n: stats.war, label: '战争记录' },
    { n: stats.building, label: '收录建筑' },
  ];

  return (
    <div className="fade-in">
      <section className="max-w-5xl mx-auto px-6 py-32 text-center">
        <h1 className="font-serif text-5xl md:text-7xl font-bold tracking-tight text-archive-text mb-8">
          KRTPEDIA <br/>
          <span className="text-archive-accent font-normal italic text-3xl md:text-5xl mt-4 block">Archive of KRT Medieval</span>
        </h1>
        <p className="font-serif text-xl text-archive-muted mb-12 tracking-[0.3em]">« 记录一个世界的诞生、战争、国家与文明。 »</p>
        <div className="flex justify-center gap-6">
          <Link href="/nations" className="px-8 py-3 bg-archive-text text-archive-paper text-sm tracking-widest hover:bg-archive-accent transition-colors">进入档案馆</Link>
          <Link href="/submit" className="px-8 py-3 border border-archive-border text-sm tracking-widest hover:border-archive-text transition-colors">撰写投稿</Link>
        </div>
      </section>

      <section className="border-y border-archive-border bg-archive-paper">
        <div className="max-w-5xl mx-auto px-6 py-16 grid grid-cols-2 md:grid-cols-5 gap-8 text-center divide-x divide-archive-border/50">
          {statItems.map(s => (
            <div key={s.label}><p className="text-4xl font-serif mb-2 text-archive-accent">{s.n}</p><p className="text-xs tracking-widest text-archive-muted">{s.label}</p></div>
          ))}
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
    </div>
  );
}