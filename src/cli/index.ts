import { parseArgs } from 'node:util';
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname, basename, extname, join } from 'node:path';
import pkg from '../../package.json';
import { pdfConverter } from '../nodejs/index.js';
import type { ConvertOptions, ImageFormat } from '../types/index.js';

const IMAGE_EXTENSIONS: Record<string, ImageFormat> = {
  '.png': 'png',
  '.jpg': 'jpeg',
  '.jpeg': 'jpeg',
  '.bmp': 'bmp',
  '.ppm': 'ppm',
  '.tiff': 'tiff',
  '.tif': 'tiff',
  '.ico': 'ico',
};

function formatExtension(format: string): string {
  return format === 'jpeg' ? 'jpg' : format;
}

function isKnownImageExt(ext: string): boolean {
  return ext.toLowerCase() in IMAGE_EXTENSIONS;
}

function isOutputFile(outputPath: string, rawArg: string): boolean {
  if (existsSync(outputPath) && statSync(outputPath).isDirectory()) return false;
  if (rawArg.endsWith('/') || rawArg.endsWith('\\')) return false;
  return isKnownImageExt(extname(outputPath));
}

function parsePageList(pagesStr: string): number[] {
  const pages: number[] = [];
  for (const part of pagesStr.split(',')) {
    const trimmed = part.trim();
    const dashIdx = trimmed.indexOf('-');
    if (dashIdx > 0) {
      const start = parseInt(trimmed.slice(0, dashIdx), 10);
      const end = parseInt(trimmed.slice(dashIdx + 1), 10);
      if (!isNaN(start) && !isNaN(end) && start >= 1 && start <= end) {
        for (let i = start; i <= end; i++) pages.push(i);
      }
    } else {
      const n = parseInt(trimmed, 10);
      if (!isNaN(n) && n >= 1) pages.push(n);
    }
  }
  return pages;
}

function printHelp(): void {
  console.log(`
Usage: pdf-image-converter <pdf-path> [options]

Convert PDF pages to images.

Options:
  -o, --output <path>     Output directory or file path (default: current directory)
  -f, --format <format>   Image format: png, jpeg, bmp, ppm, tiff, ico (default: png)
  -d, --dpi <number>      Rendering DPI (default: 150)
  -q, --quality <number>  Encoding quality 1-100 (for jpeg)
  -p, --page <number>     Convert a specific page (1-indexed)
      --pages <pages>     Pages to convert: comma-separated (1,3,5) or range (1-5)
                          PowerShell: quote the value  --pages "2,4"
  -h, --help              Show this help message
  -V, --version           Show version number

Examples:
  pdf-image-converter document.pdf
  pdf-image-converter document.pdf --output ./images --format jpeg --dpi 300
  pdf-image-converter document.pdf --page 1 --output ./cover.png
  pdf-image-converter document.pdf --pages 1-5 --format jpeg
  pdf-image-converter document.pdf --pages "1,3,5" --quality 90
`);
}

// PowerShell splits unquoted `2,4` into separate argv tokens ['2','4'].
// This merges all non-flag tokens that follow --pages into one comma-joined value
// so parseArgs always receives a single string like "2,4".
function normalizeArgv(args: string[]): string[] {
  const result: string[] = [];
  let i = 0;
  while (i < args.length) {
    if (args[i] === '--pages' && i + 1 < args.length) {
      const tokens: string[] = [];
      let j = i + 1;
      while (j < args.length && !args[j]!.startsWith('-')) {
        tokens.push(args[j]!);
        j++;
      }
      result.push('--pages', tokens.join(','));
      i = j;
    } else {
      result.push(args[i]!);
      i++;
    }
  }
  return result;
}

// Extracted so ReturnType<typeof parseCLIArgs> is valid (generic typeof is not legal TS)
function parseCLIArgs() {
  return parseArgs({
    args: normalizeArgv(process.argv.slice(2)),
    options: {
      output: { type: 'string' as const, short: 'o' },
      format: { type: 'string' as const, short: 'f' },
      dpi: { type: 'string' as const, short: 'd' },
      quality: { type: 'string' as const, short: 'q' },
      page: { type: 'string' as const, short: 'p' },
      pages: { type: 'string' as const },
      help: { type: 'boolean' as const, short: 'h' },
      version: { type: 'boolean' as const, short: 'V' },
    },
    allowPositionals: true,
    strict: true,
  });
}

