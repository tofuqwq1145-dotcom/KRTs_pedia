import Link from 'next/link';
import { nations } from '@/data/nations';
import { people } from '@/data/people';
import { events } from '@/data/events';
import { wars } from '@/data/wars';
import { buildings } from '@/data/buildings';

export default function Home() {
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
          <Link href="/about" className="px-8 py-3 border border-archive-border text-sm tracking-widest hover:border-archive-text transition-colors">了解 KRTP</Link>
        </div>
      </section>

      <section className="border-y border-archive-border bg-archive-paper">
        <div className="max-w-5xl mx-auto px-6 py-16 grid grid-cols-2 md:grid-cols-5 gap-8 text-center divide-x divide-archive-border/50">
          <div><p className="text-4xl font-serif mb-2 text-archive-accent">{nations.length}</p><p className="text-xs tracking-widest text-archive-muted">收录国家</p></div>
          <div><p className="text-4xl font-serif mb-2 text-archive-accent">{people.length}</p><p className="text-xs tracking-widest text-archive-muted">人物档案</p></div>
          <div><p className="text-4xl font-serif mb-2 text-archive-accent">{events.length}</p><p className="text-xs tracking-widest text-archive-muted">历史事件</p></div>
          <div><p className="text-4xl font-serif mb-2 text-archive-accent">{wars.length}</p><p className="text-xs tracking-widest text-archive-muted">战争记录</p></div>
          <div><p className="text-4xl font-serif mb-2 text-archive-accent">{buildings.length}</p><p className="text-xs tracking-widest text-archive-muted">收录建筑</p></div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-24">
        <div className="flex justify-between items-end mb-12 border-b border-archive-border pb-4">
          <h2 className="font-serif text-3xl text-archive-text">最新历史记录</h2>
          <Link href="/events" className="text-sm tracking-widest text-archive-accent hover:underline">查看全部 →</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {events.slice(0, 4).map(event => (
            <Link href={`/events`} key={event.id} className="group block bg-archive-paper p-8 border border-archive-border hover:border-archive-accent transition-colors">
              <p className="text-xs text-archive-muted tracking-widest mb-3 uppercase">{event.date} / {event.type}</p>
              <h3 className="font-serif text-xl mb-4 group-hover:text-archive-accent transition-colors line-clamp-1">{event.title}</h3>
              <p className="text-sm text-archive-text leading-relaxed line-clamp-2">{event.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
