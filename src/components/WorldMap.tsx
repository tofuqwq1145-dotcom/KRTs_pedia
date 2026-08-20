'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { NATION_ALIASES } from '@/data/nationAliases';

interface MapLocation {
  id: string;
  nationId: string;
  country: string;
  name: string;
  lat: number;
  lon: number;
  type: string;
  status: string;
  desc: string;
}

// 与 src/data/nations.ts 一一对应的国家节点。文案保持档案库中性口吻，
// 不虚构历史（废除原稿中"沙皇国/教宗国/大公国/帝国"等与站内国家档案不符的表述及捏造数字）。
const LOCATIONS: MapLocation[] = [
  { id: 'russia', nationId: 'russia', country: '俄罗斯', name: '莫斯科', lat: 55.7558, lon: 37.6173, type: '首都节点', status: '存在', desc: '俄罗斯档案主节点，坐标莫斯科。国家档案已接入全站检索，史料持续补全中。' },
  { id: 'prussia', nationId: 'prussia', country: '普鲁士', name: '哥尼斯堡', lat: 54.7104, lon: 20.4522, type: '首都节点', status: '存在', desc: '普鲁士档案主节点，坐标哥尼斯堡。档案卷宗已接入全站检索，史料持续补全中。' },
  { id: 'italy', nationId: 'italy', country: '意大利', name: '罗马', lat: 41.9028, lon: 12.4964, type: '首都节点', status: '存在', desc: '意大利档案主节点，坐标罗马。国家定位为中立国，档案卷宗已接入全站检索。' },
  { id: 'finland', nationId: 'finland', country: '芬兰', name: '图尔库', lat: 60.4518, lon: 22.2666, type: '首都节点', status: '存在', desc: '芬兰档案主节点，坐标图尔库。档案卷宗已接入全站检索，史料持续补全中。' },
  { id: 'france', nationId: 'france', country: '法兰西', name: '巴黎', lat: 48.8566, lon: 2.3522, type: '首都节点', status: '存在', desc: '法兰西档案主节点，坐标巴黎。档案卷宗已接入全站检索，史料持续补全中。' },
  { id: 'england', nationId: 'england', country: '英格兰', name: '伦敦', lat: 51.5074, lon: -0.1278, type: '首都节点', status: '存在', desc: '英格兰档案主节点，坐标伦敦。档案卷宗已接入全站检索，史料持续补全中。' },
  { id: 'austria', nationId: 'austria', country: '奥地利', name: '维也纳', lat: 48.2082, lon: 16.3738, type: '首都节点', status: '存在', desc: '奥地利档案主节点，坐标维也纳。档案卷宗已接入全站检索，史料持续补全中。' },
  { id: 'osman', nationId: 'osman', country: '奥斯曼', name: '君士坦丁堡', lat: 41.0082, lon: 28.9784, type: '首都节点', status: '存在', desc: '奥斯曼档案主节点，坐标君士坦丁堡。档案卷宗已接入全站检索，史料持续补全中。' },
  { id: 'sweden', nationId: 'sweden', country: '瑞典', name: '斯德哥尔摩', lat: 59.3293, lon: 18.0686, type: '首都节点', status: '存在', desc: '瑞典档案主节点，坐标斯德哥尔摩。档案卷宗已接入全站检索，史料持续补全中。' },
  { id: 'denmark', nationId: 'denmark', country: '丹麦', name: '哥本哈根', lat: 55.6761, lon: 12.5683, type: '首都节点', status: '存在', desc: '丹麦档案主节点，坐标哥本哈根。档案卷宗已接入全站检索，史料持续补全中。' },
];

const WORLD_W = 4000;
const WORLD_H = 4000;
const GEOJSON_URL = 'https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_50m_admin_0_countries.geojson';

const BOOT_LINES = [
  'KRT ARCHIVE SYSTEM BOOT SEQUENCE INITIATED...',
  'ESTABLISHING SECURE TERMINAL LINK.......... OK',
  'AUTHENTICATING ARCHIVE DATABASE............ OK',
  'LOADING WORLD GEOGRAPHIC INDEX............. OK',
  'SYNCHRONIZING NATION DATA NODES...',
  'AWAITING GLOBAL MATRIX ALIGNMENT...',
];

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@100..800&display=swap');

