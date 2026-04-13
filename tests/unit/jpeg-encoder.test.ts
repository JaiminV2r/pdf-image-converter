import { describe, it, expect } from 'vitest';
import { encodeJpeg } from '../../src/encoders/jpeg-encoder.js';
import type { RawPixmap } from '../../src/types/index.js';

function makePixmap(width: number, height: number, fill: [number, number, number] = [200, 100, 50]): RawPixmap {
  const data = new Uint8Array(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    data[i * 3]     = fill[0];
    data[i * 3 + 1] = fill[1];
    data[i * 3 + 2] = fill[2];
  }
  return { data, width, height };
}

describe('JPEG encoder', () => {
  it('starts with JPEG SOI marker (0xFF 0xD8)', () => {
    const buf = encodeJpeg(makePixmap(8, 8));
    expect(buf[0]).toBe(0xff);
    expect(buf[1]).toBe(0xd8);
  });

  it('contains JFIF APP0 marker (0xFF 0xE0)', () => {
    const buf = encodeJpeg(makePixmap(8, 8));
    expect(buf[2]).toBe(0xff);
    expect(buf[3]).toBe(0xe0);
  });

  it('ends with JPEG EOI marker (0xFF 0xD9)', () => {
    const buf = encodeJpeg(makePixmap(8, 8));
    expect(buf[buf.length - 2]).toBe(0xff);
    expect(buf[buf.length - 1]).toBe(0xd9);
  });

  it('produces a non-empty buffer for 8x8', () => {
    const buf = encodeJpeg(makePixmap(8, 8));
    expect(buf.length).toBeGreaterThan(100);
  });

  it('produces a larger buffer for higher quality', () => {
    const low  = encodeJpeg(makePixmap(16, 16), 10);
    const high = encodeJpeg(makePixmap(16, 16), 95);
    expect(high.length).toBeGreaterThanOrEqual(low.length);
  });

  it('handles non-multiple-of-8 dimensions', () => {
    const buf = encodeJpeg(makePixmap(10, 15));
    expect(buf[0]).toBe(0xff);
    expect(buf[1]).toBe(0xd8);
    expect(buf[buf.length - 2]).toBe(0xff);
    expect(buf[buf.length - 1]).toBe(0xd9);
  });
});
