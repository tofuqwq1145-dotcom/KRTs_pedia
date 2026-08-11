import { MASCOTS, type MascotMood } from '@/data/mascot';

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
  const def = MASCOTS[mood];

  return (
    <span
      className={`mascot ${active ? 'mascot-play' : 'mascot-idle'}`}
      style={{ width: size, height: size, background: `radial-gradient(circle at 35% 30%, ${def.bgB}, ${def.bgA})` }}
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

      {def.overlay === 'bars' && (
        <span className="mascot-bars"><span /><span /><span /></span>
      )}
      {def.overlay === 'embers' && (
        <span className="mascot-embers"><span /><span /><span /></span>
      )}
      {def.overlay === 'bubble' && <span className="mascot-bubble">··</span>}
      {def.overlay === 'pen' && <span className="mascot-pen" />}

      <svg viewBox="0 0 64 64" className="mascot-girl" aria-hidden="true">
        <circle cx="32" cy="30" r="13.5" fill={def.dress === '#e8eef5' ? '#f6d9c4' : '#f7d9bd'} />
        <path d="M20 26c0-8 5-13 12-13s12 5 12 13c0-4-2-6-5-7-1-3-4-5-7-5s-6 2-7 5c-3 1-5 3-5 7z" fill={def.hair} />
        <circle cx="27" cy="31" r="1.8" fill="#2b2b2b" />
        <circle cx="37" cy="31" r="1.8" fill="#2b2b2b" />
        <circle cx="26.2" cy="30.4" r="0.6" fill="#fff" />
        <circle cx="36.2" cy="30.4" r="0.6" fill="#fff" />
        <path d="M30.5 35c.9.9 2.1.9 3 0" stroke="#c47a5a" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        <circle cx="24" cy="36" r="2.2" fill="#edb3a0" opacity="0.85" />
        <circle cx="40" cy="36" r="2.2" fill="#edb3a0" opacity="0.85" />
        <path d="M14 62c2-12 10-18 18-18s16 6 18 18z" fill={def.dress} stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
        <rect x="18" y="47" width="10" height="5" rx="2.5" fill="#f7d9bd" />
        <rect x="36" y="47" width="10" height="5" rx="2.5" fill="#f7d9bd" />
      </svg>
    </span>
  );
}