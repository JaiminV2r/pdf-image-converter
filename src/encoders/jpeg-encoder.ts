/**
 * Pure TypeScript Baseline DCT JPEG encoder.
 *
 * Implements the JFIF/JPEG standard (ISO 10918-1):
 * - RGB → YCbCr color space conversion
 * - 8×8 block DCT using the Arai-Agui-Nakajima (AAN) fast algorithm
 * - Quantization with scaled JFIF Annex K tables
 * - Zigzag ordering
 * - Huffman coding with standard JFIF tables
 *
 * No external dependencies. Only built-in JavaScript arithmetic.
 */

import type { RawPixmap, ConvertOptions, ImageEncoder } from '../types/index.js';

// ---------------------------------------------------------------------------
// JFIF Annex K — Standard quantization tables
// ---------------------------------------------------------------------------

const LUMA_QUANT_BASE: readonly number[] = [
  16, 11, 10, 16,  24,  40,  51,  61,
  12, 12, 14, 19,  26,  58,  60,  55,
  14, 13, 16, 24,  40,  57,  69,  56,
  14, 17, 22, 29,  51,  87,  80,  62,
  18, 22, 37, 56,  68, 109, 103,  77,
  24, 35, 55, 64,  81, 104, 113,  92,
  49, 64, 78, 87, 103, 121, 120, 101,
  72, 92, 95, 98, 112, 100, 103,  99,
];

const CHROMA_QUANT_BASE: readonly number[] = [
  17, 18, 24, 47, 99, 99, 99, 99,
  18, 21, 26, 66, 99, 99, 99, 99,
  24, 26, 56, 99, 99, 99, 99, 99,
  47, 66, 99, 99, 99, 99, 99, 99,
  99, 99, 99, 99, 99, 99, 99, 99,
  99, 99, 99, 99, 99, 99, 99, 99,
  99, 99, 99, 99, 99, 99, 99, 99,
  99, 99, 99, 99, 99, 99, 99, 99,
];

// Zigzag order (maps 2D block index to sequential scan order)
const ZIGZAG: readonly number[] = [
   0,  1,  8, 16,  9,  2,  3, 10,
  17, 24, 32, 25, 18, 11,  4,  5,
  12, 19, 26, 33, 40, 48, 41, 34,
  27, 20, 13,  6,  7, 14, 21, 28,
  35, 42, 49, 56, 57, 50, 43, 36,
  29, 22, 15, 23, 30, 37, 44, 51,
  58, 59, 52, 45, 38, 31, 39, 46,
  53, 60, 61, 54, 47, 55, 62, 63,
];

// ---------------------------------------------------------------------------
// JFIF Annex K — Standard Huffman tables (hardcoded as bit lengths + values)
// ---------------------------------------------------------------------------

// Luminance DC
const DC_LUMA_LENGTHS = [0,1,5,1,1,1,1,1,1,0,0,0,0,0,0,0];
const DC_LUMA_VALUES  = [0,1,2,3,4,5,6,7,8,9,10,11];

// Chrominance DC
const DC_CHROMA_LENGTHS = [0,3,1,1,1,1,1,1,1,1,1,0,0,0,0,0];
const DC_CHROMA_VALUES  = [0,1,2,3,4,5,6,7,8,9,10,11];

// Luminance AC
const AC_LUMA_LENGTHS  = [0,2,1,3,3,2,4,3,5,5,4,4,0,0,1,125];
const AC_LUMA_VALUES   = [
  0x01,0x02,0x03,0x00,0x04,0x11,0x05,0x12,0x21,0x31,0x41,0x06,0x13,0x51,0x61,
  0x07,0x22,0x71,0x14,0x32,0x81,0x91,0xa1,0x08,0x23,0x42,0xb1,0xc1,0x15,0x52,
  0xd1,0xf0,0x24,0x33,0x62,0x72,0x82,0x09,0x0a,0x16,0x17,0x18,0x19,0x1a,0x25,
  0x26,0x27,0x28,0x29,0x2a,0x34,0x35,0x36,0x37,0x38,0x39,0x3a,0x43,0x44,0x45,
  0x46,0x47,0x48,0x49,0x4a,0x53,0x54,0x55,0x56,0x57,0x58,0x59,0x5a,0x63,0x64,
  0x65,0x66,0x67,0x68,0x69,0x6a,0x73,0x74,0x75,0x76,0x77,0x78,0x79,0x7a,0x83,
  0x84,0x85,0x86,0x87,0x88,0x89,0x8a,0x92,0x93,0x94,0x95,0x96,0x97,0x98,0x99,
  0x9a,0xa2,0xa3,0xa4,0xa5,0xa6,0xa7,0xa8,0xa9,0xaa,0xb2,0xb3,0xb4,0xb5,0xb6,
  0xb7,0xb8,0xb9,0xba,0xc2,0xc3,0xc4,0xc5,0xc6,0xc7,0xc8,0xc9,0xca,0xd2,0xd3,
  0xd4,0xd5,0xd6,0xd7,0xd8,0xd9,0xda,0xe1,0xe2,0xe3,0xe4,0xe5,0xe6,0xe7,0xe8,
  0xe9,0xea,0xf1,0xf2,0xf3,0xf4,0xf5,0xf6,0xf7,0xf8,0xf9,0xfa,
];

