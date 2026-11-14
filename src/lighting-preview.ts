import type { RGBW } from './scene-engine';

export type PreviewRGB = { r: number; g: number; b: number };

/** Blend RGBW setpoints into an approximate on-screen RGB color. */
export function composePreviewRGB(rgbw: RGBW): PreviewRGB {
  const white = Math.max(0, Math.min(100, Number.isFinite(rgbw.w) ? rgbw.w : 0));
  const channel = (value: number) => Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0) + white);
  return { r: channel(rgbw.r), g: channel(rgbw.g), b: channel(rgbw.b) };
}

/** Apply a display-only low-level lift so dim scene values remain visible. */
export function previewLightLevel(rgbw: RGBW, masterIntensity: number): number {
  const master = Math.max(0, Math.min(100, Number.isFinite(masterIntensity) ? masterIntensity : 0)) / 100;
  const channels = [rgbw.r, rgbw.g, rgbw.b, rgbw.w].map((value) => Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0)));
  const setpoint = Math.max(...channels) / 100;
  const drive = Math.max(0, Math.min(1, setpoint * master));
  return drive === 0 ? 0 : drive ** .82;
}
