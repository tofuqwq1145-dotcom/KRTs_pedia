import { notFound } from 'next/navigation';
import { nations } from '@/data/nations';
import Breadcrumb from '@/components/Breadcrumb';

export function generateStaticParams() { return nations.map(n => ({ id: n.id })); }

export default function NationDetail({ params }: { params: { id: string } }) {
  const nation = nations.find(n => n.id === params.id);
  if (!nation) notFound();

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 fade-in">
      <Breadcrumb items={[{ label: '国家', path: '/nations' }, { label: nation.name }]} />
      <div className="bg-archive-paper border border-archive-border p-8 md:p-12">
        <div className="border-b border-archive-border pb-8 mb-8 text-center">
          <div className="w-full h-48 bg-archive-bg border border-archive-border mb-8 flex items-center justify-center text-archive-muted text-sm tracking-widest">[ 封面图片预留位 / 暂无资料 ]</div>
          <h1 className="font-serif text-5xl text-archive-text mb-4">{nation.name}</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <section>
            <h3 className="font-serif text-xl border-b border-archive-border pb-2 mb-4 text-archive-text">基本信息</h3>
            <ul className="space-y-4 text-sm text-archive-text tracking-wide">
              <li className="flex"><span className="w-24 text-archive-muted">存在时间</span> {nation.time}</li>
              <li className="flex"><span className="w-24 text-archive-muted">状态</span> {nation.status}</li>
              <li className="flex"><span className="w-24 text-archive-muted">国家定位</span> {nation.alignment}</li>
            </ul>
          </section>
          <section>
            <h3 className="font-serif text-xl border-b border-archive-border pb-2 mb-4 text-archive-text">外交与战史</h3>
            <ul className="space-y-4 text-sm text-archive-text tracking-wide">
              <li className="flex"><span className="w-24 text-archive-muted">外交关系</span> 友好 {nation.diplomacy.friendly} / 敌对 {nation.diplomacy.hostile} / 中立 {nation.diplomacy.neutral}</li>
              <li className="flex"><span className="w-24 text-archive-muted">战争总数</span> {nation.warStats.wars}</li>
              <li className="flex"><span className="w-24 text-archive-muted">胜负记录</span> 胜 {nation.warStats.wins} / 败 {nation.warStats.losses}</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
