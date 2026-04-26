import { describe, it, expect } from 'vitest';
import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { PdfImageModule } from '../../src/nestjs/pdf-image.module.js';
import { PdfImageService } from '../../src/nestjs/pdf-image.service.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SAMPLE_PDF = path.join(__dirname, '../fixtures/sample.pdf');

describe('PdfImageModule', () => {
  it('creates PdfImageService via forRoot', async () => {
    const module = await Test.createTestingModule({
      imports: [PdfImageModule.forRoot({ defaultDpi: 72 })],
    }).compile();

    const service = module.get(PdfImageService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(PdfImageService);
    await module.close();
  });

  it('PdfImageService.convertPage returns a valid result', async () => {
    const module = await Test.createTestingModule({
      imports: [PdfImageModule.forRoot({ defaultDpi: 72, defaultFormat: 'png' })],
    }).compile();

    const service = module.get(PdfImageService);
    const pdf = fs.readFileSync(SAMPLE_PDF);
    const result = await service.convertPage(pdf, 1);

    expect(result.page).toBe(1);
    expect(result.format).toBe('png');
    expect(result.width).toBeGreaterThan(0);
    expect(result.buffer[0]).toBe(137); // PNG sig
    await module.close();
  });

  it('creates PdfImageService via forRootAsync', async () => {
    const module = await Test.createTestingModule({
      imports: [
        PdfImageModule.forRootAsync({
          useFactory: () => ({ defaultDpi: 96, defaultFormat: 'bmp' }),
        }),
      ],
    }).compile();

    const service = module.get(PdfImageService);
    expect(service).toBeDefined();
    await module.close();
  });
});
