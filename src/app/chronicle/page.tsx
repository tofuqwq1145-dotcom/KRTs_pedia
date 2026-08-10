import Breadcrumb from '@/components/Breadcrumb';
import { chronicle } from '@/data/chronicle';

export default function ChroniclePage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 fade-in">
      <Breadcrumb items={[{ label: '编年史' }]} />
      <div className="mb-16 border-b border-archive-border pb-8">
        <h1 className="font-serif text-4xl mb-4 text-archive-text">KRT 编年史 (Chronicle)</h1>
        <p className="text-sm tracking-widest text-archive-muted leading-relaxed">按照时间顺序整理服务器重大历史事件的文档。</p>
      </div>
      <div className="relative border-l border-archive-border ml-[5px] md:ml-4 space-y-16">
        {chronicle.map(entry => (
          <div key={entry.id} className="relative pl-8 md:pl-12">
            <span className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-archive-bg border-2 border-archive-accent"></span>
            <div className="text-archive-accent text-sm tracking-[0.2em] mb-2 font-bold">{entry.date}</div>
            <h3 className="font-serif text-2xl mb-4 text-archive-text">{entry.title}</h3>
            <div className="bg-archive-paper border border-archive-border p-6 shadow-sm hover:border-archive-accent transition-colors">
              <p className="text-sm text-archive-text leading-loose">{entry.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
