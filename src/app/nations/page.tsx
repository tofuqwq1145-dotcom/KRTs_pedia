import Link from 'next/link';
import { nations } from '@/data/nations';
import Breadcrumb from '@/components/Breadcrumb';

export const metadata = { title: '国家档案 | KRTPedia' };

export default function NationsPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-12 fade-in">
      <Breadcrumb items={[{ label: '国家' }]} />
      <h1 className="font-serif text-4xl mb-12 text-archive-text border-b border-archive-border pb-6">国家档案 (Nations)</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {nations.map(nation => (
          <Link href={`/nations/${nation.id}`} key={nation.id} className="group block bg-archive-paper border border-archive-border p-8 hover:shadow-xl transition-all relative overflow-hidden">
            <h2 className="font-serif text-2xl mb-6 text-archive-text group-hover:text-archive-accent transition-colors">{nation.name}</h2>
            <div className="space-y-3 text-sm tracking-wide text-archive-muted">
              <p><span className="w-16 inline-block opacity-60">状态</span> {nation.status}</p>
              <p><span className="w-16 inline-block opacity-60">时间</span> {nation.time}</p>
              <p><span className="w-16 inline-block opacity-60">定位</span> {nation.alignment}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
