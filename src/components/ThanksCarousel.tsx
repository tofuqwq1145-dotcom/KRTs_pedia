'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Supporter {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  title: string | null;
}

function initialOf(name: string | null): string {
  return (name || '佚')[0] ?? '佚';
}

const FADE_IN_MS = 3000;
const HOLD_MS = 3000;
const FADE_OUT_MS = 3000;

export default function ThanksCarousel({ users }: { users: Supporter[] }) {
  const total = users.length;
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  const user = users[Math.min(index, Math.max(total - 1, 0))];

  useEffect(() => {
    setVisible(true);
  }, []);

  useEffect(() => {
    if (total <= 1) return;
    const t1 = setTimeout(() => setVisible(false), HOLD_MS);
    const t2 = setTimeout(() => {
      setIndex(i => (i + 1) % total);
      setVisible(true);
    }, HOLD_MS + FADE_OUT_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [index, total]);

  if (!user) return null;

  return (
    <div className="krt-thanks-stage relative min-h-[480px] md:min-h-[520px]">
      <span className="krt-corner top-3 left-3 border-t border-l rounded-tl" />
      <span className="krt-corner top-3 right-3 border-t border-r rounded-tr" />
      <span className="krt-corner bottom-3 left-3 border-b border-l rounded-bl" />
      <span className="krt-corner bottom-3 right-3 border-b border-r rounded-br" />

      <div className="relative flex flex-col items-center justify-center px-6 py-14">
        <p className="mb-10 font-mono text-[10px] tracking-[0.4em] text-archive-muted uppercase">
          KRT<span className="text-archive-accent">·</span>THANKS
        </p>

        <div
          className={`transition-all duration-[3000ms] ease-in-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        >
          <Link href={`/a/${user.id}`} className="block relative w-32 h-32 md:w-36 md:h-36 mx-auto" title={user.display_name || '佚名撰稿人'}>
            <span className="krt-thanks-ring" />
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt=""
                className="w-full h-full rounded-full object-cover border-2 border-archive-accent/40 shadow-[0_0_28px_rgba(127,184,228,0.25)] hover:border-archive-accent transition-colors"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-archive-accent/15 border-2 border-archive-accent/40 grid place-items-center shadow-[0_0_28px_rgba(127,184,228,0.25)] hover:border-archive-accent transition-colors">
                <span className="font-serif text-5xl text-archive-accent">{initialOf(user.display_name)}</span>
              </div>
            )}
          </Link>

          <div className="mt-10 text-center">
            <Link href={`/a/${user.id}`} className="inline-block font-serif text-2xl md:text-3xl text-archive-text tracking-[0.2em] hover:text-archive-accent transition-colors">
              {user.display_name || '佚名撰稿人'}
            </Link>
            {user.title && (
              <p className="mt-3 text-sm md:text-base text-archive-accent tracking-[0.25em]">「{user.title}」</p>
            )}
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-6 py-4 font-mono text-[10px] tracking-[0.3em] text-archive-muted">
          <span>{String(index + 1).padStart(2, '0')} <span className="text-archive-accent">/</span> {String(total).padStart(2, '0')}</span>
          <span className="krt-thanks-caret text-archive-accent">▌</span>
        </div>
      </div>
    </div>
  );
}
