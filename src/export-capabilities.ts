export const CABIN_EXPORT_4K = { width: 3840, height: 2160 } as const;

export function canRenderExport(maxRenderbufferSize: number, width: number, height: number): boolean {
  return Number.isFinite(maxRenderbufferSize)
    && Number.isInteger(width) && width > 0
    && Number.isInteger(height) && height > 0
    && maxRenderbufferSize >= width
    && maxRenderbufferSize >= height;
}

/** Lower bound for one uncompressed RGBA8 surface; excludes depth, copies, and encoders. */
export function estimateRgbaSurfaceMiB(width: number, height: number): number {
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new Error('Export dimensions must be positive integers.');
  }
  return width * height * 4 / (1024 * 1024);
}
