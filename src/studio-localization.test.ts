import { describe, expect, it } from 'vitest';
import { STUDIO_COPY, studioText } from './studio-localization';

describe('Studio localization candidates', () => {
  it('provide every core Studio label in every supported locale', () => {
    const expected = Object.keys(STUDIO_COPY.en).sort();
    for (const [locale, entries] of Object.entries(STUDIO_COPY)) {
      expect(Object.keys(entries).sort(), locale).toEqual(expected);
      expect(Object.values(entries).every((value) => value.trim().length > 0), locale).toBe(true);
    }
  });

  it('keeps technical scene values unchanged while translating the shared controls', () => {
    expect(studioText('de', 'cabinDigitalTwin')).toBe('Digitaler Kabinenzwilling');
    expect(studioText('yo', 'cabinDigitalTwin')).toBe('Àwòṣe oni-nọmba àgọ́');
    expect(studioText('pcm', 'cabinDigitalTwin')).toBe('Cabin digital twin');
    expect(studioText('de', 'channelRange')).toContain('RGBW');
    expect(studioText('yo', 'channelRange')).toContain('RGBW');
    expect(studioText('pcm', 'channelRange')).toContain('4 CHANNELS');
  });
});
