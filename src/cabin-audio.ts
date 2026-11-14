export type CabinInstrument = 'piano' | 'soft-piano' | 'celesta' | 'flute' | 'warm-pad' | 'plucked-strings' | 'marimba';

export type MoodScore = {
  readonly instrument: CabinInstrument;
  readonly tempo: number;
  readonly rootMidi: number;
  readonly progression: readonly (readonly number[])[];
  readonly motif: readonly number[];
};

const SCOREBOOK: Readonly<Record<string, MoodScore>> = {
  boarding: { instrument: 'soft-piano', tempo: 68, rootMidi: 60, progression: [[0, 4, 7], [5, 9, 12], [2, 7, 11], [0, 4, 7]], motif: [0, 4, 7, 9, 7, 4, 2, 4] },
  aurora: { instrument: 'soft-piano', tempo: 56, rootMidi: 57, progression: [[0, 4, 7, 11], [5, 9, 12, 16], [2, 7, 11, 14], [4, 7, 11, 14]], motif: [0, 7, 11, 14, 11, 7, 4, 7] },
  sunrise: { instrument: 'piano', tempo: 64, rootMidi: 62, progression: [[0, 4, 7], [9, 12, 16], [5, 9, 12], [2, 6, 9]], motif: [0, 2, 4, 7, 9, 7, 4, 2] },
  sunset: { instrument: 'flute', tempo: 58, rootMidi: 55, progression: [[0, 4, 7], [7, 11, 14], [5, 9, 12], [0, 4, 7]], motif: [7, 9, 7, 4, 2, 4, 0, 2] },
  dining: { instrument: 'plucked-strings', tempo: 76, rootMidi: 60, progression: [[0, 4, 7], [2, 5, 9], [5, 9, 12], [7, 11, 14]], motif: [0, 4, 7, 4, 2, 5, 9, 5] },
  sleep: { instrument: 'warm-pad', tempo: 48, rootMidi: 53, progression: [[0, 4, 7, 11], [5, 9, 12, 16], [3, 7, 10, 14], [0, 4, 7, 11]], motif: [0, 7, 11, 7, 4, 11, 7, 4] },
  wake: { instrument: 'celesta', tempo: 62, rootMidi: 60, progression: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]], motif: [0, 4, 7, 12, 11, 9, 7, 4] },
  landing: { instrument: 'piano', tempo: 60, rootMidi: 57, progression: [[0, 4, 7], [5, 9, 12], [0, 4, 7], [7, 11, 14]], motif: [0, 4, 7, 9, 7, 4, 2, 0] },
  relax: { instrument: 'soft-piano', tempo: 54, rootMidi: 65, progression: [[0, 4, 7, 11], [9, 12, 16], [5, 9, 12, 16], [7, 11, 14]], motif: [0, 7, 11, 9, 7, 4, 2, 4] },
  rest: { instrument: 'warm-pad', tempo: 50, rootMidi: 50, progression: [[0, 3, 7], [5, 9, 12], [3, 7, 10], [0, 3, 7]], motif: [0, 7, 10, 7, 3, 7, 5, 3] },
  prayer: { instrument: 'flute', tempo: 52, rootMidi: 62, progression: [[0, 5, 9], [2, 7, 11], [5, 9, 12], [0, 5, 9]], motif: [0, 5, 9, 12, 9, 7, 5, 2] },
  movie: { instrument: 'celesta', tempo: 72, rootMidi: 55, progression: [[0, 3, 7, 10], [5, 9, 12], [3, 7, 10, 14], [0, 3, 7, 10]], motif: [0, 3, 7, 10, 7, 5, 3, 2] },
  'first-class': { instrument: 'piano', tempo: 66, rootMidi: 64, progression: [[0, 4, 7, 11], [7, 11, 14, 16], [9, 12, 16], [5, 9, 12, 16]], motif: [0, 4, 7, 11, 14, 11, 9, 7] },
  'business-class': { instrument: 'plucked-strings', tempo: 70, rootMidi: 59, progression: [[0, 4, 7], [5, 9, 12], [2, 6, 9], [7, 11, 14]], motif: [0, 7, 4, 9, 7, 4, 2, 7] },
  economy: { instrument: 'marimba', tempo: 80, rootMidi: 57, progression: [[0, 4, 7], [3, 7, 10], [5, 9, 12], [0, 4, 7]], motif: [0, 4, 7, 4, 3, 7, 10, 7] },
  'window-shade-lighting': { instrument: 'celesta', tempo: 74, rootMidi: 60, progression: [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]], motif: [12, 9, 7, 4, 7, 9, 4, 2] },
};

export function getMoodScore(sceneId: string): MoodScore {
  return SCOREBOOK[sceneId] ?? SCOREBOOK.relax;
}

export function getMoodInstrumentLabel(sceneId: string): string {
  const labels: Record<CabinInstrument, string> = {
    piano: 'felt piano', 'soft-piano': 'soft piano', celesta: 'celesta', flute: 'airy flute',
    'warm-pad': 'warm ambient pad', 'plucked-strings': 'plucked strings', marimba: 'soft marimba',
  };
  return labels[getMoodScore(sceneId).instrument];
}

const frequencyForMidi = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);
const boundedVolume = (value: number): number => Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0)) / 100;

