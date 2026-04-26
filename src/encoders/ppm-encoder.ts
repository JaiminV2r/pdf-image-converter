import type { RawPixmap, ConvertOptions, ImageEncoder } from '../types/index.js';

/**
 * Encodes raw RGB pixel data as a PPM (Portable Pixmap, P6 binary format).
 * No compression — the simplest lossless raster format.
 */
export function encodePpm(pixmap: RawPixmap): Buffer {
  const { data, width, height } = pixmap;
  const header = Buffer.from(`P6\n${width} ${height}\n255\n`, 'ascii');
  const pixelBuf = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  return Buffer.concat([header, pixelBuf]);
}

export const ppmEncoder: ImageEncoder = {
  encode(pixmap: RawPixmap, _options: ConvertOptions): Buffer {
    return encodePpm(pixmap);
  },
};
