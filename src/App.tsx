import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, ArrowDownToLine, ArrowRight, Bookmark, Check, ChevronDown,
  CircleHelp, Clock3, CloudOff, Download, Gauge, LayoutGrid,
  Lightbulb, Monitor, MoreHorizontal, Pause, Play, Plus, Radio, Redo2, RotateCcw,
  Save, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, Undo2, Upload, Volume2,
  Waves, X,
} from 'lucide-react';
import {
  interpolateRGBW, interpolateScene, makeDefaultZones, makeZones, normalizeRGBW, PRESETS, toHex, validateSceneFile,
  ZONE_IDS, ZONE_INFO, type RGBW, type SceneFile, type ZoneId, type ZoneState,
} from './scene-engine';

const STORAGE_KEY = 'adigun-cabin-studio:v1';
type SavedState = { zones: ZoneState[]; scenes: SceneFile[]; intensity: number; activeSceneId: string; selectedZoneId: ZoneId };
const copy = <T,>(value: T): T => structuredClone(value);

function readSaved(): Partial<SavedState> {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<SavedState>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch { return {}; }
}

function cabinGlows(zones: ZoneState[]) {
  return Object.fromEntries(zones.map((zone) => [zone.id, toHex(zone.rgbw)])) as Record<ZoneId, string>;
}