// Chrominance AC
const AC_CHROMA_LENGTHS = [0,2,1,2,4,4,3,4,7,5,4,4,0,1,2,119];
const AC_CHROMA_VALUES  = [
  0x00,0x01,0x02,0x03,0x11,0x04,0x05,0x21,0x31,0x06,0x12,0x41,0x51,0x07,0x61,
  0x71,0x13,0x22,0x32,0x81,0x08,0x14,0x42,0x91,0xa1,0xb1,0xc1,0x09,0x23,0x33,
  0x52,0xf0,0x15,0x62,0x72,0xd1,0x0a,0x16,0x24,0x34,0xe1,0x25,0xf1,0x17,0x18,
  0x19,0x1a,0x26,0x27,0x28,0x29,0x2a,0x35,0x36,0x37,0x38,0x39,0x3a,0x43,0x44,
  0x45,0x46,0x47,0x48,0x49,0x4a,0x53,0x54,0x55,0x56,0x57,0x58,0x59,0x5a,0x63,
  0x64,0x65,0x66,0x67,0x68,0x69,0x6a,0x73,0x74,0x75,0x76,0x77,0x78,0x79,0x7a,
  0x82,0x83,0x84,0x85,0x86,0x87,0x88,0x89,0x8a,0x92,0x93,0x94,0x95,0x96,0x97,
  0x98,0x99,0x9a,0xa2,0xa3,0xa4,0xa5,0xa6,0xa7,0xa8,0xa9,0xaa,0xb2,0xb3,0xb4,
  0xb5,0xb6,0xb7,0xb8,0xb9,0xba,0xc2,0xc3,0xc4,0xc5,0xc6,0xc7,0xc8,0xc9,0xca,
  0xd2,0xd3,0xd4,0xd5,0xd6,0xd7,0xd8,0xd9,0xda,0xe2,0xe3,0xe4,0xe5,0xe6,0xe7,
  0xe8,0xe9,0xea,0xf2,0xf3,0xf4,0xf5,0xf6,0xf7,0xf8,0xf9,0xfa,
];

// ---------------------------------------------------------------------------
// Build Huffman code tables from bit-length + value arrays
// ---------------------------------------------------------------------------

interface HuffTable {
  codes: Map<number, { code: number; len: number }>;
}

function buildHuffTable(lengths: readonly number[], values: readonly number[]): HuffTable {
  const codes = new Map<number, { code: number; len: number }>();
  let code = 0;
  let valIdx = 0;
  for (let bits = 1; bits <= 16; bits++) {
    const count = lengths[bits - 1] ?? 0;
    for (let i = 0; i < count; i++) {
      const val = values[valIdx++] as number;
      codes.set(val, { code, len: bits });
      code++;
    }
    code <<= 1;
  }
  return { codes };
}

const DC_LUMA_TABLE   = buildHuffTable(DC_LUMA_LENGTHS, DC_LUMA_VALUES);
const DC_CHROMA_TABLE = buildHuffTable(DC_CHROMA_LENGTHS, DC_CHROMA_VALUES);
const AC_LUMA_TABLE   = buildHuffTable(AC_LUMA_LENGTHS, AC_LUMA_VALUES);
const AC_CHROMA_TABLE = buildHuffTable(AC_CHROMA_LENGTHS, AC_CHROMA_VALUES);