async function main(): Promise<void> {
  let parsed: ReturnType<typeof parseCLIArgs>;

  try {
    parsed = parseCLIArgs();
  } catch (err) {
    console.error(`Error: ${(err as Error).message}\n`);
    console.error('Run with --help for usage information.');
    process.exit(1);
  }

  const { values, positionals } = parsed!;

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  if (values.version) {
    console.log(pkg.version);
    process.exit(0);
  }

  if (positionals.length === 0) {
    console.error('Error: PDF path is required.\n');
    console.error('Run with --help for usage information.');
    process.exit(1);
  }

  const pdfPath = resolve(positionals[0]!);

  if (!existsSync(pdfPath)) {
    console.error(`Error: File not found: ${pdfPath}`);
    process.exit(1);
  }

  const outputArg = values.output ?? '.';
  const outputPath = resolve(outputArg);
  const outputFile = isOutputFile(outputPath, outputArg);
  const outputExt = extname(outputPath).toLowerCase();

  // Format: explicit --format wins, then infer from output extension, then default png
  let format: ImageFormat = 'png';
  if (values.format) {
    format = values.format as ImageFormat;
  } else if (outputFile && IMAGE_EXTENSIONS[outputExt]) {
    format = IMAGE_EXTENSIONS[outputExt];
  }

  const options: ConvertOptions = { format };
  if (values.dpi) {
    const dpi = parseInt(values.dpi, 10);
    if (isNaN(dpi) || dpi < 1) { console.error('Error: --dpi must be a positive integer'); process.exit(1); }
    options.dpi = dpi;
  }
  if (values.quality) {
    const quality = parseInt(values.quality, 10);
    if (isNaN(quality) || quality < 1 || quality > 100) { console.error('Error: --quality must be between 1 and 100'); process.exit(1); }
    options.quality = quality;
  }

  // Determine pages
  let pagesToConvert: number[] | null = null;

  if (values.page && values.pages?.length) {
    console.error('Error: --page and --pages cannot be used together');
    process.exit(1);
  }

  if (values.page) {
    const n = parseInt(values.page, 10);
    if (isNaN(n) || n < 1) { console.error('Error: --page must be a positive integer'); process.exit(1); }
    pagesToConvert = [n];
  } else if (values.pages) {
    pagesToConvert = parsePageList(values.pages);
    if (pagesToConvert.length === 0) { console.error('Error: --pages produced no valid page numbers'); process.exit(1); }
  }

  if (outputFile && pagesToConvert !== null && pagesToConvert.length > 1) {
    console.error('Error: When output is a file path, only one page can be specified (use --page)');
    process.exit(1);
  }

  // Read PDF
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = readFileSync(pdfPath);
  } catch {
    console.error(`Error: Could not read file: ${pdfPath}`);
    process.exit(1);
  }

  const pdfName = basename(pdfPath, extname(pdfPath));

  try {
    let results;
    if (pagesToConvert === null) {
      results = await pdfConverter.convertAll(pdfBuffer, options);
    } else if (pagesToConvert.length === 1) {
      results = [await pdfConverter.convertPage(pdfBuffer, pagesToConvert[0]!, options)];
    } else {
      results = await pdfConverter.convertPages(pdfBuffer, pagesToConvert, options);
    }

    if (outputFile && results.length > 1) {
      console.error('Error: PDF has multiple pages; specify an output directory or use --page');
      process.exit(1);
    }

    const outputDir = outputFile ? dirname(outputPath) : outputPath;
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    for (const result of results) {
      const filePath = outputFile
        ? outputPath
        : join(outputDir, `${pdfName}-page-${result.page}.${formatExtension(result.format)}`);

      writeFileSync(filePath, result.buffer);
      console.log(`Page ${result.page} → ${filePath} (${result.width}×${result.height}, ${(result.size / 1024).toFixed(1)} KB)`);
    }

    console.log(`\nDone. ${results.length} page(s) converted.`);
  } catch (err) {
    console.error(`Error: ${(err as Error).message}`);
    process.exit(1);
  }
}

main();