function CabinDrawing({ zones, selected, onSelect, compact = false }: {
  zones: ZoneState[]; selected: ZoneId; onSelect?: (id: ZoneId) => void; compact?: boolean;
}) {
  const glows = cabinGlows(zones);
  const labelPositions: Record<ZoneId, { x: number; y: number }> = {
    ceiling: { x: 490, y: 147 }, windows: { x: 490, y: 190 }, sidewalls: { x: 222, y: 310 },
    footwell: { x: 490, y: 411 }, reading: { x: 655, y: 331 }, entry: { x: 193, y: 359 },
  };
  const onKey = (event: React.KeyboardEvent<SVGGElement>, id: ZoneId) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect?.(id); }
  };
  const group = (id: ZoneId, label: string, children: React.ReactNode, className = '') => (
    <g className={`cabin-zone ${selected === id ? 'is-selected' : ''} ${className}`} role={compact ? undefined : 'button'} tabIndex={compact ? -1 : 0}
      aria-label={compact ? undefined : `Select ${ZONE_INFO[id].name}`} aria-pressed={compact ? undefined : selected === id}
      onClick={() => onSelect?.(id)} onKeyDown={(e) => onKey(e, id)}>
      <title>{ZONE_INFO[id].name} · select to edit</title>{children}
      {!compact && <text className="zone-label" x={labelPositions[id].x} y={labelPositions[id].y} textAnchor="middle" fill={selected === id ? '#f2f7ff' : '#8fa4bd'}>{label}</text>}
    </g>
  );
  return (
    <svg className={`cabin-drawing ${compact ? 'compact' : ''}`} viewBox={compact ? '0 0 980 470' : '40 25 900 415'} role={compact ? 'img' : 'group'} aria-label={compact ? 'Illustrative cabin zone preview' : 'Interactive cabin zone map'}>
      <defs>
        <linearGradient id="shell" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#26384c" /><stop offset=".52" stopColor="#111d2b" /><stop offset="1" stopColor="#08111c" /></linearGradient>
        <linearGradient id="floor" x1="0" x2="1"><stop stopColor="#122131" /><stop offset=".5" stopColor="#213247" /><stop offset="1" stopColor="#0e1b29" /></linearGradient>
        <radialGradient id="ambient"><stop stopColor="#4387a2" stopOpacity=".24" /><stop offset="1" stopColor="#08111c" stopOpacity="0" /></radialGradient>
        <filter id="softglow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="9" /></filter>
        <filter id="smallglow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3.5" /></filter>
      </defs>
      <ellipse cx="500" cy="290" rx="440" ry="190" fill="url(#ambient)" />
      <path d="M115 345 C150 128 285 55 490 42 C695 55 830 128 865 345 L740 405 L240 405 Z" fill="url(#shell)" stroke="#304359" strokeWidth="2" />
      <path d="M180 343 C218 168 330 101 490 89 C650 101 762 168 800 343 L706 380 L274 380 Z" fill="#0c1724" stroke="#3c5167" strokeWidth="2" />
      <path d="M230 354 C285 301 695 301 750 354 L706 397 L274 397 Z" fill="url(#floor)" stroke="#34475b" />
      <path d="M241 358 L739 358" stroke="#51677e" strokeWidth="1" strokeDasharray="5 8" />
      {/* ceiling coves */}
      {group('ceiling', 'CEILING COVE', <>
        <path d="M240 285 C276 144 365 108 490 99 C615 108 704 144 740 285" fill="none" stroke={glows.ceiling} strokeWidth="15" opacity=".24" filter="url(#softglow)" />
        <path d="M240 285 C276 144 365 108 490 99 C615 108 704 144 740 285" fill="none" stroke={glows.ceiling} strokeWidth="5" opacity=".95" />
      </>, 'ceiling-zone')}
      {/* windows */}
      {group('windows', 'WINDOW REVEALS', <>
        {[0, 1, 2, 3].map((i) => <g key={`win-${i}`}>
          <path d={`M${281 + i * 63} ${207 - Math.sin((i / 3) * Math.PI) * 18} l42 -11 l15 51 l-53 8 z`} fill="#172a3a" stroke="#7690a4" strokeWidth="2" />
          <path d={`M${284 + i * 63} ${210 - Math.sin((i / 3) * Math.PI) * 18} l36 -8 l11 43 l-44 6 z`} fill="#19374a" stroke={glows.windows} strokeWidth="2" />
          <path d={`M${286 + i * 63} ${212 - Math.sin((i / 3) * Math.PI) * 18} l31 -6 l8 33 l-37 5 z`} fill="#60acc3" opacity=".12" />
        </g>)}
      </>, 'windows-zone')}
      {/* seat rows */}
      {[0, 1, 2, 3].map((row) => {
        const y = 276 + row * 25; const scale = 0.7 + row * 0.11;
        return <g key={row} opacity={.8}>
          {[-1, 1].map((side) => <g key={side} transform={`translate(${490 + side * (120 + row * 25)} ${y}) scale(${scale})`}>
            <path d="M-39 0 Q-39 -32 -17 -32 L17 -32 Q39 -32 39 0 L28 10 L-28 10 Z" fill="#344658" stroke="#53697e" />
            <path d="M-31 -12 Q-31 -25 -14 -25 L14 -25 Q31 -25 31 -12 L23 -4 L-23 -4 Z" fill="#455b6f" />
            <path d="M-32 12 L-38 37 M32 12 L38 37" stroke="#40536a" strokeWidth="4" />
          </g>)}
        </g>;
      })}
      {/* sidewall accents */}
      {group('sidewalls', 'SIDEWALL ACCENTS', <>
        <path d="M182 331 C216 250 230 193 253 170" fill="none" stroke={glows.sidewalls} strokeWidth="15" opacity=".25" filter="url(#softglow)" />
        <path d="M182 331 C216 250 230 193 253 170" fill="none" stroke={glows.sidewalls} strokeWidth="5" />
        <path d="M798 331 C764 250 750 193 727 170" fill="none" stroke={glows.sidewalls} strokeWidth="15" opacity=".25" filter="url(#softglow)" />
        <path d="M798 331 C764 250 750 193 727 170" fill="none" stroke={glows.sidewalls} strokeWidth="5" />
      </>, 'sidewalls-zone')}
      {/* aisle footwell */}
      {group('footwell', 'FOOTWELL', <>
        <path d="M477 355 L465 393 M503 355 L515 393" stroke={glows.footwell} strokeWidth="16" opacity=".28" filter="url(#softglow)" />
        <path d="M477 355 L465 393 M503 355 L515 393" stroke={glows.footwell} strokeWidth="4" strokeDasharray="3 8" />
      </>, 'footwell-zone')}
      {/* reading lights */}
      {group('reading', 'READING', <>
        {[0, 1, 2, 3].map((i) => <g key={i}>
          <circle cx={359 + i * 87} cy={275 + i * 5} r="9" fill={glows.reading} opacity=".28" filter="url(#smallglow)" />
          <circle cx={359 + i * 87} cy={275 + i * 5} r="3.2" fill={glows.reading} />
          <circle cx={621 - i * 87} cy={275 + i * 5} r="9" fill={glows.reading} opacity=".28" filter="url(#smallglow)" />
          <circle cx={621 - i * 87} cy={275 + i * 5} r="3.2" fill={glows.reading} />
        </g>)}
      </>, 'reading-zone')}
      {/* entry / monuments */}
      {group('entry', 'ENTRY + GALLEY', <>
        <path d="M145 324 Q162 259 191 245 L210 255 L190 346 Z" fill="#1b2936" stroke="#52687a" strokeWidth="2" />
        <path d="M151 320 Q169 273 190 258" stroke={glows.entry} strokeWidth="5" fill="none" />
        <path d="M773 275 L825 284 L840 351 L769 345 Z" fill="#182736" stroke="#566d80" strokeWidth="2" />
        <path d="M782 286 L825 293" stroke={glows.entry} strokeWidth="5" />
      </>, 'entry-zone')}
      <g className="map-axis"><text x="490" y="438" textAnchor="middle">ILLUSTRATIVE CABIN MAP · SIMULATION PROFILE 01</text></g>
    </svg>
  );
}

function Brand({ small = false }: { small?: boolean }) {
  return <a className={`brand ${small ? 'brand-small' : ''}`} href="/" aria-label="AdigunCabinLighting home">
    <span className="brand-rule" aria-hidden="true" />
    <span className="brand-text"><strong>Adigun<span>Cabin</span>Lighting</strong><small>BY HB ELEKTRONIKER</small></span>
  </a>;
}

