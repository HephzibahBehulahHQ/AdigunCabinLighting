export const CABIN_LAYOUTS = {
  regional: { name: 'Regional · 2–2', description: 'Compact cabin · one aisle', groups: [2, 2] },
  singleAisle: { name: 'Single aisle · 3–3', description: 'Six seats per row · one aisle', groups: [3, 3] },
  widebody: { name: 'Wide cabin · 3–3–3', description: 'Nine seats per row · two aisles', groups: [3, 3, 3] },
  premium: { name: 'Premium · 1–2–1', description: 'Four seats per row · two aisles', groups: [1, 2, 1] },
  a330300: {
    name: 'A330-300 · standard reference',
    description: 'Airbus A330-300 planning dimensions and two-class seat data; row distribution is derived for illustration.',
    groups: [2, 4, 2],
    source: 'https://www.aircraft.airbus.com/en/aircraft/a330/a330-300',
    planningSource: 'https://www.aircraft.airbus.com/sites/g/files/jlcbta126/files/2025-12/AC_A330_20251201.pdf',
    sourceRevision: 'Airbus A330 Aircraft Characteristics · Rev Dec 01/25',
    assetRights: 'Airbus planning reference; reproduction permission not recorded. No licensed 3D cabin asset is included.',
    seatPlan: [
      { groups: [2, 2, 2], rows: 6, pitchMeters: 1.524, seatCount: 36, cabinClass: 'Business' },
      { groups: [2, 4, 2], rows: 33, pitchMeters: .8128, seatCount: 264, cabinClass: 'Economy' },
    ],
    seatCount: 300,
    seatCountBasis: 'Airbus A330-300 two-class planning configuration',
    geometryNote: 'Cabin length, maximum width and planning seat totals are sourced. Class order and row distribution are derived for display from published totals and pitch. Ceiling, windows, bins and monuments remain generic reference geometry; this is not an Airbus plan drawing or airline fit.',
  },
  a350900: {
    name: 'A350-900 · standard reference',
    description: 'Airbus planning dimensions and two-class seat data; row distribution is derived for illustration.',
    groups: [3, 3, 3],
    source: 'https://www.aircraft.airbus.com/en/aircraft/a350/a350-900',
    planningSource: 'https://www.aircraft.airbus.com/sites/g/files/jlcbta126/files/2025-07/AC_A350_20250715.pdf',
    sourceRevision: 'Airbus A350 Aircraft Characteristics · Rev 15 · Jul 15/25',
    assetRights: 'Airbus planning reference; reproduction permission not recorded. No licensed 3D cabin asset is included.',
    seatPlan: [
      { groups: [2, 2, 2], rows: 8, pitchMeters: 1.524, seatCount: 48, cabinClass: 'Business' },
      { groups: [3, 3, 3], rows: 29, pitchMeters: .8128, seatCount: 261, cabinClass: 'Economy' },
      { groups: [3, 3], rows: 1, pitchMeters: .8128, seatCount: 6, cabinClass: 'Economy' },
    ],
    seatCount: 315,
    seatCountBasis: 'Airbus standard two-class planning configuration',
    geometryNote: 'Class order and row distribution are derived for display from published totals and pitch. This is not the Airbus plan drawing or an airline fit.',
  },
} as const;

export type CabinLayoutId = keyof typeof CABIN_LAYOUTS;
export type CabinConfig = {
  layoutId: CabinLayoutId;
  lengthMeters: number;
  widthMeters: number;
  ceilingHeightMeters: number;
  seatRows: number;
  seatPitchMeters: number;
  windowCountPerSide: number;
  overheadBinDepthMeters: number;
};

export const CABIN_PROFILES: Record<CabinLayoutId, CabinConfig> = {
  regional: { layoutId: 'regional', lengthMeters: 12.8, widthMeters: 3.25, ceilingHeightMeters: 2.05, seatRows: 10, seatPitchMeters: .78, windowCountPerSide: 9, overheadBinDepthMeters: .43 },
  singleAisle: { layoutId: 'singleAisle', lengthMeters: 18.4, widthMeters: 4.4, ceilingHeightMeters: 2.65, seatRows: 12, seatPitchMeters: .76, windowCountPerSide: 11, overheadBinDepthMeters: .58 },
  widebody: { layoutId: 'widebody', lengthMeters: 27.6, widthMeters: 5.75, ceilingHeightMeters: 2.85, seatRows: 15, seatPitchMeters: .79, windowCountPerSide: 16, overheadBinDepthMeters: .75 },
  premium: { layoutId: 'premium', lengthMeters: 20.2, widthMeters: 5.25, ceilingHeightMeters: 2.72, seatRows: 9, seatPitchMeters: 1.05, windowCountPerSide: 12, overheadBinDepthMeters: .62 },
  a330300: { layoutId: 'a330300', lengthMeters: 50.36, widthMeters: 5.26, ceilingHeightMeters: 2.85, seatRows: 39, seatPitchMeters: .8128, windowCountPerSide: 16, overheadBinDepthMeters: .72 },
  a350900: { layoutId: 'a350900', lengthMeters: 51.04, widthMeters: 5.71, ceilingHeightMeters: 2.85, seatRows: 38, seatPitchMeters: .8128, windowCountPerSide: 16, overheadBinDepthMeters: .75 },
};

export const DEFAULT_CABIN_CONFIG: CabinConfig = CABIN_PROFILES.singleAisle;

export function validateCabinConfig(input: Partial<CabinConfig> & { seatsPerSide?: number }): CabinConfig {
  const clamp = (value: unknown, fallback: number, min: number, max: number, integer = false) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
    const safe = Math.min(max, Math.max(min, value));
    return integer ? Math.round(safe) : safe;
  };
  // Migrate saved projects made before the layout selector existed.
  const legacyRows = input.seatsPerSide === 2 ? 'regional' : input.seatsPerSide === 1 ? 'premium' : null;
  const layoutId: CabinLayoutId = Object.hasOwn(CABIN_LAYOUTS, input.layoutId ?? '') ? input.layoutId! : legacyRows ?? 'singleAisle';
  const fallback = CABIN_PROFILES[layoutId];
  return {
    layoutId,
    lengthMeters: clamp(input.lengthMeters, fallback.lengthMeters, 8, 60),
    widthMeters: clamp(input.widthMeters, fallback.widthMeters, 2.6, 7),
    ceilingHeightMeters: clamp(input.ceilingHeightMeters, fallback.ceilingHeightMeters, 1.8, 4),
    seatRows: clamp(input.seatRows, fallback.seatRows, 2, 40, true),
    seatPitchMeters: clamp(input.seatPitchMeters, fallback.seatPitchMeters, .55, 1.3),
    windowCountPerSide: clamp(input.windowCountPerSide, fallback.windowCountPerSide, 2, 30, true),
    overheadBinDepthMeters: clamp(input.overheadBinDepthMeters, fallback.overheadBinDepthMeters, .25, 1),
  };
}

