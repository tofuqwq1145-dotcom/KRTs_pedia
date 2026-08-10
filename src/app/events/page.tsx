import { events } from '@/data/events';
import Breadcrumb from '@/components/Breadcrumb';

export default function EventsPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-12 fade-in">
      <Breadcrumb items={[{ label: '事件' }]} />
      <h1 className="font-serif text-4xl mb-12 text-archive-text border-b border-archive-border pb-6">历史事件 (Events)</h1>
      <div className="space-y-8">
        {events.map(e => (
          <div key={e.id} className="bg-archive-paper border border-archive-border p-8 hover:border-archive-accent transition-colors">
            <div className="flex justify-between items-start mb-4 border-b border-archive-border pb-4">
              <p className="text-xs text-archive-accent tracking-widest font-bold">{e.date} / {e.type}</p>
              <p className="text-xs text-archive-muted tracking-widest">{e.status}</p>
            </div>
            <h3 className="font-serif text-2xl mb-4 text-archive-text">{e.title}</h3>
            <p className="text-sm text-archive-text leading-relaxed mb-6">{e.description}</p>
            <div className="text-xs text-archive-muted tracking-widest flex flex-wrap gap-6">
              <span>发生地点: {e.location}</span>
              <span>参与国家: {e.relatedNations.join(', ')}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
