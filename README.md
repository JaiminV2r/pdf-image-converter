# pdf-image-converter

🚀 Convert PDF pages to images in Node.js — fast, lightweight, and zero dependencies.

[![npm version](https://img.shields.io/npm/v/pdf-image-converter.svg)](https://www.npmjs.com/package/pdf-image-converter)
[![Downloads](https://img.shields.io/npm/dm/pdf-image-converter)](https://www.npmjs.com/package/pdf-image-converter)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## ✨ Why pdf-image-converter?

Stop dealing with heavy tools like ImageMagick or Ghostscript.

**pdf-image-converter** is a modern, zero-dependency solution built for speed, simplicity, and production use.

✔ No native installs

✔ Works out of the box

✔ Built with TypeScript

✔ Perfect for APIs, microservices, and NestJS apps

---

## 🆕 What's New

- 💻 **Powerful CLI** — Convert PDFs directly from your terminal using `npx pdf-image-converter`

---

## ⚡ Features

- ⚡ **Blazing Fast** — Powered by WASM for high performance
- 📦 **Zero Dependencies** — No external binaries required
- 💻 **Powerful CLI** — Convert PDFs directly from your terminal
- 🖼 **Multiple Formats Supported**:
  - PNG
  - JPEG
  - BMP
  - PPM
  - ICO
  - TIFF

- 🧩 **Flexible API** — Convert single, multiple, or all pages
- 🦅 **NestJS Ready** — First-class integration
- 🎨 **Customisable Output** — DPI, quality, and page selection
- 💠 **Fully Typed** — Built with TypeScript

---

## 📦 Installation

```bash
npm install pdf-image-converter
```

---

## 🚀 Quick Start

```ts
import { pdfConverter } from "pdf-image-converter";
import fs from "node:fs/promises";

async function convert() {
  const pdfBuffer = await fs.readFile("document.pdf");

  const result = await pdfConverter.convertPage(pdfBuffer, 1, {
    format: "png",
    dpi: 300,
  });

  await fs.writeFile("page1.png", result.buffer);
}
```

---

## 🔥 Advanced Usage

```ts
import { PdfConverter } from "pdf-image-converter";

const converter = new PdfConverter({
  dpi: 200,
  format: "jpeg",
});

async function convertAll(pdfBuffer: Buffer) {
  const pages = await converter.convertAll(pdfBuffer, {
    quality: 85,
  });

  console.log(`Converted ${pages.length} pages`);
}

async function convertSpecific(pdfBuffer: Buffer) {
  const results = await converter.convertPages(pdfBuffer, [1, 3, 5]);
}
```

---

## 🧠 Supported Formats

```ts
const formats = pdfConverter.supportedFormats();
console.log(formats);
```

**Output:**

```
png, jpeg, bmp, ppm, ico, tiff
```

---

## 🏗 NestJS Integration

### 1. Import Module

```ts
import { Module } from "@nestjs/common";
import { PdfImageModule } from "pdf-image-converter/nestjs";

@Module({
  imports: [
    PdfImageModule.forRoot({
      defaultDpi: 150,
      defaultFormat: "png",
    }),
  ],
})
export class AppModule {}
```

---

### 2. Inject Service

```ts
import { Injectable } from "@nestjs/common";
import { PdfImageService } from "pdf-image-converter/nestjs";

@Injectable()
export class AppService {
  constructor(private readonly pdfService: PdfImageService) {}

  async processPdf(pdfBuffer: Buffer) {
    const totalPages = await this.pdfService.getPageCount(pdfBuffer);
    return this.pdfService.convertAll(pdfBuffer);
  }
}
```

---

## 📚 API Overview

### `PdfConverter`

- `convertPage(pdf, page, options)`
- `convertAll(pdf, options)`
- `convertPages(pdf, pages, options)`
- `getPageCount(pdf)`
- `supportedFormats()`

---

### ⚙️ Options

| Option  | Type   | Description                    |
| ------- | ------ | ------------------------------ |
| format  | string | png, jpeg, bmp, ppm, ico, tiff |
| dpi     | number | Resolution (default: 150)      |
| quality | number | 1–100 (JPEG/PNG compression)   |

---

## 💻 CLI Usage

The package includes a powerful command-line interface to convert PDFs without writing any code.

### Basic Usage

```bash
npx pdf-image-converter document.pdf
```

### Options

| Option | Short | Description | Default |
| :--- | :--- | :--- | :--- |
| `--output` | `-o` | Output directory or file path | `.` |
| `--format` | `-f` | Image format: `png`, `jpeg`, `bmp`, `ppm`, `tiff`, `ico` | `png` |
| `--dpi` | `-d` | Rendering resolution (DPI) | `150` |
| `--quality` | `-q` | Encoding quality (1-100) for JPEG | `100` |
| `--page` | `-p` | Convert a specific page (1-indexed) | |
| `--pages` | | Range (`1-5`) or comma-separated (`1,3,5`) | All |
| `--help` | `-h` | Show help message | |
| `--version` | `-V` | Show version number | |

### Examples

**Convert all pages to JPEG with 300 DPI:**
```bash
npx pdf-image-converter document.pdf --format jpeg --dpi 300
```

**Convert a specific page to a specific file:**
```bash
npx pdf-image-converter document.pdf --page 1 --output cover.png
```

**Convert a range of pages to a directory:**
```bash
npx pdf-image-converter document.pdf --pages 1-5 --output ./images
```

**Convert specific pages (quoted for PowerShell compatibility):**
```bash
npx pdf-image-converter document.pdf --pages "1,3,5" --quality 90
```

## 💡 Use Cases

- 📄 Document preview generation
- 🖼 Thumbnail creation
- 📦 File processing pipelines
- 🧾 PDF-to-image APIs
- 🎯 Icon generation (ICO support!)

---

## ❤️ Contributing & Support

If this package helped you:

- ⭐ Star the repo
- 🐛 Report issues
- 💡 PRs & ideas are always welcome!

It helps more developers discover this package 🚀

---

## 📄 License

MIT © 2026