.world-root {
  --bg-color: #010306;
  --grid-color: rgba(51, 170, 255, 0.04);
  --primary: #33aaff;
  --primary-dim: rgba(51, 170, 255, 0.35);
  --primary-glow: rgba(51, 170, 255, 0.6);
  --alert: #ffaa33;
  --text-dark: #010306;
  --inv-scale: 1;
}
.world-root * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; }
body.world-immersive { overflow: hidden; background-color: #010306; }
body.world-immersive > header, body.world-immersive > footer { display: none; }

.world-root {
  position: fixed; inset: 0; z-index: 40;
  background-color: var(--bg-color);
  color: var(--primary);
  font-family: 'JetBrains Mono', monospace;
  overflow: hidden;
}
.world-root .scanlines { position: fixed; inset: 0; pointer-events: none; z-index: 999; overflow: hidden; }
.world-root .scanlines::before {
  content: ''; position: absolute; top: -100px; left: 0; right: 0; bottom: -100px;
  background: linear-gradient(to bottom, rgba(255,255,255,0) 50%, rgba(0,0,0,0.25) 50%);
  background-size: 100% 4px; animation: wrScanlineScroll 5s linear infinite; will-change: transform;
}
.world-root .scanlines::after {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 12vh;
  background: linear-gradient(to bottom, transparent, rgba(51, 170, 255, 0.02), rgba(51, 170, 255, 0.08), transparent);
  animation: wrScanBar 6s linear infinite; will-change: transform;
}
@keyframes wrScanlineScroll { 0% { transform: translate3d(0,0,0); } 100% { transform: translate3d(0,40px,0); } }
@keyframes wrScanBar { 0% { transform: translate3d(0,-100vh,0); } 100% { transform: translate3d(0,100vh,0); } }
.world-root .vignette {
  position: fixed; inset: 0; pointer-events: none; z-index: 998;
  background: radial-gradient(circle at center, transparent 40%, #000 120%);
}

#world-boot-screen {
  position: fixed; inset: 0; z-index: 2000; background-color: var(--bg-color);
  display: flex; flex-direction: column; justify-content: center; align-items: center;
  transition: opacity 1.2s cubic-bezier(0.16,1,0.3,1), transform 1.2s cubic-bezier(0.16,1,0.3,1);
}
#world-boot-screen.fade-out { opacity: 0; transform: scale(1.05); pointer-events: none; }
#world-init-btn {
  font-size: 16px; letter-spacing: 4px; color: var(--primary);
  border: 1px solid var(--primary-dim); padding: 15px 40px; cursor: pointer;
  background: rgba(51, 170, 255, 0.05); box-shadow: 0 0 20px rgba(51, 170, 255, 0.1);
  transition: all 0.3s; animation: wrPulseInit 2s infinite; text-transform: uppercase;
  font-family: inherit;
}
#world-init-btn:hover { background: var(--primary); color: var(--text-dark); box-shadow: 0 0 40px var(--primary-glow); }
@keyframes wrPulseInit { 0%,100% { opacity: 0.7; } 50% { opacity: 1; } }
#world-boot-terminal {
  display: none; width: 60%; max-width: 800px;
  font-size: 14px; line-height: 1.8; letter-spacing: 2px;
  color: var(--primary); text-shadow: 0 0 8px var(--primary-dim); text-align: left;
}
.world-boot-line { margin-bottom: 10px; }

