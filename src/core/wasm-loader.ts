import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve the vendor directory by walking up from this file until we find
// a directory that contains vendor/mupdf.js.
//
// After build: dist/{esm|cjs}/core/wasm-loader.{js|cjs} → 3 levels up
// During tests (ts-node / vitest): src/core/wasm-loader.ts → 2 levels up
function resolveVendorDir(): string {
  // ESM: use import.meta.url; tsup rewrites this to __filename in CJS
  const thisFile = fileURLToPath(import.meta.url);
  let dir = path.dirname(thisFile);

  // Walk up to 4 levels looking for vendor/mupdf.js
  for (let i = 0; i < 4; i++) {
    const candidate = path.join(dir, 'vendor');
    if (fs.existsSync(path.join(candidate, 'mupdf.js'))) {
      return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break; // filesystem root
    dir = parent;
  }

  // Fallback to conventional dist-relative path (for installed package use)
  const thisFileFallback = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(thisFileFallback), '..', '..', '..', 'vendor');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MuPdfModule = any;

let cachedModule: MuPdfModule | null = null;

/**
 * Loads and caches the MuPDF WASM module from the bundled vendor directory.
 * The first call takes ~200-500ms; all subsequent calls return instantly.
 */
export async function loadMuPdf(): Promise<MuPdfModule> {
  if (cachedModule !== null) {
    return cachedModule;
  }

  const vendorDir = resolveVendorDir();
  const mupdfJsPath = path.join(vendorDir, 'mupdf.js');

  if (!fs.existsSync(mupdfJsPath)) {
    throw new Error(
      `MuPDF vendor files not found at "${vendorDir}". ` +
      `Run "npm run vendor" to generate them.`
    );
  }

  // Dynamic import of the vendored mupdf.js (ES module).
  // mupdf.js internally loads mupdf-wasm.js, which loads mupdf-wasm.wasm
  // using import.meta.url — all resolved relative to vendor/, so paths work.
  const mupdfUrl = new URL(`file:///${mupdfJsPath.replace(/\\/g, '/')}`);
  const mod = await import(mupdfUrl.toString());
  cachedModule = mod.default ?? mod;
  return cachedModule;
}
