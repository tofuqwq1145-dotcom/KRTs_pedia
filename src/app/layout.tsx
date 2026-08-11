import './globals.css';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import MusicProvider from '@/components/MusicProvider';
import PresencePulse from '@/components/PresencePulse';
import type { Metadata } from 'next';   // ← 新增这行

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://krts-pedia.vercel.app'),
  title: {
    default: 'KRTPedia | KRT中世纪国战服务器',
    template: '%s | KRTPedia',
  },
  description: '记录一个正在发生的虚拟世界的历史。',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    siteName: 'KRTPedia',
    title: 'KRTPedia | KRT 中世纪数字档案馆',
    description: '记录一个正在发生的虚拟世界的历史。',
  },
  verification: {
    google: 'D-6Or_UgNJbomM8NTbjF1JZfrSdtugEx1IhX5ECUUT8',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <Navigation />
        <main className="min-h-screen">{children}</main>
        <MusicProvider />
        <PresencePulse />
        <div className="site-scan" aria-hidden="true" />
        <footer className="border-t border-archive-border mt-24 py-12 bg-archive-paper">
          <div className="max-w-7xl mx-auto px-6 text-center text-xs tracking-widest text-archive-muted leading-loose">
            <p>KRTPEDIA — KRT MEDIEVAL NATIONAL WAR ARCHIVE</p>
            <p>基于真实服务器历史事件记录，拒绝凭空推测。</p>
            <p className="mt-4">
              <Link href="/thanks" className="hover:text-archive-accent transition-colors">致谢名单</Link>
              <span className="mx-3 text-archive-border">·</span>
              <Link href="/about" className="hover:text-archive-accent transition-colors">关于本站</Link>
            </p>
            <p className="mt-3">Initiated by Kachibode · © 2026</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
