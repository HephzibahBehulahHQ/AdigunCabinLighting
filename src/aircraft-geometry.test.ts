import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { G650ER_VISIBLE_WINDOW_INDICES, inspectG650ERSeatClearance, isG650ERPublishedWindow, seatG650ERSeatAssemblies } from './aircraft-geometry';

describe('G650ER authored window correction', () => {
  it('keeps eight symmetric window positions on both sides to match the published total of 16', () => {
    const visible = [-1, 1].flatMap((side) => Array.from({ length: 18 }, (_, index) => `Window glass ${side} ${index}`).filter((name) => isG650ERPublishedWindow(name)));
    expect(G650ER_VISIBLE_WINDOW_INDICES).toHaveLength(8);
    expect(visible).toHaveLength(16);
    expect(visible.filter((name) => name.startsWith('Window glass -1 '))).toHaveLength(8);
    expect(visible.filter((name) => name.startsWith('Window glass 1 '))).toHaveLength(8);
    expect(isG650ERPublishedWindow('Seat cushion row 2 left')).toBeNull();
  });

  it('seats the authored seat assemblies on the floor and checks seat envelopes for overlap', () => {
    const root = new THREE.Group();
    const floor = new THREE.Mesh(new THREE.BoxGeometry(2, 0.02, 4));
    floor.name = 'Carpet_floor';
    floor.position.y = -0.01;
    root.add(floor);
    for (const [index, x] of [[1, -0.5], [2, 0.5]] as const) {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.6));
      seat.name = `Seat_row_1_position_${index}_pedestal`;
      seat.position.set(x, 0.275, 0);
      root.add(seat);
    }
    const initial = inspectG650ERSeatClearance(root);
    expect(initial).toMatchObject({ seatCount: 2, overlapCount: 0 });
    expect(initial.floorGapMeters).toBeCloseTo(0.025);
    seatG650ERSeatAssemblies(root);
    expect(inspectG650ERSeatClearance(root)).toMatchObject({ seatCount: 2, overlapCount: 0, floorGapMeters: 0 });
  });
});
