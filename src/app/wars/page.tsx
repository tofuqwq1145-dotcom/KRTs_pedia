import Breadcrumb from '@/components/Breadcrumb';
import EmptyState from '@/components/EmptyState';
export default function WarsPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-12 fade-in">
      <Breadcrumb items={[{ label: '战争' }]} />
      <h1 className="font-serif text-4xl mb-12 text-archive-text border-b border-archive-border pb-6">战争与冲突 (Wars)</h1>
      <EmptyState entity="战争" />
    </div>
  );
}
