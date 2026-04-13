import { defineConfig } from 'tsup';

const external = [
  // Node.js built-ins
  'fs', 'path', 'zlib', 'buffer', 'url', 'worker_threads', 'os', 'crypto', 'stream',
  // NestJS peer deps
  '@nestjs/common', '@nestjs/core', 'reflect-metadata', 'rxjs',
];

export default defineConfig([
  // ESM build
  {
    entry: {
      'nodejs/index': 'src/nodejs/index.ts',
      'nestjs/index': 'src/nestjs/index.ts',
    },
    format: ['esm'],
    outDir: 'dist/esm',
    dts: false,
    sourcemap: true,
    splitting: false,
    external,
  },
  // CJS build
  {
    entry: {
      'nodejs/index': 'src/nodejs/index.ts',
      'nestjs/index': 'src/nestjs/index.ts',
    },
    format: ['cjs'],
    outDir: 'dist/cjs',
    dts: false,
    sourcemap: true,
    splitting: false,
    shims: true, // polyfills import.meta.url → __filename in CJS
    external,
  },
  // Type declarations
  {
    entry: {
      'nodejs/index': 'src/nodejs/index.ts',
      'nestjs/index': 'src/nestjs/index.ts',
    },
    format: ['esm'],
    outDir: 'dist/types',
    dts: { only: true },
    external: ['@nestjs/common', '@nestjs/core'],
  },
]);
