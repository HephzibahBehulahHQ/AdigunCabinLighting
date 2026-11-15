import * as THREE from 'three';

/** Published G650ER specification: 16 panoramic windows, eight on each side. */
export const G650ER_VISIBLE_WINDOW_INDICES = [1, 3, 5, 7, 10, 12, 14, 16] as const;

const G650ER_WINDOW_PART = /^(?:Oval window frame|Window (?:glass|glazing)|Window sill) (-?1) (\d+)$/i;

/** Return null for unrelated nodes; otherwise whether the authored window belongs in the 16-window profile. */
export function isG650ERPublishedWindow(name: string): boolean | null {
  const normalizedName = name.replace(/_/g, ' ').replace(/\.\d+$/, '').trim();
  const match = G650ER_WINDOW_PART.exec(normalizedName);
  if (!match) return null;
  return G650ER_VISIBLE_WINDOW_INDICES.includes(Number(match[2]) as typeof G650ER_VISIBLE_WINDOW_INDICES[number]);
}

function normalizedName(name: string) {
  return name.replace(/_/g, ' ').trim();
}

/** Seat bases in this authored mesh sit 25 mm above the carpet datum; lower all seat parts to floor contact. */
export function seatG650ERSeatAssemblies(root: THREE.Object3D, offsetMeters = 0.025) {
  root.traverse((object) => {
    if (/^Seat row \d+ position \d+ /i.test(normalizedName(object.name))) object.position.y -= offsetMeters;
  });
}

export function inspectG650ERSeatClearance(root: THREE.Object3D) {
  root.updateMatrixWorld(true);
  const seatBounds = new Map<string, THREE.Box3>();
  let floorTop = Number.NEGATIVE_INFINITY;
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const name = normalizedName(object.name);
    const seat = /^Seat row (\d+) position (\d+) /i.exec(name);
    if (seat) {
      const key = `${seat[1]}:${seat[2]}`;
      const bounds = new THREE.Box3().setFromObject(object);
      const current = seatBounds.get(key);
      if (current) current.union(bounds); else seatBounds.set(key, bounds);
    }
    if (name === 'Carpet floor') floorTop = Math.max(floorTop, new THREE.Box3().setFromObject(object).max.y);
  });
  const seats = [...seatBounds.values()];
  let overlapCount = 0;
  for (let i = 0; i < seats.length; i++) for (let j = i + 1; j < seats.length; j++) {
    const a = seats[i]; const b = seats[j];
    const overlap = [Math.min(a.max.x, b.max.x) - Math.max(a.min.x, b.min.x), Math.min(a.max.y, b.max.y) - Math.max(a.min.y, b.min.y), Math.min(a.max.z, b.max.z) - Math.max(a.min.z, b.min.z)];
    if (overlap.every((depth) => depth > 0.01)) overlapCount++;
  }
  const seatBottom = seats.reduce((min, bounds) => Math.min(min, bounds.min.y), Number.POSITIVE_INFINITY);
  const measuredGap = seatBottom - floorTop;
  const floorGapMeters = Number.isFinite(floorTop) && Number.isFinite(seatBottom) ? measuredGap <= 0.000001 ? 0 : measuredGap : null;
  return { seatCount: seats.length, overlapCount, floorGapMeters };
}
