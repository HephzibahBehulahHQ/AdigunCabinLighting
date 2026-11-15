/// <reference types="vite/client" />

import aircraftCatalog from '../assets/aircraft-data/catalog.json';
import airlineMeshCatalog from '../assets/aircraft-data/airline-mesh-catalog.json';

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
};

const catalog = aircraftCatalog as AircraftCatalog;
const airlineCatalog = airlineMeshCatalog as AirlineCatalog;
const aircraftEntries = catalog.aircraft.map((entry) => {
  const dataKey = `../assets/aircraft-data/aircraft/${entry.id}.json`;
  const metadata = (import.meta.glob('../assets/aircraft-data/aircraft/*.json', { eager: true, import: 'default' }) as Record<string, { manufacturer?: string; model?: string; source?: { url?: string; precision?: string }; interior?: { published_cabin_length_m?: number | null; maximum_cabin_width_m?: number | null } }>)[dataKey];
  const meshPath = `meshes/${entry.id}.glb`;
  return {
    id: entry.id,
    label: `${metadata?.manufacturer ?? 'Aircraft'} ${metadata?.model ?? entry.model} · dimension-based simulation`,
    aircraft: `${metadata?.manufacturer ?? ''} ${metadata?.model ?? entry.model}`.trim(),
    widthMeters: metadata?.interior?.maximum_cabin_width_m ?? undefined,
    lengthMeters: metadata?.interior?.published_cabin_length_m ?? undefined,
    sourceUrl: metadata?.source?.url,
    sourceNote: 'Published planning dimensions with authored cabin geometry; not OEM cabin CAD or an operator fit.',
    meshUrl: meshUrls[`../assets/aircraft-data/${meshPath}`],
    modelPath: `assets/aircraft-data/${meshPath}`,
    accuracy: 'dimension-based authored simulation geometry',
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
  } satisfies CabinMeshProfile;
});

export const AIRCRAFT_MESH_PROFILES: readonly CabinMeshProfile[] = [...airlineEntries, ...aircraftEntries];
export const AIRLINE_MESH_PROFILES = airlineEntries;
export const AIRCRAFT_DIMENSION_PROFILES = aircraftEntries;

export function getCabinMeshProfile(id: string | null | undefined): CabinMeshProfile | null {
  return id ? AIRCRAFT_MESH_PROFILES.find((profile) => profile.id === id) ?? null : null;
}
