import { describe, it, expect } from 'vitest';
import { encodeIco } from '../../src/encoders/ico-encoder.js';
import type { RawPixmap } from '../../src/types/index.js';

function makePixmap(width: number, height: number, fill: [number, number, number] = [255, 0, 0]): RawPixmap {
  const data = new Uint8Array(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    data[i * 3]     = fill[0];
    data[i * 3 + 1] = fill[1];
    data[i * 3 + 2] = fill[2];
  }
  return { data, width, height };
}

describe('ICO encoder (BMP-in-ICO)', () => {
  it('starts with reserved=0, type=1 (ICO), count=1', () => {
    const buf = encodeIco(makePixmap(16, 16));
    expect(buf.readUInt16LE(0)).toBe(0); // reserved
    expect(buf.readUInt16LE(2)).toBe(1); // type: ICO
    expect(buf.readUInt16LE(4)).toBe(1); // count: 1
  });

  it('ICONDIRENTRY has correct width/height for small images', () => {
    const buf = encodeIco(makePixmap(32, 48));
    expect(buf[6]).toBe(32); // width
    expect(buf[7]).toBe(48); // height
  });

  it('stores 0 for dimensions ≥ 256', () => {
    const buf = encodeIco(makePixmap(256, 256));
    expect(buf[6]).toBe(0);
    expect(buf[7]).toBe(0);
  });

  it('ICONDIRENTRY imageOffset = 22', () => {
    const buf = encodeIco(makePixmap(16, 16));
    expect(buf.readUInt32LE(18)).toBe(22);
  });

  it('BITMAPINFOHEADER starts at offset 22 with biSize=40', () => {
    const buf = encodeIco(makePixmap(4, 4));
    expect(buf.readUInt32LE(22)).toBe(40); // biSize
  });

  it('BITMAPINFOHEADER has correct width and doubled height', () => {
    const buf = encodeIco(makePixmap(10, 20));
    expect(buf.readInt32LE(26)).toBe(10);  // biWidth
    expect(buf.readInt32LE(30)).toBe(40);  // biHeight = height * 2
  });

  it('biBitCount = 24 (24-bit BGR)', () => {
    const buf = encodeIco(makePixmap(4, 4));
    // BITMAPINFOHEADER at 22: biSize(4)+biWidth(4)+biHeight(4)+biPlanes(2) = 14 bytes before biBitCount
    expect(buf.readUInt16LE(36)).toBe(24);
  });

  it('pixel at top-left is stored last (bottom-up), with BGR order', () => {
    // Single row image: top-left pixel = image row 0
    // Bottom-up: row 0 (only row) is written last… for 1-row image it IS the first buffer row
    const buf = encodeIco(makePixmap(1, 1, [10, 20, 30]));
    // XOR data starts at offset 62 (22 ICONDIR+ENTRY + 40 BITMAPINFOHEADER)
    expect(buf[62]).toBe(30); // B (source R=10 → blue channel in BGR = source B)
    expect(buf[63]).toBe(20); // G
    expect(buf[64]).toBe(10); // R
  });

  it('total size matches header + XOR mask + AND mask', () => {
    const w = 5, h = 3;
    const xorPaddedRow  = (w * 3 + 3) & ~3;
    const andPaddedRow  = ((w + 31) >>> 5) << 2;
    const expected = 22 + 40 + xorPaddedRow * h + andPaddedRow * h;
    expect(encodeIco(makePixmap(w, h)).length).toBe(expected);
  });
});
