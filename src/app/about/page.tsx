import Breadcrumb from '@/components/Breadcrumb';
import Link from 'next/link';
export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 fade-in">
      <Breadcrumb items={[{ label: '关于 KRTPedia' }]} />
      <h1 className="font-serif text-4xl mb-12 text-archive-text border-b border-archive-border pb-6">关于 KRTPedia</h1>
      <div className="bg-archive-paper border border-archive-border p-8 md:p-12 text-archive-text leading-loose">
        <h2 className="font-serif text-2xl mb-8 border-l-4 border-archive-accent pl-4">关于本站</h2>
        <div className="space-y-6 text-sm">
          <p>KRTP（KRTpedia） 是 KRT 中世纪国战服务器的历史与设定知识库。它由“Kachibode”发起，并面向全服务器所有国家和玩家开放共建。</p>
          <p>不同于以往散落在 QQ 群聊、零星截图或玩家个人记忆中的碎片化信息，KRTP 致力于打造一个客观、严谨、系统化的维基式百科。</p>
          <p>在这里，我们将收录：国家、编年史、人物、建筑、事件等一系列相关内容</p>
          <p className="font-bold text-archive-accent text-lg py-4">KRTP 并非属于某一个国家的私有档案，而是一项服务器的公益项目。</p>
        </div>
      </div>
      <div className="mt-8 text-center">
        <Link href="/thanks" className="text-sm tracking-widest text-archive-accent hover:underline">查看致谢名单 →</Link>
      </div>
    </div>
  );
}
