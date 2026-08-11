'use client';

import { useEffect, useState } from 'react';
import { MASCOTS, type MascotMood } from '@/data/mascot';

interface ImgMap { [key: string]: string }

let cachePromise: Promise<ImgMap> | null = null;

function loadImages(): Promise<ImgMap> {
  if (!cachePromise) {
    cachePromise = (async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data } = await supabase.from('mascot_images').select('key, image_url');
        const map: ImgMap = {};
        for (const r of (data ?? []) as { key: string; image_url: string }[]) {
          map[r.key] = r.image_url;
        }
        return map;
      } catch {
        return {};
      }
    })();
  }
  return cachePromise;
}

export default function SiteMascot({
  mood = 'home',
  active = false,
  size = 56,
  title,
}: {
  mood?: MascotMood;
  active?: boolean;
  size?: number;
  title?: string;
}) {
  const [imgs, setImgs] = useState<ImgMap | null>(null);

  useEffect(() => {
    let mounted = true;
    loadImages().then(map => { if (mounted) setImgs(map); });
    return () => { mounted = false; };
  }, []);

  const def = MASCOTS[mood];
  const key = `${mood}-${active ? 'play' : 'pause'}`;
  const url = imgs?.[key];

  if (url) {
    return (
      <span className="mascot" style={{ width: size, height: size }} title={title ?? def.label} aria-label={def.label}>
        <img src={url} alt={def.label} className="w-full h-full object-cover" draggable={false} />
      </span>
    );
  }

  return (
    <span
      className={`mascot ${active ? 'mascot-play' : 'mascot-idle'}`}
      style={{ width: size, height: size }}
      title={title ?? def.label}
      aria-label={def.label}
    >
      {active && (
        <>
          <span className="mascot-note n1">♪</span>
          <span className="mascot-note n2">♫</span>
          <span className="mascot-note n3">♪</span>
        </>
      )}

      <span className="mascot-fallback">
        <span className="mascot-fallback-ring" />
        <span className="mascot-fallback-note" style={{ fontSize: Math.max(size * 0.42, 14) }}>♪</span>
      </span>
    </span>
  );
}