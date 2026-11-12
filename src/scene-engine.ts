export type RGBW = { r: number; g: number; b: number; w: number };
export type ZoneId = 'ceiling' | 'windows' | 'sidewalls' | 'footwell' | 'reading' | 'entry' | 'monuments' | 'toilet' | 'handrail' | 'trolley' | 'cabin';
export type ZoneState = { id: ZoneId; name: string; detail: string; rgbw: RGBW; fadeSeconds: number };
export type SceneKeyframe = { atSeconds: number; targets: Record<ZoneId, RGBW> };
export type SceneFile = {
  schemaVersion: 1;
  id: string;
  name: string;
  durationSeconds: number;
  keyframes: SceneKeyframe[];
};

export const ZONE_IDS: ZoneId[] = ['ceiling', 'windows', 'sidewalls', 'footwell', 'reading', 'entry', 'monuments', 'toilet', 'handrail', 'trolley', 'cabin'];
const LEGACY_ZONE_IDS: ZoneId[] = ['ceiling', 'windows', 'sidewalls', 'footwell', 'reading', 'entry'];
export const ZONE_INFO: Record<ZoneId, Pick<ZoneState, 'name' | 'detail'>> = {
  ceiling: { name: 'Ceiling cove', detail: 'Continuous indirect wash' },
  windows: { name: 'Window surrounds', detail: 'Left + right reveals' },
  sidewalls: { name: 'Sidewall accents', detail: 'Lower cabin wash' },
  footwell: { name: 'Footwell', detail: 'Low-level aisle guidance' },
  reading: { name: 'Reading lights', detail: 'Seat-level task light' },
  entry: { name: 'Entry & monuments', detail: 'Doorway and galley accents' },
  monuments: { name: 'Monuments', detail: 'Cabin monument lighting zone · illustrative' },
  toilet: { name: 'Lavatory', detail: 'Lavatory lighting zone · illustrative' },
  handrail: { name: 'Handrail', detail: 'Handrail accent zone · illustrative' },
  trolley: { name: 'Trolley service area', detail: 'Service-area lighting zone · illustrative' },
  cabin: { name: 'Cabin ambient', detail: 'Overall cabin ambient lighting · illustrative' },
};

export const ZERO: RGBW = { r: 0, g: 0, b: 0, w: 0 };
export const clampChannel = (value: number): number => Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
export const normalizeRGBW = (rgbw: RGBW): RGBW => ({
  r: clampChannel(rgbw.r), g: clampChannel(rgbw.g), b: clampChannel(rgbw.b), w: clampChannel(rgbw.w),
});
export function interpolateRGBW(from: RGBW, to: RGBW, progress: number): RGBW {
  const t = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  return normalizeRGBW({
    r: from.r + (to.r - from.r) * t, g: from.g + (to.g - from.g) * t,
    b: from.b + (to.b - from.b) * t, w: from.w + (to.w - from.w) * t,
  });
}

const targets = (color: RGBW, overrides: Partial<Record<ZoneId, RGBW>> = {}): Record<ZoneId, RGBW> =>
  Object.fromEntries(ZONE_IDS.map((id) => [id, overrides[id] ?? color])) as Record<ZoneId, RGBW>;

