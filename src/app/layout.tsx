import './globals.css';
import Navigation from '@/components/Navigation';

export const metadata = {
  title: 'KRTPedia | KRT 中世纪数字档案馆',
  description: '记录一个正在发生的虚拟世界的历史。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <Navigation />
        <main className="min-h-screen">{children}</main>
        <footer className="border-t border-archive-border mt-24 py-12 bg-archive-paper">
          <div className="max-w-7xl mx-auto px-6 text-center text-xs tracking-widest text-archive-muted leading-loose">
            <p>KRTPEDIA — KRT MEDIEVAL NATIONAL WAR ARCHIVE</p>
            <p>基于真实服务器历史事件记录，拒绝凭空推测。</p>
            <p className="mt-4">Initiated by Kachibode · © 2026</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
