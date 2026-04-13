import { Injectable, Inject } from '@nestjs/common';
import { PdfConverter } from '../nodejs/index.js';
import { PDF_IMAGE_OPTIONS } from './pdf-image.constants.js';
import type { ConvertOptions, ConversionResult, PdfImageModuleOptions } from '../types/index.js';

/**
 * NestJS-injectable wrapper around `PdfConverter`.
 *
 * Inject this service after importing `PdfImageModule` in your module.
 * It exposes the same API as `PdfConverter`.
 */
@Injectable()
export class PdfImageService {
  private readonly converter: PdfConverter;

  constructor(
    @Inject(PDF_IMAGE_OPTIONS) options: PdfImageModuleOptions
  ) {
    const defaults: ConvertOptions = {};
    if (options.defaultDpi     !== undefined) defaults.dpi     = options.defaultDpi;
    if (options.defaultFormat  !== undefined) defaults.format  = options.defaultFormat;
    if (options.defaultQuality !== undefined) defaults.quality = options.defaultQuality;
    this.converter = new PdfConverter(defaults);
  }

  /** Convert a single page (1-indexed) to an image. */
  convertPage(pdf: Buffer, page: number, options?: ConvertOptions): Promise<ConversionResult> {
    return this.converter.convertPage(pdf, page, options);
  }

  /** Convert all pages to images. */
  convertAll(pdf: Buffer, options?: ConvertOptions): Promise<ConversionResult[]> {
    return this.converter.convertAll(pdf, options);
  }

  /** Convert specific pages (1-indexed) to images. */
  convertPages(pdf: Buffer, pages: number[], options?: ConvertOptions): Promise<ConversionResult[]> {
    return this.converter.convertPages(pdf, pages, options);
  }

  /** Get total page count of a PDF. */
  getPageCount(pdf: Buffer): Promise<number> {
    return this.converter.getPageCount(pdf);
  }
}
