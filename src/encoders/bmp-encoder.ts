import type { RawPixmap, ConvertOptions, ImageEncoder } from '../types/index.js';

/**
 * Encodes raw RGB pixel data as a 24-bit uncompressed BMP file.
 * BMP rows are stored bottom-up and each row is padded to a 4-byte boundary.
 */
export function encodeBmp(pixmap: RawPixmap): Buffer {
  const { data, width, height } = pixmap;

  // BMP rows must be padded to 4-byte boundaries
  const rowBytes = width * 3;
  const paddedRowBytes = (rowBytes + 3) & ~3;
  const pixelDataSize = paddedRowBytes * height;

  const fileHeaderSize = 14;
  const dibHeaderSize = 40; // BITMAPINFOHEADER
  const headerSize = fileHeaderSize + dibHeaderSize;
  const fileSize = headerSize + pixelDataSize;

  const buf = Buffer.alloc(fileSize, 0);

  // BITMAPFILEHEADER (14 bytes)
  buf.write('BM', 0, 'ascii');                    // Signature
  buf.writeUInt32LE(fileSize, 2);                  // File size
  buf.writeUInt16LE(0, 6);                         // Reserved1
  buf.writeUInt16LE(0, 8);                         // Reserved2
  buf.writeUInt32LE(headerSize, 10);               // Offset to pixel data

  // BITMAPINFOHEADER (40 bytes) at offset 14
  buf.writeUInt32LE(dibHeaderSize, 14);            // Header size
  buf.writeInt32LE(width, 18);                     // Width
  buf.writeInt32LE(-height, 22);                   // Height (negative = top-down)
  buf.writeUInt16LE(1, 26);                        // Color planes
  buf.writeUInt16LE(24, 28);                       // Bits per pixel
  buf.writeUInt32LE(0, 30);                        // Compression (BI_RGB = 0)
  buf.writeUInt32LE(pixelDataSize, 34);            // Image size
  buf.writeInt32LE(2835, 38);                      // X pixels per metre (~72 DPI)
  buf.writeInt32LE(2835, 42);                      // Y pixels per metre
  buf.writeUInt32LE(0, 46);                        // Colors in table
  buf.writeUInt32LE(0, 50);                        // Important colors

  // Pixel data: BMP stores BGR, our source is RGB — swap R and B
  for (let y = 0; y < height; y++) {
    const srcRowStart = y * rowBytes;
    const destRowStart = headerSize + y * paddedRowBytes;
    for (let x = 0; x < width; x++) {
      const srcPx = srcRowStart + x * 3;
      const destPx = destRowStart + x * 3;
      buf[destPx]     = data[srcPx + 2] as number; // B
      buf[destPx + 1] = data[srcPx + 1] as number; // G
      buf[destPx + 2] = data[srcPx]     as number; // R
    }
  }

  return buf;
}

export const bmpEncoder: ImageEncoder = {
  encode(pixmap: RawPixmap, _options: ConvertOptions): Buffer {
    return encodeBmp(pixmap);
  },
};
