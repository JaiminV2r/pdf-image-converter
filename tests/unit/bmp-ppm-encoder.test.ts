import { describe, it, expect } from 'vitest';
import { encodeBmp } from '../../src/encoders/bmp-encoder.js';
import { encodePpm } from '../../src/encoders/ppm-encoder.js';
import type { RawPixmap } from '../../src/types/index.js';

function makePixmap(width: number, height: number): RawPixmap {
  const data = new Uint8Array(width * height * 3).fill(128);
  return { data, width, height };
}

describe('BMP encoder', () => {
  it('starts with BM signature', () => {
    const buf = encodeBmp(makePixmap(4, 4));
    expect(buf[0]).toBe(0x42); // B
    expect(buf[1]).toBe(0x4d); // M
  });

  it('writes correct file size', () => {
    const pm = makePixmap(4, 4);
    const buf = encodeBmp(pm);
    const fileSize = buf.readUInt32LE(2);
    expect(fileSize).toBe(buf.length);
  });

  it('writes correct dimensions in header', () => {
    const buf = encodeBmp(makePixmap(10, 20));
    const w = buf.readInt32LE(18);
    const h = buf.readInt32LE(22);
    expect(w).toBe(10);
    expect(Math.abs(h)).toBe(20);
  });

  it('has 24 bits per pixel', () => {
    const buf = encodeBmp(makePixmap(4, 4));
    expect(buf.readUInt16LE(28)).toBe(24);
  });
});

describe('PPM encoder', () => {
  it('starts with P6 header', () => {
    const buf = encodePpm(makePixmap(8, 8));
    expect(buf.toString('ascii', 0, 2)).toBe('P6');
  });

  it('includes correct dimensions in header', () => {
    const buf = encodePpm(makePixmap(10, 20));
    const header = buf.toString('ascii', 0, 20);
    expect(header).toContain('10 20');
  });

  it('includes maxval 255', () => {
    const buf = encodePpm(makePixmap(4, 4));
    const header = buf.toString('ascii', 0, 30);
    expect(header).toContain('255');
  });
});
