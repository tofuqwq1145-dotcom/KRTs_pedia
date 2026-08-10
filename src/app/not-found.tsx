import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center fade-in">
      <h1 className="font-serif text-6xl text-archive-accent mb-4">404</h1>
      <p className="tracking-widest text-archive-muted mb-8 text-sm">此历史档案不存在，或资料暂未收录。</p>
      <Link href="/" className="px-8 py-3 border border-archive-border hover:bg-archive-paper transition-colors text-sm tracking-widest">返回档案馆首页</Link>
    </div>
  );
}
