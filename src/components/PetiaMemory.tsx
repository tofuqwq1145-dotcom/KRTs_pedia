'use client';

import { useEffect, useRef, useState } from 'react';
import { TYPE_LABELS } from '@/lib/labels';
import SiteMascot from '@/components/SiteMascot';
import { STICKER_MOODS, type MascotMood } from '@/data/mascot';

const BUBBLES = ['>_<', '唔？', '收到', '已归档', '…让我记一下', '♪', '(。-ω-。)', '在的', '咦？'];
const BOT_NAME = 'SCI-Petia';
const STRIP_TAG = /\[mascot:[a-z_]+\]/g;

interface PetiaRecord {
  id: string;
  title: string;
  type: string;
  status: string;
  created_at: string;
  body?: string | null;
}

interface PetiaLine {
  id: string;
  content: string;
  created_at: string;
  who: string;
}

export default function PetiaMemory() {
  const [records, setRecords] = useState<PetiaRecord[]>([]);
  const [lines, setLines] = useState<PetiaLine[]>([]);
  const [mood, setMood] = useState<MascotMood>('chat');
  const [active, setActive] = useState(false);
  const [bubble, setBubble] = useState<string | null>(null);
  const [openRec, setOpenRec] = useState<string[]>([]);
  const [openLine, setOpenLine] = useState<string[]>([]);
  const bubbleTimer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const [r, l] = await Promise.all([
        supabase.from('pages').select('id, title, type, status, body, created_at').eq('source', 'petia').order('created_at', { ascending: false }).limit(5),
        supabase.from('chat_messages').select('id, author_name, content, created_at').order('created_at', { ascending: false }).limit(30),
      ]);
      if (cancelled) return;
      if (!r.error && r.data) setRecords(r.data as PetiaRecord[]);
      if (!l.error && l.data) {
        const chrono = [...l.data].reverse();
        const collected: PetiaLine[] = [];
        let who = '…';
        for (const m of chrono) {
          if (m.author_name === BOT_NAME) {
            collected.push({
              id: m.id,
              content: m.content,
              created_at: m.created_at,
              who,
            });
          } else {
            who = m.author_name;
          }
        }
        collected.reverse();
        setLines(collected.slice(0, 5));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => () => {
    if (bubbleTimer.current !== null) window.clearTimeout(bubbleTimer.current);
  }, []);

  function tapMascot() {
    const m = STICKER_MOODS[Math.floor(Math.random() * STICKER_MOODS.length)].mood;
    const a = Math.random() < 0.5;
    setMood(m);
    setActive(a);
    setBubble(BUBBLES[Math.floor(Math.random() * BUBBLES.length)]);
    if (bubbleTimer.current !== null) window.clearTimeout(bubbleTimer.current);
    bubbleTimer.current = window.setTimeout(() => setBubble(null), 1400);
  }

  const fmt = (iso: string) => new Date(iso).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  const statusText: Record<string, string> = { pending: '待审', approved: '已录', rejected: '驳回' };
  const toggle = (arr: string[], set: (v: string[]) => void, id: string) =>
    set(arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]);

  return (
    <aside className="krt-panel relative rounded-2xl text-[#efe6d5]">
      <span className="krt-corner top-1.5 left-1.5 border-t border-l rounded-tl" />
      <span className="krt-corner top-1.5 right-1.5 border-t border-r rounded-tr" />
      <span className="krt-corner bottom-1.5 left-1.5 border-b border-l rounded-bl" />
      <span className="krt-corner bottom-1.5 right-1.5 border-b border-r rounded-br" />

      <div className="relative flex items-center justify-between px-4 pt-3 pb-2 border-b border-[#7FB8E4]/20">
        <button onClick={tapMascot} className="relative shrink-0" title="点击召唤，随机切换她的表情动图">
          {bubble && (
            <span className="absolute -top-9 left-0 z-10 px-2 py-0.5 rounded-md bg-[#0c1521]/95 border border-[#7FB8E4]/50 text-[#bcdcf5] text-[11px] tracking-widest whitespace-nowrap shadow-[0_4px_16px_rgba(0,0,0,0.5)] animate-bubble">
              {bubble}
            </span>
          )}
          <SiteMascot mood={mood} active={active} size={56} />
        </button>
        <p className="font-mono text-[11px] tracking-[0.28em] text-[#7FB8E4]">MEMORY <span className="krt-cursor">▌</span></p>
        <span className="font-mono text-[9px] tracking-[0.18em] px-2 py-0.5 rounded-sm border border-[#7FB8E4]/30 text-[#7FB8E4]/90">ARCHIVE</span>
      </div>

      <div className="max-h-[640px] overflow-y-auto px-4 py-4 space-y-5">
        <section>
          <p className="mb-2 font-mono text-[9px] tracking-[0.22em] text-[#7FB8E4]/80">她记下的条目</p>
          {records.length === 0 ? (
            <p className="text-[11px] text-[#7a7059] leading-relaxed">还没有她亲手记下的条目。去 @她 讲讲值得收录的事吧。</p>
          ) : (
            <div className="space-y-2">
              {records.map(r => {
                const open = openRec.includes(r.id);
                const excerpt = (r.body ?? '').replace(/\s+/g, ' ').trim();
                return (
                  <div key={r.id} className="border border-[#7FB8E4]/15 bg-[#7FB8E4]/5 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-[#f3ead8] truncate">{r.title}</p>
                      {excerpt && (
                        <button
                          onClick={() => toggle(openRec, setOpenRec, r.id)}
                          className="shrink-0 font-mono text-[9px] tracking-[0.14em] text-[#7FB8E4] hover:text-[#bcdcf5]"
                        >
                          {open ? '收起 ▲' : '展开 ▼'}
                        </button>
                      )}
                    </div>
                    <p className="mt-0.5 font-mono text-[9px] tracking-[0.14em] text-[#7a7059]">
                      {TYPE_LABELS[r.type as keyof typeof TYPE_LABELS] ?? r.type} · {statusText[r.status] ?? r.status} · {fmt(r.created_at)}
                    </p>
                    {open && excerpt && (
                      <p className="mt-2 text-[11px] leading-relaxed text-[#d8cbb0]">{excerpt.slice(0, 420)}{excerpt.length > 420 ? '……' : ''}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <p className="mb-2 font-mono text-[9px] tracking-[0.22em] text-[#7FB8E4]/80">她最近说过</p>
          {lines.length === 0 ? (
            <p className="text-[11px] text-[#7a7059] leading-relaxed">她还没开过口。发一句 @站娘 吧。</p>
          ) : (
            <div className="space-y-2">
              {lines.map(l => {
                const open = openLine.includes(l.id);
                const text = l.content.replace(STRIP_TAG, '').trim();
                const needExpand = text.length > 96;
                return (
                  <div key={l.id} className="border border-[#7FB8E4]/15 bg-[#7FB8E4]/5 px-3 py-2">
                    {text ? (
                      <p className={`text-xs text-[#bcdcf5] leading-relaxed ${!open ? 'line-clamp-3' : ''}`}>{text}</p>
                    ) : (
                      <p className="text-xs text-[#7a7059] italic">（一张表情动图）</p>
                    )}
                    {needExpand && (
                      <button
                        onClick={() => toggle(openLine, setOpenLine, l.id)}
                        className="mt-1 font-mono text-[9px] tracking-[0.14em] text-[#7FB8E4] hover:text-[#bcdcf5]"
                      >
                        {open ? '收起 ▲' : '展开全文 ▼'}
                      </button>
                    )}
                    <p className="mt-1 font-mono text-[9px] tracking-[0.14em] text-[#7a7059]">
                      和 {l.who} 聊 · {fmt(l.created_at)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}
