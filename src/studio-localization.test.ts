import { describe, expect, it } from 'vitest';
import { AIRCRAFT_MESH_PROFILES } from './aircraft-assets';
import { STUDIO_COPY, studioText, studioSceneDiagnostic, studioSceneName, studioVoicePreview, studioZoneDetail, studioZoneName } from './studio-localization';

describe('Studio localization candidates', () => {
  it('provide every core Studio label in every supported locale', () => {
    const expected = Object.keys(STUDIO_COPY.en).sort();
    for (const [locale, entries] of Object.entries(STUDIO_COPY)) {
      expect(Object.keys(entries).sort(), locale).toEqual(expected);
      expect(Object.values(entries).every((value) => value.trim().length > 0), locale).toBe(true);
    }
  });

  it('preserves message placeholders in every translation', () => {
    const placeholders = (message: string) => (message.match(/\{\w+\}/g) ?? []).sort();
    for (const key of Object.keys(STUDIO_COPY.en) as (keyof typeof STUDIO_COPY.en)[]) {
      const expected = placeholders(STUDIO_COPY.en[key]);
      for (const [locale, copy] of Object.entries(STUDIO_COPY)) {
        expect(placeholders(copy[key]), `${locale}.${key}`).toEqual(expected);
      }
    }
  });

  it('translates bundled fixture names and zone evidence while preserving source node names', () => {
    for (const profile of AIRCRAFT_MESH_PROFILES) {
      for (const { id, name, basis, source_node_name: node } of profile.zones) {
        const zone = { id, name, detail: basis };
        expect(studioZoneName('en', zone)).toBe(name);
        expect(studioZoneDetail('en', zone)).toBe(basis);
        for (const locale of ['de', 'yo', 'pcm'] as const) {
          const localized = studioZoneDetail(locale, zone);
          expect(localized, `${locale}.${profile.id}.${id}`).not.toBe(basis);
          if (node) expect(localized).toContain(node);
          const displayedName = studioZoneName(locale, zone);
          const locatorNumber = / locator (\d+)$/.exec(name)?.[1];
          if (locatorNumber) expect(displayedName).toMatch(new RegExp(` ${locatorNumber}$`));
          if (node && name.includes(node)) expect(displayedName).toContain(node);
          if (locale === 'de') expect(displayedName).not.toBe(name);
        }
      }
    }
  });

  it('translates scenario diagnostics without changing zone and field identifiers', () => {
    const translate = (message: string) => studioSceneDiagnostic('de', new Error(message), 'scenarioValidationFailed');
    expect(translate('Zone footwell fade duration must be between 0 and 30 seconds.'))
      .toBe('Die Übergangsdauer für Zone footwell muss zwischen 0 und 30 Sekunden liegen.');
    expect(translate('Cabin profile lengthMeters must be a finite number.'))
      .toBe('Kabinenprofilfeld lengthMeters muss eine endliche Zahl sein.');
    expect(translate('Unexpected diagnostic')).toBe('Unexpected diagnostic');
  });

  it('uses locale-specific voice preview scripts and matching language tags', () => {
    for (const [locale, tag, greeting] of [
      ['en', 'en-GB', 'Welcome'],
      ['de', 'de-DE', 'Willkommen'],
      ['yo', 'yo-NG', 'Káàbọ̀'],
      ['pcm', 'pcm-NG', 'Welcome'],
    ] as const) {
      const welcome = studioVoicePreview(locale, 'welcome');
      const tour = studioVoicePreview(locale, 'tour');
      expect(welcome.language).toBe(tag);
      expect(tour.language).toBe(tag);
      expect(welcome.text).toMatch(new RegExp(`^${greeting}`));
      expect(tour.text).toMatch(new RegExp(`^${greeting}`));
      expect(welcome.text).not.toBe(tour.text);
    }
  });

  it('localizes built-in scene labels and preserves custom names', () => {
    expect(studioSceneName('de', { id: 'boarding', name: 'Boarding' })).toBe('Einsteigen');
    expect(studioSceneName('de', { id: 'boarding', name: 'First light' })).toBe('First light');
    expect(studioSceneName('de', { id: 'custom', name: 'Boarding' })).toBe('Boarding');
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