export const PRESETS: SceneFile[] = [
  { schemaVersion: 1, id: 'boarding', name: 'Boarding', durationSeconds: 45, keyframes: [
    { atSeconds: 0, targets: targets({ r: 15, g: 28, b: 45, w: 26 }, { footwell: { r: 6, g: 12, b: 18, w: 38 }, reading: ZERO }) },
    { atSeconds: 45, targets: targets({ r: 12, g: 26, b: 42, w: 30 }, { footwell: { r: 4, g: 8, b: 14, w: 45 }, entry: { r: 30, g: 22, b: 8, w: 22 } }) },
  ] },
  { schemaVersion: 1, id: 'aurora', name: 'Aurora', durationSeconds: 60, keyframes: [
    { atSeconds: 0, targets: targets({ r: 2, g: 9, b: 25, w: 4 }, { windows: { r: 14, g: 3, b: 23, w: 3 } }) },
    { atSeconds: 60, targets: targets({ r: 7, g: 34, b: 38, w: 3 }, { windows: { r: 24, g: 5, b: 36, w: 2 }, sidewalls: { r: 3, g: 25, b: 32, w: 3 } }) },
  ] },
  { schemaVersion: 1, id: 'sunrise', name: 'Sunrise', durationSeconds: 90, keyframes: [
    { atSeconds: 0, targets: targets({ r: 13, g: 6, b: 18, w: 10 }, { windows: { r: 24, g: 7, b: 17, w: 18 } }) },
    { atSeconds: 90, targets: targets({ r: 8, g: 17, b: 20, w: 52 }, { windows: { r: 28, g: 23, b: 15, w: 68 }, reading: { r: 4, g: 3, b: 2, w: 56 } }) },
  ] },
  { schemaVersion: 1, id: 'sunset', name: 'Sunset', durationSeconds: 75, keyframes: [
    { atSeconds: 0, targets: targets({ r: 9, g: 18, b: 21, w: 43 }) },
    { atSeconds: 75, targets: targets({ r: 36, g: 8, b: 3, w: 13 }, { windows: { r: 48, g: 12, b: 2, w: 9 }, footwell: { r: 9, g: 4, b: 1, w: 14 } }) },
  ] },
  { schemaVersion: 1, id: 'dining', name: 'Dinner', durationSeconds: 30, keyframes: [
    { atSeconds: 0, targets: targets({ r: 20, g: 6, b: 15, w: 15 }, { entry: { r: 32, g: 13, b: 5, w: 22 } }) },
    { atSeconds: 30, targets: targets({ r: 23, g: 7, b: 17, w: 18 }, { windows: { r: 27, g: 8, b: 14, w: 20 }, entry: { r: 35, g: 16, b: 5, w: 26 } }) },
  ] },
  { schemaVersion: 1, id: 'sleep', name: 'Sleep', durationSeconds: 45, keyframes: [
    { atSeconds: 0, targets: targets({ r: 8, g: 4, b: 15, w: 2 }, { footwell: { r: 1, g: 1, b: 5, w: 3 }, reading: ZERO }) },
    { atSeconds: 45, targets: targets({ r: 5, g: 3, b: 11, w: 1 }, { footwell: { r: 1, g: 1, b: 4, w: 2 }, windows: { r: 8, g: 3, b: 15, w: 1 } }) },
  ] },
  { schemaVersion: 1, id: 'wake', name: 'Wake', durationSeconds: 60, keyframes: [
    { atSeconds: 0, targets: targets({ r: 4, g: 7, b: 17, w: 3 }, { reading: ZERO, footwell: { r: 1, g: 2, b: 4, w: 4 } }) },
    { atSeconds: 60, targets: targets({ r: 15, g: 18, b: 21, w: 48 }, { ceiling: { r: 12, g: 21, b: 28, w: 35 }, reading: { r: 4, g: 5, b: 8, w: 60 }, footwell: { r: 3, g: 5, b: 7, w: 24 } }) },
  ] },
  { schemaVersion: 1, id: 'landing', name: 'Landing', durationSeconds: 45, keyframes: [
    { atSeconds: 0, targets: targets({ r: 10, g: 13, b: 18, w: 12 }) },
    { atSeconds: 45, targets: targets({ r: 7, g: 10, b: 12, w: 45 }, { footwell: { r: 3, g: 6, b: 8, w: 58 }, entry: { r: 14, g: 12, b: 8, w: 38 }, toilet: { r: 10, g: 12, b: 15, w: 32 } }) },
  ] },
  { schemaVersion: 1, id: 'relax', name: 'Relax', durationSeconds: 75, keyframes: [
    { atSeconds: 0, targets: targets({ r: 10, g: 8, b: 16, w: 8 }) },
    { atSeconds: 75, targets: targets({ r: 24, g: 8, b: 23, w: 10 }, { sidewalls: { r: 33, g: 9, b: 35, w: 4 }, reading: ZERO, handrail: { r: 18, g: 7, b: 24, w: 3 } }) },
  ] },
  { schemaVersion: 1, id: 'rest', name: 'Rest', durationSeconds: 60, keyframes: [
    { atSeconds: 0, targets: targets({ r: 6, g: 5, b: 12, w: 4 }, { reading: ZERO }) },
    { atSeconds: 60, targets: targets({ r: 7, g: 4, b: 14, w: 3 }, { reading: ZERO, footwell: { r: 2, g: 2, b: 7, w: 4 }, handrail: { r: 4, g: 3, b: 9, w: 2 } }) },
  ] },
  { schemaVersion: 1, id: 'prayer', name: 'Prayer', durationSeconds: 45, keyframes: [
    { atSeconds: 0, targets: targets({ r: 12, g: 10, b: 6, w: 14 }) },
    { atSeconds: 45, targets: targets({ r: 25, g: 17, b: 6, w: 24 }, { footwell: { r: 7, g: 7, b: 4, w: 18 }, reading: { r: 12, g: 9, b: 4, w: 22 } }) },
  ] },
  { schemaVersion: 1, id: 'movie', name: 'Movie', durationSeconds: 30, keyframes: [
    { atSeconds: 0, targets: targets({ r: 8, g: 5, b: 13, w: 4 }) },
    { atSeconds: 30, targets: targets({ r: 4, g: 2, b: 10, w: 1 }, { footwell: { r: 1, g: 2, b: 5, w: 4 }, reading: ZERO, handrail: { r: 4, g: 2, b: 9, w: 1 } }) },
  ] },
  { schemaVersion: 1, id: 'first-class', name: 'First Class', durationSeconds: 60, keyframes: [
    { atSeconds: 0, targets: targets({ r: 15, g: 10, b: 8, w: 12 }) },
    { atSeconds: 60, targets: targets({ r: 25, g: 12, b: 13, w: 18 }, { reading: { r: 7, g: 5, b: 3, w: 35 }, monuments: { r: 25, g: 12, b: 8, w: 16 }, cabin: { r: 22, g: 11, b: 8, w: 14 } }) },
  ] },
  { schemaVersion: 1, id: 'business-class', name: 'Business Class', durationSeconds: 60, keyframes: [
    { atSeconds: 0, targets: targets({ r: 7, g: 12, b: 18, w: 12 }) },
    { atSeconds: 60, targets: targets({ r: 8, g: 19, b: 26, w: 24 }, { reading: { r: 3, g: 6, b: 8, w: 40 }, monuments: { r: 10, g: 17, b: 22, w: 20 } }) },
  ] },
  { schemaVersion: 1, id: 'economy', name: 'Economy', durationSeconds: 60, keyframes: [
    { atSeconds: 0, targets: targets({ r: 6, g: 9, b: 14, w: 18 }) },
    { atSeconds: 60, targets: targets({ r: 5, g: 10, b: 14, w: 32 }, { footwell: { r: 3, g: 6, b: 8, w: 34 }, cabin: { r: 5, g: 11, b: 16, w: 30 } }) },
  ] },
  { schemaVersion: 1, id: 'window-shade-lighting', name: 'Window shade lighting', durationSeconds: 30, keyframes: [
    { atSeconds: 0, targets: targets({ r: 12, g: 8, b: 17, w: 8 }) },
    { atSeconds: 30, targets: targets({ r: 8, g: 5, b: 14, w: 5 }, { windows: ZERO, sidewalls: { r: 16, g: 7, b: 22, w: 3 } }) },
  ] },
];

