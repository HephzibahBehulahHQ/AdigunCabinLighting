import { LANDING_CHALLENGE_COPY } from './landing-challenge-copy';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, ArrowDownToLine, ArrowRight, Bookmark, Check, ChevronDown, ClipboardCheck, CopyPlus,
  CircleHelp, Clock3, Download, Gauge, LayoutGrid,
  Lightbulb, MoreHorizontal, Pause, Play, Plus, Radio, Redo2, RotateCcw,
  Save, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, Trash2, Undo2, Upload,
  Headphones, Megaphone, Move3D, Volume2, Waves, X,
} from 'lucide-react';
import {
  interpolateRGBW, interpolateScene, makeDefaultZones, makeZones, normalizeRGBW, PRESETS, preserveSafetyZones, toHex, validateSceneFile, withFixtureFallbacks,
  ZONE_IDS, ZONE_INFO, type ControlZoneId, type RGBW, type SceneFile, type ZoneId, type ZoneState,
} from './scene-engine';
import { composePreviewRGB } from './lighting-preview';
import { CABIN_EXPORT_4K, estimateRgbaSurfaceMiB } from './export-capabilities';
import { CABIN_LAYOUTS, CABIN_PROFILES, DEFAULT_CABIN_CONFIG, validateCabinConfig, type CabinConfig, type CabinLayoutId } from './cabin-config';
import { createExportPreflightReport } from './export-preflight';
import { createScenarioPackage, MAX_SCENARIO_PACKAGE_BYTES, validateScenarioPackage } from '../operator/scenario-package';
import { getMoodScore, playWelcomeChime, scheduleMoodMusic, type MoodMusicHandle } from './cabin-audio';
import { cabinAudioAssetKey, deleteCabinAudioAsset, readCabinAudioAsset, saveCabinAudioAsset, type StoredCabinAudioAsset } from './audio-asset-store';
import { readAppLocale, saveAppLocale, studioText, studioCabinGeometryNote, studioCabinLayoutDescription, studioCabinLayoutName, studioGeometryAccuracy, studioInstrumentLabel, studioProfileSourceNote, studioSceneDiagnostic, studioSceneName, studioVoicePreview, studioZoneDetail, studioZoneName, type AppLocale, type StudioCopyKey } from './studio-localization';
import { AIRCRAFT_DIMENSION_PROFILES, AIRLINE_MESH_PROFILES, DEFAULT_CABIN_MESH_ID, getCabinMeshProfile, getProfileZones } from './aircraft-assets';
import cabinReferenceImage from './assets/vvip-cabin-reference.jpg';

const REFERENCE_INSPECTOR_ZONE_IDS: readonly ZoneId[] = ['ceiling', 'windows', 'footwell', 'reading', 'entry', 'monuments', 'toilet', 'handrail', 'trolley', 'cabin', 'ceiling_cove', 'left_sidewall', 'right_sidewall', 'spotlights', 'emergency', 'exit'];

const STORAGE_KEY = 'adigun-cabin-studio:v1';
const PROJECT_INDEX_KEY = 'adigun-cabin-projects:v1';
const ACTIVE_PROJECT_KEY = 'adigun-cabin-active-project:v1';
type SavedState = { zones: ZoneState[]; scenes: SceneFile[]; intensity: number; activeSceneId: string; selectedZoneId: ControlZoneId; projectName?: string; cabinConfig?: CabinConfig; aircraftMeshId?: string | null };
type LocalMoodAudioCue = { readonly objectUrl: string; readonly fileName: string; readonly title: string; readonly rightsReference: string };
type LocalMoodAudioDraft = { file: File | null; title: string; rightsReference: string };
const MAX_LOCAL_MOOD_AUDIO_BYTES = 25 * 1024 * 1024;
const copy = <T,>(value: T): T => structuredClone(value);
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; anchor.style.display = 'none';
  document.body.append(anchor); anchor.click(); anchor.remove();
  // Let the browser begin reading the blob before revoking its object URL.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const Cabin3D = lazy(() => import('./Cabin3D'));
const CabinAsset3D = lazy(() => import('./CabinAsset3D'));

function readSaved(projectId = 'default'): Partial<SavedState> {
  try {
    const source = projectId === 'default' ? localStorage.getItem(STORAGE_KEY) : localStorage.getItem(`${STORAGE_KEY}:${projectId}`);
    const parsed = JSON.parse(source ?? '{}') as Partial<SavedState>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch { return {}; }
}

function migrateZones(saved?: readonly ZoneState[]): ZoneState[] {
  if (!saved) return makeDefaultZones();
  const baseZones = makeZones().map((base) => {
    const previous = saved.find((zone) => zone.id === base.id);
    if (previous) return { ...base, ...previous, rgbw: normalizeRGBW(previous.rgbw) };
    const legacyId: ZoneId | undefined = base.id === 'ceiling_cove' ? 'ceiling' : base.id === 'left_sidewall' || base.id === 'right_sidewall' ? 'sidewalls' : undefined;
    const legacy = legacyId ? saved.find((zone) => zone.id === legacyId) : undefined;
    return legacy ? { ...base, rgbw: normalizeRGBW(legacy.rgbw), fadeSeconds: legacy.fadeSeconds } : base;
  });
  const fixtureZones = saved.filter((zone) => zone.id.startsWith('fixture:') && zone.parentZoneId && ZONE_IDS.includes(zone.parentZoneId))
    .map((zone) => ({ ...zone, rgbw: normalizeRGBW(zone.rgbw) }));
  return [...baseZones, ...fixtureZones];
}

type ProjectEntry = { id: string; name: string; updatedAt: string };
function readProjectIndex(): ProjectEntry[] {
  try { const value = JSON.parse(localStorage.getItem(PROJECT_INDEX_KEY) ?? '[]'); return Array.isArray(value) ? value.filter((item) => item && typeof item.id === 'string' && typeof item.name === 'string') : []; }
  catch { return []; }
}
function writeProject(id: string, name: string, state: SavedState) {
  const key = id === 'default' ? STORAGE_KEY : `${STORAGE_KEY}:${id}`;
  localStorage.setItem(key, JSON.stringify(state));
  const entries = readProjectIndex();
  const entry = { id, name, updatedAt: new Date().toISOString() };
  localStorage.setItem(PROJECT_INDEX_KEY, JSON.stringify([...entries.filter((item) => item.id !== id), entry]));
  localStorage.setItem(ACTIVE_PROJECT_KEY, id);
}

function cabinGlows(zones: ZoneState[]) {
  return Object.fromEntries(zones.map((zone) => [zone.id, toHex({ ...composePreviewRGB(zone.rgbw), w: 0 })])) as Record<ZoneId, string>;
}

function CabinReferenceView({ zones, selected, onSelect, compact, layoutId, locale = 'en' }: {
  locale?: AppLocale;
  zones: ZoneState[]; selected: ControlZoneId; onSelect?: (id: ControlZoneId) => void; compact: boolean; layoutId: CabinLayoutId;
}) {
  const available = new Set(zones.map((zone) => zone.id));
  const spots: { id: ZoneId; label: string; x: number; y: number; w: number; h: number }[] = [
    { id: 'windows', label: studioText(locale, 'leftWindow').replace('{number}', '1'), x: 18, y: 0, w: 300, h: 125 },
    { id: 'windows', label: studioText(locale, 'rightWindow').replace('{number}', '1'), x: 967, y: 0, w: 300, h: 125 },
    { id: 'ceiling_cove', label: studioZoneName(locale, { id: 'ceiling_cove', name: ZONE_INFO.ceiling_cove.name }), x: 553, y: 66, w: 138, h: 33 },
    { id: 'left_sidewall', label: studioZoneName(locale, { id: 'left_sidewall', name: ZONE_INFO.left_sidewall.name }), x: 117, y: 161, w: 149, h: 34 },
    { id: 'right_sidewall', label: studioZoneName(locale, { id: 'right_sidewall', name: ZONE_INFO.right_sidewall.name }), x: 1037, y: 203, w: 158, h: 35 },
    { id: 'footwell', label: studioZoneName(locale, { id: 'footwell', name: ZONE_INFO.footwell.name }), x: 553, y: 380, w: 127, h: 35 },
  ];
  return <div className={`cabin-drawing cabin-reference-view ${compact ? 'compact' : ''}`} data-layout-id={layoutId} data-selected-zone={selected} role={compact ? undefined : 'group'} aria-label={compact ? undefined : studioText(locale, 'vvipMap')}>
    <img src={cabinReferenceImage} alt={compact ? 'VVIP cabin reference with ceiling cove, sidewall and footwell lighting' : ''} draggable={false} />
    {!compact && <svg viewBox="0 0 1285 443" role="group" aria-label={studioText(locale, 'zoneOverlay')}>
      {spots.filter((spot) => available.has(spot.id)).map((spot, index) => <g key={`${spot.id}-${index}`} role="button" tabIndex={0} aria-label={spot.label} aria-pressed={selected === spot.id}
        onClick={() => onSelect?.(spot.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect?.(spot.id); } }}>
        <title>{spot.label} · {studioText(locale, 'selectToEdit')}</title>
        <rect className={selected === spot.id ? 'reference-zone-selected' : 'reference-zone-target'} x={spot.x} y={spot.y} width={spot.w} height={spot.h} rx="16" />
      </g>)}
    </svg>}
  </div>;
}

