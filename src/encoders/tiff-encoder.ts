import type { RawPixmap, ConvertOptions, ImageEncoder } from '../types/index.js';

const TAG_IMAGE_WIDTH              = 256;
const TAG_IMAGE_LENGTH             = 257;
const TAG_BITS_PER_SAMPLE          = 258;
const TAG_COMPRESSION              = 259;
const TAG_PHOTOMETRIC              = 262;
const TAG_STRIP_OFFSETS            = 273;
const TAG_SAMPLES_PER_PIXEL        = 277;
const TAG_ROWS_PER_STRIP           = 278;
const TAG_STRIP_BYTE_COUNTS        = 279;

const TYPE_SHORT = 3;
const TYPE_LONG  = 4;

const NUM_IFD_ENTRIES   = 9;
const IFD_OFFSET        = 8;
const IFD_SIZE          = 2 + NUM_IFD_ENTRIES * 12 + 4; // count + entries + next-IFD
const EXTRA_DATA_OFFSET = IFD_OFFSET + IFD_SIZE;        // BitsPerSample [8,8,8]
const EXTRA_DATA_SIZE   = 6;                             // 3 × uint16
const PIXEL_DATA_OFFSET = EXTRA_DATA_OFFSET + EXTRA_DATA_SIZE;

export function encodeTiff(pixmap: RawPixmap): Buffer {
  const { data, width, height } = pixmap;
  const pixelDataSize = width * height * 3;
  const buf = Buffer.alloc(PIXEL_DATA_OFFSET + pixelDataSize, 0);
  let o = 0;

  // TIFF header (little-endian)
  buf.writeUInt16LE(0x4949, o); o += 2; // byte order "II"
  buf.writeUInt16LE(42, o);     o += 2; // magic
  buf.writeUInt32LE(IFD_OFFSET, o); o += 4;

  // IFD entry count
  buf.writeUInt16LE(NUM_IFD_ENTRIES, o); o += 2;

  function writeEntry(tag: number, type: number, count: number, valueOrOffset: number): void {
    buf.writeUInt16LE(tag, o);          o += 2;
    buf.writeUInt16LE(type, o);         o += 2;
    buf.writeUInt32LE(count, o);        o += 4;
    buf.writeUInt32LE(valueOrOffset, o); o += 4;
  }

  // Entries sorted by tag
  writeEntry(TAG_IMAGE_WIDTH,       TYPE_LONG,  1, width);
  writeEntry(TAG_IMAGE_LENGTH,      TYPE_LONG,  1, height);
  writeEntry(TAG_BITS_PER_SAMPLE,   TYPE_SHORT, 3, EXTRA_DATA_OFFSET); // offset: 6 bytes
  writeEntry(TAG_COMPRESSION,       TYPE_SHORT, 1, 1);                  // no compression
  writeEntry(TAG_PHOTOMETRIC,       TYPE_SHORT, 1, 2);                  // RGB
  writeEntry(TAG_STRIP_OFFSETS,     TYPE_LONG,  1, PIXEL_DATA_OFFSET);
  writeEntry(TAG_SAMPLES_PER_PIXEL, TYPE_SHORT, 1, 3);
  writeEntry(TAG_ROWS_PER_STRIP,    TYPE_LONG,  1, height);
  writeEntry(TAG_STRIP_BYTE_COUNTS, TYPE_LONG,  1, pixelDataSize);

  // Next IFD offset (none)
  buf.writeUInt32LE(0, o); o += 4;

  // BitsPerSample extra data: [8, 8, 8]
  buf.writeUInt16LE(8, o); o += 2;
  buf.writeUInt16LE(8, o); o += 2;
  buf.writeUInt16LE(8, o); o += 2;

  // Pixel data (packed RGB, top-to-bottom)
  Buffer.from(data.buffer, data.byteOffset, data.byteLength).copy(buf, o);

  return buf;
}

export const tiffEncoder: ImageEncoder = {
  encode(pixmap: RawPixmap, _options: ConvertOptions): Buffer {
    return encodeTiff(pixmap);
  },
};
