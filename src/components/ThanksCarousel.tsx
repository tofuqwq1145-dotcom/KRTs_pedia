'use client';

import { useEffect, useState } from 'react';

interface Supporter {
  display_name: string | null;
  avatar_url: string | null;
  title: string | null;
}

function initialOf(name: string | null): string {
  return (name || '佚')[0] ?? '佚';
}

const FADE_MS = 800;
const HOLD_MS = 4200;

export default function ThanksCarousel({ users }: { users: Supporter[] }) {
  const total = users.length;
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  const user = users[Math.min(index, Math.max(total - 1, 0))];

  useEffect(() => {
    if (total <= 1) {
      setVisible(true);
      return;
    }
    const t1 = setTimeout(() => setVisible(false), HOLD_MS);
    const t2 = setTimeout(() => {
      setIndex(i => (i + 1) % total);
      setVisible(true);
    }, HOLD_MS + FADE_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [index, total]);

  if (!user) return null;

  return (
    <div className="krt-thanks-stage relative min-h-[480px] md:min-h-[520px]">
      <span className="krt-scanline" />
      <span className="krt-corner top-3 left-3 border-t border-l rounded-tl" />
      <span className="krt-corner top-3 right-3 border-t border-r rounded-tr" />
      <span className="krt-corner bottom-3 left-3 border-b border-l rounded-bl" />
      <span className="krt-corner bottom-3 right-3 border-b border-r rounded-br" />

      <div className="relative flex flex-col items-center justify-center px-6 py-14">
        <p className="mb-10 font-mono text-[10px] tracking-[0.4em] text-archive-muted uppercase">
          KRT<span className="text-archive-accent">·</span>THANKS
        </p>

        <div
          className={`transition-all duration-700 ease-in-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          <div className="relative w-32 h-32 md:w-36 md:h-36 mx-auto">
            <span className="krt-thanks-ring" />
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt=""
                className="w-full h-full rounded-full object-cover border-2 border-archive-accent/40 shadow-[0_0_28px_rgba(127,184,228,0.25)]"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-archive-accent/15 border-2 border-archive-accent/40 grid place-items-center shadow-[0_0_28px_rgba(127,184,228,0.25)]">
                <span className="font-serif text-5xl text-archive-accent">{initialOf(user.display_name)}</span>
              </div>
            )}
          </div>

          <div className="mt-10 text-center">
            <p className="font-serif text-2xl md:text-3xl text-archive-text tracking-[0.2em]">{user.display_name || '佚名撰稿人'}</p>
            {user.title && (
              <p className="mt-3 text-sm md:text-base text-archive-accent tracking-[0.25em]">「{user.title}」</p>
            )}
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0">
          <div className="flex items-center justify-between px-6 py-4 font-mono text-[10px] tracking-[0.3em] text-archive-muted">
            <span>{String(index + 1).padStart(2, '0')} <span className="text-archive-accent">/</span> {String(total).padStart(2, '0')}</span>
            <span className="krt-thanks-caret text-archive-accent">▌</span>
          </div>
          <div className="h-[2px] bg-archive-border">
            {total > 1 && <div key={index} className="krt-thanks-fill" />}
          </div>
        </div>
      </div>
    </div>
  );
}
