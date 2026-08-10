import Breadcrumb from '@/components/Breadcrumb';
import ArchiveList from '@/components/ArchiveList';
import { listPages } from '@/lib/pages';

export const metadata = { title: '人物档案 | KRTPedia' };

export default async function PeoplePage() {
  const items = await listPages('person');
  return (
    <div className="max-w-6xl mx-auto px-6 py-12 fade-in">
      <Breadcrumb items={[{ label: '人物' }]} />
      <h1 className="font-serif text-4xl mb-12 text-archive-text border-b border-archive-border pb-6">人物档案 ({items.length})</h1>
      <ArchiveList items={items} />
    </div>
  );
}