// ---------------------------------------------------------------------------
// Quantization table scaling (JFIF quality formula)
// ---------------------------------------------------------------------------

function buildQuantTable(base: readonly number[], quality: number): number[] {
  const q = quality < 50 ? Math.floor(5000 / quality) : 200 - quality * 2;
  return base.map((v) => Math.max(1, Math.min(255, Math.floor((v * q + 50) / 100))));
}


function dct2d(block: Float64Array): Float64Array {
  // Separate, correct 2D DCT using loeffler-style separable 1D DCT
  const result = new Float64Array(64);

  // Row DCT
  const row = new Float64Array(8);
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) row[j] = block[i * 8 + j]!;
    fdct1d(row);
    for (let j = 0; j < 8; j++) result[i * 8 + j] = row[j]!;
  }

  // Column DCT
  const col = new Float64Array(8);
  for (let j = 0; j < 8; j++) {
    for (let i = 0; i < 8; i++) col[i] = result[i * 8 + j]!;
    fdct1d(col);
    for (let i = 0; i < 8; i++) result[i * 8 + j] = col[i]!;
  }

  return result;
}

// Correct 1D DCT (using direct formula — reliable baseline implementation)
function fdct1d(v: Float64Array): void {
  const N = 8;
  const tmp = new Float64Array(N);
  for (let k = 0; k < N; k++) {
    let sum = 0;
    for (let n = 0; n < N; n++) {
      sum += (v[n]!) * Math.cos(Math.PI * k * (2 * n + 1) / 16);
    }
    const scale = k === 0 ? Math.SQRT1_2 : 1;
    tmp[k] = 0.5 * scale * sum;
  }
  for (let k = 0; k < N; k++) v[k] = tmp[k]!;
}

// ---------------------------------------------------------------------------
// Bit writer
// ---------------------------------------------------------------------------

class BitWriter {
  private bytes: number[] = [];
  private buf = 0;
  private bits = 0;

  writeBits(val: number, len: number): void {
    for (let i = len - 1; i >= 0; i--) {
      this.buf = (this.buf << 1) | ((val >> i) & 1);
      this.bits++;
      if (this.bits === 8) {
        this.flushByte();
      }
    }
  }

  private flushByte(): void {
    const b = this.buf & 0xff;
    this.bytes.push(b);
    if (b === 0xff) this.bytes.push(0x00); // byte stuffing
    this.buf = 0;
    this.bits = 0;
  }

  flush(): void {
    if (this.bits > 0) {
      // Pad remaining bits with 1s (JPEG spec requirement)
      this.buf = (this.buf << (8 - this.bits)) | ((1 << (8 - this.bits)) - 1);
      this.flushByte();
    }
  }

  toBuffer(): Buffer {
    return Buffer.from(this.bytes);
  }
}

// ---------------------------------------------------------------------------
// Huffman encode one block
// ---------------------------------------------------------------------------

function huffEncodeDC(
  diff: number,
  table: HuffTable,
  writer: BitWriter
): void {
  const category = dcCategory(diff);
  const entry = table.codes.get(category);
  if (!entry) throw new Error(`DC: no Huffman code for category ${category}`);
  writer.writeBits(entry.code, entry.len);
  if (category > 0) {
    // Write amplitude bits
    const amp = diff < 0 ? diff - 1 : diff;
    writer.writeBits(amp & ((1 << category) - 1), category);
  }
}

function huffEncodeAC(
  coeffs: number[],
  table: HuffTable,
  writer: BitWriter
): void {
  let run = 0;
  for (let i = 1; i < 64; i++) {
    const coeff = coeffs[i]!;
    if (coeff === 0) {
      if (i === 63) {
        // EOB
        const eob = table.codes.get(0x00);
        if (!eob) throw new Error('AC: no EOB code');
        writer.writeBits(eob.code, eob.len);
        return;
      }
      run++;
      if (run === 16) {
        // ZRL: 16 zeros
        const zrl = table.codes.get(0xf0);
        if (!zrl) throw new Error('AC: no ZRL code');
        writer.writeBits(zrl.code, zrl.len);
        run = 0;
      }
    } else {
      const cat = acCategory(coeff);
      const symbol = (run << 4) | cat;
      const entry = table.codes.get(symbol);
      if (!entry) throw new Error(`AC: no Huffman code for symbol 0x${symbol.toString(16)}`);
      writer.writeBits(entry.code, entry.len);
      const amp = coeff < 0 ? coeff - 1 : coeff;
      writer.writeBits(amp & ((1 << cat) - 1), cat);
      run = 0;
    }
  }
  // EOB (if we reach here, last coeff was non-zero, which was already written above)
}