function CabinDrawing({ zones, selected, onSelect, compact = false, config = DEFAULT_CABIN_CONFIG, referenceImage = true, locale = 'en' }: {
  locale?: AppLocale;
  zones: ZoneState[]; selected: ControlZoneId; onSelect?: (id: ControlZoneId) => void; compact?: boolean; config?: CabinConfig; referenceImage?: boolean;
}) {
  const glows = cabinGlows(zones);
  if (referenceImage) return <CabinReferenceView zones={zones} selected={selected} onSelect={onSelect} compact={compact} layoutId={config.layoutId} locale={locale} />;
  const layout = CABIN_LAYOUTS[config.layoutId];
  const rowTemplates = 'seatPlan' in layout
    ? layout.seatPlan.flatMap((section) => Array.from({ length: section.rows }, () => section.groups))
    : Array.from({ length: config.seatRows }, () => layout.groups);
  const visibleRowCount = Math.min(18, rowTemplates.length);
  const visibleRows = Array.from({ length: visibleRowCount }, (_, index) => rowTemplates[Math.round(index * (rowTemplates.length - 1) / Math.max(1, visibleRowCount - 1))]);
  const labelPositions: Record<ZoneId, { x: number; y: number }> = {
    ceiling: { x: 490, y: 147 }, windows: { x: 490, y: 190 }, sidewalls: { x: 222, y: 310 },
    footwell: { x: 490, y: 411 }, reading: { x: 655, y: 331 }, entry: { x: 193, y: 359 },
    monuments: { x: 805, y: 365 }, toilet: { x: 825, y: 242 }, handrail: { x: 490, y: 389 },
    trolley: { x: 757, y: 332 }, cabin: { x: 490, y: 254 }, ceiling_cove: { x: 490, y: 165 },
    left_sidewall: { x: 220, y: 295 }, right_sidewall: { x: 760, y: 295 },
    spotlights: { x: 490, y: 218 }, emergency: { x: 490, y: 431 }, exit: { x: 490, y: 130 },
  };
  const onKey = (event: React.KeyboardEvent<SVGGElement>, id: ZoneId) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect?.(id); }
  };
  const group = (id: ZoneId, label: string, children: React.ReactNode, className = '') => (
    <g className={`cabin-zone ${selected === id ? 'is-selected' : ''} ${className}`} role={compact ? undefined : 'button'} tabIndex={compact ? -1 : 0}
      aria-label={compact ? undefined : studioText(locale, 'selectMapZone').replace('{name}', () => studioZoneName(locale, { id, name: ZONE_INFO[id].name }))} aria-pressed={compact ? undefined : selected === id}
      onClick={() => onSelect?.(id)} onKeyDown={(e) => onKey(e, id)}>
      <title>{studioZoneName(locale, { id, name: ZONE_INFO[id].name })} · {studioText(locale, 'selectToEdit')}</title>{children}
      {!compact && <text className="zone-label" x={labelPositions[id].x} y={labelPositions[id].y} textAnchor="middle" fill={selected === id ? '#f2f7ff' : '#8fa4bd'}>{label}</text>}
    </g>
  );
  return (
    <svg className={`cabin-drawing ${compact ? 'compact' : ''}`} data-layout-id={config.layoutId} viewBox={compact ? '0 0 980 470' : '40 25 900 415'} role={compact ? 'img' : 'group'} aria-label={compact ? `Illustrative ${layout.name} cabin preview` : studioText(locale, 'interactiveMap').replace('{name}', () => studioCabinLayoutName(locale, config.layoutId))}>
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
      {group('ceiling_cove', 'CEILING COVE', <>
        <path d="M240 285 C276 144 365 108 490 99 C615 108 704 144 740 285" fill="none" stroke={glows.ceiling_cove} strokeWidth="15" opacity=".24" filter="url(#softglow)" />
        <path d="M240 285 C276 144 365 108 490 99 C615 108 704 144 740 285" fill="none" stroke={glows.ceiling_cove} strokeWidth="5" opacity=".95" />
      </>, 'ceiling-zone')}
      {/* windows */}
      {group('windows', 'WINDOW REVEALS', <>
        {Array.from({ length: config.windowCountPerSide }, (_, index) => {
          const y = 132 + (index + 1) * 212 / (config.windowCountPerSide + 1);
          const xOffset = Math.min(285, config.widthMeters * 52);
          return [-1, 1].map((side) => {
            const x = 490 + side * xOffset;
            return <g key={`win-${side}-${index}`} aria-hidden={compact || undefined} aria-label={compact ? undefined : studioText(locale, side < 0 ? 'leftWindow' : 'rightWindow').replace('{number}', String(index + 1))}>
              <rect x={x - 8} y={y - 12} width="16" height="25" rx="8" fill="#172a3a" stroke="#7690a4" strokeWidth="2" />
              <rect x={x - 5} y={y - 9} width="10" height="19" rx="5" fill="#19374a" stroke={glows.windows} strokeWidth="1.6" />
              <rect x={x - 3} y={y - 7} width="6" height="15" rx="3" fill="#60acc3" opacity=".18" />
            </g>;
          });
        }).flat()}
      </>, 'windows-zone')}
      {/* seat rows */}
      {visibleRows.map((groups, row) => {
          const totalSeats = groups.reduce((sum, count) => sum + count, 0);
          const aisleCount = groups.length - 1;
          const seatWidth = Math.min(config.layoutId === 'ownerVvip' ? 48 : 34, 340 / (totalSeats + aisleCount * 1.5));
          const aisleGap = config.layoutId === 'ownerVvip' ? 52 : 15;
          const occupiedWidth = totalSeats * seatWidth + aisleCount * aisleGap;
          const rowY = 157 + row * (186 / Math.max(1, visibleRows.length - 1));
          let x = 490 - occupiedWidth / 2 + seatWidth / 2;
          const seats: number[] = [];
          groups.forEach((count, groupIndex) => {
            for (let seat = 0; seat < count; seat++) { seats.push(x); x += seatWidth + 3; }
            if (groupIndex < groups.length - 1) x += aisleGap - 3;
          });
          return <g key={row} aria-hidden={compact || undefined} aria-label={compact ? undefined : studioText(locale, 'cabinRow').replace('{number}', String(row + 1))}>
            {seats.map((seatX, index) => <g key={index}>
              <rect x={seatX - seatWidth / 2} y={rowY - (config.layoutId === 'ownerVvip' ? 8 : 5)} width={seatWidth} height={config.layoutId === 'ownerVvip' ? 16 : 10} rx={Math.min(8, seatWidth / 3)} fill={config.layoutId === 'ownerVvip' ? '#627b91' : '#344658'} stroke="#8298aa" strokeWidth="1.5" />
              <rect x={seatX - seatWidth * .34} y={rowY - (config.layoutId === 'ownerVvip' ? 6 : 3)} width={seatWidth * .68} height={config.layoutId === 'ownerVvip' ? 5 : 3} rx="2" fill="#9eb2c3" opacity=".72" />
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
      {group('left_sidewall', 'LEFT SIDEWALL', <>
        <path d="M182 331 C216 250 230 193 253 170" fill="none" stroke={glows.left_sidewall} strokeWidth="16" opacity=".32" filter="url(#softglow)" />
        <path d="M182 331 C216 250 230 193 253 170" fill="none" stroke={glows.left_sidewall} strokeWidth="5" />
      </>, 'sidewalls-zone')}
      {group('right_sidewall', 'RIGHT SIDEWALL', <>
        <path d="M798 331 C764 250 750 193 727 170" fill="none" stroke={glows.right_sidewall} strokeWidth="16" opacity=".32" filter="url(#softglow)" />
        <path d="M798 331 C764 250 750 193 727 170" fill="none" stroke={glows.right_sidewall} strokeWidth="5" />
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
      {group('monuments', 'MONUMENTS', <><path d="M770 275 L825 284 L840 351 L769 345 Z" fill="none" stroke={glows.monuments} strokeWidth="4" /><path d="M145 324 Q162 259 191 245 L210 255 L190 346 Z" fill="none" stroke={glows.monuments} strokeWidth="3" /></>)}
      {group('toilet', 'LAVATORY', <><path d="M784 235 L829 244 L834 278 L786 269 Z" fill={glows.toilet} fillOpacity=".22" stroke={glows.toilet} strokeWidth="3" /></>)}
      {group('handrail', 'HANDRAIL', <><path d="M300 365 Q490 390 680 365" fill="none" stroke={glows.handrail} strokeWidth="5" /><path d="M300 365 Q490 390 680 365" fill="none" stroke={glows.handrail} strokeWidth="13" opacity=".2" filter="url(#softglow)" /></>)}
      {group('trolley', 'TROLLEY', <><rect x="739" y="309" width="35" height="42" rx="4" fill={glows.trolley} fillOpacity=".28" stroke={glows.trolley} strokeWidth="3" /><circle cx="747" cy="355" r="3" fill="#9ab0c4"/><circle cx="767" cy="355" r="3" fill="#9ab0c4"/></>)}
      {group('cabin', 'CABIN AMBIENT', <><path d="M215 336 Q250 290 300 276 M765 336 Q730 290 680 276" fill="none" stroke={glows.cabin} strokeWidth="4" opacity=".85" /><path d="M215 336 Q250 290 300 276 M765 336 Q730 290 680 276" fill="none" stroke={glows.cabin} strokeWidth="14" opacity=".18" filter="url(#softglow)" /></>)}
      <g className="map-axis"><text x="490" y="438" textAnchor="middle">{layout.name.toUpperCase()} · 2D REFERENCE MAP · SIMULATION</text></g>
    </svg>
  );
}

function Brand({ small = false }: { small?: boolean }) {
  return <a className={`brand ${small ? 'brand-small' : ''}`} href="/" aria-label="AdigunCabinLighting home">
    <span className="brand-rule" aria-hidden="true" />
    <span className="brand-text"><strong>Adigun<span>Cabin</span>Lighting</strong><small>BY HB ELEKTRONIKER</small></span>
  </a>;
}

const LANDING_COPY = {
  en: {
    language: 'Language', navLabel: 'Main navigation', nav: ['Capabilities', 'Engineering', 'Safety'], open: 'Open Studio',
    eyebrow: 'CABIN LIGHTING · ENGINEERING STUDIO', title: 'Shape the cabin', titleEnd: 'around the', moment: 'moment.',
    intro: 'Design considered RGBW lighting scenes for cabin environments. Explore zones, tune transitions, and review every idea in an offline simulator.',
    enter: 'Enter Cabin Studio', explore: 'Explore the system', offline: 'Offline by design', noOutput: 'No physical outputs',
    sceneStudy: '01 / SCENE STUDY', simProfile: 'SIMULATION PROFILE', aurora: 'Aurora / cabin wash', zoneCount: 'RGBW · ILLUSTRATIVE ZONE VIEW',
    zoneMap: 'Illustrative zone map', notConnected: 'Not connected to aircraft', statusLabel: 'Product status',
    ribbon: ['OFFLINE SIMULATION', 'Local scene editing', 'Deterministic timeline preview', 'Validated scene files'],
    sectionEyebrow: 'A WORKSPACE FOR LIGHT', sectionTitle: 'From zone to', atmosphere: 'atmosphere.',
    sectionBody: 'Every control is tied to an editable cabin zone. Every scene is yours to shape, preview, and save locally.',
    cards: [
      ['01 · SPATIAL DESIGN', 'Cabin-aware zones', 'Choose a modeled aircraft profile and inspect its available lighting sources in the interactive cabin view. Unsupported fixtures stay out of that cabin’s inspector.'],
      ['02 · RGBW CONTROL', 'Precise, editable scenes', 'Shape red, green, blue, and white output per zone. Refine a fade and see the simulator respond immediately.'],
      ['03 · CHOREOGRAPHY', 'Time has a texture', 'Build a paced transition with real keyframes, scrub the deterministic preview, and export a versioned scene file.'],
    ],
    engineeringEyebrow: 'BUILT FOR CAREFUL WORK', engineeringTitle: 'Design intent, clearly bounded.',
    engineeringBody: 'AdigunCabinLighting Studio is an offline software simulator. It does not connect to aircraft or lighting hardware, and it does not claim certification or OEM compatibility.',
    exploreStudio: 'Explore the Studio', safetyTitle: 'Safety is explicit in every session.',
    safetyBody: 'SIMULATION · OFFLINE · NO HARDWARE CONNECTED. Physical bench and aircraft integration require independent authorization, validated equipment, and their own safety gates.',
    review: 'Review the simulator', footer: 'Engineering simulator · 2026',
    workflowTitle: 'From cabin profile to repeatable scene.',
    workflow: [
      ['01', 'Choose a cabin', 'Switch between the aircraft and airline mesh profiles available in this workspace.'],
      ['02', 'Work with modeled sources', 'The inspector follows the selected cabin and exposes only its supported lighting sources.'],
      ['03', 'Preview and save', 'Edit RGBW values, review a timed transition, then save or export the scene for review.'],
    ],
    profileCount: '29 bundled cabin mesh profiles',
  },
  de: {
    language: 'Sprache', navLabel: 'Hauptnavigation', nav: ['Funktionen', 'Technik', 'Sicherheit'], open: 'Studio öffnen',
    eyebrow: 'KABINENBELEUCHTUNG · ENGINEERING-STUDIO', title: 'Gestalten Sie die Kabine', titleEnd: 'für den', moment: 'Moment.',
    intro: 'Entwerfen Sie abgestimmte RGBW-Lichtszenen für Kabinen. Erkunden Sie Zonen, stimmen Sie Übergänge ab und prüfen Sie Ihre Ideen in einem Offline-Simulator.',
    enter: 'Kabinen-Studio öffnen', explore: 'System entdecken', offline: 'Offline konzipiert', noOutput: 'Keine physische Ausgabe',
    sceneStudy: '01 / SZENENSTUDIE', simProfile: 'SIMULATIONSPROFIL', aurora: 'Aurora / Kabinenlicht', zoneCount: 'RGBW · ILLUSTRATIVE ZONENANSICHT',
    zoneMap: 'Illustrative Zonenkarte', notConnected: 'Nicht mit einem Flugzeug verbunden', statusLabel: 'Produktstatus',
    ribbon: ['OFFLINE-SIMULATION', 'Lokale Szenenbearbeitung', 'Deterministische Timeline-Vorschau', 'Validierte Szenendateien'],
    sectionEyebrow: 'EIN ARBEITSPLATZ FÜR LICHT', sectionTitle: 'Von der Zone zur', atmosphere: 'Atmosphäre.',
    sectionBody: 'Jede Steuerung ist einer bearbeitbaren Kabinenzone zugeordnet. Jede Szene können Sie selbst gestalten, prüfen und lokal speichern.',
    cards: [
      ['01 · RÄUMLICHES DESIGN', 'Zone für Zone', 'Wählen Sie Deckenlichtleisten, Fensterumrandungen, Seitenwände, Fußraum, Leselichter und Einstiegsakzente in einer interaktiven Kabinenkarte.'],
      ['02 · RGBW-STEUERUNG', 'Präzise, bearbeitbare Szenen', 'Stimmen Sie Rot, Grün, Blau und Weiß je Zone ab. Passen Sie Überblendungen an und sehen Sie die Reaktion des Simulators sofort.'],
      ['03 · CHOREOGRAFIE', 'Zeit wird erlebbar', 'Erstellen Sie Übergänge mit Keyframes, prüfen Sie die deterministische Vorschau und exportieren Sie versionierte Szenendateien.'],
    ],
    engineeringEyebrow: 'FÜR SORGFÄLTIGE ARBEIT', engineeringTitle: 'Gestaltungsabsicht, klar abgegrenzt.',
    engineeringBody: 'AdigunCabinLighting Studio ist ein Offline-Software-Simulator. Es verbindet sich weder mit Flugzeugen noch mit Beleuchtungshardware und beansprucht keine Zertifizierung oder OEM-Kompatibilität.',
    exploreStudio: 'Studio ansehen', safetyTitle: 'Sicherheit ist in jeder Sitzung ausdrücklich ausgewiesen.',
    safetyBody: 'SIMULATION · OFFLINE · KEINE HARDWARE VERBUNDEN. Prüfstand- und Flugzeugintegration erfordern eine unabhängige Genehmigung, validierte Ausrüstung und eigene Sicherheitsfreigaben.',
    review: 'Simulator ansehen', footer: 'Engineering-Simulator · 2026',
    workflowTitle: 'Vom Kabinenprofil zur wiederholbaren Szene.',
    workflow: [
      ['01', 'Kabine auswählen', 'Wechseln Sie zwischen den Flugzeug- und Airline-Meshprofilen dieses Arbeitsbereichs.'],
      ['02', 'Modellierte Lichtquellen nutzen', 'Der Inspector richtet sich nach der ausgewählten Kabine und zeigt nur belegte Lichtquellen.'],
      ['03', 'Vorschau und speichern', 'Bearbeiten Sie RGBW-Werte, prüfen Sie den zeitlichen Übergang und speichern oder exportieren Sie die Szene.'],
    ],
    profileCount: '29 enthaltene Kabinen-Meshprofile',
  },
  yo: {
    language: 'Èdè', navLabel: 'Àkójọ ìtọ́kasí àkọ́kọ́', nav: ['Àwọn iṣẹ́', 'Ìmọ̀ ẹ̀rọ', 'Ààbò'], open: 'Ṣí Studio',
    eyebrow: 'ÌMỌ́LẸ̀ ÀGỌ́ · STUDIO ÌṢẸ̀LẸ̀', title: 'Ṣètò àgọ́ náà', titleEnd: 'fún', moment: 'àkókò kọ̀ọ̀kan.',
    intro: 'Ṣe àgbékalẹ̀ àwọn ìran ìmọ́lẹ̀ RGBW fún inú àgọ́. Yan àwọn agbègbè, ṣètò bí ìyípadà ṣe ń lọ, kí o sì ṣàyẹ̀wò èrò kọ̀ọ̀kan nínú simulator tí kò nílò ìsopọ̀.',
    enter: 'Wọlé sí Cabin Studio', explore: 'Ṣàyẹ̀wò ètò náà', offline: 'A ṣe é fún lílò láìsí ìsopọ̀', noOutput: 'Kò sí àbájáde sí ẹ̀rọ gidi',
    sceneStudy: '01 / ÌWÁDÌÍ ÌRÍNṢẸ̀', simProfile: 'ÀPẸẸRẸ ÌṢẸ̀LẸ̀', aurora: 'Aurora / ìmọ́lẹ̀ àgọ́', zoneCount: 'RGBW · ÀWÒRÁN ÀPẸẸRẸ',
    zoneMap: 'Àwòrán agbègbè àpẹẹrẹ', notConnected: 'Kò sopọ̀ mọ́ ọkọ̀ òfurufú', statusLabel: 'Ipò ọjà',
    ribbon: ['ÌṢẸ̀LẸ̀ LÁÌSÍ ÌSỌ̀DỌ̀', 'Ṣíṣe àtúnṣe ìran ní agbègbè tirẹ', 'Àyẹ̀wò àkókò tó ṣeé tún ṣe', 'Àwọn fáìlì ìran tí a ti ṣàyẹ̀wò'],
    sectionEyebrow: 'IṢẸ́ FÚN ÌṢẸ̀LẸ̀ ÌMỌ́LẸ̀', sectionTitle: 'Láti agbègbè sí', atmosphere: 'ìrísí àyíká.',
    sectionBody: 'A so gbogbo ìṣàkóso mọ́ agbègbè àgọ́ tí o lè ṣàtúnṣe. Ìwọ ló ń ṣe àgbékalẹ̀, ṣàyẹ̀wò, àti fi gbogbo ìran pamọ́ sí ẹ̀rọ rẹ.',
    cards: [
      ['01 · ÀWÒRÁN ÀGBÈGBÈ', 'Agbègbè kọ̀ọ̀kan', 'Yan ìmọ́lẹ̀ òrùlé, etí fèrèsé, ògiri ẹ̀gbẹ́, ìsàlẹ̀ ọ̀nà, ìmọ́lẹ̀ ìkàwé, àti ìmọ́lẹ̀ ẹnu-ọ̀nà lórí àwòrán àgọ́ tó ń ṣiṣẹ́.'],
      ['02 · ÌṢÀKÓSO RGBW', 'Àwọn ìran tó ṣe kedere, tó ṣeé ṣàtúnṣe', 'Ṣètò ìmọ́lẹ̀ pupa, ewé, búlúù, àti funfun fún agbègbè kọ̀ọ̀kan. Ṣàtúnṣe ìrọ̀rùn ìyípadà, kí o sì wo èsì simulator lẹ́sẹ̀kẹsẹ̀.'],
      ['03 · ÌLÀKỌRÍ ÀKÓKÒ', 'Àkókò ní ìrísí tirẹ̀', 'Ṣẹ̀dá ìyípadà pẹ̀lú keyframe, ṣàyẹ̀wò rẹ̀ lórí àkókò tó ṣeé tún ṣe, kí o sì gbé fáìlì ìran tó ní ẹ̀dà jáde.'],
    ],
    engineeringEyebrow: 'A ṢE É FÚN IṢẸ́ PẸ̀LÚ ÌṢỌ́RA', engineeringTitle: 'Aala ìlò rẹ̀ ṣe kedere.',
    engineeringBody: 'AdigunCabinLighting Studio jẹ́ simulator sọ́fítíwẹ̀ tí kò nílò ìsopọ̀. Kò sopọ̀ mọ́ ọkọ̀ òfurufú tàbí ẹ̀rọ ìmọ́lẹ̀, kò sì sọ pé ó ní ìjẹ́rìí tàbí ìbámu OEM.',
    exploreStudio: 'Ṣàyẹ̀wò Studio', safetyTitle: 'A ń ṣàlàyé ààbò ní gbogbo ìgbà ìlò.',
    safetyBody: 'ÌṢẸ̀LẸ̀ · LÁÌSÍ ÌSỌ̀DỌ̀ · KÒ SÍ Ẹ̀RỌ̀ GIDI TÍ A SOPỌ̀. Ìdánwò pẹ̀lú ohun èlò àti ìsopọ̀ ọkọ̀ òfurufú nílò àṣẹ olómìnira, ohun èlò tí a ti fọwọ́sí, àti ìgbésẹ̀ ààbò lọ́tọ̀ọ̀tọ̀.',
    review: 'Ṣàyẹ̀wò simulator', footer: 'Simulator ìmọ̀ ẹ̀rọ · 2026',
    workflowTitle: 'Láti àpẹẹrẹ àgọ́ dé ìran tó ṣeé tún ṣe.',
    workflow: [
      ['01', 'Yan àpẹẹrẹ àgọ́', 'Yí padà láàárín àwọn àpẹẹrẹ ọkọ̀ òfurufú àti ọkọ̀ òfurufú ilé-iṣẹ́ tó wà.'],
      ['02', 'Lo àwọn orísun ìmọ́lẹ̀ tó wà nínú àwòrán', 'Inspector yóò tẹ̀lé àgọ́ tí a yàn, yóò sì fi àwọn orísun ìmọ́lẹ̀ tó ní àkọsílẹ̀ hàn.'],
      ['03', 'Ṣàyẹ̀wò, kí o sì pamọ́', 'Ṣàtúnṣe RGBW, ṣàyẹ̀wò ìyípadà àkókò, kí o sì pamọ́ tàbí gbé ìran jáde.'],
    ],
    profileCount: 'Àpẹẹrẹ mesh àgọ́ 29 wà nínú ètò',
  },
  pcm: {
    language: 'Language', navLabel: 'Main navigation', nav: ['Wetin e fit do', 'Engineering', 'Safety'], open: 'Open Studio',
    eyebrow: 'CABIN LIGHTING · ENGINEERING STUDIO', title: 'Set the cabin light', titleEnd: 'make e fit', moment: 'the moment.',
    intro: 'Design correct RGBW light scenes for cabin space. Check zones, tune how light dey change, and review each idea for offline simulator.',
    enter: 'Enter Cabin Studio', explore: 'See how the system work', offline: 'E dey work offline by design', noOutput: 'E no send output to hardware',
    sceneStudy: '01 / SCENE STUDY', simProfile: 'SIMULATION PROFILE', aurora: 'Aurora / cabin light', zoneCount: 'RGBW · EXAMPLE ZONE VIEW',
    zoneMap: 'Example zone map', notConnected: 'E no connect to aircraft', statusLabel: 'Product status',
    ribbon: ['OFFLINE SIMULATION', 'Edit scenes for this browser', 'Timeline preview dey repeat the same result', 'Scene files wey pass validation'],
    sectionEyebrow: 'WORKSPACE FOR LIGHT', sectionTitle: 'From zone reach', atmosphere: 'atmosphere.',
    sectionBody: 'Every control connect to cabin zone wey you fit edit. Na you go shape the scene, preview am, and save am for this browser.',
    cards: [
      ['01 · CABIN ZONES', 'Zone by zone', 'Select ceiling light, window edge, side wall, footwell, reading light, and entry accent for the cabin map.'],
      ['02 · RGBW CONTROL', 'Scenes wey you fit edit', 'Set red, green, blue, and white for each zone. Change the fade and see the simulator respond sharp-sharp.'],
      ['03 · CHOREOGRAPHY', 'Time get texture', 'Build transition with real keyframes, scrub the timeline preview, and export versioned scene file.'],
    ],
    engineeringEyebrow: 'BUILT FOR CAREFUL WORK', engineeringTitle: 'Clear limit for wetin this tool fit do.',
    engineeringBody: 'AdigunCabinLighting Studio na offline software simulator. E no connect to aircraft or lighting hardware, and e no claim certification or OEM compatibility.',
    exploreStudio: 'Check the Studio', safetyTitle: 'Safety dey clear for every session.',
    safetyBody: 'SIMULATION · OFFLINE · NO HARDWARE CONNECTED. Bench test and aircraft integration need independent authorization, validated equipment, and separate safety checks.',
    review: 'Review the simulator', footer: 'Engineering simulator · 2026',
    workflowTitle: 'From cabin profile reach scene wey you fit repeat.',
    workflow: [
      ['01', 'Choose cabin', 'Switch between aircraft and airline mesh profiles wey dey for this workspace.'],
      ['02', 'Use modeled light sources', 'Inspector follow the cabin wey you choose and show only the lighting sources wey get support.'],
      ['03', 'Preview and save', 'Edit RGBW, check timed transition, then save or export the scene for review.'],
    ],
    profileCount: '29 cabin mesh profiles dey inside',
  },
} as const;
type LandingLocale = keyof typeof LANDING_COPY;

function LandingCabinExperience({ locale }: { locale: AppLocale }) {
  const copy = LANDING_CHALLENGE_COPY[locale];
  const profile = getCabinMeshProfile(DEFAULT_CABIN_MESH_ID) ?? AIRCRAFT_DIMENSION_PROFILES[0];
  const zones = useMemo(() => getProfileZones(profile, makeDefaultZones()), [profile]);
  const [sceneId, setSceneId] = useState('aurora');
  const [challenge, setChallenge] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [daylight, setDaylight] = useState(45);
  const [warmth, setWarmth] = useState(55);
  const [isolated, setIsolated] = useState(false);
  const [challengeStatus, setChallengeStatus] = useState('');
  const [selectedZone, setSelectedZone] = useState<ControlZoneId>('windows');
  const inspectedZone = selectedZone === 'left_sidewall' || selectedZone === 'ceiling_cove' ? selectedZone : 'windows';
  const [playing, setPlaying] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  // Start on the selected mood's finished look so the landing preview opens
  // with its actual cabin color palette; Preview still plays the full fade.
  const [time, setTime] = useState(() => PRESETS.find((preset) => preset.id === 'aurora')?.durationSeconds ?? 0);
  const [playbackStartedAt, setPlaybackStartedAt] = useState(0);
  const [soundError, setSoundError] = useState('');
  const audioContext = useRef<AudioContext | null>(null);
  const music = useRef<MoodMusicHandle | null>(null);
  const captureRef = useRef<(() => Promise<Blob>) | null>(null);
  const resetRef = useRef<(() => void) | null>(null);
  const preset = PRESETS.find((item) => item.id === sceneId) ?? PRESETS[1];
  const scene = useMemo(() => {
    if (!challenge) return preset;
    const last = preset.keyframes.at(-1)!;
    const study = validateSceneFile({
      ...preset,
      id: 'landing-lighting-study',
      name: copy.study,
      keyframes: [...preset.keyframes.slice(0, -1), {
        ...last,
        targets: {
          ...last.targets,
          windows: Object.fromEntries(Object.entries(last.targets.windows).map(([key, value]) => [key, value * daylight / 100])),
          left_sidewall: { r: warmth, g: warmth * .55, b: warmth * .24, w: 12 },
          right_sidewall: { r: warmth, g: warmth * .55, b: warmth * .24, w: 12 },
        },
      }],
    });
    return {
      ...study,
      keyframes: study.keyframes.map((frame) => ({
        ...frame,
        targets: withFixtureFallbacks(frame.targets, zones),
      })),
    };
  }, [challenge, copy.study, daylight, preset, warmth, zones]);
  const effective = useMemo(() => {
    const values = withFixtureFallbacks(interpolateScene(showOriginal ? preset : scene, time), zones);
    if (!isolated) return values;
    return Object.fromEntries(zones.map((zone) => [
      zone.id,
      zone.id === inspectedZone || zone.parentZoneId === inspectedZone
        ? values[zone.id]
        : { r: 0, g: 0, b: 0, w: 0 },
    ])) as typeof values;
  }, [inspectedZone, isolated, preset, scene, showOriginal, time, zones]);

  const openStudy = () => {
    try {
      const id = crypto.randomUUID();
      const targets = withFixtureFallbacks(interpolateScene(scene, scene.durationSeconds), zones);
      const studyZones = makeDefaultZones().map((zone) => ({ ...zone, rgbw: targets[zone.id] }));
      writeProject(id, scene.name, {
        zones: studyZones, scenes: [scene], intensity: 78, activeSceneId: scene.id,
        selectedZoneId: 'windows', projectName: scene.name, cabinConfig: CABIN_PROFILES.g650erVvip,
        aircraftMeshId: profile.id,
      });
      window.location.assign('/studio');
    } catch {
      setChallengeStatus(copy.storage);
    }
  };

  const downloadStudy = () => {
    const targets = interpolateScene(scene, scene.durationSeconds);
    const scenario = createScenarioPackage({
      projectName: scene.name,
      cabinConfig: CABIN_PROFILES.g650erVvip,
      zones: makeDefaultZones().map((zone) => ({ ...zone, rgbw: targets[zone.id] })),
      scenes: [scene], activeSceneId: scene.id, masterIntensity: 78,
    });
    downloadBlob(new Blob([JSON.stringify(scenario, null, 2)], { type: 'application/json' }), 'cabin-lighting-scenario.json');
  };


  const startMusic = (selectedScene: SceneFile, enabled = soundOn) => {
    if (!enabled) return;
    if (!window.AudioContext) { setSoundError(studioText(locale, 'instrumentalUnsupported')); return; }
    audioContext.current ??= new window.AudioContext();
    void audioContext.current.resume().then(() => {
      music.current?.stop();
      music.current = scheduleMoodMusic(audioContext.current!, selectedScene.id, 0, selectedScene.durationSeconds, .36);
    }).catch(() => setSoundError(studioText(locale, 'playbackPermission')));
  };
  const playScene = () => {
    setShowOriginal(false);
    setIsolated(false);
    setTime(0);
    setPlaybackStartedAt(performance.now());
    setPlaying(true);
    startMusic(preset);
  };
  const chooseScene = (nextScene: SceneFile) => {
    setSceneId(nextScene.id);
    setIsolated(false);
    setTime(playing ? 0 : nextScene.durationSeconds);
    if (playing) {
      setPlaybackStartedAt(performance.now());
      startMusic(nextScene);
    }
  };

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const tick = (now: number) => {
      const nextTime = Math.min(scene.durationSeconds, Math.max(0, (now - playbackStartedAt) / 1000));
      setTime(nextTime);
      if (nextTime < scene.durationSeconds) frame = requestAnimationFrame(tick);
      else { setPlaying(false); music.current?.stop(); music.current = null; }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, playbackStartedAt, scene.durationSeconds]);
  useEffect(() => () => { music.current?.stop(); void audioContext.current?.close(); }, []);

  return <><div className="hero-art live-cabin-preview" data-testid="landing-live-cabin">
    <Suspense fallback={<div className="landing-3d-loading">{copy.loading}</div>}>
      <CabinAsset3D locale={locale} enhancedSpill={false} profile={profile} zones={zones} effective={effective} intensity={78} selected={selectedZone} onSelect={setSelectedZone}
        highQuality previewActive={playing} previewMotion={false} previewTime={time} previewDuration={scene.durationSeconds} previewStartedAt={playbackStartedAt}
        scene={scene} cameraView="entry" captureRef={captureRef} cameraResetRef={resetRef} />
    </Suspense>
    <div className="landing-view-badge"><span><i /> {copy.live}</span><span>{profile.aircraft}</span></div>
    <div className="landing-preview-tools" aria-label={copy.viewControls}>
      {PRESETS.filter((preset) => ['boarding', 'aurora', 'sunrise', 'sunset', 'dining', 'sleep'].includes(preset.id)).map((preset) => {
        const targets = preset.keyframes[preset.keyframes.length - 1].targets;
        const swatch = [targets.ceiling, targets.sidewalls, targets.windows, targets.footwell]
          .map((rgbw) => `rgb(${rgbw.r * 2.55} ${rgbw.g * 2.55} ${rgbw.b * 2.55})`).join(', ');
        return <button type="button" key={preset.id} aria-label={copy.palette.replace('{name}', () => studioSceneName(locale, preset))} aria-pressed={sceneId === preset.id} onClick={() => chooseScene(preset)}>
          <i style={{ background: `linear-gradient(90deg, ${swatch})` }} />{studioSceneName(locale, preset)}
        </button>;
      })}
      <button type="button" className="landing-preview-play" onClick={playing ? () => { setPlaying(false); music.current?.stop(); music.current = null; } : playScene} aria-label={playing ? copy.pauseLabel : copy.playLabel}>
        {playing ? <Pause size={13} /> : <Play size={13} />}{playing ? copy.pause : copy.preview}
      </button>
      <button type="button" className={`landing-preview-sound ${soundOn ? 'is-on' : ''}`} aria-pressed={soundOn} onClick={() => { const next = !soundOn; setSoundOn(next); if (next) startMusic(preset, true); else { music.current?.stop(); music.current = null; } }}>
        <Volume2 size={14} />{soundOn ? copy.soundOn : copy.sound}
      </button>
    </div>
    {soundError && <span className="landing-audio-status" role="status">{soundError}</span>}
    <div className="art-caption"><span className="art-caption-dot" /> {studioSceneName(locale, scene)} / {copy.cabinLighting} <small>{copy.sim}</small></div>
  </div>
    <section className="landing-lighting-lab" id="lighting-challenge" lang={locale} aria-labelledby="lighting-challenge-heading">
      <h2 id="lighting-challenge-heading">{copy.title}</h2>
      <p>{copy.intro}</p>
      {!challenge ? <button type="button" className="button button-primary" onClick={() => { setChallenge(true); setIsolated(false); setPlaying(false); music.current?.stop(); setTime(preset.durationSeconds); }}>{copy.start}</button> : <>
        <div className="landing-lab-controls">
          <label>{copy.daylight} <output>{daylight}%</output><input type="range" min="0" max="100" value={daylight} onChange={(event) => { setPlaying(false); music.current?.stop(); setShowOriginal(false); setDaylight(Number(event.target.value)); setTime(preset.durationSeconds); }} /></label>
          <label>{copy.warmth} <output>{warmth}%</output><input type="range" min="0" max="100" value={warmth} onChange={(event) => { setPlaying(false); music.current?.stop(); setShowOriginal(false); setWarmth(Number(event.target.value)); setTime(preset.durationSeconds); }} /></label>
        </div>
        <div className="landing-lab-actions">
          <button type="button" className="button button-outline" aria-pressed={showOriginal} onClick={() => { setPlaying(false); music.current?.stop(); setIsolated(false); setShowOriginal(!showOriginal); setTime(preset.durationSeconds); }}>{showOriginal ? copy.showEdit : copy.compare}</button>
          <button type="button" className="button button-primary" onClick={openStudy}>{copy.edit} <ArrowRight size={15} /></button>
          <button type="button" className="button button-outline" onClick={downloadStudy}><Download size={15} /> {copy.download}</button>
        </div>
        {challengeStatus && <p role="status">{challengeStatus}</p>}
      </>}
      <details className="landing-fixture-study">
        <summary>{copy.inspect}</summary>
        <label>{copy.group} <select value={inspectedZone} onChange={(event) => { setSelectedZone(event.target.value as ControlZoneId); setIsolated(true); setPlaying(false); music.current?.stop(); setTime(preset.durationSeconds); }}>
          <option value="windows">{copy.daylight}</option>
          <option value="left_sidewall">{copy.sidewall}</option>
          <option value="ceiling_cove">{copy.cove}</option>
        </select></label>
        <button type="button" className="button button-outline" aria-pressed={isolated} onClick={() => { setSelectedZone(inspectedZone); setIsolated(!isolated); setPlaying(false); music.current?.stop(); setTime(preset.durationSeconds); }}>{isolated ? copy.combined : copy.isolate}</button>
        <p>{studioZoneDetail(locale, zones.find((zone) => zone.id === inspectedZone)!)}. {inspectedZone === 'windows' ? copy.windowTip : inspectedZone === 'left_sidewall' ? copy.sideTip : copy.coveTip}</p>
        <p>{copy.limits}{profile.sourceUrl && <> <a href={profile.sourceUrl}>{copy.source}</a></>}</p>
      </details>
    </section>
  </>;
}

function Landing() {
  const [locale, setLocale] = useState<LandingLocale>(readAppLocale);
  const text = LANDING_COPY[locale];
  return <main className="landing" lang={locale}>
    <header className="landing-nav"><Brand />
      <nav aria-label={text.navLabel}><a href="#capabilities">{text.nav[0]}</a><a href="#engineering">{text.nav[1]}</a><a href="#safety">{text.nav[2]}</a></nav>
      <label className="landing-language"><span className="sr-only">{text.language}</span><select className="landing-locale" aria-label={text.language} value={locale} onChange={(event) => { const next = event.target.value as LandingLocale; setLocale(next); saveAppLocale(next); }}><option value="en">English</option><option value="de">Deutsch</option><option value="yo">Yorùbá</option><option value="pcm">Nigerian Pidgin</option></select></label>
      <a className="button button-primary nav-cta" href="/studio">{text.open} <ArrowRight size={16} /></a>
    </header>
    <section className="landing-hero">
      <div className="hero-copy">
        <div className="eyebrow"><span className="eyebrow-line" /> {text.eyebrow}</div>
        <h1>{text.title}<br />{text.titleEnd} <em>{text.moment}</em></h1>
        <p>{text.intro}</p>
        <div className="hero-actions"><a className="button button-primary button-large" href="/studio">{text.enter} <ArrowRight size={18} /></a><a href="#lighting-challenge" className="text-link">{LANDING_CHALLENGE_COPY[locale].tryIt} <ArrowDownToLine size={15} /></a></div>
        <div className="hero-proof"><span><Radio size={16} /> {text.offline}</span><span><ShieldCheck size={16} /> {text.noOutput}</span></div>
        <div className="landing-profile-proof"><span className="landing-profile-count">{AIRLINE_MESH_PROFILES.length + AIRCRAFT_DIMENSION_PROFILES.length}</span><span>{text.profileCount}</span><span className="landing-proof-divider" /><span>2D / 3D · RGBW · Scene timeline</span></div>
      </div>
      <div className="hero-art-wrap"><div className="hero-art-label"><span>{text.sceneStudy}</span><span>{text.simProfile}</span></div>
        <LandingCabinExperience locale={locale} />
        <div className="hero-art-bottom"><span>{text.zoneMap}</span><span>{text.notConnected}</span></div>
      </div>
    </section>
    <section className="landing-ribbon" aria-label={text.statusLabel}><span><span className="status-pulse" /> {text.ribbon[0]}</span><span>{text.ribbon[1]}</span><span>{text.ribbon[2]}</span><span>{text.ribbon[3]}</span></section>
    <section className="landing-section" id="capabilities"><div className="section-heading"><div><div className="eyebrow">{text.sectionEyebrow}</div><h2>{text.sectionTitle} <em>{text.atmosphere}</em></h2></div><p>{text.sectionBody}</p></div>
      <div className="capability-grid">
        {text.cards.map(([meta, title, body]) => <article key={meta}><span className="feature-icon"><LayoutGrid size={19} /></span><small>{meta}</small><h3>{title}</h3><p>{body}</p></article>)}
      </div>
    </section>
    <section className="landing-workflow" aria-labelledby="landing-workflow-title"><div className="landing-workflow-heading"><div className="eyebrow">{text.profileCount}</div><h2 id="landing-workflow-title">{text.workflowTitle}</h2></div><div className="landing-workflow-steps">{text.workflow.map(([number, title, body]) => <article key={number}><span>{number}</span><div><h3>{title}</h3><p>{body}</p></div></article>)}</div><a href="/studio" className="button button-outline">{text.exploreStudio} <ArrowRight size={15} /></a></section>
    <section className="engineering-band" id="engineering"><div className="engineering-mark"><Gauge size={24} /></div><div><div className="eyebrow">{text.engineeringEyebrow}</div><h2>{text.engineeringTitle}</h2><p>{text.engineeringBody}</p></div><a href="/studio" className="button button-quiet">{text.exploreStudio} <ArrowRight size={16} /></a></section>
    <section className="safety-section" id="safety"><ShieldCheck size={18} /><div><strong>{text.safetyTitle}</strong><p>{text.safetyBody}</p></div><a href="/studio">{text.review} <ArrowRight size={14} /></a></section>
    <footer className="landing-footer"><Brand small /><span>AdigunCabinLighting · HB Elektroniker</span><span>{text.footer}</span></footer>
  </main>;
}

function Channel({ locale, name, value, color, onChange }: { locale: AppLocale; name: string; value: number; color: string; onChange: (value: number) => void }) {
  const inputId = `channel-${name.toLowerCase()}`;
  return <div className="channel-row"><label htmlFor={inputId}><i style={{ background: color }} />{name}</label>
    <input id={inputId} aria-label={studioText(locale, 'channelSlider').replace('{name}', name)} type="range" min="0" max="100" step="1" value={value}
      style={{ '--range-fill': `${value}%`, '--range-color': color } as React.CSSProperties} onChange={(e) => onChange(Number(e.target.value))} />
    <input className="channel-value" type="number" min="0" max="100" step="1" value={Math.round(value)} aria-label={studioText(locale, 'channelPercent').replace('{name}', name)}
      onChange={(e) => onChange(Math.max(0, Math.min(100, Number(e.target.value))))} />
  </div>;
}

function Studio() {
  const [locale] = useState<AppLocale>(readAppLocale);
  const t = (key: StudioCopyKey) => studioText(locale, key);
  const [projectId, setProjectId] = useState(() => localStorage.getItem(ACTIVE_PROJECT_KEY) ?? 'default');
  const stored = useMemo(() => readSaved(projectId), [projectId]);
  const [zones, setZones] = useState<ZoneState[]>(() => {
    const saved = stored.zones;
    return migrateZones(Array.isArray(saved) ? saved : undefined);
  });
  const [scenes, setScenes] = useState<SceneFile[]>(() => {
    try {
      if (!Array.isArray(stored.scenes) || !stored.scenes.length) return copy(PRESETS);
      const savedScenes = stored.scenes.map(validateSceneFile);
      return [...savedScenes, ...PRESETS.filter((preset) => !savedScenes.some((scene) => scene.id === preset.id)).map(copy)];
    }
    catch { return copy(PRESETS); }
  });
  const [intensity, setIntensity] = useState<number>(() => Number.isFinite(stored.intensity) ? Math.max(0, Math.min(100, stored.intensity!)) : 72);
  const [selected, setSelected] = useState<ControlZoneId>(() => ZONE_IDS.includes(stored.selectedZoneId as ZoneId) || stored.selectedZoneId?.startsWith('fixture:') ? stored.selectedZoneId! : 'ceiling');
  const [activeSceneId, setActiveSceneId] = useState(() => typeof stored.activeSceneId === 'string' ? stored.activeSceneId : 'aurora');
  const [projectName, setProjectName] = useState(() => typeof stored.projectName === 'string' && stored.projectName.trim() ? stored.projectName : 'Cabin 01');
  const [cabinConfig, setCabinConfig] = useState<CabinConfig>(() => validateCabinConfig(stored.cabinConfig ?? {}));
  const [cabinDraft, setCabinDraft] = useState<CabinConfig>(() => validateCabinConfig(stored.cabinConfig ?? {}));
  const [aircraftMeshId, setAircraftMeshId] = useState<string | null>(() => Object.hasOwn(stored, 'aircraftMeshId') ? getCabinMeshProfile(stored.aircraftMeshId)?.id ?? null : DEFAULT_CABIN_MESH_ID);
  const [aircraftMeshDraftId, setAircraftMeshDraftId] = useState<string | null>(() => Object.hasOwn(stored, 'aircraftMeshId') ? getCabinMeshProfile(stored.aircraftMeshId)?.id ?? null : DEFAULT_CABIN_MESH_ID);
  const selectedMeshProfile = getCabinMeshProfile(aircraftMeshId);
  const inspectorZones = useMemo(() => selectedMeshProfile
    ? getProfileZones(selectedMeshProfile, zones)
    : zones.filter((zone) => REFERENCE_INSPECTOR_ZONE_IDS.includes(zone.id as ZoneId)), [selectedMeshProfile, zones]);
  const inspectorZoneIds = useMemo(() => new Set(inspectorZones.map((zone) => zone.id)), [inspectorZones]);
  useEffect(() => {
    if (!inspectorZoneIds.has(selected) && inspectorZones[0]) setSelected(inspectorZones[0].id);
  }, [inspectorZoneIds, inspectorZones, selected]);
  const [time, setTime] = useState(0);
  const [previewStartedAt, setPreviewStartedAt] = useState(0);
  const [effectiveRGBW, setEffectiveRGBW] = useState<Record<ControlZoneId, RGBW>>(() => Object.fromEntries(zones.map((zone) => [zone.id, { ...zone.rgbw }])) as Record<ControlZoneId, RGBW>);
  const [playing, setPlaying] = useState(false);
  const [motionPreview, setMotionPreview] = useState(false);
  const [audioCues, setAudioCues] = useState(true);
  const [audioPanelOpen, setAudioPanelOpen] = useState(false);
  const [audioVolume, setAudioVolume] = useState(38);
  const [localMoodAudio, setLocalMoodAudio] = useState<Record<string, LocalMoodAudioCue>>({});
  const [localVoiceAudio, setLocalVoiceAudio] = useState<Record<string, LocalMoodAudioCue>>({});
  const [localAudioRole, setLocalAudioRole] = useState<'mood' | 'welcome' | 'tour'>('mood');
  const [localMoodAudioDraft, setLocalMoodAudioDraft] = useState<LocalMoodAudioDraft>({ file: null, title: '', rightsReference: '' });
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState('scene');
  const [menuOpen, setMenuOpen] = useState(false);
  const [hq4k, setHq4k] = useState(true);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('3d');
  const [cameraView, setCameraView] = useState<'entry' | 'mid-cabin' | 'aft' | 'window-row'>('entry');
  const [configOpen, setConfigOpen] = useState(false);
  const [undo, setUndo] = useState<ZoneState[][]>([]);
  const [redo, setRedo] = useState<ZoneState[][]>([]);
  const importRef = useRef<HTMLInputElement>(null);
  const scenarioImportRef = useRef<HTMLInputElement>(null);
  const moodAudioFileRef = useRef<HTMLInputElement>(null);
  const localMoodAudioRef = useRef<HTMLAudioElement | null>(null);
  const localVoiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const localAudioObjectUrls = useRef(new Set<string>());
  const audioLoadTicket = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const cabinCaptureRef = useRef<(() => Promise<Blob>) | null>(null);
  const cameraResetRef = useRef<(() => void) | null>(null);
  const playStart = useRef(0);
  const playbackTime = useRef(time);
  const audioContext = useRef<AudioContext | null>(null);
  const moodMusicRef = useRef<MoodMusicHandle | null>(null);
  const speechUtterance = useRef<SpeechSynthesisUtterance | null>(null);
  const speechTimer = useRef<number | null>(null);
  const effectiveRef = useRef(effectiveRGBW);
  const zoneValuesRef = useRef(Object.fromEntries(zones.map((zone) => [zone.id, zone.rgbw])) as Record<ControlZoneId, RGBW>);
  zoneValuesRef.current = Object.fromEntries(zones.map((zone) => [zone.id, zone.rgbw])) as Record<ControlZoneId, RGBW>;
  const fadeTransitions = useRef<Partial<Record<ControlZoneId, { from: RGBW; to: RGBW; started: number; durationMs: number }>>>({});
  const fadeFrame = useRef<number | null>(null);
  const scene = scenes.find((item) => item.id === activeSceneId) ?? scenes[0] ?? PRESETS[0];
  useEffect(() => {
    if (!selectedMeshProfile) return;
    const profileFixtures = getProfileZones(selectedMeshProfile, zones).filter((zone) => zone.parentZoneId);
    if (!profileFixtures.length) return;
    const existing = new Set(zones.map((zone) => zone.id));
    const added = profileFixtures.filter((zone) => !existing.has(zone.id));
    if (added.length) {
      setZones((previous) => [...previous, ...added.filter((zone) => !previous.some((item) => item.id === zone.id))]);
      const effective = { ...effectiveRef.current, ...Object.fromEntries(added.map((zone) => [zone.id, { ...zone.rgbw }])) };
      effectiveRef.current = effective;
      setEffectiveRGBW(effective);
    }
    setScenes((previous) => previous.map((item) => ({
      ...item,
      keyframes: item.keyframes.map((frame) => ({
        ...frame,
        targets: { ...frame.targets, ...Object.fromEntries(profileFixtures.map((zone) => [
          zone.id,
          frame.targets[zone.id] ?? frame.targets[zone.parentZoneId!] ?? zone.rgbw,
        ])) },
      })),
    })));
  // Seed only the selected cabin's fixture tracks from its parent moods.
  }, [selectedMeshProfile?.id]);
  const audioTrackKey = `${projectId}:${scene.id}`;
  const currentMoodAudio = localMoodAudio[audioTrackKey];
  const currentVoiceAudio = localAudioRole === 'mood' ? undefined : localVoiceAudio[`${projectId}:${localAudioRole}`];
  const currentConfiguredAudio = localAudioRole === 'mood' ? currentMoodAudio : currentVoiceAudio;
  const currentAudioAssetKey = cabinAudioAssetKey(projectId, localAudioRole, localAudioRole === 'mood' ? scene.id : undefined);
  const currentZone = inspectorZones.find((zone) => zone.id === selected) ?? inspectorZones[0] ?? zones[0];
  useEffect(() => {
    let cancelled = false;
    const ticket = ++audioLoadTicket.current;
    void readCabinAudioAsset(currentAudioAssetKey).then((asset) => {
      if (!asset || cancelled || ticket !== audioLoadTicket.current) return;
      const objectUrl = URL.createObjectURL(asset.blob);
      localAudioObjectUrls.current.add(objectUrl);
      const cue = { objectUrl, fileName: asset.fileName, title: asset.title, rightsReference: asset.rightsReference };
      if (asset.role === 'mood' && asset.sceneId) setLocalMoodAudio((current) => ({ ...current, [projectId + ':' + asset.sceneId]: cue }));
      else if (asset.role !== 'mood') setLocalVoiceAudio((current) => ({ ...current, [projectId + ':' + asset.role]: cue }));
    }).catch(() => {
      if (!cancelled && ticket === audioLoadTicket.current) setNotice(t('audioReadFailed'));
    });
    return () => { cancelled = true; };
  }, [currentAudioAssetKey, projectId]);
  const startTransitionPreview = () => {
    const startAt = time >= scene.durationSeconds ? 0 : time;
    playbackTime.current = startAt;
    setPreviewStartedAt(performance.now() - startAt * 1000);
    if (time >= scene.durationSeconds) applySceneAt(0);
    if (audioCues && !currentMoodAudio) {
      if (!window.AudioContext) setNotice(t('instrumentalUnsupported'));
      else {
        audioContext.current ??= new window.AudioContext();
        void audioContext.current.resume().catch(() => setNotice(t('instrumentalPermission')));
      }
    }
    setPlaying(true);
  };

  const getAudioContext = () => {
    if (!window.AudioContext) { setNotice(t('generatedAudioUnsupported')); return null; }
    audioContext.current ??= new window.AudioContext();
    void audioContext.current.resume().catch(() => setNotice(t('playbackPermission')));
    return audioContext.current;
  };
  const importLocalMoodAudio = async () => {
    const { file, title, rightsReference } = localMoodAudioDraft;
    if (!file) { setNotice(t('chooseLocalAudio')); return; }
    if (file.size > MAX_LOCAL_MOOD_AUDIO_BYTES) { setNotice(t('audioFileTooLarge')); return; }
    const audioExtension = /\.(aac|flac|m4a|mp3|oga|ogg|wav|webm)$/i.test(file.name);
    if (!file.type.startsWith('audio/') && !audioExtension) { setNotice(t('chooseSupportedAudio')); return; }
    if (!title.trim() || !rightsReference.trim()) { setNotice(t('audioMetadataRequired')); return; }
    const role = localAudioRole;
    const projectIdAtSave = projectId;
    const sceneAtSave = scene;
    const sceneId = role === 'mood' ? sceneAtSave.id : null;
    const moodKey = projectIdAtSave + ':' + sceneId;
    const voiceKey = projectIdAtSave + ':' + role;
    const asset: StoredCabinAudioAsset = { key: cabinAudioAssetKey(projectIdAtSave, role, sceneId ?? undefined), projectId: projectIdAtSave, role, sceneId, fileName: file.name, mediaType: file.type || 'application/octet-stream', title: title.trim(), rightsReference: rightsReference.trim(), savedAt: new Date().toISOString(), blob: file };
    try { await saveCabinAudioAsset(asset); }
    catch { setNotice(t('audioSaveFailed')); return; }
    audioLoadTicket.current += 1;
    const objectUrl = URL.createObjectURL(file);
    localAudioObjectUrls.current.add(objectUrl);
    const cue = { objectUrl, fileName: file.name, title: title.trim(), rightsReference: rightsReference.trim() };
    if (role === 'mood') {
      const previous = localMoodAudio[moodKey];
      if (previous) { URL.revokeObjectURL(previous.objectUrl); localAudioObjectUrls.current.delete(previous.objectUrl); }
      setLocalMoodAudio((current) => ({ ...current, [moodKey]: cue }));
      setNotice(t('instrumentalAdded').replace('{name}', () => studioSceneName(locale, sceneAtSave)));
    } else {
      const roleKey = voiceKey;
      const previous = localVoiceAudio[roleKey];
      if (previous) {
        if (localVoiceAudioRef.current?.src === previous.objectUrl) { localVoiceAudioRef.current.pause(); localVoiceAudioRef.current.removeAttribute('src'); localVoiceAudioRef.current.load(); }
        URL.revokeObjectURL(previous.objectUrl);
        localAudioObjectUrls.current.delete(previous.objectUrl);
      }
      setLocalVoiceAudio((current) => ({ ...current, [roleKey]: cue }));
      setNotice(t(role === 'welcome' ? 'welcomeRecordingAdded' : 'tourRecordingAdded'));
    }
    setLocalMoodAudioDraft({ file: null, title: '', rightsReference: '' });
    if (moodAudioFileRef.current) moodAudioFileRef.current.value = '';
  };
  const removeLocalMoodAudio = async () => {
    const cue = currentConfiguredAudio;
    if (!cue) return;
    const role = localAudioRole;
    const moodKey = audioTrackKey;
    const voiceKey = projectId + ':' + role;
    const sceneName = studioSceneName(locale, scene);
    try { await deleteCabinAudioAsset(currentAudioAssetKey); }
    catch { setNotice(t('audioRemoveFailed')); return; }
    audioLoadTicket.current += 1;
    if (role === 'mood') {
      setLocalMoodAudio((current) => { const next = { ...current }; delete next[moodKey]; return next; });
      setNotice(t('audioCueRemoved').replace('{name}', () => sceneName));
    } else {
      const roleKey = voiceKey;
      if (localVoiceAudioRef.current?.src === cue.objectUrl) { localVoiceAudioRef.current.pause(); localVoiceAudioRef.current.removeAttribute('src'); }
      setLocalVoiceAudio((current) => { const next = { ...current }; delete next[roleKey]; return next; });
      setNotice(t(role === 'welcome' ? 'welcomeRecordingRemoved' : 'tourRecordingRemoved'));
    }
    URL.revokeObjectURL(cue.objectUrl);
    localAudioObjectUrls.current.delete(cue.objectUrl);
  };  const speakCabinAudio = (kind: 'welcome' | 'tour') => {
    const recordedVoice = localVoiceAudio[projectId + ':' + kind];
    setPlaying(false); moodMusicRef.current?.stop(); localMoodAudioRef.current?.pause();
    if (recordedVoice) {
      speechUtterance.current = null;
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      if (speechTimer.current !== null) { window.clearTimeout(speechTimer.current); speechTimer.current = null; }
      const player = localVoiceAudioRef.current;
      if (!player) { setNotice(t('recordingPlayerUnavailable')); return; }
      player.pause(); player.src = recordedVoice.objectUrl; player.currentTime = 0; player.loop = false; player.volume = audioVolume / 100;
      void player.play().then(() => setNotice(t(kind === 'welcome' ? 'welcomeRecordingStarted' : 'tourRecordingStarted')))
        .catch(() => setNotice(t('recordingPlaybackFailed')));
      return;
    }
    if (!('speechSynthesis' in window) || typeof window.SpeechSynthesisUtterance !== 'function') { setNotice(t('speechUnsupported')); return; }
    speechUtterance.current = null; window.speechSynthesis.cancel();
    if (speechTimer.current !== null) window.clearTimeout(speechTimer.current);
    const announce = () => {
      const preview = studioVoicePreview(locale, kind);
      const utterance = new window.SpeechSynthesisUtterance(preview.text);
      utterance.lang = preview.language; utterance.rate = kind === 'welcome' ? .88 : .94; utterance.pitch = .94; utterance.volume = audioVolume / 100;
      const voices = window.speechSynthesis.getVoices();
      const language = preview.language.toLowerCase();
      const primaryLanguage = language.split('-')[0];
      const matchingVoice = voices.find((voice) => voice.lang.toLowerCase() === language)
        ?? voices.find((voice) => voice.lang.toLowerCase().split('-')[0] === primaryLanguage);
      if (matchingVoice) utterance.voice = matchingVoice;
      speechUtterance.current = utterance;
      utterance.onend = () => { if (speechUtterance.current === utterance) speechUtterance.current = null; };
      utterance.onerror = () => { if (speechUtterance.current === utterance) { speechUtterance.current = null; setNotice(t('voicePlaybackFailed')); } };
      window.speechSynthesis.speak(utterance);
    };
    if (kind === 'welcome') { const context = getAudioContext(); if (context) { playWelcomeChime(context, audioVolume); speechTimer.current = window.setTimeout(announce, 850); } else announce(); }
    else announce();
    setNotice(kind === 'welcome' ? t('welcomeVoiceStarted') : t('guideVoiceStarted'));
  };  const stopFadeFrame = () => {
    if (fadeFrame.current !== null) cancelAnimationFrame(fadeFrame.current);
    fadeFrame.current = null;
  };
  const setEffectiveImmediately = (values: Record<ControlZoneId, RGBW>) => {
    stopFadeFrame(); fadeTransitions.current = {}; effectiveRef.current = values; setEffectiveRGBW(values);
  };
  useEffect(() => {
    moodMusicRef.current?.setVolume(audioVolume);
    if (speechUtterance.current) speechUtterance.current.volume = audioVolume / 100;
    if (localVoiceAudioRef.current) localVoiceAudioRef.current.volume = audioVolume / 100;
  }, [audioVolume]);
  useEffect(() => {
    if (!playing || !audioCues || !audioContext.current || currentMoodAudio) return;
    let cancelled = false;
    const context = audioContext.current;
    void context.resume().then(() => {
      if (!cancelled) moodMusicRef.current = scheduleMoodMusic(context, scene.id, playbackTime.current, scene.durationSeconds, audioVolume);
    }).catch(() => setNotice(t('instrumentalPermission')));
    return () => {
      cancelled = true;
      moodMusicRef.current?.stop();
      moodMusicRef.current = null;
    };
  }, [playing, audioCues, scene.id, scene.durationSeconds, audioVolume, currentMoodAudio]);
  useEffect(() => {
    const element = localMoodAudioRef.current;
    if (!element) return;
    element.volume = audioVolume / 100;
    if (!currentMoodAudio) {
      element.pause();
      element.removeAttribute('src');
      element.load();
      return;
    }
    if (element.src !== currentMoodAudio.objectUrl) {
      element.src = currentMoodAudio.objectUrl;
      element.loop = true;
      element.load();
    }
    const syncPosition = () => {
      const duration = Number.isFinite(element.duration) && element.duration > 0 ? element.duration : 0;
      const target = duration ? playbackTime.current % duration : playbackTime.current;
      if (element.paused || Math.abs(element.currentTime - target) > .5) element.currentTime = target;
      if (playing && audioCues) void element.play().catch(() => setNotice(t('importedAudioPlaybackFailed')));
      else element.pause();
    };
    if (element.readyState >= 1) syncPosition();
    else element.addEventListener('loadedmetadata', syncPosition, { once: true });
    return () => element.removeEventListener('loadedmetadata', syncPosition);
  }, [currentMoodAudio, playing, audioCues, audioVolume, scene.id]);
  useEffect(() => {
    const player = localVoiceAudioRef.current;
    if (!player) return;
    player.pause(); player.removeAttribute('src'); player.load();
  }, [projectId]);
  useEffect(() => () => {
    if (speechTimer.current !== null) window.clearTimeout(speechTimer.current);
    speechUtterance.current = null;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    moodMusicRef.current?.stop();
    localMoodAudioRef.current?.pause();
    localVoiceAudioRef.current?.pause();
    for (const objectUrl of localAudioObjectUrls.current) URL.revokeObjectURL(objectUrl);
    localAudioObjectUrls.current.clear();
    void audioContext.current?.close();
  }, []);
  useEffect(() => {
    moodMusicRef.current?.setVolume(audioVolume);
    if (speechUtterance.current) speechUtterance.current.volume = audioVolume / 100;
    if (localVoiceAudioRef.current) localVoiceAudioRef.current.volume = audioVolume / 100;
  }, [audioVolume]);
  const fadeZoneTo = (id: ControlZoneId, value: RGBW, seconds: number) => {
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
      for (const zoneId of Object.keys(fadeTransitions.current) as ControlZoneId[]) {
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
      try { writeProject(projectId, projectName, { zones, scenes, intensity, activeSceneId, selectedZoneId: selected, projectName, cabinConfig, aircraftMeshId }); }
      catch { setNotice(t('browserStorageUnavailable')); }
    };
    const timer = window.setTimeout(persist, 300);
    window.addEventListener('pagehide', persist);
    return () => { window.clearTimeout(timer); window.removeEventListener('pagehide', persist); };
  }, [zones, scenes, intensity, activeSceneId, selected, projectName, projectId, cabinConfig, aircraftMeshId]);
  useEffect(() => {
    if (!playing) return;
    playStart.current = performance.now() - playbackTime.current * 1000;
    let lastVisualUpdate = 0;
    let animation = 0;
    const tick = (now: number) => {
      const next = Math.min(scene.durationSeconds, (now - playStart.current) / 1000);
      playbackTime.current = next;
      // Bound React/Three.js work for large cabin meshes while retaining a smooth lighting crossfade.
      if (now - lastVisualUpdate >= 100 || next >= scene.durationSeconds) {
        lastVisualUpdate = now;
        setTime(next);
        if (!aircraftMeshId) setEffectiveImmediately(preserveSafetyZones(withFixtureFallbacks(interpolateScene(scene, next), zones), zoneValuesRef.current));
      }
      if (next >= scene.durationSeconds) {
        if (aircraftMeshId) setEffectiveImmediately(preserveSafetyZones(withFixtureFallbacks(interpolateScene(scene, next), zones), zoneValuesRef.current));
        setPlaying(false);
        return;
      }
      animation = window.requestAnimationFrame(tick);
    };
    animation = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(animation);
  }, [playing, scene, aircraftMeshId, zones]);
  useEffect(() => () => stopFadeFrame(), []);
  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(''), 6000);
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
    const editedIds: ControlZoneId[] = selected === 'sidewalls' ? ['sidewalls', 'left_sidewall', 'right_sidewall'] : [selected, ...zones.filter((zone) => zone.parentZoneId === selected && selected === 'reading').map((zone) => zone.id)];
    setZones((previous) => {
      const matching = previous.map((zone) => editedIds.includes(zone.id) ? { ...zone, rgbw } : zone);
      return matching.some((zone, index) => zone !== previous[index]) ? matching : [...previous, { ...currentZone, rgbw }];
    });
    editedIds.forEach((id) => fadeZoneTo(id, rgbw, zones.find((zone) => zone.id === id)?.fadeSeconds ?? currentZone.fadeSeconds));
    setPlaying(false);
  };
  const setZoneColor = (rgbw: RGBW) => {
    snapshot(); setRedo([]);
    const editedIds: ControlZoneId[] = selected === 'sidewalls' ? ['sidewalls', 'left_sidewall', 'right_sidewall'] : [selected, ...zones.filter((zone) => zone.parentZoneId === selected && selected === 'reading').map((zone) => zone.id)];
    setZones((previous) => {
      const matching = previous.map((zone) => editedIds.includes(zone.id) ? { ...zone, rgbw } : zone);
      return matching.some((zone, index) => zone !== previous[index]) ? matching : [...previous, { ...currentZone, rgbw }];
    });
    editedIds.forEach((id) => fadeZoneTo(id, rgbw, zones.find((zone) => zone.id === id)?.fadeSeconds ?? currentZone.fadeSeconds)); setPlaying(false);
  };
  const applySceneAt = (nextTime: number, nextScene = scene) => {
    const targets = preserveSafetyZones(withFixtureFallbacks(interpolateScene(nextScene, nextTime), zones), zoneValuesRef.current);
    setEffectiveImmediately(targets);
    playbackTime.current = nextTime;
    const audio = localMoodAudioRef.current;
    if (audio && currentMoodAudio && Number.isFinite(audio.duration) && audio.duration > 0) audio.currentTime = nextTime % audio.duration;
    setTime(nextTime);
  };
  const chooseScene = (id: string) => {
    const next = scenes.find((item) => item.id === id);
    if (!next) return;
    setPlaying(false); setActiveSceneId(id); applySceneAt(0, next);
    setZones((previous) => previous.map((zone) => ({
      ...zone,
      rgbw: zone.id === 'emergency' || zone.id === 'exit' ? zone.rgbw : next.keyframes[0].targets[zone.id] ?? (zone.parentZoneId ? next.keyframes[0].targets[zone.parentZoneId] : zone.rgbw),
    })));
    setNotice(t('sceneLoaded').replace('{name}', () => studioSceneName(locale, next)));
  };
  const changeFade = (value: number) => {
    snapshot(); setZones((previous) => previous.map((zone) => zone.id === selected ? { ...zone, fadeSeconds: Math.max(0, Math.min(120, value)) } : zone));
  };
  const undoOnce = () => {
    if (!undo.length) return;
    setRedo((history) => [...history, copy(zones)]); setZones(undo[undo.length - 1]); setEffectiveImmediately(Object.fromEntries(undo[undo.length - 1].map((zone) => [zone.id, zone.rgbw])) as Record<ControlZoneId, RGBW>); setUndo((history) => history.slice(0, -1)); setPlaying(false);
  };
  const redoOnce = () => {
    if (!redo.length) return;
    setUndo((history) => [...history, copy(zones)]); setZones(redo[redo.length - 1]); setEffectiveImmediately(Object.fromEntries(redo[redo.length - 1].map((zone) => [zone.id, zone.rgbw])) as Record<ControlZoneId, RGBW>); setRedo((history) => history.slice(0, -1)); setPlaying(false);
  };
  const saveScene = () => {
    const finalEasing = scene.keyframes.find((item) => item.atSeconds === scene.durationSeconds)?.easing;
    const frame = { atSeconds: scene.durationSeconds, ...(finalEasing ? { easing: finalEasing } : {}), targets: Object.fromEntries(zones.map((zone) => [zone.id, zone.rgbw])) as SceneFile['keyframes'][number]['targets'] };
    const keyframes = scene.keyframes.filter((item) => item.atSeconds !== scene.durationSeconds).concat(frame).sort((a, b) => a.atSeconds - b.atSeconds);
    const updated = validateSceneFile({ ...scene, keyframes });
    setScenes((all) => all.map((item) => item.id === updated.id ? updated : item));
    setNotice(t('sceneSaved').replace('{name}', () => studioSceneName(locale, scene)));
  };
  const resetScene = () => { const defaults = makeDefaultZones(); setPlaying(false); setUndo([]); setRedo([]); setScenes(copy(PRESETS)); setZones(defaults); setEffectiveImmediately(Object.fromEntries(defaults.map((zone) => [zone.id, zone.rgbw])) as Record<ControlZoneId, RGBW>); setActiveSceneId('aurora'); setSelected('ceiling'); setTime(0); setIntensity(72); setCabinConfig(DEFAULT_CABIN_CONFIG); setCabinDraft(DEFAULT_CABIN_CONFIG); setAircraftMeshId(DEFAULT_CABIN_MESH_ID); setAircraftMeshDraftId(DEFAULT_CABIN_MESH_ID); setNotice(t('localReset')); };
  const currentProjectState = (): SavedState => ({ zones, scenes, intensity, activeSceneId, selectedZoneId: selected, projectName, cabinConfig, aircraftMeshId });
  const saveProject = () => { try { writeProject(projectId, projectName, currentProjectState()); setNotice(t('projectSaved').replace('{name}', () => projectName)); } catch { setNotice(t('projectStorageFailed')); } };
  const loadProject = (id: string, name: string) => {
    const next = readSaved(id);
    const nextZones = Array.isArray(next.zones) ? migrateZones(next.zones) : makeDefaultZones();
    let nextScenes: SceneFile[]; try {
      const savedScenes = Array.isArray(next.scenes) && next.scenes.length ? next.scenes.map(validateSceneFile) : [];
      nextScenes = [...savedScenes, ...PRESETS.filter((preset) => !savedScenes.some((item) => item.id === preset.id)).map(copy)];
      if (!nextScenes.length) nextScenes = copy(PRESETS);
    } catch { nextScenes = copy(PRESETS); }
    const nextMeshId = Object.hasOwn(next, 'aircraftMeshId') ? getCabinMeshProfile(next.aircraftMeshId)?.id ?? null : DEFAULT_CABIN_MESH_ID;
    setProjectId(id); localStorage.setItem(ACTIVE_PROJECT_KEY, id); setProjectName(next.projectName || name); setZones(nextZones); setScenes(nextScenes); setIntensity(Number.isFinite(next.intensity) ? Math.max(0, Math.min(100, next.intensity!)) : 72); setActiveSceneId(next.activeSceneId || 'aurora'); setSelected(next.selectedZoneId && (ZONE_IDS.includes(next.selectedZoneId as ZoneId) || next.selectedZoneId.startsWith('fixture:')) ? next.selectedZoneId : 'ceiling'); setCabinConfig(validateCabinConfig(next.cabinConfig ?? {})); setCabinDraft(validateCabinConfig(next.cabinConfig ?? {})); setAircraftMeshId(nextMeshId); setAircraftMeshDraftId(nextMeshId); setUndo([]); setRedo([]); setPlaying(false); setTime(0); setEffectiveImmediately(Object.fromEntries(nextZones.map((zone) => [zone.id, zone.rgbw])) as Record<ControlZoneId, RGBW>); setNotice(t('projectOpened').replace('{name}', () => name));
  };
  const openProject = () => {
    const index = readProjectIndex(); if (!index.length) { setNotice(t('saveBeforeOpening')); return; }
    try { writeProject(projectId, projectName, currentProjectState()); } catch { setNotice(t('currentProjectSaveFailed')); return; }
    const answer = window.prompt(t('projectNumber') + '\n' + index.map((item, i) => `${i + 1}. ${item.name}`).join('\n'), '1');
    const entry = index[Number(answer) - 1]; if (entry) loadProject(entry.id, entry.name);
  };
  const createProject = () => {
    const name = window.prompt(t('newProjectName'), t('defaultProjectName'));
    if (!name?.trim()) return;
    try { writeProject(projectId, projectName, currentProjectState()); } catch { setNotice(t('currentProjectSaveFailed')); return; }
    const id = crypto.randomUUID(); setProjectId(id); localStorage.setItem(ACTIVE_PROJECT_KEY, id); setProjectName(name.trim()); resetScene(); setNotice(t('projectCreated').replace('{value}', () => name.trim()));
  };
  const changeCabin = () => { setCabinDraft(cabinConfig); setAircraftMeshDraftId(aircraftMeshId); setConfigOpen((open) => !open); setTab('scene'); };
  const createNewScene = () => {
    const name = window.prompt(t('newSceneName')); if (!name?.trim()) return;
    const targets = Object.fromEntries(zones.map((zone) => [zone.id, { ...zone.rgbw }])) as SceneFile['keyframes'][number]['targets'];
    const next: SceneFile = { schemaVersion: 1, id: `scene-${Date.now()}`, name: name.trim().slice(0, 80), durationSeconds: 60, keyframes: [{ atSeconds: 0, targets }, { atSeconds: 60, targets: copy(targets) }] };
    setScenes((all) => [...all, next]); setActiveSceneId(next.id); setTime(0); setEffectiveImmediately(targets); setNotice(t('sceneCreated').replace('{value}', () => next.name));
  };
  const duplicateScene = (id: string) => {
    const source = scenes.find((item) => item.id === id); if (!source) return;
    const next = validateSceneFile({ ...copy(source), id: `${source.id.slice(0, 45)}-copy-${Date.now()}`, name: t('sceneCopyName').replace('{name}', () => studioSceneName(locale, source)).slice(0, 80) });
    setScenes((all) => [...all, next]); setNotice(t('sceneDuplicated').replace('{value}', () => next.name));
  };
  const renameScene = (id: string) => {
    const source = scenes.find((item) => item.id === id); if (!source) return;
    const name = window.prompt(t('renameScenePrompt'), source.name); if (!name?.trim()) return;
    try { const renamed = validateSceneFile({ ...source, name: name.trim() }); setScenes((all) => all.map((item) => item.id === id ? renamed : item)); setNotice(t('sceneRenamed').replace('{value}', () => renamed.name)); }
    catch (error) { setNotice(studioSceneDiagnostic(locale, error, 'sceneNameInvalid')); }
  };
  const deleteScene = (id: string) => {
    if (scenes.length <= 1) { setNotice(t('keepOneScene')); return; }
    const target = scenes.find((item) => item.id === id); if (!target || !window.confirm(t('deleteScenePrompt').replace('{name}', () => studioSceneName(locale, target)))) return;
    const remaining = scenes.filter((item) => item.id !== id); setScenes(remaining);
    if (activeSceneId === id) { const next = remaining[0]; setActiveSceneId(next.id); setTime(0); setEffectiveImmediately(next.keyframes[0].targets); }
    setNotice(t('sceneDeleted').replace('{value}', () => studioSceneName(locale, target)));
  };
  const addKeyframe = () => {
    const at = Math.max(1, Math.min(scene.durationSeconds - 1, Math.round(time)));
    const existingEasing = scene.keyframes.find((item) => item.atSeconds === at)?.easing;
    const frame = { atSeconds: at, ...(existingEasing ? { easing: existingEasing } : {}), targets: Object.fromEntries(zones.map((zone) => [zone.id, zone.rgbw])) as SceneFile['keyframes'][number]['targets'] };
    const frames = scene.keyframes.filter((item) => item.atSeconds !== at).concat(frame).sort((a, b) => a.atSeconds - b.atSeconds);
    setScenes((all) => all.map((item) => item.id === scene.id ? { ...item, keyframes: frames } : item)); setNotice(t('keyframeSet').replace('{value}', () => formatTime(at)));
  };
  const commitCurrentKeyframe = () => {
    const atSeconds = Math.max(0, Math.min(scene.durationSeconds, Math.round(time)));
    const targets = Object.fromEntries(zones.map((zone) => [zone.id, zone.rgbw])) as SceneFile['keyframes'][number]['targets'];
    const existingEasing = scene.keyframes.find((frame) => frame.atSeconds === atSeconds)?.easing;
    const keyframes = scene.keyframes.filter((frame) => frame.atSeconds !== atSeconds)
      .concat({ atSeconds, ...(existingEasing ? { easing: existingEasing } : {}), targets }).sort((a, b) => a.atSeconds - b.atSeconds);
    try {
      const updated = validateSceneFile({ ...scene, keyframes });
      setScenes((all) => all.map((item) => item.id === scene.id ? updated : item));
      setEffectiveImmediately(targets);
      setNotice(t('valuesCommitted').replace('{time}', formatTime(atSeconds)).replace('{name}', () => studioSceneName(locale, scene)));
    } catch (error) { setNotice(studioSceneDiagnostic(locale, error, 'commitFailed')); }
  };
  const exportScene = () => {
    const payload = JSON.stringify(scene, null, 2);
    downloadBlob(new Blob([payload], { type: 'application/json' }), `${scene.id}.adigun-scene.json`);
    setNotice(t('sceneFileExported'));
  };
  const exportPreflight = () => {
    const baseline = PRESETS.find((preset) => preset.id === scene.id);
    const report = createExportPreflightReport(scene, cabinConfig, baseline);
    downloadBlob(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }), `${scene.id}.engineering-preflight.json`);
    const coverage = `${report.fixtureCoverage.documentedZoneCount}/${report.fixtureCoverage.checkedZoneCount} ${t('fixtureZonesDocumented')}`;
    const comparison = report.sceneComparison.changes
      ? t('comparisonDetails').replace('{targets}', String(report.sceneComparison.changes.summary.changedTargets)).replace('{easing}', String(report.sceneComparison.changes.easingChanges)).replace('{baseline}', () => String(report.sceneComparison.baselineId))
      : t('noComparisonBaseline');
    setNotice(`${t('preflightExported')} · ${t(report.sceneValidation.status === 'VALID' ? 'validScene' : 'invalidScene')} · ${coverage} · ${comparison}`);
  };
  const exportCabin4K = async () => {
    if (viewMode === '3d') {
      try {
        const startedAt = performance.now();
        const png = await cabinCaptureRef.current?.();
        if (!png) throw new Error(t('rendererNotReady'));
        downloadBlob(png, 'adigun-configurable-reference-cabin-3840x2160.png');
        const elapsedMs = Math.round(performance.now() - startedAt);
        const surfaceMiB = estimateRgbaSurfaceMiB(CABIN_EXPORT_4K.width, CABIN_EXPORT_4K.height);
        setNotice(t('export4KMeasured').replace('{elapsed}', String(elapsedMs)).replace('{surface}', surfaceMiB.toFixed(1)));
      } catch (error) { setNotice(error instanceof Error ? error.message : t('export3DFailed')); }
      return;
    }
    const source = stageRef.current?.querySelector('svg');
    if (!source) { setNotice(t('cabinExportNotReady')); return; }
    try {
      const clone = source.cloneNode(true) as SVGSVGElement;
      const width = hq4k ? 3840 : 1920; const height = hq4k ? 2160 : 1080;
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); clone.setAttribute('width', String(width)); clone.setAttribute('height', String(height));
      const image = new Image(); const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml;charset=utf-8' }));
      await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('Unable to render 4K cabin image')); image.src = url; });
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; const context = canvas.getContext('2d');
      if (!context) throw new Error(t('canvasUnavailable'));
      context.fillStyle = '#0b1420'; context.fillRect(0, 0, canvas.width, canvas.height);
      const scale = Math.min(canvas.width / image.width, canvas.height / image.height); context.drawImage(image, (canvas.width - image.width * scale) / 2, (canvas.height - image.height * scale) / 2, image.width * scale, image.height * scale);
      URL.revokeObjectURL(url);
      const png = await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('4K PNG encoding failed')), 'image/png'));
      downloadBlob(png, `adigun-zone-map-${width}x${height}.png`);
      setNotice(t('mapExported').replace('{width}', String(width)).replace('{height}', String(height)));
    } catch (error) { setNotice(error instanceof Error ? error.message : t('export4KFailed')); }
  };
  const importScene = async (file?: File) => {
    if (!file) return;
    try {
      const parsed = validateSceneFile(JSON.parse(await file.text()));
      setScenes((all) => [...all.filter((item) => item.id !== parsed.id), parsed]); setActiveSceneId(parsed.id); applySceneAt(0, parsed); setZones((previous) => previous.map((zone) => ({ ...zone, rgbw: parsed.keyframes[0].targets[zone.id] ?? zone.rgbw }))); setNotice(t('sceneImported').replace('{name}', () => studioSceneName(locale, parsed)));
    } catch (error) { setNotice(studioSceneDiagnostic(locale, error, 'sceneValidationFailed')); }
    if (importRef.current) importRef.current.value = '';
  };
  const importScenario = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > MAX_SCENARIO_PACKAGE_BYTES) throw new Error('Scenario package exceeds the 64 KiB review limit.');
      const scenario = validateScenarioPackage(JSON.parse(await file.text()));
      const importedZones = migrateZones(scenario.zones);
      const nextState: SavedState = {
        zones: importedZones, scenes: scenario.scenes.map(copy), intensity: scenario.masterIntensity,
        activeSceneId: scenario.activeSceneId, selectedZoneId: 'ceiling', projectName: scenario.projectName,
        cabinConfig: scenario.cabin.config,
      };
      // Preserve the current workspace, then import as a separate browser-local project.
      writeProject(projectId, projectName, currentProjectState());
      const nextId = crypto.randomUUID();
      writeProject(nextId, scenario.projectName, nextState);
      setProjectId(nextId); setProjectName(scenario.projectName); setZones(importedZones);
      setScenes(scenario.scenes.map(copy)); setIntensity(scenario.masterIntensity);
      setActiveSceneId(scenario.activeSceneId); setSelected('ceiling');
      setCabinConfig(scenario.cabin.config); setCabinDraft(scenario.cabin.config);
      setUndo([]); setRedo([]); setPlaying(false); setTime(0);
      setEffectiveImmediately(Object.fromEntries(importedZones.map((zone) => [zone.id, zone.rgbw])) as Record<ControlZoneId, RGBW>);
      setNotice(t('scenarioImported').replace('{name}', () => scenario.projectName));
    } catch (error) { setNotice(studioSceneDiagnostic(locale, error, 'scenarioValidationFailed')); }
    if (scenarioImportRef.current) scenarioImportRef.current.value = '';
  };
  const chooseTab = (next: string, section: string) => {
    setTab(next);
    window.requestAnimationFrame(() => document.getElementById(section)?.focus({ preventScroll: true }));
  };

  return <main className="studio-shell" data-active-tab={tab} lang={locale}>
    <header className="studio-topbar"><Brand />
      <div className="top-spacer" />
      <div className="top-actions"><span className="mode-pill compact-mode" title={t('offlineStatus')}><i className="status-pulse" /> {t('offlineShort')}</span><button className="button button-quiet button-sm top-save" onClick={saveScene}><Save size={15} /> {t('saveScene')}</button><button className="button button-primary button-sm top-export" onClick={() => void exportCabin4K()}><Download size={15} /> {t('export')}</button><button className="icon-button" title={t('help')} aria-label={t('help')} onClick={() => setNotice(t('studioHelp'))}><CircleHelp size={18} /></button>
        <button className="icon-button" title={t('moreActions')} aria-label={t('moreActions')} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}><MoreHorizontal size={20} /></button>
      </div>
      {menuOpen && <><button className="dismiss-overlay" aria-label={t('closeMenu')} onClick={() => setMenuOpen(false)} /><div className="top-menu" role="menu"><button role="menuitem" disabled={!undo.length} onClick={() => { setMenuOpen(false); undoOnce(); }}><Undo2 size={15} /> {t('undo')}</button><button role="menuitem" disabled={!redo.length} onClick={() => { setMenuOpen(false); redoOnce(); }}><Redo2 size={15} /> {t('redo')}</button><button role="menuitem" onClick={() => { setMenuOpen(false); saveScene(); }}><Save size={15} /> {t('saveSceneLocal')}</button><button role="menuitem" onClick={() => { setMenuOpen(false); exportScene(); }}><Download size={15} /> {t('exportSceneJson')}</button><button role="menuitem" onClick={() => { setMenuOpen(false); exportPreflight(); }}><ClipboardCheck size={15} /> {t('exportPreflight')}</button><button role="menuitem" onClick={() => { setMenuOpen(false); void exportCabin4K(); }}><Download size={15} /> {t('exportCabin')}</button><button role="menuitem" onClick={() => { setMenuOpen(false); importRef.current?.click(); }}><Upload size={15} /> {t('importScene')}</button><button role="menuitem" onClick={() => { setMenuOpen(false); scenarioImportRef.current?.click(); }}><Upload size={15} /> {t('importScenario')}</button><button role="menuitem" onClick={() => { setMenuOpen(false); resetScene(); }}><RotateCcw size={15} /> {t('resetStudio')}</button><button role="menuitem" onClick={() => { setMenuOpen(false); setNotice(t('simulationOnly')); }}><ShieldCheck size={15} /> {t('modeSafety')}</button></div></>}
    </header>
    <div className="studio-layout">
      <aside className="studio-rail" aria-label={t('studioSections')}>
        <span className="rail-label">{t('workspace')}</span>
        <button aria-label={t('cabinOverview')} title={t('cabinOverview')} aria-current={tab === 'scene' ? 'page' : undefined} className={tab === 'scene' ? 'active' : ''} onClick={() => chooseTab('scene', 'cabin-view')}><LayoutGrid size={18} /><span>{t('cabinOverview')}</span></button>
        <button aria-label={t('zoneMapping')} title={t('zoneMapping')} aria-current={tab === 'zones' ? 'page' : undefined} className={tab === 'zones' ? 'active' : ''} onClick={() => chooseTab('zones', 'zone-inspector')}><SlidersHorizontal size={18} /><span>{t('zoneMapping')}</span></button>
        <button aria-label={t('choreography')} title={t('choreography')} aria-current={tab === 'timeline' ? 'page' : undefined} className={tab === 'timeline' ? 'active' : ''} onClick={() => chooseTab('timeline', 'timeline')}><Waves size={18} /><span>{t('choreography')}</span></button>
        <button aria-label={t('sceneLibrary')} title={t('sceneLibrary')} aria-current={tab === 'library' ? 'page' : undefined} className={tab === 'library' ? 'active' : ''} onClick={() => chooseTab('library', 'scene-library')}><Bookmark size={18} /><span>{t('sceneLibrary')}</span></button>
        <div className="rail-divider" />
        <span className="rail-label">{t('project')}</span>
        <button aria-label={t('saveScene')} title={t('saveScene')} onClick={saveScene}><Save size={18} /><span>{t('saveScene')}</span></button>
        <button aria-label={t('saveProject')} title={t('saveProject')} onClick={saveProject}><Save size={18} /><span>{t('saveProject')}</span></button>
        <button aria-label={t('openProject')} title={t('openProject')} onClick={openProject}><LayoutGrid size={18} /><span>{t('openProject')}</span></button>
        <button aria-label={t('newProject')} title={t('newProject')} onClick={createProject}><Plus size={18} /><span>{t('newProject')}</span></button>
        <button aria-label={t('newScene')} title={t('newScene')} onClick={createNewScene}><Plus size={18} /><span>{t('newScene')}</span></button>
        <button aria-label={t('changeCabin')} title={t('changeCabin')} aria-expanded={configOpen} onClick={changeCabin}><Settings2 size={18} /><span>{t('changeCabin')}</span></button>
        <button aria-label={t('resetCamera')} title={t('resetCamera')} disabled={viewMode !== '3d'} onClick={() => cameraResetRef.current?.()}><RotateCcw size={18} /><span>{t('resetCamera')}</span></button>
        <div className="rail-divider" /><span className="rail-label">{t('system')}</span>
        <div className="rail-disabled" title={t('hardwareUnavailable')}><Activity size={18} /><span>{t('hardwareDiagnostics')}</span><small>{t('notAvailable')}</small></div>
        <div className="rail-disabled" title={t('botUnavailable')}><Sparkles size={18} /><span>{t('adigunBot')}</span><small>{t('notEnabled')}</small></div>
      </aside>
      <section className="studio-main">
        <div className="workspace-grid">
          <div className="visual-column">
            <section className="panel cabin-panel" id="cabin-view" tabIndex={-1}>
              <div className="panel-head"><div><h2>{t('cabinDigitalTwin')}</h2></div><div className="view-controls" aria-label={t('cabinViewControls')}><div className="view-switch" role="group" aria-label={t('cabinView')}><button aria-pressed={viewMode === '2d'} onClick={() => setViewMode('2d')}>2D</button><button aria-pressed={viewMode === '3d'} onClick={() => setViewMode('3d')}>3D</button></div><button className={`quality-toggle ${hq4k ? 'is-on' : ''}`} aria-label={t('highQuality4K')} aria-pressed={hq4k} onClick={() => setHq4k((value) => !value)}>HQ 4K <span /></button></div></div>
              {configOpen && <form className="cabin-config" onSubmit={(e) => { e.preventDefault(); const next = validateCabinConfig(cabinDraft); const meshSelect = e.currentTarget.elements.namedItem('aircraftMeshId') as HTMLSelectElement | null; const asset = getCabinMeshProfile(meshSelect?.value || null); setCabinDraft(next); setCabinConfig(next); setAircraftMeshDraftId(asset?.id ?? null); setAircraftMeshId(asset?.id ?? null); setConfigOpen(false); setNotice(asset ? t('meshLoaded').replace('{name}', () => asset.label) : next.layoutId === 'a350900' || next.layoutId === 'a330300' ? t('planningCabinLoaded').replace('{name}', () => studioCabinLayoutName(locale, next.layoutId)) : next.layoutId === 'ownerVvip' ? t('ownerCabinLoaded') : t('referenceCabinLoaded').replace('{dimensions}', () => `${next.lengthMeters.toFixed(1)} m × ${next.widthMeters.toFixed(2)} m`).replace('{name}', () => studioCabinLayoutName(locale, next.layoutId))); }}>
                <div className="cabin-config-head"><strong>{t('changeCabin')} <small>· {cabinDraft.layoutId === 'a350900' || cabinDraft.layoutId === 'a330300' || cabinDraft.layoutId === 'g650erVvip' ? t('manufacturerReference') : cabinDraft.layoutId === 'ownerVvip' ? t('imageReference') : t('configurableReference')}</small></strong><button type="button" aria-label={t('closeCabin')} onClick={() => setConfigOpen(false)}><X size={14} /></button></div>
                <label className="cabin-profile-select">{t('cabinLayout')}<select aria-label={t('cabinLayout')} value={cabinDraft.layoutId} onChange={(e) => { setCabinDraft(CABIN_PROFILES[e.target.value as CabinLayoutId]); setAircraftMeshDraftId(null); }}>{Object.keys(CABIN_LAYOUTS).map((id) => <option key={id} value={id}>{studioCabinLayoutName(locale, id as CabinLayoutId)}</option>)}</select></label>
                <label className="cabin-profile-select">{t('aircraftModelLabel')}<select name="aircraftMeshId" aria-label={t('aircraftModel')} value={aircraftMeshDraftId ?? ''} onChange={(e) => { const id = e.target.value || null; setAircraftMeshDraftId(id); if (id === DEFAULT_CABIN_MESH_ID) setCabinDraft(CABIN_PROFILES.g650erVvip); }}><option value="">{t('currentReference')}</option><optgroup label={t('seatMapModels')}>{AIRLINE_MESH_PROFILES.map((profile) => <option key={profile.id} value={profile.id}>{profile.label}</option>)}</optgroup><optgroup label={t('dimensionModels')}>{AIRCRAFT_DIMENSION_PROFILES.map((profile) => <option key={profile.id} value={profile.id}>{profile.label}</option>)}</optgroup></select></label>
                {(() => { const profile = getCabinMeshProfile(aircraftMeshDraftId); return profile ? <p className="cabin-profile-note">{studioProfileSourceNote(locale, profile.sourceNote)}{profile.sourceUrl && <> · <a href={profile.sourceUrl} target="_blank" rel="noreferrer">{t('sourceLink')}</a></>}</p> : <p className="cabin-profile-note">{t('sourcedProfileGuide')}</p>; })()}
                <div className="cabin-profile-summary">{cabinDraft.layoutId === 'a350900' ? <>{t('a350SeatSummary')} · {cabinDraft.lengthMeters.toFixed(2)} {t('cabinLengthSummary')} · {cabinDraft.widthMeters.toFixed(2)} {t('maxWidthSummary')}</> : cabinDraft.layoutId === 'a330300' ? <>{t('a330SeatSummary')} · {cabinDraft.lengthMeters.toFixed(2)} {t('cabinLengthSummary')} · {cabinDraft.widthMeters.toFixed(2)} {t('maxWidthSummary')}</> : cabinDraft.layoutId === 'g650erVvip' ? <>{t('g650SeatSummary')} · {cabinDraft.lengthMeters.toFixed(2)} {t('cabinLengthSummary')} · {cabinDraft.widthMeters.toFixed(2)} {t('finishedWidthSummary')} · {t('publishedWindows')}</> : <>{studioCabinLayoutDescription(locale, cabinDraft.layoutId)} · {cabinDraft.lengthMeters.toFixed(1)} {t('metersLong')} · {cabinDraft.widthMeters.toFixed(2)} {t('metersWide')} · {CABIN_LAYOUTS[cabinDraft.layoutId].groups.reduce((sum, count) => sum + count, 0)} {t('seatsPerRow')}</>}</div>
                {([['lengthMeters',t('cabinLength'),8,60,.1],['widthMeters',t('interiorWidth'),2,7,.05],['ceilingHeightMeters',t('ceilingHeight'),1.8,4,.05],['seatRows',t('seatRows'),2,60,1],['seatPitchMeters',t('seatPitch'),.55,2.2,.01],['windowCountPerSide',t('windowsPerSide'),2,30,1],['overheadBinDepthMeters',t('binDepth'),.25,1,.01]] as const).map(([key,label,min,max,step]) => <label key={key}>{(cabinDraft.layoutId === 'a350900' || cabinDraft.layoutId === 'a330300') && key === 'widthMeters' ? t('maxCabinWidth') : label}<input type="number" min={min} max={max} step={step} value={cabinDraft[key]} disabled={(cabinDraft.layoutId === 'a350900' || cabinDraft.layoutId === 'a330300') && ['lengthMeters','widthMeters','seatRows','seatPitchMeters'].includes(key) || cabinDraft.layoutId === 'g650erVvip' && ['lengthMeters','widthMeters','ceilingHeightMeters','seatRows','windowCountPerSide'].includes(key)} onChange={(e) => setCabinDraft((config) => ({ ...config, [key]: Number(e.target.value) }))} /></label>)}
                <p className="cabin-profile-note">{cabinDraft.layoutId === 'a350900' ? `${t('a350PlanningQualifier')} ${studioCabinGeometryNote(locale, 'a350900')}` : cabinDraft.layoutId === 'a330300' ? `${t('a330PlanningQualifier')} ${studioCabinGeometryNote(locale, 'a330300')}` : cabinDraft.layoutId === 'ownerVvip' ? studioCabinGeometryNote(locale, 'ownerVvip') : cabinDraft.layoutId === 'g650erVvip' ? studioCabinGeometryNote(locale, 'g650erVvip') : t('editableLayoutsGuide')}{(cabinDraft.layoutId === 'a350900' || cabinDraft.layoutId === 'a330300' || cabinDraft.layoutId === 'g650erVvip') && <><br /><a href={cabinDraft.layoutId === 'g650erVvip' ? CABIN_LAYOUTS.g650erVvip.source : CABIN_LAYOUTS[cabinDraft.layoutId].planningSource} target="_blank" rel="noreferrer">{cabinDraft.layoutId === 'g650erVvip' ? CABIN_LAYOUTS.g650erVvip.sourceRevision : CABIN_LAYOUTS[cabinDraft.layoutId].sourceRevision}</a></>}</p>
                <button type="submit" className="button button-quiet button-sm">{t('loadCabinLayout')}</button>
              </form>}
              <div className={`cabin-stage ${hq4k ? 'quality-high' : ''}`} data-view-mode={viewMode} data-cabin-layout={cabinConfig.layoutId} data-aircraft-mesh-id={selectedMeshProfile?.id ?? ''} ref={stageRef}><div className="stage-grid" /><div className="stage-crosshair" />
                {viewMode === '3d' ? <><Suspense fallback={<div className="cabin3d-loading" role="status">{t('meshLoading')}</div>}>{selectedMeshProfile ? <CabinAsset3D locale={locale} key={selectedMeshProfile.id} profile={selectedMeshProfile} zones={zones} effective={effectiveRGBW} intensity={intensity} selected={selected} onSelect={(id) => { if (inspectorZoneIds.has(id)) setSelected(id); }} highQuality={hq4k} previewActive={playing} previewMotion={playing && motionPreview} previewTime={time} previewDuration={scene.durationSeconds} previewStartedAt={previewStartedAt} scene={scene} cameraView={cameraView} captureRef={cabinCaptureRef} cameraResetRef={cameraResetRef} /> : <Cabin3D locale={locale} key={JSON.stringify(cabinConfig)} config={cabinConfig} zones={zones} effective={effectiveRGBW} intensity={intensity} selected={selected} onSelect={(id) => { if (inspectorZoneIds.has(id)) setSelected(id); }} highQuality={hq4k} previewActive={playing} previewMotion={playing && motionPreview} previewTime={time} previewDuration={scene.durationSeconds} cameraView={cameraView} captureRef={cabinCaptureRef} cameraResetRef={cameraResetRef} />}</Suspense><select className="camera-angle-select" aria-label={t('cameraAngle')} value={cameraView} onChange={(event) => setCameraView(event.target.value as typeof cameraView)}><option value="entry">{t('entryView')}</option><option value="mid-cabin">{t('midCabin')}</option><option value="aft">{t('aftView')}</option><option value="window-row">{t('windowRow')}</option></select></> : <><CabinDrawing locale={locale} zones={inspectorZones.map((zone) => ({ ...zone, rgbw: Object.fromEntries(Object.entries(effectiveRGBW[zone.id] ?? zone.rgbw).map(([key, value]) => [key, value * intensity / 100])) as RGBW }))} selected={selected} onSelect={(id) => { if (inspectorZoneIds.has(id)) setSelected(id); }} config={cabinConfig} /><div className="stage-scale"><span /> {selectedMeshProfile ? `${selectedMeshProfile.label.toUpperCase()} · ${t('referenceMap2D')}` : `${studioCabinLayoutName(locale, cabinConfig.layoutId).toUpperCase()} · ${t('referenceMap2D')}`}</div></>}
              </div>
              <div className="cabin-legend"><span><i className="legend-active" /> {t('activeZone')}: {studioZoneName(locale, currentZone)}</span><span><i className="legend-zone" /> {t('doubleClickFixture')}</span><span className="legend-revision">{selectedMeshProfile ? `${studioGeometryAccuracy(locale, selectedMeshProfile.accuracy)} · ${t('legendSimulation')}` : t('legendReference')}</span></div>
            </section>
            <section className="panel timeline-panel" id="timeline" tabIndex={-1}>
              <div className="timeline-head"><div><span className="panel-overline">{t('choreographyTimeline')}</span><h2>{t('transitionPreview')}</h2></div><div className="timeline-actions"><button className={`preview-toggle ${motionPreview ? 'is-on' : ''}`} aria-label={t('cameraMotion')} aria-pressed={motionPreview} title={t('cameraMotionHelp')} onClick={() => setMotionPreview((value) => !value)}><Move3D size={13} /> {t('motion')}</button><button className={`preview-toggle ${audioCues ? 'is-on' : ''}`} aria-label={t('moodMusic')} aria-pressed={audioCues} title={t('moodMusicHelp')} onClick={() => setAudioCues((value) => !value)}><Volume2 size={13} /> {t('music')}</button><button className="preview-toggle" aria-label={t('audioAnnouncements')} aria-expanded={audioPanelOpen} title={t('audioAnnouncementsHelp')} onClick={() => setAudioPanelOpen((open) => !open)}><Headphones size={13} /> {t('audio')}</button><button className="button button-quiet button-sm" onClick={addKeyframe}><Plus size={14} /> {t('addKeyframe')}</button></div></div>
              {audioPanelOpen && <div className="audio-console" id="audio-console" role="group" aria-label={t('audioControls')}>
                <div className="audio-console-head"><div><span className="panel-overline">{t('soundDesign')}</span><strong>{studioSceneName(locale, scene)} · {currentMoodAudio ? currentMoodAudio.title : studioInstrumentLabel(locale, scene.id)}</strong></div><button type="button" aria-label={t('closeAudio')} onClick={() => setAudioPanelOpen(false)}><X size={15} /></button></div>
                <p className="audio-score-note">{currentMoodAudio ? t('importedCueNote') : t('generatedScoreNote').replace('{tempo}', String(getMoodScore(scene.id).tempo))}</p>
                <label className="audio-volume-control" htmlFor="cabin-audio-volume"><span><Volume2 size={14} /> {t('playbackVolume')}</span><strong>{audioVolume}%</strong></label>
                <input id="cabin-audio-volume" aria-label={t('playbackVolume')} type="range" min="0" max="100" value={audioVolume} onChange={(event) => setAudioVolume(Number(event.target.value))} />
                <div className="audio-voice-actions"><button type="button" onClick={() => speakCabinAudio('welcome')}><Megaphone size={14} /> {t('welcomeAnnouncement')}</button><button type="button" onClick={() => speakCabinAudio('tour')}><Headphones size={14} /> {t('guidedTour')}</button></div>
                <div className="audio-cue-import">
                  <strong>{t('airlineAudio')} · {localAudioRole === 'mood' ? studioSceneName(locale, scene) : t(localAudioRole === 'welcome' ? 'welcomeAnnouncement' : 'guidedTour')}</strong>
                  <label htmlFor="local-audio-role">{t('assignRecording')}</label>
                  <select id="local-audio-role" aria-label={t('localAudioRole')} value={localAudioRole} onChange={(event) => setLocalAudioRole(event.target.value as typeof localAudioRole)}>
                    <option value="mood">{t('moodInstrumental')}</option><option value="welcome">{t('hb380Welcome')}</option><option value="tour">{t('tourNarration')}</option>
                  </select>
                  <label htmlFor="mood-audio-file">{t('audioFileLimit')}</label>
                  <input ref={moodAudioFileRef} id="mood-audio-file" aria-label={t('localAudioFile')} type="file" accept="audio/*,.aac,.flac,.m4a,.mp3,.oga,.ogg,.wav,.webm" onChange={(event) => { const file = event.currentTarget.files?.[0] ?? null; setLocalMoodAudioDraft((draft) => ({ ...draft, file })); }} />
                  <label htmlFor="mood-audio-title">{t('recordingTitle')}</label>
                  <input id="mood-audio-title" aria-label={t('trackTitle')} value={localMoodAudioDraft.title} onChange={(event) => setLocalMoodAudioDraft((draft) => ({ ...draft, title: event.target.value }))} placeholder={localAudioRole === 'mood' ? t('moodAudioExample') : localAudioRole === 'welcome' ? t('welcomeAudioExample') : t('tourAudioExample')} />
                  <label htmlFor="mood-audio-rights">{t('rightsReference')}</label>
                  <input id="mood-audio-rights" aria-label={t('audioRights')} value={localMoodAudioDraft.rightsReference} onChange={(event) => setLocalMoodAudioDraft((draft) => ({ ...draft, rightsReference: event.target.value }))} placeholder={t('rightsExample')} />
                  <button type="button" className="audio-import-button" onClick={() => void importLocalMoodAudio()} disabled={!localMoodAudioDraft.file || !localMoodAudioDraft.title.trim() || !localMoodAudioDraft.rightsReference.trim()}>
                    {localAudioRole === 'mood' ? t('addMoodAudio') : localAudioRole === 'welcome' ? t('addWelcomeAudio') : t('addTourAudio')}
                  </button>
                  {currentConfiguredAudio && <div className="audio-cue-active"><span><b>{currentConfiguredAudio.title}</b><small>{currentConfiguredAudio.fileName} · {currentConfiguredAudio.rightsReference}</small></span><button type="button" aria-label={t('removeRecording').replace('{name}', () => currentConfiguredAudio.title)} onClick={() => void removeLocalMoodAudio()}>{t('removeAudio')}</button></div>}
                  <small>{t('audioStorageDisclosure')}</small>
                </div>
                <small>{t('audioPreviewOnly')}</small>
              </div>}
              <audio ref={localMoodAudioRef} preload="metadata" aria-hidden="true" />
              <audio ref={localVoiceAudioRef} preload="metadata" aria-hidden="true" data-testid="local-voice-audio" />
              <div className="transport"><button className="play-button" aria-label={playing ? t('pausePreview') : t('playPreview')} onClick={() => { if (playing) setPlaying(false); else startTransitionPreview(); }}>{playing ? <Pause size={17} /> : <Play size={17} fill="currentColor" />}</button>
                <div className="timeline-track-wrap"><div className="timeline-label-row"><span>{studioSceneName(locale, scene).toLocaleUpperCase(locale)} <i>·</i> {scene.keyframes.length} {t('keyframes')}</span><span className="time-readout">{formatTime(time)} <small>/ {formatTime(scene.durationSeconds)}</small></span></div>
                  <div className="timeline-track"><div className="timeline-progress" style={{ width: `${scene.durationSeconds ? time / scene.durationSeconds * 100 : 0}%` }} /><input aria-label={t('timelinePosition')} type="range" min="0" max={scene.durationSeconds} step="0.1" value={time} onChange={(e) => { setPlaying(false); applySceneAt(Number(e.target.value)); }} />
                    {scene.keyframes.map((frame, index) => <span key={frame.atSeconds} className="timeline-key" style={{ left: `${frame.atSeconds / scene.durationSeconds * 100}%` }} title={`${t('keyframe')} ${index + 1} · ${formatTime(frame.atSeconds)}`} />)}
                  </div>
                </div>
                <button className="icon-button stop-button" title={t('returnToStart')} aria-label={t('returnToStart')} onClick={() => { setPlaying(false); applySceneAt(0); }}><RotateCcw size={16} /></button>
                <span className="transport-duration"><Clock3 size={14} /> {scene.durationSeconds}s</span>
              </div>
            </section>
            <section className="panel scene-library" id="scene-library" tabIndex={-1}>
              <div className="library-head"><div><span className="panel-overline">{t('sceneLibrary')}</span><h2>{t('startWithMood')}</h2></div><div className="library-tools"><button className="icon-button" aria-label={t('duplicateScene')} title={t('duplicateScene')} onClick={() => duplicateScene(scene.id)}><CopyPlus size={15} /></button><button className="icon-button" aria-label={t('renameScene')} title={t('renameScene')} onClick={() => renameScene(scene.id)}><Settings2 size={15} /></button><button className="icon-button" aria-label={t('deleteScene')} title={t('deleteScene')} onClick={() => deleteScene(scene.id)}><Trash2 size={15} /></button><span className="local-badge"><span /> {t('savedLocally')}</span></div></div>
              <div className="scene-cards">{scenes.map((item) => { const last = item.keyframes[item.keyframes.length - 1].targets; const samples = [last.ceiling, last.windows, last.sidewalls, last.footwell]; return <button key={item.id} className={`scene-card ${item.id === activeSceneId ? 'selected' : ''}`} onClick={() => chooseScene(item.id)} aria-pressed={item.id === activeSceneId}>
                <span className="scene-swatch">{samples.map((sample, index) => <i key={index} style={{ background: toHex(sample), color: toHex(sample) }} />)}</span><strong>{studioSceneName(locale, item)}</strong><small>{t('sceneDuration').replace('{duration}', String(item.durationSeconds))}</small>{item.id === activeSceneId && <Check className="scene-check" size={15} />}
              </button>; })}</div>
            </section>
          </div>
          <aside className="inspector panel" id="zone-inspector" tabIndex={-1}>
            <div className="inspector-head"><div><span className="panel-overline">{t('zoneInspector')}</span><h2>{studioZoneName(locale, currentZone)}</h2><p>{studioZoneDetail(locale, currentZone)}</p></div><button className="icon-button" aria-label={t('inspectorSettings')} title={t('inspectorSettings')} onClick={() => setNotice(t('simulationEditingOnly'))}><Settings2 size={17} /></button></div>
            <div className="zone-select"><label htmlFor="zone-picker">{t('editingZone')}</label><select id="zone-picker" value={inspectorZoneIds.has(selected) ? selected : inspectorZones[0]?.id} onChange={(e) => setSelected(e.target.value as ControlZoneId)}>{inspectorZones.map((zone) => <option key={zone.id} value={zone.id}>{studioZoneName(locale, zone)}</option>)}</select><ChevronDown size={14} /></div>
            <div className="rgbw-head"><div><span className="panel-overline">{t('rgbwOutput')}</span><span className="channel-model">{t('channelRange')}</span></div><label className="color-well" aria-label={t('rgbPicker')}><input type="color" aria-label={t('chooseRgb')} value={toHex(currentZone.rgbw)} onChange={(e) => { const hex = e.target.value; setZoneColor({ r: parseInt(hex.slice(1, 3), 16) / 2.55, g: parseInt(hex.slice(3, 5), 16) / 2.55, b: parseInt(hex.slice(5, 7), 16) / 2.55, w: currentZone.rgbw.w }); }} /><span style={{ background: toHex(currentZone.rgbw) }} /></label></div>
            <div className="channel-list">
              {(['r', 'g', 'b', 'w'] as const).map((channel) => <Channel locale={locale} key={channel} name={channel.toUpperCase()} value={currentZone.rgbw[channel]} color={{ r: '#ff6b72', g: '#59d6a5', b: '#6c9eff', w: '#e9edf2' }[channel]} onChange={(value) => setRGBW(channel, value)} />)}
            </div>
            <div className="inspector-divider" />
            <div className="control-block"><div className="control-head"><label htmlFor="intensity">{t('masterIntensity')}</label><strong>{Math.round(intensity)}<small>%</small></strong></div><input id="intensity" className="wide-range" type="range" min="0" max="100" value={intensity} style={{ '--range-fill': `${intensity}%` } as React.CSSProperties} onChange={(e) => setIntensity(Number(e.target.value))} /></div>
            <div className="control-block fade-block"><div className="control-head"><label htmlFor="fade">{t('zoneFadeDuration')}</label><strong>{currentZone.fadeSeconds}<small>s</small></strong></div><input id="fade" className="wide-range" type="range" min="0" max="30" step="1" value={currentZone.fadeSeconds} style={{ '--range-fill': `${currentZone.fadeSeconds / 30 * 100}%` } as React.CSSProperties} onChange={(e) => changeFade(Number(e.target.value))} /><div className="range-ends"><span>{t('instant')}</span><span>{t('thirtySeconds')}</span></div></div>
            <div className="inspector-divider" />
            <div className="inspector-summary"><div><span className="summary-symbol"><Lightbulb size={15} /></span><div><b>{t('simulatorOutput')}</b><small>{t('effectiveOfflinePreview')}</small></div></div><code>{Math.round((effectiveRGBW[selected] ?? currentZone.rgbw).r * intensity / 100)} / {Math.round((effectiveRGBW[selected] ?? currentZone.rgbw).g * intensity / 100)} / {Math.round((effectiveRGBW[selected] ?? currentZone.rgbw).b * intensity / 100)} / {Math.round((effectiveRGBW[selected] ?? currentZone.rgbw).w * intensity / 100)}</code></div>
            <button className="apply-button" onClick={commitCurrentKeyframe}>{t('applySetKeyframe')} <ArrowRight size={16} /></button>
            <div className="inspector-note"><ShieldCheck size={15} /><span>{t('previewOnly')}</span></div>
          </aside>
        </div>
      </section>
    </div>
    <input ref={importRef} type="file" accept="application/json,.json" className="visually-hidden" aria-label={t('importVersionedScene')} onChange={(e) => void importScene(e.target.files?.[0])} />
    <input ref={scenarioImportRef} type="file" accept="application/json,.json" className="visually-hidden" aria-label={t('importScenarioJson')} onChange={(e) => void importScenario(e.target.files?.[0])} />
    {notice && <div className="toast" role="status"><Check size={15} />{notice}<button aria-label={t('dismissNotice')} onClick={() => setNotice('')}><X size={14} /></button></div>}
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