.world-root .hud-corner { position: absolute; width: 3vw; height: 3vw; min-width: 20px; min-height: 20px; border: 2px solid var(--primary-dim); z-index: 50; opacity: 0; transition: opacity 2s ease 1s; }
.world-root.sys-ready .hud-corner { opacity: 1; }
.world-root .hud-tl { top: 20px; left: 20px; border-right: none; border-bottom: none; }
.world-root .hud-tr { top: 20px; right: 20px; border-left: none; border-bottom: none; }
.world-root .hud-bl { bottom: 20px; left: 20px; border-right: none; border-top: none; }
.world-root .hud-br { bottom: 20px; right: 20px; border-left: none; border-top: none; }
.world-root .hud-text { position: absolute; font-size: 12px; z-index: 50; opacity: 0; letter-spacing: 1px; text-shadow: 0 0 5px var(--primary-dim); transition: opacity 2s ease 1s; }
.world-root.sys-ready .hud-text { opacity: 0.8; }
.world-root .hud-title { top: 25px; left: 40px; font-weight: bold; font-size: 14px; }
.world-root .hud-status { bottom: 25px; right: 40px; }
.world-root .hud-coords { top: 25px; right: 40px; text-align: right; }
.world-root .hud-controls { bottom: 25px; left: 40px; opacity: 0.5; }

#world-container {
  position: absolute; top: 50%; left: 50%; width: 4000px; height: 4000px;
  margin-left: -2000px; margin-top: -2000px; transform-origin: center center;
  transition: transform 0.8s cubic-bezier(0.16,1,0.3,1); opacity: 0; will-change: transform;
}
.world-root.sys-ready #world-container { opacity: 1; animation: wrMapReveal 1.2s cubic-bezier(0.16,1,0.3,1); }
@keyframes wrMapReveal { 0% { opacity: 0; transform: scale(1.1); } 100% { opacity: 1; transform: scale(1); } }
#world-container::before {
  content: ''; position: absolute; inset: 0;
  background-image: linear-gradient(var(--grid-color) 1px, transparent 1px), linear-gradient(90deg, var(--grid-color) 1px, transparent 1px);
  background-size: 80px 80px; pointer-events: none;
}
svg#map-svg { width: 100%; height: 100%; fill: none; stroke: var(--primary-dim); }
svg#map-svg path { vector-effect: non-scaling-stroke; stroke-width: 1px; stroke-linejoin: round; stroke-linecap: round; }
#focus-overlay { position: absolute; inset: 0; background: rgba(1,3,6,0.7); opacity: 0; transition: opacity 0.8s ease; pointer-events: none; z-index: 5; }
#world-container.focused #focus-overlay { opacity: 1; }

.world-root .loc-point {
  position: absolute; transform-origin: center center; z-index: 10; opacity: 0;
  transform: scale(var(--inv-scale)) translateZ(0); will-change: transform;
}
.world-root.sys-ready .loc-point { opacity: 1; transition: opacity 1s ease 1s; }
.world-root .loc-dot { position: absolute; top: -3px; left: -3px; width: 6px; height: 6px; background: var(--primary-dim); border-radius: 50%; cursor: pointer; box-shadow: 0 0 10px var(--primary-dim); transition: all 0.3s ease; }
.world-root .loc-label { position: absolute; top: -18px; left: 12px; font-size: 12px; opacity: 0; pointer-events: none; white-space: nowrap; transition: all 0.3s ease; letter-spacing: 2px; }
.world-root .loc-point.active .loc-dot { background: #fff; box-shadow: 0 0 15px #fff, 0 0 30px var(--primary); }
.world-root .loc-point.active .loc-dot::after { content: ''; position: absolute; top: -14px; left: -14px; right: -14px; bottom: -14px; border: 1px solid var(--primary); border-radius: 50%; animation: wrPulse 1.5s infinite cubic-bezier(0.16,1,0.3,1); }
.world-root .loc-point.active .loc-label { opacity: 1; color: #fff; text-shadow: 0 0 8px var(--primary-glow); font-weight: bold; }
@keyframes wrPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.6); opacity: 0.4; } }

#world-crosshair {
  position: absolute; top: 50%; left: 50%; width: 0; height: 0;
  transition: transform 0.8s cubic-bezier(0.16,1,0.3,1); pointer-events: none; z-index: 20; opacity: 0; will-change: transform;
}
.world-root.sys-ready #world-crosshair { opacity: 1; transition: opacity 1s ease 1.5s, transform 0.8s cubic-bezier(0.16,1,0.3,1); }
#world-crosshair::before, #world-crosshair::after { content: ''; position: absolute; background: var(--primary); opacity: 0.3; }
#world-crosshair::before { top: -100vh; bottom: -100vh; left: 0; width: 1px; }
#world-crosshair::after { left: -100vw; right: -100vw; top: 0; height: 1px; }
.world-center-ring { position: absolute; top: -20px; left: -20px; width: 40px; height: 40px; border: 1px dashed var(--primary); border-radius: 50%; box-shadow: inset 0 0 15px rgba(51,170,255,0.1); transition: all 0.6s cubic-bezier(0.16,1,0.3,1); }
#world-crosshair.focused .world-center-ring { transform: scale(0.5); border-color: var(--alert); border-style: solid; box-shadow: 0 0 20px rgba(255,170,51,0.4); }

