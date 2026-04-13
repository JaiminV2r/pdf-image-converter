export type BuiltinFormat = 'png' | 'jpeg' | 'bmp' | 'ppm';
export type ImageFormat = BuiltinFormat | string; // extensible for custom encoders

export interface ConvertOptions {
  /** Output image format. Default: 'png' */
  format?: ImageFormat;
  /** Rendering resolution in DPI. Default: 150 */
  dpi?: number;
  /**
   * Encoding quality, 1–100.
   * - JPEG: controls lossy compression (100 = highest quality, largest file).
   * - PNG:  controls zlib compression level (100 = least compressed, largest file — always lossless).
   * - BMP / PPM: ignored (uncompressed formats).
   * If omitted, each encoder uses its best-quality default.
   */
  quality?: number;
}

export interface ConversionResult {
  buffer: Buffer;
  size: number;   // size in bytes
  page: number;   // 1-indexed
  width: number;
  height: number;
  format: ImageFormat;
}

/** Raw RGB pixel data produced by the PDF renderer */
export interface RawPixmap {
  data: Uint8Array; // RGB bytes, 3 bytes per pixel (no alpha)
  width: number;
  height: number;
}

/** Interface for pluggable image encoders */
export interface ImageEncoder {
  encode(pixmap: RawPixmap, options: ConvertOptions): Buffer | Promise<Buffer>;
}

export interface PdfImageModuleOptions {
  defaultDpi?: number;
  defaultFormat?: ImageFormat;
  defaultQuality?: number;
}

export interface PdfImageModuleAsyncOptions {
  useFactory: (...args: unknown[]) => Promise<PdfImageModuleOptions> | PdfImageModuleOptions;
  inject?: unknown[];
  imports?: unknown[];
}
