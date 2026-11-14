import { describe, expect, it, vi } from 'vitest';
import { CABIN_GUIDED_TOUR, CABIN_WELCOME_ANNOUNCEMENT, getMoodInstrumentLabel, getMoodScore, MOOD_SCORE_IDS, scheduleMoodMusic } from './cabin-audio';
import { PRESETS } from './scene-engine';

class AudioParamStub {
  setValueAtTime = vi.fn();
  exponentialRampToValueAtTime = vi.fn();
  setTargetAtTime = vi.fn();
  cancelScheduledValues = vi.fn();
}

class AudioGraphStub {
  gain = new AudioParamStub();
  frequency = new AudioParamStub();
  type: OscillatorType = 'sine';
  start = vi.fn();
  stop = vi.fn();
  connect = vi.fn();
  disconnect = vi.fn();
}

class AudioContextStub {
  currentTime = 12;
  destination = {} as AudioNode;
  oscillators: AudioGraphStub[] = [];
  gains: AudioGraphStub[] = [];
  createGain() { const gain = new AudioGraphStub(); this.gains.push(gain); return gain as unknown as GainNode; }
  createOscillator() { const oscillator = new AudioGraphStub(); this.oscillators.push(oscillator); return oscillator as unknown as OscillatorNode; }
}

describe('cabin audio direction', () => {
  it('assigns every built-in lighting mood its own distinct instrumental arrangement', () => {
    expect(MOOD_SCORE_IDS).toHaveLength(16);
    expect([...MOOD_SCORE_IDS].sort()).toEqual(PRESETS.map(({ id }) => id).sort());
    const signatures = MOOD_SCORE_IDS.map((id) => {
      const score = getMoodScore(id);
      return `${score.instrument}:${score.tempo}:${score.rootMidi}:${score.progression.map((chord) => chord.join('.')).join('/')}:${score.motif.join('.')}`;
    });
    expect(new Set(signatures).size).toBe(MOOD_SCORE_IDS.length);
    expect(getMoodInstrumentLabel('relax')).toContain('piano');
    expect(getMoodInstrumentLabel('movie')).toContain('celesta');
    expect(getMoodInstrumentLabel('aurora')).toContain('piano');
  });

  it('provides truthful welcome and cabin-tour scripts with a simulation boundary', () => {
    expect(CABIN_WELCOME_ANNOUNCEMENT).toContain('Hephzibah Behulah');
    expect(CABIN_WELCOME_ANNOUNCEMENT).toContain('HB three eighty');
    expect(CABIN_WELCOME_ANNOUNCEMENT).toContain('no aircraft or cabin lighting hardware is connected');
    expect(CABIN_GUIDED_TOUR).toContain('illustrative design simulation');
    expect(CABIN_GUIDED_TOUR).toContain('not an aircraft fit');
  });

  it('schedules a bounded melodic score ahead of the scene clock and can change volume or stop', () => {
    const context = new AudioContextStub();
    vi.useFakeTimers();
    try {
      const handle = scheduleMoodMusic(context as unknown as AudioContext, 'relax', 6, 24, 38);
      const initiallyScheduled = context.oscillators.length;
      expect(initiallyScheduled).toBeGreaterThan(0);
      expect(initiallyScheduled).toBeLessThan(40);
      expect(context.oscillators.every((voice) => voice.start.mock.calls[0][0] >= context.currentTime + .06)).toBe(true);
      expect(context.oscillators.some((voice) => voice.frequency.setValueAtTime.mock.calls[0][0] > 500)).toBe(true);
      context.currentTime += 2;
      vi.advanceTimersByTime(100);
      expect(context.oscillators.length).toBeGreaterThan(initiallyScheduled);
      handle.setVolume(65);
      const volumeUpdate = context.gains[0].gain.setTargetAtTime.mock.calls[0];
      expect(volumeUpdate[0]).toBeCloseTo(.104, 10);
      expect(volumeUpdate.slice(1)).toEqual([context.currentTime, .035]);
      handle.stop();
      vi.advanceTimersByTime(100);
      expect(context.oscillators.every((voice) => voice.stop.mock.calls.length >= 2)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});

