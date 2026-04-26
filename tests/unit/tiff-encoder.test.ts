import { describe, it, expect } from 'vitest';
import { encodeTiff } from '../../src/encoders/tiff-encoder.js';
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

describe('TIFF encoder', () => {
  it('starts with little-endian byte-order marker and magic 42', () => {
    const buf = encodeTiff(makePixmap(4, 4));
    expect(buf[0]).toBe(0x49); // 'I'
    expect(buf[1]).toBe(0x49); // 'I'
    expect(buf.readUInt16LE(2)).toBe(42);
  });

  it('IFD offset points just after the 8-byte header', () => {
    const buf = encodeTiff(makePixmap(4, 4));
    expect(buf.readUInt32LE(4)).toBe(8);
  });

  it('encodes correct width and height in IFD entries', () => {
    const buf = encodeTiff(makePixmap(10, 20));
    // IFD at offset 8: 2-byte count, then entries sorted by tag
    // Entry 0: tag 256 (ImageWidth) at offset 10
    expect(buf.readUInt16LE(10)).toBe(256); // tag
    expect(buf.readUInt32LE(18)).toBe(10);  // value = width
    // Entry 1: tag 257 (ImageLength) at offset 22
    expect(buf.readUInt16LE(22)).toBe(257);
    expect(buf.readUInt32LE(30)).toBe(20);  // value = height
  });

  it('has PhotometricInterpretation = 2 (RGB)', () => {
    const buf = encodeTiff(makePixmap(2, 2));
    // Entry 4: tag 262 at offset 10 + 4*12 = 58
    expect(buf.readUInt16LE(58)).toBe(262);
    expect(buf.readUInt32LE(66)).toBe(2);
  });

  it('has Compression = 1 (none)', () => {
    const buf = encodeTiff(makePixmap(2, 2));
    // Entry 3: tag 259 at offset 10 + 3*12 = 46
    expect(buf.readUInt16LE(46)).toBe(259);
    expect(buf.readUInt32LE(54)).toBe(1);
  });

  it('pixel data matches source RGB bytes', () => {
    const pixmap = makePixmap(2, 1, [10, 20, 30]);
    const buf = encodeTiff(pixmap);
    // PIXEL_DATA_OFFSET = 8 + (2 + 9*12 + 4) + 6 = 128
    const pixOffset = 128;
    expect(buf[pixOffset]).toBe(10);
    expect(buf[pixOffset + 1]).toBe(20);
    expect(buf[pixOffset + 2]).toBe(30);
    expect(buf[pixOffset + 3]).toBe(10);
    expect(buf[pixOffset + 4]).toBe(20);
    expect(buf[pixOffset + 5]).toBe(30);
  });

  it('total size = header + IFD + extra + pixel data', () => {
    const w = 3, h = 5;
    const buf = encodeTiff(makePixmap(w, h));
    expect(buf.length).toBe(128 + w * h * 3);
  });
});
