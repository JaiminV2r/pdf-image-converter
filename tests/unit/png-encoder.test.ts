import { describe, it, expect } from 'vitest';
import { encodePng } from '../../src/encoders/png-encoder.js';
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

describe('PNG encoder', () => {
  it('starts with PNG signature', () => {
    const buf = encodePng(makePixmap(4, 4));
    expect(buf[0]).toBe(137);
    expect(buf[1]).toBe(80);  // P
    expect(buf[2]).toBe(78);  // N
    expect(buf[3]).toBe(71);  // G
    expect(buf[4]).toBe(13);
    expect(buf[5]).toBe(10);
    expect(buf[6]).toBe(26);
    expect(buf[7]).toBe(10);
  });

  it('encodes IHDR with correct width and height', () => {
    const buf = encodePng(makePixmap(10, 20));
    // IHDR starts at offset 16 (8 sig + 4 length + 4 type)
    const ihdrDataOffset = 8 + 4 + 4;
    const w = buf.readUInt32BE(ihdrDataOffset);
    const h = buf.readUInt32BE(ihdrDataOffset + 4);
    expect(w).toBe(10);
    expect(h).toBe(20);
  });

  it('has color type 2 (RGB truecolor) in IHDR', () => {
    const buf = encodePng(makePixmap(4, 4));
    const ihdrDataOffset = 8 + 4 + 4;
    expect(buf[ihdrDataOffset + 8]).toBe(8);  // bit depth
    expect(buf[ihdrDataOffset + 9]).toBe(2);  // color type RGB
  });

  it('ends with IEND chunk', () => {
    const buf = encodePng(makePixmap(2, 2));
    // Last 12 bytes: 4 length (0) + 4 type (IEND) + 4 crc
    const iendType = buf.slice(buf.length - 8, buf.length - 4).toString('ascii');
    expect(iendType).toBe('IEND');
  });

  it('produces a non-empty buffer', () => {
    const buf = encodePng(makePixmap(1, 1));
    expect(buf.length).toBeGreaterThan(20);
  });

  it('handles 1x1 pixel', () => {
    const buf = encodePng(makePixmap(1, 1, [128, 64, 32]));
    expect(buf[0]).toBe(137); // PNG sig
  });
});
