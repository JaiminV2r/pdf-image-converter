import {
  Injectable,
  Inject,
  BadRequestException,
  InternalServerErrorException,
  HttpStatus,
} from '@nestjs/common';
import { PdfConverter } from '../nodejs/index.js';
import { PDF_IMAGE_OPTIONS } from './pdf-image.constants.js';
import type { ConvertOptions, ConversionResult, PdfImageModuleOptions } from '../types/index.js';
import type { ErrorCode } from '../errors.js';

const PDF_ERROR_CODES = new Set<string>([
  'INVALID_PDF',
  'UNSUPPORTED_FORMAT',
  'PAGE_OUT_OF_RANGE',
]);

/**
 * NestJS-injectable wrapper around `PdfConverter`.
 *
 * Inject this service after importing `PdfImageModule` in your module.
 * It exposes the same API as `PdfConverter`.
 *
 * Errors thrown by the converter are automatically caught and re-thrown as
 * NestJS HTTP exceptions so controllers always receive a properly shaped
 * `BadRequestException` (400) or `InternalServerErrorException` (500).
 * No additional filter or interceptor registration is required.
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
    return this.handleErrors(() => this.converter.convertPage(pdf, page, options));
  }

  /** Convert all pages to images. */
  convertAll(pdf: Buffer, options?: ConvertOptions): Promise<ConversionResult[]> {
    return this.handleErrors(() => this.converter.convertAll(pdf, options));
  }

  /** Convert specific pages (1-indexed) to images. */
  convertPages(pdf: Buffer, pages: number[], options?: ConvertOptions): Promise<ConversionResult[]> {
    return this.handleErrors(() => this.converter.convertPages(pdf, pages, options));
  }

  /** Get total page count of a PDF. */
  getPageCount(pdf: Buffer): Promise<number> {
    return this.handleErrors(() => this.converter.getPageCount(pdf));
  }

  private async handleErrors<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      // Pure duck-type check — no instanceof on custom classes, so it works
      // regardless of how the package is bundled or loaded.
      if (err && typeof err === 'object') {
        const code = (err as Record<string, unknown>).errorCode;
        if (typeof code === 'string' && PDF_ERROR_CODES.has(code)) {
          throw new BadRequestException({
            statusCode: HttpStatus.BAD_REQUEST,
            error: 'Bad Request',
            message: (err as Error).message,
            errorCode: code as ErrorCode,
          });
        }
      }
      throw new InternalServerErrorException(
        'An unexpected error occurred while processing the PDF.'
      );
    }
  }
}
