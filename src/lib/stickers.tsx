import type { ReactNode } from 'react';
import SiteMascot from '@/components/SiteMascot';
import { isMascotMood, type MascotMood } from '@/data/mascot';

const RE = /(\[mascot:[a-z]+\])/g;

export function renderStickers(text: string, size = 44): ReactNode[] {
  const out: ReactNode[] = [];
  const parts = text.split(RE);
  parts.forEach((part, i) => {
    if (!part) return;
    if (part.startsWith('[mascot:')) {
      const mood = part.slice('[mascot:'.length, -1) as MascotMood;
      if (isMascotMood(mood)) {
        out.push(<SiteMascot key={`${i}-${part}`} mood={mood} active size={size} />);
        return;
      }
    }
    out.push(part);
  });
  return out;
}