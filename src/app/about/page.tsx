import Breadcrumb from '@/components/Breadcrumb';
export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 fade-in">
      <Breadcrumb items={[{ label: '关于 KRTPedia' }]} />
      <h1 className="font-serif text-4xl mb-12 text-archive-text border-b border-archive-border pb-6">关于 KRTPedia</h1>
      <div className="bg-archive-paper border border-archive-border p-8 md:p-12 text-archive-text leading-loose">
        <h2 className="font-serif text-2xl mb-8 border-l-4 border-archive-accent pl-4">发起宣言</h2>
        <div className="space-y-6 text-sm">
          <p>在过去的岁月中，无数伟大的建筑拔地而起，无数惨烈的战争改变了版图，无数杰出的领袖与成员留下了他们的印记。</p>
          <p>然而现在，时间的流逝，这些辉煌正在逐渐被遗忘。我们曾经历过没有任何历史记录的时代，那导致我们除了依靠越来越模糊的记忆和少数的截图外，别无他法去证明我们曾经创造过什么。</p>
          <p>这是文明的断层，也是我们建立 KRTP 的初衷。</p>
          <p className="font-bold text-archive-accent text-lg py-4">所以我在此宣布：KRTP项目，正式开启！</p>
        </div>
      </div>
    </div>
  );
}
