import { describe, expect, it } from 'vitest';
import { cabinAudioAssetKey } from './audio-asset-store';

describe('browser-local cabin audio asset keys', () => {
  it('isolates each project, mood scene, and announcement role', () => {
    expect(cabinAudioAssetKey('project-a', 'mood', 'boarding')).not.toBe(cabinAudioAssetKey('project-a', 'mood', 'sleep'));
    expect(cabinAudioAssetKey('project-a', 'mood', 'boarding')).not.toBe(cabinAudioAssetKey('project-b', 'mood', 'boarding'));
    expect(cabinAudioAssetKey('project-a', 'welcome')).not.toBe(cabinAudioAssetKey('project-a', 'tour'));
    expect(cabinAudioAssetKey('project-a', 'welcome', 'ignored')).toBe(cabinAudioAssetKey('project-a', 'welcome'));
  });
});
