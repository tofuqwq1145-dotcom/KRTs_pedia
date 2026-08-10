export default function EmptyState({ entity }: { entity: string }) {
  return (
    <div className="py-24 text-center border border-archive-border bg-archive-paper">
      <p className="font-serif text-2xl text-archive-muted mb-2">暂无记录</p>
      <p className="text-sm text-archive-muted tracking-widest">当前资料库中尚未收录相关 {entity} 档案。</p>
    </div>
  );
}
