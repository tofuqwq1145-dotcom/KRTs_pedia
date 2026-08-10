import Breadcrumb from '@/components/Breadcrumb';
import ArchiveList from '@/components/ArchiveList';
import { listPages } from '@/lib/pages';

export const metadata = { title: '编年史 | KRTPedia' };

export default async function ChroniclePage() {
  const items = await listPages('chronicle');
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 fade-in">
      <Breadcrumb items={[{ label: '编年史' }]} />
      <div className="mb-16 border-b border-archive-border pb-8">
        <h1 className="font-serif text-4xl mb-4 text-archive-text">KRT 编年史 ({items.length})</h1>
        <p className="text-sm tracking-widest text-archive-muted leading-relaxed">按照时间顺序整理服务器重大历史事件的文档。</p>
      </div>
      <ArchiveList items={items} layout="timeline" />
    </div>
  );
}