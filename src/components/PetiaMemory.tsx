'use client';

import { useEffect, useState } from 'react';
import { TYPE_LABELS } from '@/lib/labels';

interface PetiaRecord {
  id: string;
  title: string;
  type: string;
  status: string;
  created_at: string;
}

interface PetiaLine {
  id: string;
  content: string;
  created_at: string;
}

export default function PetiaMemory() {
  const [records, setRecords] = useState<PetiaRecord[]>([]);
  const [lines, setLines] = useState<PetiaLine[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const [r, l] = await Promise.all([
        supabase.from('pages').select('id, title, type, status, created_at').eq('source', 'petia').order('created_at', { ascending: false }).limit(5),
        supabase.from('chat_messages').select('id, content, created_at').eq('author_name', 'SCI-Petia').order('created_at', { ascending: false }).limit(5),
      ]);
      if (cancelled) return;
      if (!r.error && r.data) setRecords(r.data as PetiaRecord[]);
      if (!l.error && l.data) setLines(l.data as PetiaLine[]);
    })();
    return () => { cancelled = true; };
  }, []);

  const fmt = (iso: string) => new Date(iso).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  const statusText: Record<string, string> = { pending: '待审', approved: '已录', rejected: '驳回' };

  return (
    <aside className="krt-panel relative rounded-2xl overflow-hidden text-[#efe6d5]">
      <span className="krt-corner top-1.5 left-1.5 border-t border-l rounded-tl" />
      <span className="krt-corner top-1.5 right-1.5 border-t border-r rounded-tr" />
      <span className="krt-corner bottom-1.5 left-1.5 border-b border-l rounded-bl" />
      <span className="krt-corner bottom-1.5 right-1.5 border-b border-r rounded-br" />

      <div className="relative flex items-center justify-between px-4 pt-3 pb-2 border-b border-[#7FB8E4]/20">
        <p className="font-mono text-[11px] tracking-[0.28em] text-[#7FB8E4]">MEMORY <span className="krt-cursor">▌</span></p>
        <span className="font-mono text-[9px] tracking-[0.18em] px-2 py-0.5 rounded-sm border border-[#7FB8E4]/30 text-[#7FB8E4]/90">ARCHIVE</span>
      </div>

      <div className="max-h-[560px] overflow-y-auto px-4 py-4 space-y-5">
        <section>
          <p className="mb-2 font-mono text-[9px] tracking-[0.22em] text-[#7FB8E4]/80">她记下的条目</p>
          {records.length === 0 ? (
            <p className="text-[11px] text-[#7a7059] leading-relaxed">还没有她亲手记下的条目。去 @她 讲讲值得收录的事吧。</p>
          ) : (
            <div className="space-y-2">
              {records.map(r => (
                <div key={r.id} className="border border-[#7FB8E4]/15 bg-[#7FB8E4]/5 px-3 py-2">
                  <p className="text-xs text-[#f3ead8] truncate">{r.title}</p>
                  <p className="mt-0.5 font-mono text-[9px] tracking-[0.14em] text-[#7a7059]">
                    {TYPE_LABELS[r.type as keyof typeof TYPE_LABELS] ?? r.type} · {statusText[r.status] ?? r.status} · {fmt(r.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <p className="mb-2 font-mono text-[9px] tracking-[0.22em] text-[#7FB8E4]/80">她最近说过</p>
          {lines.length === 0 ? (
            <p className="text-[11px] text-[#7a7059] leading-relaxed">她还没开过口。发一句 @站娘 吧。</p>
          ) : (
            <div className="space-y-2">
              {lines.map(l => (
                <div key={l.id} className="border border-[#7FB8E4]/15 bg-[#7FB8E4]/5 px-3 py-2">
                  <p className="text-xs text-[#bcdcf5] leading-relaxed line-clamp-3">{l.content}</p>
                  <p className="mt-1 font-mono text-[9px] tracking-[0.14em] text-[#7a7059]">{fmt(l.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}