import Breadcrumb from '@/components/Breadcrumb';
import ArchiveList from '@/components/ArchiveList';
import { listPages } from '@/lib/pages';

export const metadata = { title: '建筑档案 | KRTPedia' };

export default async function BuildingsPage() {
  const items = await listPages('building');
  return (
    <div className="max-w-5xl mx-auto px-6 py-12 fade-in">
      <Breadcrumb items={[{ label: '建筑' }]} />
      <h1 className="font-serif text-4xl mb-12 text-archive-text border-b border-archive-border pb-6">建筑档案 ({items.length})</h1>
      <ArchiveList items={items} layout="list" />
    </div>
  );
}