function Landing() {
  return <main className="landing">
    <header className="landing-nav"><Brand />
      <nav aria-label="Main navigation"><a href="#capabilities">Capabilities</a><a href="#engineering">Engineering</a><a href="#safety">Safety</a></nav>
      <a className="button button-primary nav-cta" href="/studio">Open Studio <ArrowRight size={16} /></a>
    </header>
    <section className="landing-hero">
      <div className="hero-copy">
        <div className="eyebrow"><span className="eyebrow-line" /> CABIN LIGHTING · ENGINEERING STUDIO</div>
        <h1>Shape the cabin<br />around the <em>moment.</em></h1>
        <p>Design considered RGBW lighting scenes for cabin environments. Explore zones, tune transitions, and review every idea in an offline simulator.</p>
        <div className="hero-actions"><a className="button button-primary button-large" href="/studio">Enter Cabin Studio <ArrowRight size={18} /></a><a href="#capabilities" className="text-link">Explore the system <ArrowDownToLine size={15} /></a></div>
        <div className="hero-proof"><span><Radio size={16} /> Offline by design</span><span><ShieldCheck size={16} /> No physical outputs</span></div>
      </div>
      <div className="hero-art-wrap"><div className="hero-art-label"><span>01 / SCENE STUDY</span><span>SIMULATION PROFILE</span></div>
        <div className="hero-art"><CabinDrawing zones={PRESETS[1].keyframes[1] ? makeZones().map((zone) => ({ ...zone, rgbw: PRESETS[1].keyframes[1].targets[zone.id] })) : makeZones()} selected="windows" compact />
          <div className="art-caption"><span className="art-caption-dot" /> Aurora / cabin wash <small>RGBW · 06 ZONES</small></div>
        </div>
        <div className="hero-art-bottom"><span>Illustrative zone map</span><span>Not connected to aircraft</span></div>
      </div>
    </section>
    <section className="landing-ribbon" aria-label="Product status"><span><span className="status-pulse" /> OFFLINE SIMULATION</span><span>Local scene editing</span><span>Deterministic timeline preview</span><span>Validated scene files</span></section>
    <section className="landing-section" id="capabilities"><div className="section-heading"><div><div className="eyebrow">A WORKSPACE FOR LIGHT</div><h2>From zone to <em>atmosphere.</em></h2></div><p>Every control is tied to an editable cabin zone. Every scene is yours to shape, preview, and save locally.</p></div>
      <div className="capability-grid">
        <article><span className="feature-icon"><LayoutGrid size={19} /></span><small>01 · SPATIAL DESIGN</small><h3>Zone by zone</h3><p>Select ceiling coves, window reveals, sidewalls, footwell, reading lights, and entry accents in an interactive cabin map.</p></article>
        <article><span className="feature-icon"><SlidersHorizontal size={19} /></span><small>02 · RGBW CONTROL</small><h3>Precise, editable scenes</h3><p>Shape red, green, blue, and white output per zone. Refine a fade and see the simulator respond immediately.</p></article>
        <article><span className="feature-icon"><Waves size={19} /></span><small>03 · CHOREOGRAPHY</small><h3>Time has a texture</h3><p>Build a paced transition with real keyframes, scrub the deterministic preview, and export a versioned scene file.</p></article>
      </div>
    </section>
    <section className="engineering-band" id="engineering"><div className="engineering-mark"><Gauge size={24} /></div><div><div className="eyebrow">BUILT FOR CAREFUL WORK</div><h2>Design intent, clearly bounded.</h2><p>AdigunCabinLighting Studio is an offline software simulator. It does not connect to aircraft or lighting hardware, and it does not claim certification or OEM compatibility.</p></div><a href="/studio" className="button button-quiet">Explore the Studio <ArrowRight size={16} /></a></section>
    <section className="safety-section" id="safety"><ShieldCheck size={18} /><div><strong>Safety is explicit in every session.</strong><p>SIMULATION · OFFLINE · NO HARDWARE CONNECTED. Physical bench and aircraft integration require independent authorization, validated equipment, and their own safety gates.</p></div><a href="/studio">Review the simulator <ArrowRight size={14} /></a></section>
    <footer className="landing-footer"><Brand small /><span>AdigunCabinLighting · HB Elektroniker</span><span>Engineering simulator · 2026</span></footer>
  </main>;
}

function Channel({ name, value, color, onChange }: { name: string; value: number; color: string; onChange: (value: number) => void }) {
  const inputId = `channel-${name.toLowerCase()}`;
  return <div className="channel-row"><label htmlFor={inputId}><i style={{ background: color }} />{name}</label>
    <input id={inputId} aria-label={`${name} channel`} type="range" min="0" max="100" step="1" value={value}
      style={{ '--range-fill': `${value}%`, '--range-color': color } as React.CSSProperties} onChange={(e) => onChange(Number(e.target.value))} />
    <input className="channel-value" type="number" min="0" max="100" step="1" value={Math.round(value)} aria-label={`${name} percent`}
      onChange={(e) => onChange(Math.max(0, Math.min(100, Number(e.target.value))))} />
  </div>;
}