#world-target-indicator {
  position: absolute; bottom: 45px; left: 50%; transform: translateX(-50%); z-index: 60; transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
  font-size: 14px; letter-spacing: 3px; color: var(--primary); background: rgba(1,3,6,0.8);
  border: 1px solid var(--primary-dim); padding: 12px 30px; backdrop-filter: blur(4px); cursor: pointer;
  box-shadow: 0 0 15px rgba(51,170,255,0.05); display: flex; align-items: center; gap: 15px; opacity: 0;
}
.world-root.sys-ready #world-target-indicator { opacity: 1; transition: opacity 1s ease 2s; }
#world-target-indicator:hover { background: rgba(51,170,255,0.15); box-shadow: 0 0 25px var(--primary-dim); }
#world-target-indicator.hidden { opacity: 0 !important; transform: translateX(-50%) translateY(20px); pointer-events: none; }
#world-target-country { color: #fff; font-weight: bold; font-size: 16px; text-shadow: 0 0 8px var(--primary-glow); }
.world-blink-anim { animation: wrBlinkSeq 1.5s infinite step-end; opacity: 0.8; }
@keyframes wrBlinkSeq { 0%,100% { opacity: 1; } 50% { opacity: 0; } }

#world-detail-card {
  position: fixed; top: 50%; left: 55%; width: 400px; transform: translateY(-50%) translateX(40px);
  opacity: 0; pointer-events: none; transition: all 0.6s cubic-bezier(0.16,1,0.3,1);
  background: rgba(1,3,6,0.85); backdrop-filter: blur(8px); border: 1px solid var(--primary-dim);
  box-shadow: 0 0 40px rgba(51,170,255,0.1); padding: 2px; z-index: 100; will-change: transform, opacity;
}
#world-detail-card.visible { opacity: 1; transform: translateY(-50%) translateX(0); pointer-events: auto; }
.world-dc-inner { border: 1px dashed var(--primary-dim); padding: 25px; position: relative; }
.world-dc-header { display: flex; justify-content: space-between; font-size: 10px; opacity: 0.6; margin-bottom: 15px; border-bottom: 1px solid var(--primary-dim); padding-bottom: 10px; }
.world-dc-close { cursor: pointer; color: var(--primary); transition: color 0.2s; }
.world-dc-close:hover { color: var(--alert); }
.world-dc-title { font-size: 28px; margin-bottom: 25px; letter-spacing: 4px; text-shadow: 0 0 15px var(--primary-glow); color: #fff; }
.world-dc-grid { display: grid; grid-template-columns: 90px 1fr; gap: 12px 15px; font-size: 13px; margin-bottom: 25px; }
.world-dc-label { opacity: 0.5; }
.world-dc-val { font-weight: bold; letter-spacing: 1px; color: #fff; }
.world-dc-desc { font-size: 13px; line-height: 1.8; opacity: 0.85; margin-bottom: 30px; border-left: 2px solid var(--primary-dim); padding-left: 12px; text-align: justify; }
.world-btn-action {
  width: 100%; padding: 12px; background: rgba(51,170,255,0.05); color: var(--primary);
  border: 1px solid var(--primary); font-family: inherit; font-size: 14px; font-weight: bold; cursor: pointer;
  transition: all 0.3s; text-transform: uppercase; letter-spacing: 2px;
}
.world-btn-action:hover { background: var(--primary); color: var(--text-dark); box-shadow: 0 0 20px var(--primary-glow); }

@media (max-width: 768px) {
  #world-detail-card { left: 50%; transform: translate(-50%, -50%) translateY(20px); width: min(400px, 92vw); }
  #world-detail-card.visible { transform: translate(-50%, -50%) translateY(0); }
  .world-root .hud-controls { display: none; }
}
`;

export default function WorldMap({ counts }: { counts: Record<string, number> }) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({
    currentIndex: 0,
    isFocused: false,
    baseScale: 1,
    europeCenterX: 0,
    europeCenterY: 0,
    audioCtx: null as AudioContext | null,
    clockTimer: 0,
  });

  useEffect(() => {
    const st = stateRef.current;
    document.body.classList.add('world-immersive');

    const $ = <T extends Element = HTMLElement>(id: string) => document.getElementById(id) as unknown as T;
    const root = rootRef.current!;

    // ---------- AUDIO ----------
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const initAudio = () => {
      if (!st.audioCtx) st.audioCtx = new AC();
      if (st.audioCtx.state === 'suspended') void st.audioCtx.resume();
    };
    const playSndFile = (id: string, vol = 1.0, fallback: () => void) => {
      initAudio();
      const el = $(`snd-${id}`) as HTMLAudioElement;
      const src = el.getAttribute('src');
      if (!src || src.includes('在此粘贴')) { fallback(); return; }
      const clone = el.cloneNode() as HTMLAudioElement;
      clone.volume = vol;
      clone.play().catch(() => fallback());
    };
    const playSynthTone = (freq: number, type: OscillatorType = 'square', duration = 0.1, vol = 0.03, slideFreq: number | null = null) => {
      const ctx = st.audioCtx;
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = type;
      filter.type = 'highpass';
      filter.frequency.value = 500;
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (slideFreq) osc.frequency.exponentialRampToValueAtTime(slideFreq, ctx.currentTime + duration);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    };
    const playSndType = () => playSynthTone(800 + Math.random() * 400, 'square', 0.02, 0.01);
    const playSndNav = () => playSndFile('nav', 0.6, () => playSynthTone(800, 'square', 0.05, 0.02));
    const playSndConfirm = () => playSndFile('confirm', 0.8, () => { playSynthTone(600, 'square', 0.1, 0.03); setTimeout(() => playSynthTone(1200, 'square', 0.15, 0.03), 80); });
    const playSndCancel = () => playSndFile('cancel', 0.7, () => playSynthTone(400, 'triangle', 0.2, 0.03, 150));
    const playSndData = () => playSndFile('data', 0.7, () => { for (let i = 0; i < 8; i++) setTimeout(() => playSynthTone(1500 + Math.random() * 1000, 'square', 0.03, 0.02), i * 40); });
    const playSndDecrypt = () => playSynthTone(2000, 'sine', 0.05, 0.01);
    const playSndReveal = () => { playSynthTone(600, 'sine', 0.5, 0.05, 1200); setTimeout(() => playSynthTone(800, 'square', 0.1, 0.03), 100); };

    // ---------- BOOT ----------
    const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
    async function typeText(container: HTMLElement, text: string, speed = 25) {
      const line = document.createElement('div');
      line.className = 'world-boot-line';
      container.appendChild(line);
      for (let i = 0; i < text.length; i++) {
        line.textContent += text[i];
        playSndType();
        await sleep(speed + Math.random() * 20);
      }
    }

    // ---------- MAP ----------
    const worldContainer = $<HTMLDivElement>('world-container');
    const mapSvg = $<SVGSVGElement>('map-svg');
    const pointsLayer = $<HTMLDivElement>('points-layer');
    const crosshair = $<HTMLDivElement>('world-crosshair');
    const detailCard = $<HTMLDivElement>('world-detail-card');
    const targetIndicator = $<HTMLDivElement>('world-target-indicator');

    function latLonToXY(lat: number, lon: number) {
      const x = (lon + 180) * (WORLD_W / 360);
      const latRad = (lat * Math.PI) / 180;
      const mercY = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
      const y = WORLD_H / 2 - (WORLD_W / (2 * Math.PI)) * mercY;
      return { x, y };
    }

    async function loadRealMap() {
      try {
        const res = await fetch(GEOJSON_URL, { signal: AbortSignal.timeout(15000) });
        if (!res.ok) throw new Error('Network error');
        const geo = await res.json() as { features: { geometry: { type: string; coordinates: number[][][] | number[][][][] } }[] };
        let d = '';
        const gen = (coords: number[][][]) => {
          let p = '';
          coords.forEach((ring: number[][]) => {
            ring.forEach((coord, i) => {
              const pt = latLonToXY(coord[1], coord[0]);
              p += (i === 0 ? `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)} ` : `L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)} `);
            });
            p += 'Z ';
          });
          return p;
        };
        geo.features.forEach((f) => {
          if (f.geometry.type === 'Polygon') d += gen(f.geometry.coordinates as number[][][]);
          else if (f.geometry.type === 'MultiPolygon') (f.geometry.coordinates as number[][][][]).forEach((poly) => { d += gen(poly as number[][][]); });
        });
        const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathEl.setAttribute('d', d);
        mapSvg.appendChild(pathEl);
      } catch (e) {
        console.error('World map fetch error:', e);
      }
      initPoints();
    }

    function initPoints() {
      let sumX = 0;
      let sumY = 0;
      LOCATIONS.forEach((loc, index) => {
        const pt = document.createElement('div');
        pt.className = 'loc-point';
        pt.id = `pt-${index}`;
        const pos = latLonToXY(loc.lat, loc.lon);
        sumX += pos.x;
        sumY += pos.y;
        pt.style.left = `${(pos.x / WORLD_W) * 100}%`;
        pt.style.top = `${(pos.y / WORLD_H) * 100}%`;
        const dot = document.createElement('div');
        dot.className = 'loc-dot';
        dot.onclick = () => clickPoint(index);
        const label = document.createElement('div');
        label.className = 'loc-label';
        label.textContent = loc.name;
        pt.appendChild(dot);
        pt.appendChild(label);
        pointsLayer.appendChild(pt);
      });

      st.europeCenterX = sumX / LOCATIONS.length;
      st.europeCenterY = sumY / LOCATIONS.length;

      window.addEventListener('resize', calculateScale);
      calculateScale();
      updateSelection(false);
      const clockTimer = window.setInterval(updateClock, 1000);
      updateClock();
      stateRef.current.clockTimer = clockTimer;
    }

    const updateClock = () => {
      const el = $('hud-time');
      if (el) el.innerText = new Date().toISOString().replace('T', ' ').substring(0, 19) + 'Z';
    };

    function calculateScale() {
      st.baseScale = Math.min(window.innerWidth / WORLD_W, window.innerHeight / WORLD_H);
      updateTransform();
    }

    function formatCoord(val: number, isLat: boolean) {
      return `${Math.abs(val).toFixed(4)}° ${isLat ? (val >= 0 ? 'N' : 'S') : (val >= 0 ? 'E' : 'W')}`;
    }

    function updateTransform() {
      const loc = LOCATIONS[st.currentIndex];
      const pos = latLonToXY(loc.lat, loc.lon);
      const scale = st.isFocused ? st.baseScale * 14 : st.baseScale * 5.5;
      worldContainer.style.setProperty('--inv-scale', String(1 / scale));
      if (st.isFocused) {
        worldContainer.style.transform = `translate3d(${-(pos.x - WORLD_W / 2) * scale}px, ${-(pos.y - WORLD_H / 2) * scale}px, 0) scale(${scale})`;
        crosshair.style.transform = 'translate3d(0px, 0px, 0)';
      } else {
        worldContainer.style.transform = `translate3d(${-(st.europeCenterX - WORLD_W / 2) * scale}px, ${-(st.europeCenterY - WORLD_H / 2) * scale}px, 0) scale(${scale})`;
        crosshair.style.transform = `translate3d(${(pos.x - st.europeCenterX) * scale}px, ${(pos.y - st.europeCenterY) * scale}px, 0)`;
      }
    }

    function updateSelection(playSound = true) {
      root.querySelectorAll('.loc-point').forEach((el, idx) => el.classList.toggle('active', idx === st.currentIndex));
      const loc = LOCATIONS[st.currentIndex];
      const latEl = $('hud-lat');
      const lonEl = $('hud-lon');
      const tc = $('world-target-country');
      if (latEl) latEl.innerText = formatCoord(loc.lat, true);
      if (lonEl) lonEl.innerText = formatCoord(loc.lon, false);
      if (tc) tc.innerText = `${loc.country} - ${loc.name}`;
      if (playSound) playSndNav();
      updateTransform();
    }

    function openFocus() {
      if (st.isFocused || !root.classList.contains('sys-ready')) return;
      st.isFocused = true;
      playSndConfirm();
      worldContainer.classList.add('focused');
      crosshair.classList.add('focused');
      targetIndicator.classList.add('hidden');
      updateTransform();

      const loc = LOCATIONS[st.currentIndex];
      $('dc-id').innerText = loc.id.toUpperCase();
      $('dc-name').innerText = loc.name;
      $('dc-country').innerText = loc.country;
      $('dc-type').innerText = loc.type;
      const statusEl = $('dc-status');
      statusEl.innerText = loc.status;
      statusEl.classList.remove('world-dc-alert');
      $('dc-archives').innerText = String(counts[loc.nationId] ?? 0);
      $('dc-desc').innerText = loc.desc;
      setTimeout(() => { if (st.isFocused) detailCard.classList.add('visible'); }, 300);
    }

    function closeFocus() {
      if (!st.isFocused) return;
      st.isFocused = false;
      playSndCancel();
      worldContainer.classList.remove('focused');
      crosshair.classList.remove('focused');
      detailCard.classList.remove('visible');
      targetIndicator.classList.remove('hidden');
      updateTransform();
    }

    function clickPoint(idx: number) {
      if (!root.classList.contains('sys-ready')) return;
      if (st.isFocused && st.currentIndex === idx) return;
      st.currentIndex = idx;
      updateSelection();
      if (!st.isFocused) openFocus();
    }

    function navigate(dir: 'up' | 'down' | 'left' | 'right') {
      const curr = LOCATIONS[st.currentIndex];
      let best = -1;
      let minDist = Infinity;
      LOCATIONS.forEach((cand, idx) => {
        if (idx === st.currentIndex) return;
        let dx = cand.lon - curr.lon;
        const dy = curr.lat - cand.lat;
        if (dx > 180) dx -= 360;
        if (dx < -180) dx += 360;
        const dist = Math.hypot(dx, dy);
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        let ok = false;
        switch (dir) {
          case 'up': ok = angle > -135 && angle <= -45; break;
          case 'down': ok = angle > 45 && angle <= 135; break;
          case 'left': ok = angle > 135 || angle <= -135; break;
          case 'right': ok = angle > -45 && angle <= 45; break;
        }
        if (ok && dist < minDist) { minDist = dist; best = idx; }
      });
      if (best !== -1) { st.currentIndex = best; updateSelection(); }
    }

    function onKey(e: KeyboardEvent) {
      if (!root.classList.contains('sys-ready')) return;
      const ae = document.activeElement;
      if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA')) return;
      if (st.isFocused) { if (e.key === 'Escape') closeFocus(); return; }
      if (['Enter', ' '].includes(e.key)) { e.preventDefault(); openFocus(); return; }
      let dir: 'up' | 'down' | 'left' | 'right' | null = null;
      if (['w', 'W', 'ArrowUp'].includes(e.key)) dir = 'up';
      if (['s', 'S', 'ArrowDown'].includes(e.key)) dir = 'down';
      if (['a', 'A', 'ArrowLeft'].includes(e.key)) dir = 'left';
      if (['d', 'D', 'ArrowRight'].includes(e.key)) dir = 'right';
      if (dir) { e.preventDefault(); navigate(dir); }
    }

    async function startRitual() {
      initAudio();
      const initBtn = $('world-init-btn');
      initBtn.style.display = 'none';
      const terminal = $('world-boot-terminal');
      terminal.style.display = 'block';
      for (const line of BOOT_LINES) {
        await typeText(terminal, line, 10);
        await sleep(200);
      }
      await loadRealMap();
      playSndDecrypt();
      await typeText(terminal, '>>> KRTPEDIA WORLD ARCHIVE ONLINE <<<', 30);
      await sleep(400);
      playSndReveal();
      $('world-boot-screen').classList.add('fade-out');
      root.classList.add('sys-ready');
      setTimeout(() => { const b = $('world-boot-screen'); if (b) b.style.display = 'none'; }, 1200);
    }

    window.addEventListener('keydown', onKey);
    const initBtnEl = $<HTMLButtonElement>('world-init-btn');
    initBtnEl.onclick = () => { void startRitual(); };
    const closeEl = $<HTMLSpanElement>('world-dc-close');
    closeEl.onclick = () => closeFocus();
    const indicatorEl = $<HTMLDivElement>('world-target-indicator');
    indicatorEl.onclick = () => openFocus();
    const extractEl = $<HTMLButtonElement>('world-extract');
    extractEl.onclick = () => {
      const loc = LOCATIONS[st.currentIndex];
      playSndData();
      setTimeout(() => router.push(`/search?q=${encodeURIComponent(loc.country)}`), 700);
    };

    return () => {
      document.body.classList.remove('world-immersive');
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', calculateScale);
      if (stateRef.current.clockTimer) window.clearInterval(stateRef.current.clockTimer);
    };
  }, [counts, router]);

  return (
    <div className="world-root" id="world-root" ref={rootRef}>
      <style>{CSS}</style>
      <div style={{ display: 'none' }}>
        <audio id="snd-nav" src="/audio/nav-bip.mp3" preload="auto" />
        <audio id="snd-confirm" src="/audio/confirm.mp3" preload="auto" />
        <audio id="snd-cancel" src="/audio/cancel.mp3" preload="auto" />
        <audio id="snd-data" src="/audio/data.mp3" preload="none" />
      </div>

      <div id="world-boot-screen">
        <button id="world-init-btn">[ INITIATE CONNECTION ]</button>
        <div id="world-boot-terminal" />
      </div>

      <div className="scanlines" />
      <div className="vignette" />

      <div className="hud-corner hud-tl" />
      <div className="hud-corner hud-tr" />
      <div className="hud-corner hud-bl" />
      <div className="hud-corner hud-br" />

      <div className="hud-text hud-title">KRTPEDIA WORLD ARCHIVE SYSTEM</div>
      <div className="hud-text hud-coords">
        <div>SYS.TIME: <span id="hud-time" /></div>
        <div>LAT: <span id="hud-lat">--</span></div>
        <div>LON: <span id="hud-lon">--</span></div>
      </div>
      <div className="hud-text hud-controls">NAV: [W][A][S][D] / ARROWS | SEL: [ENTER]</div>
      <div className="hud-text hud-status">SYSTEM STATUS: <span style={{ color: 'var(--primary)' }}>ONLINE</span></div>

      <div id="world-container">
        <div id="focus-overlay" />
        <svg id="map-svg" viewBox="0 0 4000 4000" preserveAspectRatio="xMidYMid meet" />
        <div id="points-layer" />
      </div>

      <div id="world-crosshair"><div className="world-center-ring" /></div>

      <div id="world-target-indicator">
        <span className="world-blink-anim">[</span> <span>锁定目标:</span> <span id="world-target-country">---</span> <span className="world-blink-anim">]</span>
      </div>

      <div id="world-detail-card">
        <div className="world-dc-inner">
          <div className="world-dc-header">
            <span>FILE: ARCHIVE_LOG // <span id="dc-id" /></span>
            <span className="world-dc-close" id="world-dc-close">[ ESC ] CANCEL</span>
          </div>
          <h1 className="world-dc-title" id="dc-name">---</h1>
          <div className="world-dc-grid">
            <div className="world-dc-label">主权归属</div><div className="world-dc-val" id="dc-country">---</div>
            <div className="world-dc-label">节点类别</div><div className="world-dc-val" id="dc-type">---</div>
            <div className="world-dc-label">系统状态</div><div className="world-dc-val" id="dc-status">---</div>
            <div className="world-dc-label">档案卷宗</div><div className="world-dc-val" id="dc-archives">---</div>
          </div>
          <div className="world-dc-desc" id="dc-desc">---</div>
          <button className="world-btn-action" id="world-extract">[ 提取核心数据 ]</button>
        </div>
      </div>
    </div>
  );
}