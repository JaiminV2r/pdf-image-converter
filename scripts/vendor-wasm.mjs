import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const destDir = path.join(root, 'vendor');

fs.mkdirSync(destDir, { recursive: true });

// --- MuPDF ---
const mupdfSrc = path.join(root, 'node_modules', 'mupdf', 'dist');
const mupdfFiles = ['mupdf.js', 'mupdf-wasm.js', 'mupdf-wasm.wasm'];

for (const file of mupdfFiles) {
  const src = path.join(mupdfSrc, file);
  const dest = path.join(destDir, file);
  fs.copyFileSync(src, dest);
  const size = (fs.statSync(dest).size / 1024 / 1024).toFixed(2);
  console.log(`[vendor] ${file} (${size} MB) -> vendor/${file}`);
}

console.log('[vendor] Done.');
