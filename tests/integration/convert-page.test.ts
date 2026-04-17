import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PdfConverter, InvalidPdfException, UnsupportedFormatException, PageOutOfRangeException } from '../../src/nodejs/index.js';

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

  it('throws PageOutOfRangeException for page 0', async () => {
    const converter = new PdfConverter();
    const pdf = loadSamplePdf();
    await expect(converter.convertPage(pdf, 0)).rejects.toThrow(PageOutOfRangeException);
  });

  it('throws PageOutOfRangeException for page out of range', async () => {
    const converter = new PdfConverter();
    const pdf = loadSamplePdf();
    await expect(converter.convertPage(pdf, 999)).rejects.toThrow(PageOutOfRangeException);
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

describe('PdfConverter — input validation', () => {
  const converter = new PdfConverter();

  it('throws InvalidPdfException for a non-PDF buffer passed to convertPage', async () => {
    const notAPdf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]); // JPEG magic bytes
    const err = await converter.convertPage(notAPdf, 1).catch(e => e);
    expect(err).toBeInstanceOf(InvalidPdfException);
    expect(err.name).toBe('InvalidPdfException');
    expect(err.errorCode).toBe('INVALID_PDF');
    expect(err.message).toMatch(/%PDF/);
  });

  it('throws InvalidPdfException for an empty buffer', async () => {
    const err = await converter.convertPage(Buffer.alloc(0), 1).catch(e => e);
    expect(err).toBeInstanceOf(InvalidPdfException);
    expect(err.errorCode).toBe('INVALID_PDF');
  });

  it('throws InvalidPdfException for a non-PDF buffer passed to convertAll', async () => {
    const notAPdf = Buffer.from('this is not a pdf');
    const err = await converter.convertAll(notAPdf).catch(e => e);
    expect(err).toBeInstanceOf(InvalidPdfException);
    expect(err.errorCode).toBe('INVALID_PDF');
  });

  it('throws InvalidPdfException for a non-PDF buffer passed to getPageCount', async () => {
    const notAPdf = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // PNG magic bytes
    const err = await converter.getPageCount(notAPdf).catch(e => e);
    expect(err).toBeInstanceOf(InvalidPdfException);
    expect(err.errorCode).toBe('INVALID_PDF');
  });

  it('throws UnsupportedFormatException for an unsupported image format', async () => {
    const pdf = loadSamplePdf();
    const err = await converter.convertPage(pdf, 1, { format: 'webp' }).catch(e => e);
    expect(err).toBeInstanceOf(UnsupportedFormatException);
    expect(err.name).toBe('UnsupportedFormatException');
    expect(err.errorCode).toBe('UNSUPPORTED_FORMAT');
    expect(err.message).toMatch(/Unsupported image format/);
  });

  it('throws UnsupportedFormatException for an unsupported format in convertAll', async () => {
    const pdf = loadSamplePdf();
    const err = await converter.convertAll(pdf, { format: 'tiff' }).catch(e => e);
    expect(err).toBeInstanceOf(UnsupportedFormatException);
    expect(err.errorCode).toBe('UNSUPPORTED_FORMAT');
  });
});
