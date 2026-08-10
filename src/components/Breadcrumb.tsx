import Link from 'next/link';
export default function Breadcrumb({ items }: { items: { label: string, path?: string }[] }) {
  return (
    <div className="flex items-center space-x-2 text-xs tracking-widest text-archive-muted uppercase mb-10">
      <Link href="/" className="hover:text-archive-accent transition-colors">KRTPedia</Link>
      {items.map((item, idx) => (
        <span key={idx} className="flex items-center space-x-2">
          <span>/</span>
          {item.path ? <Link href={item.path} className="hover:text-archive-accent transition-colors">{item.label}</Link> : <span className="text-archive-text">{item.label}</span>}
        </span>
      ))}
    </div>
  );
}
