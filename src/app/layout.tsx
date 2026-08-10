import './globals.css';
import Navigation from '@/components/Navigation';
import type { Metadata } from 'next';   // ← 新增这行

export const metadata: Metadata = {      // ← 加上 : Metadata 类型标注
  metadataBase: new URL('https://krt-server.vercel.app'),   // ← 新增
  title: {
    default: 'KRTPedia | KRT中世纪国战服务器',             // ← 原 title 放这里
    template: '%s | KRTPedia',                              // ← 新增模板
  },
  description: '记录一个正在发生的虚拟世界的历史。',         // ← 原 description
  alternates: {                                              // ← 新增
    canonical: '/',
  },
  openGraph: {                                               // ← 新增（控制社交分享预览）
    type: 'website',
    siteName: 'KRTPedia',
    title: 'KRTPedia | KRT 中世纪数字档案馆',
    description: '记录一个正在发生的虚拟世界的历史。',
  },
  verification: {                                            // ← 新增（放 Google 验证码）
    google: 'D-6Or_UgNJbomM8NTbjF1JZfrSdtugEx1IhX5ECUUT8',                                 // ← 从 GSC 复制过来替换
  },
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
