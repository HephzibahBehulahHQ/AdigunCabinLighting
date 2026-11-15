/// <reference types="vite/client" />

import aircraftCatalog from '../assets/aircraft-data/catalog.json';
import airlineMeshCatalog from '../assets/aircraft-data/airline-mesh-catalog.json';
import zoneAvailabilityCatalog from '../assets/aircraft-data/zone-availability.json';
import type { ZoneId, ZoneState } from './scene-engine';

type AircraftCatalog = typeof aircraftCatalog;
type AirlineCatalog = typeof airlineMeshCatalog;

const meshUrls = {
  ...import.meta.glob('../assets/aircraft-data/meshes/*.glb', { eager: true, query: '?url', import: 'default' }),
  ...import.meta.glob('../assets/aircraft-data/airline-meshes/*.glb', { eager: true, query: '?url', import: 'default' }),
} as Record<string, string>;

export type CabinMeshProfile = {
  id: string;
  label: string;
  aircraft: string;
  airline?: string;
  seats?: number;
  widthMeters?: number;
  lengthMeters?: number;
  heightMeters?: number;
  sourceUrl?: string;
  sourceNote: string;
  meshUrl: string;
  modelPath: string;
  accuracy: string;
  componentCounts: Record<string, number>;
  zones: { id: ZoneId; name: string; basis: string }[];
};

type ZoneAvailability = typeof zoneAvailabilityCatalog.profiles[number];
const zonesByProfile = new Map<string, ZoneAvailability>(zoneAvailabilityCatalog.profiles.map((profile) => [profile.id, profile] as const));

function getMeshZoneData(id: string): Pick<CabinMeshProfile, 'componentCounts' | 'zones'> {
  const inventory = zonesByProfile.get(id);
  if (!inventory) throw new Error(`Missing GLB zone inventory for ${id}`);
  return {
    componentCounts: inventory.component_counts,
    zones: inventory.zones as CabinMeshProfile['zones'],
  };
}

export const DEFAULT_CABIN_MESH_ID = 'gulfstream-g650er';

const catalog = aircraftCatalog as AircraftCatalog;
const airlineCatalog = airlineMeshCatalog as AirlineCatalog;
const aircraftEntries = catalog.aircraft.map((entry) => {
  const dataKey = `../assets/aircraft-data/aircraft/${entry.id}.json`;
  const metadata = (import.meta.glob('../assets/aircraft-data/aircraft/*.json', { eager: true, import: 'default' }) as Record<string, { manufacturer?: string; model?: string; source?: { url?: string; precision?: string }; interior?: { published_cabin_length_m?: number | null; maximum_cabin_width_m?: number | null; cabin_height_m?: number | null; cabin_length_excluding_baggage_m?: number | null; total_interior_length_m?: number | null; finished_cabin_width_m?: number | null; finished_cabin_height_m?: number | null } }>)[dataKey];
  const meshPath = `meshes/${entry.id}.glb`;
  return {
    id: entry.id,
    label: `${metadata?.manufacturer ?? 'Aircraft'} ${metadata?.model ?? entry.model} · dimension-based simulation`,
    aircraft: `${metadata?.manufacturer ?? ''} ${metadata?.model ?? entry.model}`.trim(),
    widthMeters: metadata?.interior?.maximum_cabin_width_m ?? metadata?.interior?.finished_cabin_width_m ?? undefined,
    lengthMeters: metadata?.interior?.published_cabin_length_m ?? metadata?.interior?.cabin_length_excluding_baggage_m ?? metadata?.interior?.total_interior_length_m ?? undefined,
    heightMeters: metadata?.interior?.cabin_height_m ?? metadata?.interior?.finished_cabin_height_m ?? undefined,
    sourceUrl: metadata?.source?.url,
    sourceNote: 'Published planning dimensions with authored cabin geometry; not OEM cabin CAD or an operator fit.',
    meshUrl: meshUrls[`../assets/aircraft-data/${meshPath}`],
    modelPath: `assets/aircraft-data/${meshPath}`,
    accuracy: 'dimension-based authored simulation geometry',
    ...getMeshZoneData(entry.id),
  } satisfies CabinMeshProfile;
});

const airlineEntries = airlineCatalog.profiles.map((profile) => {
  const meshPath = profile.mesh_path;
  const aircraftName = profile.aircraft_id.replace(/^(airbus|boeing)-/, '').toUpperCase().replaceAll('-', ' ');
  return {
    id: profile.id,
    label: `${profile.airline} · ${aircraftName} · ${profile.total_seats} seats`,
    aircraft: aircraftName,
    airline: profile.airline,
    seats: profile.total_seats,
    widthMeters: profile.width_m,
    lengthMeters: profile.length_m,
    heightMeters: profile.height_m,
    sourceUrl: profile.source_url,
    sourceNote: `${profile.geometry_accuracy}; seat locations are ${profile.seat_position_basis}`,
    meshUrl: meshUrls[`../assets/aircraft-data/${meshPath}`],
    modelPath: `assets/aircraft-data/${meshPath}`,
    accuracy: profile.geometry_accuracy,
    ...getMeshZoneData(profile.id),
  } satisfies CabinMeshProfile;
});

export const AIRCRAFT_MESH_PROFILES: readonly CabinMeshProfile[] = [...airlineEntries, ...aircraftEntries];
export const AIRLINE_MESH_PROFILES = airlineEntries;
export const AIRCRAFT_DIMENSION_PROFILES = aircraftEntries;

export function getCabinMeshProfile(id: string | null | undefined): CabinMeshProfile | null {
  return id ? AIRCRAFT_MESH_PROFILES.find((profile) => profile.id === id) ?? null : null;
}

export function getProfileZones(profile: CabinMeshProfile, zones: readonly ZoneState[]): ZoneState[] {
  const profileZones = new Map<ZoneId, CabinMeshProfile['zones'][number]>(profile.zones.map((zone) => [zone.id, zone] as const));
  return zones.flatMap((zone) => {
    const evidence = profileZones.get(zone.id);
    return evidence ? [{ ...zone, name: evidence.name, detail: evidence.basis }] : [];
  });
}
