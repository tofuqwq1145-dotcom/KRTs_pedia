import Breadcrumb from '@/components/Breadcrumb';
import { listPages } from '@/lib/pages';
import SearchResults from '@/components/SearchResults';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: '全站检索 | KRTPedia' };

export default async function SearchPage() {
  const all = await listPages();
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 fade-in">
      <Breadcrumb items={[{ label: '检索' }]} />
      <h1 className="font-serif text-4xl mb-8 text-archive-text">全站检索</h1>
      <SearchResults items={all} />
    </div>
  );
}