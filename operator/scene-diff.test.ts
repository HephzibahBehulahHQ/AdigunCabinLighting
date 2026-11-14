import { describe, expect, it } from 'vitest';
import { PRESETS } from '../src/scene-engine.js';
import { diffScenes } from './scene-diff.js';

const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

describe('offline operator scene diff', () => {
  it('reports identical validated scenes as unchanged without enabling output', () => {
    const scene = copy(PRESETS.find((item) => item.id === 'rest'));
    const report = diffScenes(scene, copy(scene));
    expect(report.status).toBe('unchanged');
    expect(report.mode).toBe('SIMULATION');
    expect(report.physicalOutputEnabled).toBe(false);
    expect(report.keyframeChanges).toEqual([]);
  });

  it('reports metadata and RGBW changes deterministically', () => {
    const baseline = copy(PRESETS.find((item) => item.id === 'rest'));
    const proposed = copy(baseline);
    proposed.name = 'Rest update';
    proposed.keyframes[0].targets.ceiling.b = 19;
    proposed.keyframes[0].targets.windows.w = 7;
    const report = diffScenes(baseline, proposed);
    expect(report.status).toBe('changes-found');
    expect(report.metadataChanges).toEqual([{ field: 'name', before: 'Rest', after: 'Rest update' }]);
    expect(report.keyframeChanges[0]).toMatchObject({ atSeconds: 0, kind: 'modified' });
    expect(report.keyframeChanges[0].targets).toEqual([
      { zoneId: 'ceiling', channel: 'b', before: 12, after: 19 },
      { zoneId: 'windows', channel: 'w', before: 4, after: 7 },
    ]);
    expect(report.summary).toMatchObject({ modifiedKeyframes: 1, changedTargets: 2 });
  });

  it('reports easing-only keyframe changes', () => {
    const baseline = copy(PRESETS.find((item) => item.id === 'rest'));
    const proposed = copy(baseline);
    proposed.keyframes[0].easing = 'cubicInOut';
    const report = diffScenes(baseline, proposed);

    expect(report.status).toBe('changes-found');
    expect(report.keyframeChanges).toContainEqual(expect.objectContaining({
      atSeconds: 0,
      kind: 'modified',
      targets: [],
      easingChange: { before: null, after: 'cubicInOut' },
    }));
    expect(report.easingChanges).toBe(1);
  });

  it('detects added and removed keyframe times, including structurally changed frames', () => {
    const baseline = copy(PRESETS.find((item) => item.id === 'rest'));
    const proposed = copy(baseline);
    proposed.keyframes.splice(1, 0, { atSeconds: 30, targets: copy(proposed.keyframes[0].targets) });
    const added = diffScenes(baseline, proposed);
    expect(added.keyframeChanges.find((frame) => frame.atSeconds === 30)).toMatchObject({ kind: 'added' });
    expect(added.summary.addedKeyframes).toBe(1);
    const removed = diffScenes(proposed, baseline);
    expect(removed.keyframeChanges.find((frame) => frame.atSeconds === 30)).toMatchObject({ kind: 'removed' });
    expect(removed.summary.removedKeyframes).toBe(1);
  });

  it('rejects invalid scene data and does not mutate either input', () => {
    const baseline = copy(PRESETS.find((item) => item.id === 'rest'));
    const proposed = copy(baseline);
    delete (proposed.keyframes[0].targets as Partial<typeof proposed.keyframes[0]['targets']>).cabin;
    const original = copy(proposed);
    expect(() => diffScenes(baseline, proposed)).not.toThrow();
    expect(proposed).toEqual(original);
    proposed.schemaVersion = 99;
    expect(() => diffScenes(baseline, proposed)).toThrow(/schema version/i);
  });
});

