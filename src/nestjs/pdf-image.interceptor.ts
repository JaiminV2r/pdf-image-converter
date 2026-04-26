import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
  InternalServerErrorException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, catchError } from 'rxjs';
import type { ErrorCode } from '../errors.js';

const PDF_ERROR_CODES = new Set<string>([
  'INVALID_PDF',
  'UNSUPPORTED_FORMAT',
  'PAGE_OUT_OF_RANGE',
]);

/**
 * Global interceptor for pdf-image-converter errors.
 *
 * Catches `InvalidPdfException`, `UnsupportedFormatException`, and
 * `PageOutOfRangeException` and re-throws them as NestJS `BadRequestException`,
 * giving the familiar terminal log format:
 * ```
 * BadRequestException: Unsupported image format: "webp" ...
 * {
 *   response: { statusCode: 400, error: 'Bad Request', message: '...', errorCode: 'UNSUPPORTED_FORMAT' },
 *   status: 400
 * }
 * ```
 *
 * Already-handled `HttpException`s (e.g. from `PdfImageService`'s own error
 * handling) are passed through untouched, so registering both the service
 * and this interceptor at the same time is safe.
 *
 * **Register globally in `main.ts`:**
 * ```ts
 * import { PdfImageInterceptor } from 'pdf-image-converter/nestjs';
 * app.useGlobalInterceptors(new PdfImageInterceptor());
 * ```
 *
 * **Or scope to a single controller:**
 * ```ts
 * @UseInterceptors(PdfImageInterceptor)
 * @Controller('pdf')
 * export class PdfController {}
 * ```
 */
@Injectable()
export class PdfImageInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      // Use `throw` directly inside catchError — avoids the throwError factory
      // and works reliably across all RxJS 7 environments.
      catchError((err: unknown) => {
        throw this.transform(err);
      })
    );
  }

  private transform(err: unknown): Error {
    // Already an HTTP exception (e.g. from PdfImageService's own handleErrors):
    // pass it straight through so it reaches NestJS's built-in handler intact.
    if (err instanceof HttpException) {
      return err;
    }

    // Pure duck-type check — does NOT use `instanceof` on our custom classes.
    // Works even if the package is consumed from source, pre-built, or bundled,
    // and avoids instanceof failures across module boundaries.
    if (this.isPdfError(err)) {
      return new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: (err as Error).message,
        errorCode: (err as { errorCode: ErrorCode }).errorCode,
      });
    }

    return new InternalServerErrorException(
      'An unexpected error occurred while processing the PDF.'
    );
  }

  private isPdfError(err: unknown): err is Error & { errorCode: ErrorCode } {
    // Check only for the errorCode property — no instanceof Error requirement.
    if (!err || typeof err !== 'object') return false;
    const code = (err as Record<string, unknown>).errorCode;
    return typeof code === 'string' && PDF_ERROR_CODES.has(code);
  }
}