function playNote(
  context: AudioContext,
  output: GainNode,
  midi: number,
  start: number,
  duration: number,
  amplitude: number,
  instrument: CabinInstrument,
): OscillatorNode[] {
  const partials: readonly [OscillatorType, number, number][] = instrument === 'piano' || instrument === 'soft-piano'
    ? [['sine', 1, 1], ['sine', 2.01, .22], ['triangle', 3.02, .055]]
    : instrument === 'celesta'
      ? [['sine', 1, 1], ['sine', 2, .3], ['sine', 3, .09]]
      : instrument === 'plucked-strings' || instrument === 'marimba'
        ? [['triangle', 1, 1], ['sine', 2, .14]]
        : [[instrument === 'warm-pad' ? 'triangle' : 'sine', 1, 1]];
  return partials.map(([type, multiplier, partialGain]) => {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequencyForMidi(midi) * multiplier, start);
    const peak = Math.max(.0001, amplitude * partialGain);
    const attack = instrument === 'warm-pad' ? Math.min(.16, duration * .35) : instrument === 'flute' ? .07 : .012;
    oscillator.connect(envelope);
    envelope.connect(output);
    envelope.gain.setValueAtTime(.0001, start);
    envelope.gain.exponentialRampToValueAtTime(peak, start + attack);
    if (instrument === 'piano' || instrument === 'soft-piano' || instrument === 'celesta' || instrument === 'plucked-strings' || instrument === 'marimba') {
      envelope.gain.exponentialRampToValueAtTime(Math.max(.0001, peak * .18), start + Math.max(attack + .02, duration * .42));
    }
    envelope.gain.exponentialRampToValueAtTime(.0001, start + duration);
    oscillator.start(start);
    oscillator.stop(start + duration + .04);
    return oscillator;
  });
}

export type MoodMusicHandle = { setVolume: (volume: number) => void; stop: () => void };

/** Schedules a deterministic, scene-specific instrumental score against the preview timeline. */
export function scheduleMoodMusic(
  context: AudioContext,
  sceneId: string,
  offsetSeconds: number,
  durationSeconds: number,
  volume: number,
): MoodMusicHandle {
  const score = getMoodScore(sceneId);
  const output = context.createGain();
  output.gain.setValueAtTime(boundedVolume(volume) * .16, context.currentTime);
  output.connect(context.destination);
  const oscillators: OscillatorNode[] = [];
  const beatSeconds = 60 / score.tempo;
  const firstBeat = Math.max(0, Math.ceil(offsetSeconds / beatSeconds - 1e-9));
  const firstStart = context.currentTime + .06;
  for (let beat = firstBeat; beat * beatSeconds < durationSeconds; beat += 1) {
    const eventTime = beat * beatSeconds;
    const start = firstStart + Math.max(0, eventTime - offsetSeconds);
    const progression = score.progression[Math.floor(beat / 4) % score.progression.length];
    if (beat % 4 === 0) {
      for (const interval of progression) {
        oscillators.push(...playNote(context, output, score.rootMidi + interval, start, Math.min(beatSeconds * 3.7, 5), .18, score.instrument));
      }
    }
    if (beat % 2 === 0 || score.instrument === 'plucked-strings' || score.instrument === 'marimba') {
      const interval = score.motif[beat % score.motif.length];
      oscillators.push(...playNote(context, output, score.rootMidi + 12 + interval, start, Math.min(beatSeconds * 1.65, 2.2), .42, score.instrument));
    }
  }
  return {
    setVolume: (nextVolume) => output.gain.setTargetAtTime(boundedVolume(nextVolume) * .16, context.currentTime, .035),
    stop: () => {
      const now = context.currentTime;
      output.gain.cancelScheduledValues(now);
      output.gain.setTargetAtTime(.0001, now, .025);
      for (const oscillator of oscillators) {
        try { oscillator.stop(now + .09); } catch { /* A scheduled voice may already have ended. */ }
      }
      globalThis.setTimeout(() => { try { output.disconnect(); } catch { /* Already disconnected. */ } }, 180);
    },
  };
}

/** A short rising three-note welcome chime, intentionally distinct from the old click cue. */
export function playWelcomeChime(context: AudioContext, volume: number): void {
  const output = context.createGain();
  output.gain.setValueAtTime(boundedVolume(volume) * .18, context.currentTime);
  output.connect(context.destination);
  [67, 72, 76, 79].forEach((midi, index) => {
    playNote(context, output, midi, context.currentTime + .08 + index * .19, .8, .45, 'celesta');
  });
  globalThis.setTimeout(() => { try { output.disconnect(); } catch { /* Already disconnected. */ } }, 1800);
}

export const CABIN_WELCOME_ANNOUNCEMENT =
  'Welcome to Hephzibah Behulah HB three eighty. Your cabin-lighting experience is ready to begin. Explore a gentle boarding glow, a calm sunrise, a warm dining atmosphere, a quiet movie scene, or a restful night-light setting. Use the transition preview to hear each scene with its own instrumental score. For this demonstration, HB380 is a design concept in an offline visual simulator; no aircraft or cabin lighting hardware is connected. Thank you for joining us, and enjoy the preview.';

export const CABIN_GUIDED_TOUR =
  'Welcome to the Hephzibah Behulah cabin lighting studio. Start with a mood in the Scene Library, then press Play to preview the lighting change with its matching instrumental score. In the Cabin Digital Twin, switch between two D and three D views, and choose Entry, Mid-cabin, Aft, or Window row to explore different camera perspectives. Select a lighting zone to edit its red, green, blue, and white values, then save or export your scene. This is an illustrative design simulation, not an aircraft fit or a photometric measurement. No aircraft is connected and no physical lights are being controlled.';

export const MOOD_SCORE_IDS = Object.keys(SCOREBOOK);