export function makeZones(): ZoneState[] {
  return ZONE_IDS.map((id) => ({ id, ...ZONE_INFO[id], rgbw: { ...ZERO }, fadeSeconds: 3 }));
}

export function makeDefaultZones(): ZoneState[] {
  const initial = PRESETS.find((scene) => scene.id === 'aurora')!.keyframes[0].targets;
  return makeZones().map((zone) => ({ ...zone, rgbw: { ...initial[zone.id] } }));
}

export function interpolateScene(scene: SceneFile, timeSeconds: number): Record<ZoneId, RGBW> {
  const frames = scene.keyframes;
  if (frames.length === 0) throw new Error('A scene must contain at least one keyframe.');
  const time = Math.max(0, Math.min(scene.durationSeconds, timeSeconds));
  let left = frames[0];
  let right = frames[frames.length - 1];
  for (let index = 0; index < frames.length - 1; index += 1) {
    if (time >= frames[index].atSeconds && time <= frames[index + 1].atSeconds) {
      left = frames[index]; right = frames[index + 1]; break;
    }
  }
  if (left === right || left.atSeconds === right.atSeconds || time <= left.atSeconds) {
    return Object.fromEntries(ZONE_IDS.map((id) => [id, normalizeRGBW(left.targets[id])])) as Record<ZoneId, RGBW>;
  }
  const progress = (time - left.atSeconds) / (right.atSeconds - left.atSeconds);
  return Object.fromEntries(ZONE_IDS.map((id) => {
    const a = left.targets[id]; const b = right.targets[id];
    return [id, normalizeRGBW({ r: a.r + (b.r - a.r) * progress, g: a.g + (b.g - a.g) * progress,
      b: a.b + (b.b - a.b) * progress, w: a.w + (b.w - a.w) * progress })];
  })) as Record<ZoneId, RGBW>;
}

