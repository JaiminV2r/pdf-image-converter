import { pngEncoder } from './png-encoder.js';
import { jpegEncoder } from './jpeg-encoder.js';
import { bmpEncoder } from './bmp-encoder.js';
import { ppmEncoder } from './ppm-encoder.js';
import type { RawPixmap, ConvertOptions, ImageEncoder, ImageFormat } from '../types/index.js';

const registry = new Map<string, ImageEncoder>([
  ['png',  pngEncoder],
  ['jpeg', jpegEncoder],
  ['jpg',  jpegEncoder], // alias
  ['bmp',  bmpEncoder],
  ['ppm',  ppmEncoder],
]);

/**
 * Returns the list of registered format names.
 */
export function supportedFormats(): string[] {
  return Array.from(registry.keys());
}

export async function encodePixmap(
  pixmap: RawPixmap,
  options: ConvertOptions
): Promise<{ buffer: Buffer; format: ImageFormat }> {
  const format = (options.format ?? 'png').toLowerCase();
  const encoder = registry.get(format);

  if (!encoder) {
    throw new Error(
      `Unsupported format: "${format}". ` +
      `Supported: ${supportedFormats().join(', ')}.`
    );
  }

  const buffer = await Promise.resolve(encoder.encode(pixmap, options));
  return { buffer, format };
}
