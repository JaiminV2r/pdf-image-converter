import { Module, DynamicModule, Provider } from '@nestjs/common';
import { PdfImageService } from './pdf-image.service.js';
import { PDF_IMAGE_OPTIONS } from './pdf-image.constants.js';
import type { PdfImageModuleOptions, PdfImageModuleAsyncOptions } from '../types/index.js';

/**
 * NestJS module for PDF-to-image conversion.
 *
 * @example Synchronous setup
 * ```ts
 * @Module({ imports: [PdfImageModule.forRoot({ defaultDpi: 150, defaultFormat: 'png' })] })
 * class AppModule {}
 * ```
 *
 * @example Async setup (e.g., reading config from ConfigService)
 * ```ts
 * @Module({
 *   imports: [
 *     PdfImageModule.forRootAsync({
 *       imports: [ConfigModule],
 *       inject: [ConfigService],
 *       useFactory: (config: ConfigService) => ({
 *         defaultDpi: config.get('PDF_DPI'),
 *       }),
 *     }),
 *   ],
 * })
 * class AppModule {}
 * ```
 */
@Module({})
export class PdfImageModule {
  static forRoot(options: PdfImageModuleOptions = {}): DynamicModule {
    return {
      module: PdfImageModule,
      providers: [
        { provide: PDF_IMAGE_OPTIONS, useValue: options },
        PdfImageService,
      ],
      exports: [PdfImageService],
    };
  }

  static forRootAsync(asyncOptions: PdfImageModuleAsyncOptions): DynamicModule {
    const optionsProvider: Provider = {
      provide: PDF_IMAGE_OPTIONS,
      useFactory: asyncOptions.useFactory,
      inject: (asyncOptions.inject ?? []) as (string | symbol)[],
    };
    return {
      module: PdfImageModule,
      imports: (asyncOptions.imports ?? []) as DynamicModule[],
      providers: [optionsProvider, PdfImageService],
      exports: [PdfImageService],
    };
  }
}