export function validateSceneFile(value: unknown): SceneFile {
  if (!value || typeof value !== 'object') throw new Error('Scene file must be a JSON object.');
  const scene = value as Partial<SceneFile>;
  if (scene.schemaVersion !== 1) throw new Error('Unsupported scene schema version.');
  if (typeof scene.id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,63}$/i.test(scene.id)) throw new Error('Scene ID is invalid.');
  if (typeof scene.name !== 'string' || scene.name.trim().length < 1 || scene.name.length > 80) throw new Error('Scene name must be 1–80 characters.');
  if (!Number.isFinite(scene.durationSeconds) || !scene.durationSeconds || scene.durationSeconds < 1 || scene.durationSeconds > 3600) throw new Error('Scene duration must be between 1 and 3600 seconds.');
  if (!Array.isArray(scene.keyframes) || scene.keyframes.length < 1 || scene.keyframes.length > 64) throw new Error('Scene must have 1–64 keyframes.');
  let previous = -1;
  for (const frame of scene.keyframes) {
    if (!Number.isFinite(frame.atSeconds) || frame.atSeconds < 0 || frame.atSeconds > scene.durationSeconds || frame.atSeconds <= previous) throw new Error('Keyframe times must increase strictly within the scene duration.');
    previous = frame.atSeconds;
    if (!frame.targets || typeof frame.targets !== 'object') throw new Error('Each keyframe needs RGBW targets for every zone.');
    const normalizedTargets = { ...frame.targets } as Record<ZoneId, RGBW>;
    for (const id of ZONE_IDS) {
      const target = normalizedTargets[id];
      if (!target && !LEGACY_ZONE_IDS.includes(id)) { normalizedTargets[id] = { ...ZERO }; continue; }
      if (!target || !['r', 'g', 'b', 'w'].every((key) => Number.isFinite(target[key as keyof RGBW]) && target[key as keyof RGBW] >= 0 && target[key as keyof RGBW] <= 100)) {
        throw new Error(`Invalid RGBW target for ${id}.`);
      }
    }
    (frame as SceneKeyframe).targets = normalizedTargets;
  }
  if (scene.keyframes[scene.keyframes.length - 1].atSeconds !== scene.durationSeconds) throw new Error('The final keyframe must match the scene duration.');
  return scene as SceneFile;
}

export function toHex({ r, g, b }: RGBW): string {
  const channel = (value: number) => Math.round(clampChannel(value) * 2.55).toString(16).padStart(2, '0');
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}