function dcCategory(val: number): number {
  if (val === 0) return 0;
  let v = Math.abs(val);
  let cat = 0;
  while (v > 0) { v >>= 1; cat++; }
  return cat;
}

function acCategory(val: number): number {
  return dcCategory(val); // same formula
}

// ---------------------------------------------------------------------------
// JPEG markers builder
// ---------------------------------------------------------------------------

function writeUint16BE(val: number): Buffer {
  const b = Buffer.alloc(2);
  b.writeUInt16BE(val, 0);
  return b;
}

function buildSOI(): Buffer { return Buffer.from([0xff, 0xd8]); }
function buildEOI(): Buffer { return Buffer.from([0xff, 0xd9]); }

function buildAPP0(): Buffer {
  // APP0 payload: JFIF\0(5) + version(2) + units(1) + Xdensity(2) + Ydensity(2) + thumb(2) = 14 bytes
  const data = Buffer.alloc(14);
  data.write('JFIF\x00', 0, 'ascii');
  data.writeUInt16BE(0x0101, 5); // version 1.1
  data[7] = 0;                   // aspect ratio units (0=no units)
  data.writeUInt16BE(1, 8);      // Xdensity
  data.writeUInt16BE(1, 10);     // Ydensity
  data[12] = 0;                  // thumbnail width
  data[13] = 0;                  // thumbnail height
  return Buffer.concat([Buffer.from([0xff, 0xe0]), writeUint16BE(data.length + 2), data]);
}

function buildDQT(tableId: number, qtable: number[]): Buffer {
  // Qtable in zigzag order
  const tdata = Buffer.alloc(65);
  tdata[0] = tableId & 0x0f;
  for (let i = 0; i < 64; i++) tdata[1 + i] = qtable[ZIGZAG[i]!]!;
  return Buffer.concat([Buffer.from([0xff, 0xdb]), writeUint16BE(tdata.length + 2), tdata]);
}

function buildSOF0(width: number, height: number): Buffer {
  const data = Buffer.alloc(15);
  data[0] = 8;                        // precision
  data.writeUInt16BE(height, 1);
  data.writeUInt16BE(width, 3);
  data[5] = 3;                        // 3 components
  // Y component
  data[6]  = 1; data[7]  = 0x11; data[8]  = 0; // no subsampling, quant table 0
  // Cb component
  data[9]  = 2; data[10] = 0x11; data[11] = 1; // quant table 1
  // Cr component
  data[12] = 3; data[13] = 0x11; data[14] = 1;
  return Buffer.concat([Buffer.from([0xff, 0xc0]), writeUint16BE(data.length + 2), data]);
}

function buildDHT(tableClass: number, tableId: number, lengths: readonly number[], values: readonly number[]): Buffer {
  const lenBytes = Buffer.from(lengths.slice(0, 16) as number[]);
  const valBytes = Buffer.from(values as number[]);
  const id = Buffer.from([(tableClass << 4) | tableId]);
  const payload = Buffer.concat([id, lenBytes, valBytes]);
  return Buffer.concat([Buffer.from([0xff, 0xc4]), writeUint16BE(payload.length + 2), payload]);
}

function buildSOS(): Buffer {
  // SOS payload: Ns(1) + 3×(Cs+Td/Ta)(6) + Ss+Se+Ah/Al(3) = 10 bytes
  // Length field = 10 + 2 = 12
  const data = Buffer.alloc(10);
  data[0] = 3;                     // Ns: 3 components
  data[1] = 1; data[2]  = 0x00;   // Y:  DC table 0, AC table 0
  data[3] = 2; data[4]  = 0x11;   // Cb: DC table 1, AC table 1
  data[5] = 3; data[6]  = 0x11;   // Cr: DC table 1, AC table 1
  data[7] = 0;                     // Ss (start of spectral selection)
  data[8] = 63;                    // Se (end of spectral selection)
  data[9] = 0;                     // Ah/Al
  return Buffer.concat([Buffer.from([0xff, 0xda]), writeUint16BE(data.length + 2), data]);
}