function Studio() {
  const stored = useMemo(readSaved, []);
  const [zones, setZones] = useState<ZoneState[]>(() => {
    const saved = stored.zones;
    return Array.isArray(saved) && saved.length === ZONE_IDS.length && ZONE_IDS.every((id) => saved.some((zone) => zone.id === id))
      ? saved.map((zone) => ({ ...zone, rgbw: normalizeRGBW(zone.rgbw) })) : makeDefaultZones();
  });
  const [scenes, setScenes] = useState<SceneFile[]>(() => {
    try { return Array.isArray(stored.scenes) && stored.scenes.length ? stored.scenes.map(validateSceneFile) : copy(PRESETS); }
    catch { return copy(PRESETS); }
  });
  const [intensity, setIntensity] = useState<number>(() => Number.isFinite(stored.intensity) ? Math.max(0, Math.min(100, stored.intensity!)) : 72);
  const [selected, setSelected] = useState<ZoneId>(() => ZONE_IDS.includes(stored.selectedZoneId as ZoneId) ? stored.selectedZoneId! : 'ceiling');
  const [activeSceneId, setActiveSceneId] = useState(() => typeof stored.activeSceneId === 'string' ? stored.activeSceneId : 'aurora');
  const [time, setTime] = useState(0);
  const [effectiveRGBW, setEffectiveRGBW] = useState<Record<ZoneId, RGBW>>(() => Object.fromEntries(zones.map((zone) => [zone.id, { ...zone.rgbw }])) as Record<ZoneId, RGBW>);
  const [playing, setPlaying] = useState(false);
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState('scene');
  const [menuOpen, setMenuOpen] = useState(false);
  const [undo, setUndo] = useState<ZoneState[][]>([]);
  const [redo, setRedo] = useState<ZoneState[][]>([]);
  const importRef = useRef<HTMLInputElement>(null);
  const playStart = useRef(0);
  const effectiveRef = useRef(effectiveRGBW);
  const fadeTransitions = useRef<Partial<Record<ZoneId, { from: RGBW; to: RGBW; started: number; durationMs: number }>>>({});
  const fadeFrame = useRef<number | null>(null);
  const scene = scenes.find((item) => item.id === activeSceneId) ?? scenes[0] ?? PRESETS[0];
  const currentZone = zones.find((zone) => zone.id === selected) ?? zones[0];

  const stopFadeFrame = () => {
    if (fadeFrame.current !== null) cancelAnimationFrame(fadeFrame.current);
    fadeFrame.current = null;
  };
  const setEffectiveImmediately = (values: Record<ZoneId, RGBW>) => {
    stopFadeFrame(); fadeTransitions.current = {}; effectiveRef.current = values; setEffectiveRGBW(values);
  };
  const fadeZoneTo = (id: ZoneId, value: RGBW, seconds: number) => {
    if (seconds <= 0) {
      fadeTransitions.current[id] = undefined;
      const next = { ...effectiveRef.current, [id]: { ...value } };
      effectiveRef.current = next; setEffectiveRGBW(next); return;
    }
    fadeTransitions.current[id] = { from: { ...effectiveRef.current[id] }, to: { ...value }, started: performance.now(), durationMs: seconds * 1000 };
    if (fadeFrame.current !== null) return;
    const tick = (now: number) => {
      const next = { ...effectiveRef.current };
      let active = false;
      for (const zoneId of ZONE_IDS) {
        const transition = fadeTransitions.current[zoneId];
        if (!transition) continue;
        const progress = Math.min(1, Math.max(0, (now - transition.started) / transition.durationMs));
        next[zoneId] = interpolateRGBW(transition.from, transition.to, progress);
        if (progress >= 1) fadeTransitions.current[zoneId] = undefined;
        else active = true;
      }
      effectiveRef.current = next; setEffectiveRGBW(next);
      fadeFrame.current = active ? requestAnimationFrame(tick) : null;
    };
    fadeFrame.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    const persist = () => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ zones, scenes, intensity, activeSceneId, selectedZoneId: selected } satisfies SavedState)); }
      catch { setNotice('Browser storage is unavailable. Export scenes to save a local copy.'); }
    };
    const timer = window.setTimeout(persist, 300);
    window.addEventListener('pagehide', persist);
    return () => { window.clearTimeout(timer); window.removeEventListener('pagehide', persist); };
  }, [zones, scenes, intensity, activeSceneId, selected]);
  useEffect(() => {
    if (!playing) return;
    playStart.current = performance.now() - time * 1000;
    let animation = 0;
    const tick = (now: number) => {
      const next = Math.min(scene.durationSeconds, (now - playStart.current) / 1000);
      setTime(next);
      setEffectiveImmediately(interpolateScene(scene, next));
      if (next >= scene.durationSeconds) { setPlaying(false); return; }
      animation = requestAnimationFrame(tick);
    };
    animation = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animation);
  }, [playing, scene]);
  useEffect(() => () => stopFadeFrame(), []);
  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(''), 2600);
    return () => window.clearTimeout(timeout);
  }, [notice]);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [menuOpen]);

  const snapshot = useCallback(() => setUndo((history) => [...history.slice(-30), copy(zones)]), [zones]);
  const setRGBW = (channel: keyof RGBW, value: number) => {
    snapshot(); setRedo([]);
    const rgbw = { ...currentZone.rgbw, [channel]: Math.max(0, Math.min(100, value)) };
    setZones((previous) => previous.map((zone) => zone.id === selected ? { ...zone, rgbw } : zone));
    fadeZoneTo(selected, rgbw, currentZone.fadeSeconds);
    setPlaying(false);
  };
  const setZoneColor = (rgbw: RGBW) => {
    snapshot(); setRedo([]);
    setZones((previous) => previous.map((zone) => zone.id === selected ? { ...zone, rgbw } : zone));
    fadeZoneTo(selected, rgbw, currentZone.fadeSeconds); setPlaying(false);
  };
  const applySceneAt = (nextTime: number, nextScene = scene) => {
    const targets = interpolateScene(nextScene, nextTime);
    setEffectiveImmediately(targets);
    setTime(nextTime);
  };
  const chooseScene = (id: string) => {
    const next = scenes.find((item) => item.id === id);
    if (!next) return;
    setPlaying(false); setActiveSceneId(id); applySceneAt(0, next);
    setZones((previous) => previous.map((zone) => ({ ...zone, rgbw: next.keyframes[0].targets[zone.id] })));
    setNotice(next.name + ' loaded into simulator');
  };
  const changeFade = (value: number) => {
    snapshot(); setZones((previous) => previous.map((zone) => zone.id === selected ? { ...zone, fadeSeconds: Math.max(0, Math.min(120, value)) } : zone));
  };
  const undoOnce = () => {
    if (!undo.length) return;
    setRedo((history) => [...history, copy(zones)]); setZones(undo[undo.length - 1]); setEffectiveImmediately(Object.fromEntries(undo[undo.length - 1].map((zone) => [zone.id, zone.rgbw])) as Record<ZoneId, RGBW>); setUndo((history) => history.slice(0, -1)); setPlaying(false);
  };
  const redoOnce = () => {
    if (!redo.length) return;
    setUndo((history) => [...history, copy(zones)]); setZones(redo[redo.length - 1]); setEffectiveImmediately(Object.fromEntries(redo[redo.length - 1].map((zone) => [zone.id, zone.rgbw])) as Record<ZoneId, RGBW>); setRedo((history) => history.slice(0, -1)); setPlaying(false);
  };
  const saveScene = () => {
    const frame = { atSeconds: scene.durationSeconds, targets: Object.fromEntries(zones.map((zone) => [zone.id, zone.rgbw])) as SceneFile['keyframes'][number]['targets'] };
    const keyframes = scene.keyframes.filter((item) => item.atSeconds !== scene.durationSeconds).concat(frame).sort((a, b) => a.atSeconds - b.atSeconds);
    const updated = validateSceneFile({ ...scene, keyframes });
    setScenes((all) => all.map((item) => item.id === updated.id ? updated : item));
    setNotice(`Saved ${scene.name} locally`);
  };
  const resetScene = () => { const defaults = makeDefaultZones(); setPlaying(false); setUndo([]); setRedo([]); setScenes(copy(PRESETS)); setZones(defaults); setEffectiveImmediately(Object.fromEntries(defaults.map((zone) => [zone.id, zone.rgbw])) as Record<ZoneId, RGBW>); setActiveSceneId('aurora'); setSelected('ceiling'); setTime(0); setIntensity(72); setNotice('Local studio reset to default scenes'); };
  const addKeyframe = () => {
    const at = Math.max(1, Math.min(scene.durationSeconds - 1, Math.round(time)));
    const frame = { atSeconds: at, targets: Object.fromEntries(zones.map((zone) => [zone.id, zone.rgbw])) as SceneFile['keyframes'][number]['targets'] };
    const frames = scene.keyframes.filter((item) => item.atSeconds !== at).concat(frame).sort((a, b) => a.atSeconds - b.atSeconds);
    setScenes((all) => all.map((item) => item.id === scene.id ? { ...item, keyframes: frames } : item)); setNotice(`Keyframe set at ${formatTime(at)}`);
  };
  const commitCurrentKeyframe = () => {
    const atSeconds = Math.max(0, Math.min(scene.durationSeconds, Math.round(time)));
    const targets = Object.fromEntries(zones.map((zone) => [zone.id, zone.rgbw])) as SceneFile['keyframes'][number]['targets'];
    const keyframes = scene.keyframes.filter((frame) => frame.atSeconds !== atSeconds)
      .concat({ atSeconds, targets }).sort((a, b) => a.atSeconds - b.atSeconds);
    try {
      const updated = validateSceneFile({ ...scene, keyframes });
      setScenes((all) => all.map((item) => item.id === scene.id ? updated : item));
      setEffectiveImmediately(targets);
      setNotice('Values committed to ' + scene.name + ' at ' + formatTime(atSeconds));
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Current values could not be committed.'); }
  };
  const exportScene = () => {
    const payload = JSON.stringify(scene, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${scene.id}.adigun-scene.json`; anchor.click(); URL.revokeObjectURL(url);
    setNotice('Versioned scene file exported');
  };
  const importScene = async (file?: File) => {
    if (!file) return;
    try {
      const parsed = validateSceneFile(JSON.parse(await file.text()));
      setScenes((all) => [...all.filter((item) => item.id !== parsed.id), parsed]); setActiveSceneId(parsed.id); applySceneAt(0, parsed); setZones((previous) => previous.map((zone) => ({ ...zone, rgbw: parsed.keyframes[0].targets[zone.id] }))); setNotice(`${parsed.name} imported and validated`);
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Scene import failed validation'); }
    if (importRef.current) importRef.current.value = '';
  };
  const chooseTab = (next: string, section: string) => {
    setTab(next);
    window.requestAnimationFrame(() => document.getElementById(section)?.focus({ preventScroll: true }));
  };

  return <main className="studio-shell" data-active-tab={tab}>
    <header className="studio-topbar"><Brand /><div className="top-project"><span className="project-kicker">PROJECT PROFILE</span><strong>Cabin 01 <ChevronDown size={14} /></strong></div>
      <div className="top-revision">REV <b>01</b><span className="revision-dot" /> LOCAL DRAFT</div>
      <div className="top-spacer" />
      <div className="mode-pill"><span className="status-pulse" /> SIMULATION <i /> OFFLINE</div>
      <div className="top-actions"><button className="icon-button" title="Help" aria-label="Help" onClick={() => setNotice('Studio help: select a zone, tune RGBW, then save or export a scene.')}><CircleHelp size={18} /></button>
        <button className="icon-button" title="More studio actions" aria-label="More studio actions" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}><MoreHorizontal size={20} /></button>
      </div>
      {menuOpen && <><button className="dismiss-overlay" aria-label="Close menu" onClick={() => setMenuOpen(false)} /><div className="top-menu" role="menu"><button role="menuitem" onClick={() => { setMenuOpen(false); exportScene(); }}><Download size={15} /> Export current scene</button><button role="menuitem" onClick={() => { setMenuOpen(false); importRef.current?.click(); }}><Upload size={15} /> Import scene file</button><button role="menuitem" onClick={() => { setMenuOpen(false); resetScene(); }}><RotateCcw size={15} /> Reset local studio</button></div></>}
    </header>
    <div className="sim-banner"><CloudOff size={15} /><span><strong>SIMULATION ONLY</strong> · Offline workspace · No hardware connected · No physical output</span><a href="/#safety">Safety boundary <ArrowRight size={13} /></a></div>
    <div className="studio-layout">
      <aside className="studio-rail" aria-label="Studio sections">
        <span className="rail-label">WORKSPACE</span>
        <button aria-label="Cabin overview" title="Cabin overview" className={tab === 'scene' ? 'active' : ''} onClick={() => chooseTab('scene', 'cabin-view')}><LayoutGrid size={18} /><span>Cabin overview</span></button>
        <button aria-label="Zone mapping" title="Zone mapping" className={tab === 'zones' ? 'active' : ''} onClick={() => chooseTab('zones', 'zone-inspector')}><SlidersHorizontal size={18} /><span>Zone mapping</span></button>
        <button aria-label="Choreography" title="Choreography" className={tab === 'timeline' ? 'active' : ''} onClick={() => chooseTab('timeline', 'timeline')}><Waves size={18} /><span>Choreography</span></button>
        <button aria-label="Scene library" title="Scene library" className={tab === 'library' ? 'active' : ''} onClick={() => chooseTab('library', 'scene-library')}><Bookmark size={18} /><span>Scene library</span></button>
        <div className="rail-divider" /><span className="rail-label">SYSTEM</span>
        <div className="rail-disabled" title="Physical hardware diagnostics are not included in this offline release"><Activity size={18} /><span>Hardware diagnostics</span><small>NOT AVAILABLE</small></div>
        <div className="rail-disabled" title="Adigun BOT is not enabled for this release"><Sparkles size={18} /><span>Adigun BOT</span><small>NOT ENABLED</small></div>
        <div className="rail-bottom"><div className="sim-avatar"><Monitor size={16} /></div><div><b>Offline workspace</b><small>Local browser storage</small></div></div>
      </aside>
      <section className="studio-main">
        <div className="studio-heading"><div><div className="breadcrumbs">CABIN STUDIO <span>/</span> SCENE DESIGN</div><h1>Light, in its place.</h1><p>Adjust an individual cabin zone, then preview how the whole cabin changes.</p></div>
          <div className="heading-actions"><button className="icon-button undo-btn" aria-label="Undo" title="Undo" disabled={!undo.length} onClick={undoOnce}><Undo2 size={17} /></button><button className="icon-button undo-btn" aria-label="Redo" title="Redo" disabled={!redo.length} onClick={redoOnce}><Redo2 size={17} /></button><button className="button button-outline" onClick={saveScene}><Save size={15} /> Save scene</button><button className="button button-primary" onClick={exportScene}><Download size={15} /> Export</button></div>
        </div>
        <div className="workspace-grid">
          <div className="visual-column">
            <section className="panel cabin-panel" id="cabin-view" tabIndex={-1}>
              <div className="panel-head"><div><span className="panel-overline">SPATIAL PREVIEW</span><h2>Cabin digital twin</h2></div><div className="view-chip"><span className="view-chip-dot" /> PERSPECTIVE · 2D</div></div>
              <div className="cabin-stage"><div className="stage-grid" /><div className="stage-crosshair" /><div className="stage-label stage-label-front">FORWARD <span>01</span></div><div className="stage-label stage-label-aft">AFT <span>02</span></div>
                <CabinDrawing zones={zones.map((zone) => ({ ...zone, rgbw: Object.fromEntries(Object.entries(effectiveRGBW[zone.id]).map(([key, value]) => [key, value * intensity / 100])) as RGBW }))} selected={selected} onSelect={setSelected} />
                <div className="stage-scale"><span /> 2D ZONE MAP</div>
              </div>
              <div className="cabin-legend"><span><i className="legend-active" /> Active selection</span><span><i className="legend-zone" /> Selectable lighting zone</span><span className="legend-revision">Illustrative profile · not an aircraft fit</span></div>
            </section>
            <section className="panel timeline-panel" id="timeline" tabIndex={-1}>
              <div className="timeline-head"><div><span className="panel-overline">CHOREOGRAPHY TIMELINE</span><h2>Transition preview</h2></div><button className="button button-quiet button-sm" onClick={addKeyframe}><Plus size={14} /> Add keyframe</button></div>
              <div className="transport"><button className="play-button" aria-label={playing ? 'Pause preview' : 'Play preview'} onClick={() => { if (playing) setPlaying(false); else { if (time >= scene.durationSeconds) applySceneAt(0); setPlaying(true); } }}>{playing ? <Pause size={17} /> : <Play size={17} fill="currentColor" />}</button>
                <div className="timeline-track-wrap"><div className="timeline-label-row"><span>{scene.name.toUpperCase()} <i>·</i> {scene.keyframes.length} KEYFRAMES</span><span className="time-readout">{formatTime(time)} <small>/ {formatTime(scene.durationSeconds)}</small></span></div>
                  <div className="timeline-track"><div className="timeline-progress" style={{ width: `${scene.durationSeconds ? time / scene.durationSeconds * 100 : 0}%` }} /><input aria-label="Scene timeline position" type="range" min="0" max={scene.durationSeconds} step="0.1" value={time} onChange={(e) => { setPlaying(false); applySceneAt(Number(e.target.value)); }} />
                    {scene.keyframes.map((frame, index) => <span key={frame.atSeconds} className="timeline-key" style={{ left: `${frame.atSeconds / scene.durationSeconds * 100}%` }} title={`Keyframe ${index + 1} · ${formatTime(frame.atSeconds)}`} />)}
                  </div>
                </div>
                <button className="icon-button stop-button" title="Return to start" aria-label="Return to start" onClick={() => { setPlaying(false); applySceneAt(0); }}><RotateCcw size={16} /></button>
                <span className="transport-duration"><Clock3 size={14} /> {scene.durationSeconds}s</span>
              </div>
            </section>
            <section className="panel scene-library" id="scene-library" tabIndex={-1}>
              <div className="library-head"><div><span className="panel-overline">SCENE LIBRARY</span><h2>Start with a mood</h2></div><span className="local-badge"><span /> SAVED LOCALLY</span></div>
              <div className="scene-cards">{scenes.map((item) => { const last = item.keyframes[item.keyframes.length - 1].targets; const samples = [last.ceiling, last.windows, last.sidewalls, last.footwell]; return <button key={item.id} className={`scene-card ${item.id === activeSceneId ? 'selected' : ''}`} onClick={() => chooseScene(item.id)} aria-pressed={item.id === activeSceneId}>
                <span className="scene-swatch">{samples.map((sample, index) => <i key={index} style={{ background: toHex(sample), color: toHex(sample) }} />)}</span><strong>{item.name}</strong><small>{item.durationSeconds}s transition</small>{item.id === activeSceneId && <Check className="scene-check" size={15} />}
              </button>; })}</div>
            </section>
          </div>
          <aside className="inspector panel" id="zone-inspector" tabIndex={-1}>
            <div className="inspector-head"><div><span className="panel-overline">ZONE INSPECTOR</span><h2>{currentZone.name}</h2><p>{currentZone.detail}</p></div><button className="icon-button" aria-label="Inspector settings" title="Inspector settings" onClick={() => setNotice('Zone values are editable in SIMULATION only.')}><Settings2 size={17} /></button></div>
            <div className="zone-select"><label htmlFor="zone-picker">EDITING ZONE</label><select id="zone-picker" value={selected} onChange={(e) => setSelected(e.target.value as ZoneId)}>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select><ChevronDown size={14} /></div>
            <div className="rgbw-head"><div><span className="panel-overline">RGBW OUTPUT</span><span className="channel-model">4 CHANNELS · 0—100%</span></div><label className="color-well" aria-label="RGB color picker"><input type="color" aria-label="Choose RGB color" value={toHex(currentZone.rgbw)} onChange={(e) => { const hex = e.target.value; setZoneColor({ r: parseInt(hex.slice(1, 3), 16) / 2.55, g: parseInt(hex.slice(3, 5), 16) / 2.55, b: parseInt(hex.slice(5, 7), 16) / 2.55, w: currentZone.rgbw.w }); }} /><span style={{ background: toHex(currentZone.rgbw) }} /></label></div>
            <div className="channel-list">
              {(['r', 'g', 'b', 'w'] as const).map((channel) => <Channel key={channel} name={channel.toUpperCase()} value={currentZone.rgbw[channel]} color={{ r: '#ff6b72', g: '#59d6a5', b: '#6c9eff', w: '#e9edf2' }[channel]} onChange={(value) => setRGBW(channel, value)} />)}
            </div>
            <div className="inspector-divider" />
            <div className="control-block"><div className="control-head"><label htmlFor="intensity">MASTER INTENSITY</label><strong>{Math.round(intensity)}<small>%</small></strong></div><input id="intensity" className="wide-range" type="range" min="0" max="100" value={intensity} style={{ '--range-fill': `${intensity}%` } as React.CSSProperties} onChange={(e) => setIntensity(Number(e.target.value))} /></div>
            <div className="control-block fade-block"><div className="control-head"><label htmlFor="fade">ZONE FADE DURATION</label><strong>{currentZone.fadeSeconds}<small>s</small></strong></div><input id="fade" className="wide-range" type="range" min="0" max="30" step="1" value={currentZone.fadeSeconds} style={{ '--range-fill': `${currentZone.fadeSeconds / 30 * 100}%` } as React.CSSProperties} onChange={(e) => changeFade(Number(e.target.value))} /><div className="range-ends"><span>Instant</span><span>30 sec</span></div></div>
            <div className="inspector-divider" />
            <div className="inspector-summary"><div><span className="summary-symbol"><Lightbulb size={15} /></span><div><b>Simulator output</b><small>Effective · offline preview</small></div></div><code>{Math.round(effectiveRGBW[selected].r * intensity / 100)} / {Math.round(effectiveRGBW[selected].g * intensity / 100)} / {Math.round(effectiveRGBW[selected].b * intensity / 100)} / {Math.round(effectiveRGBW[selected].w * intensity / 100)}</code></div>
            <button className="apply-button" onClick={commitCurrentKeyframe}>Apply &amp; set keyframe <ArrowRight size={16} /></button>
            <div className="inspector-note"><ShieldCheck size={15} /><span>Applies to the local preview only. No physical output path exists in this release.</span></div>
          </aside>
        </div>
      </section>
    </div>
    <div className="studio-statusbar"><span><span className="status-pulse" /> SIMULATION · NOT CONNECTED</span><span><Volume2 size={14} /> Scene engine ready</span><span><Save size={13} /> Auto-saved locally</span><span className="status-right">PROFILE 01 · SCHEMA v1 <span className="status-sep">|</span> 60 FPS TARGET (NOT MEASURED)</span></div>
    <input ref={importRef} type="file" accept="application/json,.json" className="visually-hidden" aria-label="Import versioned scene JSON" onChange={(e) => void importScene(e.target.files?.[0])} />
    {notice && <div className="toast" role="status"><Check size={15} />{notice}<button aria-label="Dismiss notice" onClick={() => setNotice('')}><X size={14} /></button></div>}
  </main>;
}

function formatTime(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60).toString().padStart(2, '0')}:${(whole % 60).toString().padStart(2, '0')}`;
}

export default function App() {
  const isStudio = window.location.pathname.replace(/\/$/, '') === '/studio';
  return isStudio ? <Studio /> : <Landing />;
}

