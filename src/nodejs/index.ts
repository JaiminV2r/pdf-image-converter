import { renderPage, getPageCount } from '../core/pdf-renderer.js';
import { encodePixmap, supportedFormats } from '../encoders/encoder-factory.js';
import type {
  ConvertOptions,
  ConversionResult,
  ImageFormat,
  PdfImageModuleOptions,
} from '../types/index.js';

export type {
  ConvertOptions,
  ConversionResult,
  ImageFormat,
  PdfImageModuleOptions,
  PdfImageModuleAsyncOptions,
} from '../types/index.js';

export { supportedFormats } from '../encoders/encoder-factory.js';

/**
 * Converts PDF pages to images.
 *
 * Works in any Node.js environment, including NestJS — no framework setup required.
 * The NestJS DI integration (`pdf-image-converter/nestjs`) is an optional convenience layer.
 *
 * Pass default `ConvertOptions` to the constructor to apply them to every call.
 * Individual method calls can override these defaults via their own `options` argument.
 *
 * @example Basic usage
 * ```ts
 * import { PdfConverter } from 'pdf-image-converter';
 * import fs from 'fs';
 *
 * const converter = new PdfConverter({ dpi: 150 });
 * const pdfBuffer = fs.readFileSync('document.pdf');
 *
 * // Convert page 1 to PNG
 * const result = await converter.convertPage(pdfBuffer, 1, { format: 'png' });
 * console.log(result.width, result.height, result.size, result.format);
 * fs.writeFileSync('page1.png', result.buffer);
 *
 * // Convert all pages to JPEG
 * const pages = await converter.convertAll(pdfBuffer, { format: 'jpeg', quality: 85 });
 * ```
 */
export class PdfConverter {
  private readonly defaults: { format: ImageFormat; dpi: number; quality?: number };

  constructor(defaults: ConvertOptions = {}) {
    this.defaults = {
      format: defaults.format ?? 'png',
      dpi:    defaults.dpi    ?? 150,
      ...(defaults.quality !== undefined && { quality: defaults.quality }),
    };
  }

  /**
   * Convert a single PDF page to an image.
   *
   * Page numbers are **1-indexed** (i.e. the first page is `1`, not `0`).
   * Throws a `RangeError` if `page` is less than 1.
   * Throws if `page` exceeds the total number of pages in the document.
   *
   * @param pdf     Raw PDF file contents as a `Buffer` (e.g. from `fs.readFileSync`)
   * @param page    1-indexed page number to convert
   * @param options Override the instance-level defaults for this call only
   *                (e.g. `{ format: 'jpeg', quality: 90, dpi: 200 }`)
   * @returns A `ConversionResult` containing the encoded image `buffer`, the
   *          actual `size` in bytes, the output `format`, `width` and `height`
   *          in pixels, and the original `page` number.
   *
   * @example
   * ```ts
   * const result = await converter.convertPage(pdfBuffer, 1, { format: 'png', dpi: 300 });
   * fs.writeFileSync('page1.png', result.buffer);
   * ```
   */
  async convertPage(
    pdf: Buffer,
    page: number,
    options: ConvertOptions = {}
  ): Promise<ConversionResult> {
    if (page < 1) {
      throw new RangeError(`Page number must be >= 1, got ${page}.`);
    }
    const opts = { ...this.defaults, ...options };
    const pixmap = await renderPage(pdf, page - 1, opts.dpi); // convert to 0-indexed
    const { buffer, format } = await encodePixmap(pixmap, opts);
    return { buffer, size: buffer.length, page, width: pixmap.width, height: pixmap.height, format };
  }

  /**
   * Convert all pages of a PDF to images.
   *
   * Pages are processed sequentially and returned in page order.
   * For large documents consider using `convertPages` to process a subset at a time.
   *
   * @param pdf     Raw PDF file contents as a `Buffer`
   * @param options Override the instance-level defaults for this call only
   * @returns An array of `ConversionResult` objects, one per page, in ascending page order.
   *
   * @example
   * ```ts
   * const results = await converter.convertAll(pdfBuffer, { format: 'jpeg', quality: 85 });
   * results.forEach(r => fs.writeFileSync(`page${r.page}.jpg`, r.buffer));
   * ```
   */
  async convertAll(pdf: Buffer, options: ConvertOptions = {}): Promise<ConversionResult[]> {
    const total = await getPageCount(pdf);
    const pages = Array.from({ length: total }, (_, i) => i + 1);
    return this.convertPages(pdf, pages, options);
  }

  /**
   * Convert a specific set of pages to images.
   *
   * Useful when you only need a subset of pages (e.g. a cover page and a summary).
   * Results are returned in the same order as the `pages` array, not necessarily
   * ascending document order.
   * Pages are processed sequentially to avoid memory pressure on the WASM heap.
   *
   * @param pdf     Raw PDF file contents as a `Buffer`
   * @param pages   Array of 1-indexed page numbers to convert (e.g. `[1, 3, 5]`)
   * @param options Override the instance-level defaults for this call only
   * @returns An array of `ConversionResult` objects in the same order as `pages`.
   *
   * @example
   * ```ts
   * // Convert only the first and last page
   * const count = await converter.getPageCount(pdfBuffer);
   * const results = await converter.convertPages(pdfBuffer, [1, count], { format: 'png' });
   * ```
   */
  async convertPages(
    pdf: Buffer,
    pages: number[],
    options: ConvertOptions = {}
  ): Promise<ConversionResult[]> {
    // Pages are processed sequentially to avoid thrashing the WASM heap
    const results: ConversionResult[] = [];
    for (const page of pages) {
      results.push(await this.convertPage(pdf, page, options));
    }
    return results;
  }

  /**
   * Get the total number of pages in a PDF.
   *
   * Useful for iterating over pages or validating a page number before calling
   * `convertPage`. Parsing is lightweight — the full document is not rendered.
   *
   * @param pdf Raw PDF file contents as a `Buffer`
   * @returns The total page count as a positive integer.
   *
   * @example
   * ```ts
   * const total = await converter.getPageCount(pdfBuffer);
   * console.log(`Document has ${total} page(s).`);
   * ```
   */
  async getPageCount(pdf: Buffer): Promise<number> {
    return getPageCount(pdf);
  }

  /**
   * Returns the list of image format names that can be used in `ConvertOptions.format`.
   *
   * Includes both built-in formats (e.g. `'png'`, `'jpeg'`, `'webp'`) and any
   * custom formats registered at runtime via the encoder registry.
   * Call this to validate a user-supplied format string before passing it to a
   * convert method.
   *
   * @returns An array of lowercase format name strings (e.g. `['png', 'jpeg', 'webp']`).
   *
   * @example
   * ```ts
   * const formats = converter.supportedFormats();
   * if (!formats.includes(userFormat)) {
   *   throw new Error(`Unsupported format: ${userFormat}. Use one of: ${formats.join(', ')}`);
   * }
   * ```
   */
  supportedFormats(): string[] {
    return supportedFormats();
  }
}

/**
 * A pre-built `PdfConverter` instance using library defaults (`dpi: 150`, `format: 'png'`).
 * Import and use directly for one-off conversions without instantiating your own converter.
 *
 * @example
 * ```ts
 * import { pdfConverter } from 'pdf-image-converter';
 * const result = await pdfConverter.convertPage(pdfBuffer, 1);
 * ```
 */
export const pdfConverter = new PdfConverter();
