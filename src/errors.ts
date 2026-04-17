/**
 * Machine-readable error codes for all errors thrown by pdf-image-converter.
 * Useful for programmatic handling without relying on `instanceof` or message strings.
 *
 * @example
 * ```ts
 * } catch (err) {
 *   switch ((err as any).errorCode) {
 *     case 'INVALID_PDF':       // non-PDF or corrupt file
 *     case 'UNSUPPORTED_FORMAT': // image format not recognised
 *     case 'PAGE_OUT_OF_RANGE': // page number < 1 or > total pages
 *   }
 * }
 * ```
 */
export type ErrorCode =
  | 'INVALID_PDF'
  | 'UNSUPPORTED_FORMAT'
  | 'PAGE_OUT_OF_RANGE';

/**
 * Thrown when the supplied buffer is not a valid PDF file.
 *
 * Causes: empty buffer, buffer too small, missing `%PDF` magic bytes.
 *
 * `errorCode`: `'INVALID_PDF'`
 */
export class InvalidPdfException extends Error {
  override name = 'InvalidPdfException';
  readonly errorCode: ErrorCode = 'INVALID_PDF';

  constructor(message: string) {
    super(message);
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/**
 * Thrown when the requested image output format is not supported.
 *
 * `errorCode`: `'UNSUPPORTED_FORMAT'`
 */
export class UnsupportedFormatException extends Error {
  override name = 'UnsupportedFormatException';
  readonly errorCode: ErrorCode = 'UNSUPPORTED_FORMAT';

  constructor(message: string) {
    super(message);
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/**
 * Thrown when a page number is out of the valid range for the document.
 *
 * Causes: page < 1 (1-indexed API), or page > total pages in the document.
 *
 * `errorCode`: `'PAGE_OUT_OF_RANGE'`
 */
export class PageOutOfRangeException extends Error {
  override name = 'PageOutOfRangeException';
  readonly errorCode: ErrorCode = 'PAGE_OUT_OF_RANGE';

  constructor(message: string) {
    super(message);
    Error.captureStackTrace?.(this, this.constructor);
  }
}
