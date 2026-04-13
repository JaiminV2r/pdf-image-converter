import { loadMuPdf } from './wasm-loader.js';
import type { RawPixmap } from '../types/index.js';

const DEFAULT_DPI = 150;

/**
 * Renders a single PDF page to raw RGB pixel data.
 *
 * @param pdfData  Raw PDF file bytes
 * @param pageIndex  0-indexed page number
 * @param dpi  Output resolution (default 150)
 */
export async function renderPage(
  pdfData: Buffer | Uint8Array,
  pageIndex: number,
  dpi: number = DEFAULT_DPI
): Promise<RawPixmap> {
  const mupdf = await loadMuPdf();

  const doc = mupdf.Document.openDocument(pdfData, 'application/pdf');

  try {
    const totalPages: number = doc.countPages();

    if (pageIndex < 0 || pageIndex >= totalPages) {
      throw new RangeError(
        `Page index ${pageIndex} is out of range. ` +
        `Document has ${totalPages} page(s) (0-indexed).`
      );
    }

    const page = doc.loadPage(pageIndex);

    try {
      // PDF default unit is 1/72 inch; scale to the requested DPI
      const scale = dpi / 72;
      const matrix = mupdf.Matrix.scale(scale, scale);
      const colorspace = mupdf.ColorSpace.DeviceRGB;

      const pixmap = page.toPixmap(matrix, colorspace, false /* no alpha */);

      try {
        const width: number = pixmap.getWidth();
        const height: number = pixmap.getHeight();
        const stride: number = pixmap.getStride();

        // getPixels() returns a Uint8ClampedArray VIEW into WASM heap memory.
        // We must copy it out BEFORE calling pixmap.destroy(), otherwise the
        // data will point to freed memory.
        const rawPixels = pixmap.getPixels();

        // Build a compact width*3 per row buffer (stride may include padding)
        const bytesPerPixel = 3; // RGB, no alpha
        const rowBytes = width * bytesPerPixel;
        let pixelData: Uint8Array;

        if (stride === rowBytes) {
          // No padding — copy entire block at once
          pixelData = new Uint8Array(rawPixels.buffer, rawPixels.byteOffset, width * height * bytesPerPixel);
          pixelData = Uint8Array.from(pixelData); // copy out of WASM heap
        } else {
          // Has row padding — copy row by row
          pixelData = new Uint8Array(rowBytes * height);
          for (let y = 0; y < height; y++) {
            const srcStart = y * stride;
            const destStart = y * rowBytes;
            pixelData.set(rawPixels.subarray(srcStart, srcStart + rowBytes), destStart);
          }
        }

        return { data: pixelData, width, height };
      } finally {
        pixmap.destroy();
      }
    } finally {
      page.destroy();
    }
  } finally {
    doc.destroy();
  }
}

/**
 * Returns the total number of pages in a PDF.
 */
export async function getPageCount(pdfData: Buffer | Uint8Array): Promise<number> {
  const mupdf = await loadMuPdf();
  const doc = mupdf.Document.openDocument(pdfData, 'application/pdf');
  try {
    return doc.countPages() as number;
  } finally {
    doc.destroy();
  }
}
