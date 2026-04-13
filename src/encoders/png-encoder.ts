import zlib from 'zlib';
import type { RawPixmap, ConvertOptions, ImageEncoder } from '../types/index.js';

/** Standard PNG signature bytes */
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

// CRC32 lookup table (standard PNG / zlib algorithm)
const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  return table;
})();

function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = (CRC_TABLE[(crc ^ (data[i] as number)) & 0xff] as number) ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type: string, data: Buffer): Buffer {
  const typeBytes = Buffer.from(type, 'ascii');
  const lengthBuf = Buffer.alloc(4);
  lengthBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBytes, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lengthBuf, typeBytes, data, crcBuf]);
}

export function encodePng(pixmap: RawPixmap, quality?: number): Buffer {
  const { data, width, height } = pixmap;
  const rowBytes = width * 3; // RGB, 3 bytes per pixel

  // IHDR: width(4) + height(4) + bitDepth(1) + colorType(1) + compression(1) + filter(1) + interlace(1)
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 2;   // color type: RGB truecolor
  ihdr[10] = 0;  // compression: deflate
  ihdr[11] = 0;  // filter method
  ihdr[12] = 0;  // interlace: none

  // Each scanline is prefixed with a filter byte (0 = None)
  const filtered = Buffer.alloc((rowBytes + 1) * height);
  for (let y = 0; y < height; y++) {
    const destRow = y * (rowBytes + 1);
    filtered[destRow] = 0; // filter type None
    const srcRow = y * rowBytes;
    filtered.set(data.subarray(srcRow, srcRow + rowBytes), destRow + 1);
  }

  // quality 1-100: high quality = less compression = larger file (consistent with JPEG mental model)
  // omitted → Z_NO_COMPRESSION (default)
  const level = quality !== undefined
    ? Math.round((100 - quality) / 100 * 9)
    : zlib.constants.Z_NO_COMPRESSION;

  const compressed = zlib.deflateSync(filtered, { level });

  return Buffer.concat([
    PNG_SIGNATURE,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

export const pngEncoder: ImageEncoder = {
  encode(pixmap: RawPixmap, options: ConvertOptions): Buffer {
    return encodePng(pixmap, options.quality);
  },
};
