import Breadcrumb from '@/components/Breadcrumb';
import Link from 'next/link';

const EXTERNAL_LINKS = [
  { label: '站长 · 哔哩哔哩', href: 'https://space.bilibili.com/690424907' },
  { label: '站长 · 抖音', href: 'https://www.douyin.com/user/self' },
  { label: '服主 · 哔哩哔哩', href: 'https://space.bilibili.com/3691008661391453' },
  { label: '服主 · 抖音', href: 'https://www.douyin.com/user/MS4wLjABAAAAgdSAPPLzEHH2yuf_hjo203Gy7udXDCaL0QQgXdqsTEbJThx9V7FM7GT2WJTN4NFw' },
  { label: '相关视频合集', href: 'https://space.bilibili.com/3691008661391453/video' },
];

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

      <div className="mt-8 bg-archive-paper border border-archive-border p-8 md:p-12 text-archive-text leading-loose">
        <h2 className="font-serif text-2xl mb-8 border-l-4 border-archive-accent pl-4">外部联动</h2>
        <p className="text-sm text-archive-muted mb-6">关注站长的创作动态，或在其他平台看到更多关于 KRT 的记录与视频。</p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {EXTERNAL_LINKS.map(l => (
            <li key={l.label}>
              <a href={l.href} target="_blank" rel="noopener noreferrer" className="group flex items-center justify-between border border-archive-border px-4 py-3 text-sm transition-colors hover:border-archive-accent hover:text-archive-accent">
                <span>{l.label}</span>
                <span className="text-archive-muted group-hover:text-archive-accent">↗</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