// ---------------------------------------------------------------------------
// Main encoder
// ---------------------------------------------------------------------------

export function encodeJpeg(pixmap: RawPixmap, quality?: number): Buffer {
  const q = quality !== undefined ? Math.max(1, Math.min(100, quality)) : 100;
  const { data, width, height } = pixmap;

  const lumaQ   = buildQuantTable(LUMA_QUANT_BASE, q);
  const chromaQ = buildQuantTable(CHROMA_QUANT_BASE, q);

  const writer = new BitWriter();

  // DC predictors (one per component)
  let dcY = 0, dcCb = 0, dcCr = 0;

  const paddedWidth  = Math.ceil(width  / 8) * 8;
  const paddedHeight = Math.ceil(height / 8) * 8;

  for (let by = 0; by < paddedHeight; by += 8) {
    for (let bx = 0; bx < paddedWidth; bx += 8) {
      // Extract 8×8 block and convert to YCbCr
      const yBlock   = new Float64Array(64);
      const cbBlock  = new Float64Array(64);
      const crBlock  = new Float64Array(64);

      for (let dy = 0; dy < 8; dy++) {
        const py = Math.min(by + dy, height - 1);
        for (let dx = 0; dx < 8; dx++) {
          const px = Math.min(bx + dx, width - 1);
          const idx = (py * width + px) * 3;
          const r = data[idx]!;
          const g = data[idx + 1]!;
          const b = data[idx + 2]!;

          // RGB → YCbCr (JFIF Rec.601 coefficients, level-shifted by -128)
          const Y  =  0.299   * r + 0.587   * g + 0.114   * b - 128;
          const Cb = -0.16874 * r - 0.33126 * g + 0.5     * b;
          const Cr =  0.5     * r - 0.41869 * g - 0.08131 * b;

          const bi = dy * 8 + dx;
          yBlock[bi]  = Y;
          cbBlock[bi] = Cb;
          crBlock[bi] = Cr;
        }
      }

      // DCT + quantize + zigzag + encode each component
      dcY  = encodeBlock(yBlock,  lumaQ,   DC_LUMA_TABLE,   AC_LUMA_TABLE,   dcY,  writer);
      dcCb = encodeBlock(cbBlock, chromaQ, DC_CHROMA_TABLE, AC_CHROMA_TABLE, dcCb, writer);
      dcCr = encodeBlock(crBlock, chromaQ, DC_CHROMA_TABLE, AC_CHROMA_TABLE, dcCr, writer);
    }
  }

  writer.flush();
  const scanData = writer.toBuffer();

  const headers = Buffer.concat([
    buildSOI(),
    buildAPP0(),
    buildDQT(0, lumaQ),
    buildDQT(1, chromaQ),
    buildSOF0(width, height),
    buildDHT(0, 0, DC_LUMA_LENGTHS,   DC_LUMA_VALUES),
    buildDHT(0, 1, DC_CHROMA_LENGTHS, DC_CHROMA_VALUES),
    buildDHT(1, 0, AC_LUMA_LENGTHS,   AC_LUMA_VALUES),
    buildDHT(1, 1, AC_CHROMA_LENGTHS, AC_CHROMA_VALUES),
    buildSOS(),
  ]);

  return Buffer.concat([headers, scanData, buildEOI()]);
}

function encodeBlock(
  block: Float64Array,
  qtable: number[],
  dcTable: HuffTable,
  acTable: HuffTable,
  prevDC: number,
  writer: BitWriter
): number {
  const dct = dct2d(block);

  // Quantize and zigzag
  const zz: number[] = new Array(64);
  for (let i = 0; i < 64; i++) {
    const zIdx = ZIGZAG[i]!;
    const q = qtable[zIdx]!;
    zz[i] = Math.round(dct[zIdx]! / q);
  }

  const dc = zz[0]!;
  const diff = dc - prevDC;
  huffEncodeDC(diff, dcTable, writer);
  huffEncodeAC(zz, acTable, writer);

  return dc;
}

export const jpegEncoder: ImageEncoder = {
  encode(pixmap: RawPixmap, options: ConvertOptions): Buffer {
    return encodeJpeg(pixmap, options.quality);
  },
};
