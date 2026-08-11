'use client';

import { useState } from 'react';
import Markdown from './Markdown';

export default function CollapsibleList({ items }: { items: { title: string; body: string }[] }) {
  const [open, setOpen] = useState(0);

  if (items.length === 0) return null;

  return (
    <div className="border border-archive-border mb-6 divide-y divide-archive-border">
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={i}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? -1 : i)}
              className="w-full flex items-center justify-between gap-4 px-5 py-4 bg-archive-paper hover:bg-archive-bg/60 transition-colors text-left"
            >
              <span className="font-serif text-lg text-archive-text">{it.title}</span>
              <svg width="12" height="8" viewBox="0 0 12 8" fill="none" className={`text-archive-muted shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                <path d="M1 1.5l5 5 5-5" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            </button>
            {isOpen && (
              <div className="px-6 py-5 bg-archive-bg/40">
                <Markdown content={it.body} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}