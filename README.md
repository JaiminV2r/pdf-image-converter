# pdf-image-converter

Convert PDF pages to images with ease. A lightweight, zero-dependency Node.js library that also provides seamless NestJS integration.

[![npm version](https://img.shields.io/npm/v/pdf-image-converter.svg)](https://www.npmjs.com/package/pdf-image-converter)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- ⚡ **Lightning Fast**: Lightweight WASM renderer.
- 📦 **Zero Runtime Dependencies**: No need for GraphicsMagick, ImageMagick, or Ghostscript.
- 🧩 **Flexible**: Supports PNG, JPEG, BMP, and PPM formats.
- 🦅 **NestJS Ready**: Includes a dedicated module and service for NestJS dependency injection.
- 🎨 **Customisable**: Control DPI (resolution), quality, and page selection.
- 💠 **Strictly Typed**: Written in TypeScript with full type definitions.

---

## Installation

```bash
npm install pdf-image-converter
```

---

## Basic Usage (Node.js)

You can use the library in any Node.js project using the `PdfConverter` class or the pre-instantiated `pdfConverter` object.

```typescript
import { pdfConverter } from 'pdf-image-converter';
import fs from 'node:fs/promises';

async function convert() {
  const pdfBuffer = await fs.readFile('document.pdf');
  
  // Convert the first page to PNG
  const result = await pdfConverter.convertPage(pdfBuffer, 1, {
    format: 'png',
    dpi: 300
  });

  console.log(`Page 1 converted: ${result.width}x${result.height}`);
  await fs.writeFile('page1.png', result.buffer);
}
```

### Advanced Page Conversion

```typescript
import { PdfConverter } from 'pdf-image-converter';

const converter = new PdfConverter({ dpi: 200, format: 'jpeg' });

async function convertAll(pdfBuffer: Buffer) {
  // Convert all pages
  const pages = await converter.convertAll(pdfBuffer, { quality: 85 });
  
  for (const page of pages) {
    console.log(`Converted page ${page.page}`);
  }
}

async function convertSpecific(pdfBuffer: Buffer) {
  // Convert only pages 1, 3, and 5
  const results = await converter.convertPages(pdfBuffer, [1, 3, 5]);
}
```

---

## NestJS Integration

The package exports a dedicated NestJS module for easy integration into your dependency injection tree.

### 1. Import the Module

```typescript
import { Module } from '@nestjs/common';
import { PdfImageModule } from 'pdf-image-converter/nestjs';

@Module({
  imports: [
    PdfImageModule.forRoot({
      defaultDpi: 150,
      defaultFormat: 'png',
    }),
  ],
})
export class AppModule {}
```

### 2. Inject the Service

```typescript
import { Injectable } from '@nestjs/common';
import { PdfImageService } from 'pdf-image-converter/nestjs';

@Injectable()
export class AppService {
  constructor(private readonly pdfService: PdfImageService) {}

  async processPdf(pdfBuffer: Buffer) {
    const totalPages = await this.pdfService.getPageCount(pdfBuffer);
    const results = await this.pdfService.convertAll(pdfBuffer);
    return results;
  }
}
```

### Async Configuration (Optional)

Use `forRootAsync` to load configuration from your `ConfigService`.

```typescript
PdfImageModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    defaultDpi: config.get('PDF_CONVERTER_DPI'),
  }),
})
```

---

## API Reference

### `PdfConverter` (Class)

- `convertPage(pdf: Buffer, page: number, options?: ConvertOptions): Promise<ConversionResult>`
  - `page`: 1-indexed page number.
- `convertAll(pdf: Buffer, options?: ConvertOptions): Promise<ConversionResult[]>`
- `convertPages(pdf: Buffer, pages: number[], options?: ConvertOptions): Promise<ConversionResult[]>`
- `getPageCount(pdf: Buffer): Promise<number>`
- `supportedFormats(): string[]`

### `ConvertOptions` (Interface)

- `format`: One of `'png'`, `'jpeg'`, `'bmp'`, `'ppm'`. (Default: `'png'`)
- `dpi`: Dots per inch, controls resolution. (Default: `150`)
- `quality`: 1-100. Controls compression (JPEG) or zlib level (PNG).

### `ConversionResult` (Interface)

- `buffer`: The encoded image `Buffer`.
- `size`: The size of the image in bytes.
- `page`: The 1-indexed page number.
- `width`: Image width in pixels.
- `height`: Image height in pixels.
- `format`: Output format used.

---

## License

MIT © 2026
