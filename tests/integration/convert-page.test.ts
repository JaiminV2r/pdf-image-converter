import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PdfConverter } from '../../src/nodejs/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SAMPLE_PDF = path.join(__dirname, '../fixtures/sample.pdf');

function loadSamplePdf(): Buffer {
  return fs.readFileSync(SAMPLE_PDF);
}

describe('PdfConverter — convertPage', () => {
  it('converts page 1 to PNG', async () => {
    const converter = new PdfConverter();
    const pdf = loadSamplePdf();
    const result = await converter.convertPage(pdf, 1, { format: 'png' });

    expect(result.page).toBe(1);
    expect(result.format).toBe('png');
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
    expect(result.buffer).toBeInstanceOf(Buffer);
    // Verify PNG signature
    expect(result.buffer[0]).toBe(137);
    expect(result.buffer[1]).toBe(80); // P
    expect(result.buffer[2]).toBe(78); // N
    expect(result.buffer[3]).toBe(71); // G
  });

  it('converts page 1 to JPEG', async () => {
    const converter = new PdfConverter();
    const pdf = loadSamplePdf();
    const result = await converter.convertPage(pdf, 1, { format: 'jpeg', quality: 80 });

    expect(result.format).toBe('jpeg');
    expect(result.buffer[0]).toBe(0xff);
    expect(result.buffer[1]).toBe(0xd8);
    expect(result.buffer[result.buffer.length - 2]).toBe(0xff);
    expect(result.buffer[result.buffer.length - 1]).toBe(0xd9);
  });

  it('converts page 1 to BMP', async () => {
    const converter = new PdfConverter();
    const pdf = loadSamplePdf();
    const result = await converter.convertPage(pdf, 1, { format: 'bmp' });

    expect(result.format).toBe('bmp');
    expect(result.buffer[0]).toBe(0x42); // B
    expect(result.buffer[1]).toBe(0x4d); // M
  });

  it('converts page 1 to PPM', async () => {
    const converter = new PdfConverter();
    const pdf = loadSamplePdf();
    const result = await converter.convertPage(pdf, 1, { format: 'ppm' });

    expect(result.format).toBe('ppm');
    expect(result.buffer.toString('ascii', 0, 2)).toBe('P6');
  });

  it('throws RangeError for page 0', async () => {
    const converter = new PdfConverter();
    const pdf = loadSamplePdf();
    await expect(converter.convertPage(pdf, 0)).rejects.toThrow(RangeError);
  });

  it('throws for page out of range', async () => {
    const converter = new PdfConverter();
    const pdf = loadSamplePdf();
    await expect(converter.convertPage(pdf, 999)).rejects.toThrow();
  });

  it('respects DPI setting', async () => {
    const converter = new PdfConverter();
    const pdf = loadSamplePdf();
    const low  = await converter.convertPage(pdf, 1, { dpi: 72 });
    const high = await converter.convertPage(pdf, 1, { dpi: 144 });
    // Higher DPI should produce larger image
    expect(high.width).toBeGreaterThan(low.width);
    expect(high.height).toBeGreaterThan(low.height);
  });
});

describe('PdfConverter — convertAll', () => {
  it('returns an array with one result for a single-page PDF', async () => {
    const converter = new PdfConverter();
    const pdf = loadSamplePdf();
    const results = await converter.convertAll(pdf, { format: 'png' });

    expect(results).toHaveLength(1);
    expect(results[0]?.page).toBe(1);
  });
});

describe('PdfConverter — convertPages', () => {
  it('converts only specified pages', async () => {
    const converter = new PdfConverter();
    const pdf = loadSamplePdf();
    const results = await converter.convertPages(pdf, [1], { format: 'png' });

    expect(results).toHaveLength(1);
    expect(results[0]?.page).toBe(1);
  });
});

describe('PdfConverter — getPageCount', () => {
  it('returns 1 for single-page PDF', async () => {
    const converter = new PdfConverter();
    const pdf = loadSamplePdf();
    expect(await converter.getPageCount(pdf)).toBe(1);
  });
});

describe('PdfConverter — constructor defaults', () => {
  it('uses constructor defaults when no options passed to convertPage', async () => {
    const converter = new PdfConverter({ format: 'bmp', dpi: 72 });
    const pdf = loadSamplePdf();
    const result = await converter.convertPage(pdf, 1);
    expect(result.format).toBe('bmp');
  });
});
