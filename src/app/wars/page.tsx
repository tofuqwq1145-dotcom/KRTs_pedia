import Breadcrumb from '@/components/Breadcrumb';
import ArchiveList from '@/components/ArchiveList';
import { listPages } from '@/lib/pages';

export const metadata = { title: '战争与冲突 | KRTPedia' };

export default async function WarsPage() {
  const items = await listPages('war');
  return (
    <div className="max-w-5xl mx-auto px-6 py-12 fade-in">
      <Breadcrumb items={[{ label: '战争' }]} />
      <h1 className="font-serif text-4xl mb-12 text-archive-text border-b border-archive-border pb-6">战争与冲突 ({items.length})</h1>
      <ArchiveList items={items} layout="list" />
    </div>
  );
}