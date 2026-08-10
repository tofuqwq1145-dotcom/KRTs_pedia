import { people } from '@/data/people';
import Breadcrumb from '@/components/Breadcrumb';

export default function PeoplePage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-12 fade-in">
      <Breadcrumb items={[{ label: '人物' }]} />
      <h1 className="font-serif text-4xl mb-12 text-archive-text border-b border-archive-border pb-6">人物档案 (Figures)</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {people.map(p => (
          <div key={p.id} className="bg-archive-paper border border-archive-border p-6 hover:border-archive-accent transition-colors">
            <p className="text-xs text-archive-accent mb-3 tracking-widest">{p.category}</p>
            <h3 className="font-serif text-2xl mb-4 text-archive-text">{p.name}</h3>
            <div className="text-sm text-archive-text space-y-2">
              <p><span className="text-archive-muted w-12 inline-block">所属</span> {p.nationId}</p>
              <p><span className="text-archive-muted w-12 inline-block">身份</span> {p.role}</p>
              <p><span className="text-archive-muted w-12 inline-block">状态</span> {p.status}</p>
              <p><span className="text-archive-muted w-12 inline-block">别名</span> {p.aliases.length > 0 ? p.aliases.join(', ') : '暂无资料'}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
