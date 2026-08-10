import Breadcrumb from '@/components/Breadcrumb';
import EmptyState from '@/components/EmptyState';
export default function BuildingsPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-12 fade-in">
      <Breadcrumb items={[{ label: '建筑' }]} />
      <h1 className="font-serif text-4xl mb-12 text-archive-text border-b border-archive-border pb-6">建筑档案 (Buildings)</h1>
      <EmptyState entity="建筑" />
    </div>
  );
}
