/**
 * Encodes raw RGB pixel data as an ICO file using the classic BMP-in-ICO format.
 *
 * Structure per the ICO/BMP spec:
 *   ICONDIR (6 bytes) + ICONDIRENTRY (16 bytes) + BITMAPINFOHEADER (40 bytes)
 *   + XOR mask (BGR pixels, bottom-up, 4-byte-padded rows)
 *   + AND mask (1 bit/pixel, all zeros = opaque, bottom-up, 4-byte-padded rows)
 *
 * BITMAPINFOHEADER.biHeight is doubled (actual_height × 2) as required by ICO.
 * No alpha channel — AND mask carries the transparency (all opaque here).
 */

import type { RawPixmap, ConvertOptions, ImageEncoder } from '../types/index.js';

export function encodeIco(pixmap: RawPixmap): Buffer {
  const { data, width, height } = pixmap;

  // XOR mask: BGR pixels, each row padded to 4-byte boundary, stored bottom-up
  const xorRowBytes   = width * 3;
  const xorPaddedRow  = (xorRowBytes + 3) & ~3;
  const xorDataSize   = xorPaddedRow * height;

  // AND mask: 1 bit per pixel, each row padded to 32-bit (4-byte) boundary
  const andPaddedRow  = ((width + 31) >>> 5) << 2;
  const andDataSize   = andPaddedRow * height;

  const bmpDataSize = 40 + xorDataSize + andDataSize;
  const imgOffset   = 22; // 6 (ICONDIR) + 16 (ICONDIRENTRY)

  const buf = Buffer.alloc(imgOffset + bmpDataSize, 0);
  let o = 0;

  // ICONDIR (6 bytes)
  buf.writeUInt16LE(0, o); o += 2; // reserved
  buf.writeUInt16LE(1, o); o += 2; // type: 1 = ICO
  buf.writeUInt16LE(1, o); o += 2; // image count

  // ICONDIRENTRY (16 bytes)
  buf[o++] = width  >= 256 ? 0 : width;   // 0 encodes 256 per spec
  buf[o++] = height >= 256 ? 0 : height;
  buf[o++] = 0; // color count (0 = truecolor, no palette)
  buf[o++] = 0; // reserved
  buf.writeUInt16LE(1,  o); o += 2; // planes
  buf.writeUInt16LE(24, o); o += 2; // bits per pixel
  buf.writeUInt32LE(bmpDataSize, o); o += 4;
  buf.writeUInt32LE(imgOffset,   o); o += 4;

  // BITMAPINFOHEADER (40 bytes)
  buf.writeUInt32LE(40,           o); o += 4; // biSize
  buf.writeInt32LE(width,         o); o += 4; // biWidth
  buf.writeInt32LE(height * 2,    o); o += 4; // biHeight × 2 (XOR + AND masks)
  buf.writeUInt16LE(1,            o); o += 2; // biPlanes
  buf.writeUInt16LE(24,           o); o += 2; // biBitCount
  buf.writeUInt32LE(0,            o); o += 4; // biCompression (BI_RGB)
  buf.writeUInt32LE(xorDataSize,  o); o += 4; // biSizeImage
  buf.writeInt32LE(0,             o); o += 4; // biXPelsPerMeter
  buf.writeInt32LE(0,             o); o += 4; // biYPelsPerMeter
  buf.writeUInt32LE(0,            o); o += 4; // biClrUsed
  buf.writeUInt32LE(0,            o); o += 4; // biClrImportant

  // XOR mask: BGR, bottom-up (image row height-1 written first)
  for (let row = 0; row < height; row++) {
    const y = height - 1 - row; // convert to top-down image row
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 3;
      buf[o + x * 3]     = data[src + 2]!; // B
      buf[o + x * 3 + 1] = data[src + 1]!; // G
      buf[o + x * 3 + 2] = data[src]!;     // R
    }
    o += xorPaddedRow;
  }

  // AND mask: all zeros (already zeroed by Buffer.alloc) = fully opaque
  o += andDataSize;

  return buf.subarray(0, o);
}

export const icoEncoder: ImageEncoder = {
  encode(pixmap: RawPixmap, _options: ConvertOptions): Buffer {
    return encodeIco(pixmap);
  },
};
