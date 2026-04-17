import { describe, it, expect } from 'vitest';
import { BadRequestException, InternalServerErrorException, HttpException, HttpStatus } from '@nestjs/common';
import { of, throwError, firstValueFrom } from 'rxjs';
import { PdfImageInterceptor } from '../../src/nestjs/pdf-image.interceptor.js';
import {
  InvalidPdfException,
  UnsupportedFormatException,
  PageOutOfRangeException,
} from '../../src/errors.js';

const interceptor = new PdfImageInterceptor();

async function intercept(error: unknown): Promise<unknown> {
  const handler = { handle: () => throwError(() => error) } as never;
  try {
    await firstValueFrom(interceptor.intercept({} as never, handler));
  } catch (err) {
    return err;
  }
}

async function interceptSuccess(value: unknown): Promise<unknown> {
  const handler = { handle: () => of(value) } as never;
  return firstValueFrom(interceptor.intercept({} as never, handler));
}

describe('PdfImageInterceptor', () => {
  it('passes through successful responses untouched', async () => {
    const result = await interceptSuccess({ page: 1, format: 'png' });
    expect(result).toEqual({ page: 1, format: 'png' });
  });

  it('passes through existing HttpExceptions without re-wrapping', async () => {
    const original = new BadRequestException({ statusCode: 400, message: 'already handled', errorCode: 'INVALID_PDF' });
    const err = await intercept(original);
    expect(err).toBe(original); // exact same instance
  });

  it('transforms InvalidPdfException → BadRequestException with errorCode INVALID_PDF', async () => {
    const original = new InvalidPdfException('Input is not a valid PDF: file does not begin with the PDF magic bytes (%PDF).');
    const err = await intercept(original) as BadRequestException;

    expect(err).toBeInstanceOf(BadRequestException);
    const body = err.getResponse() as Record<string, unknown>;
    expect(body.statusCode).toBe(400);
    expect(body.error).toBe('Bad Request');
    expect(body.message).toBe(original.message);
    expect(body.errorCode).toBe('INVALID_PDF');
  });

  it('transforms UnsupportedFormatException → BadRequestException with errorCode UNSUPPORTED_FORMAT', async () => {
    const original = new UnsupportedFormatException('Unsupported image format: "webp".');
    const err = await intercept(original) as BadRequestException;

    expect(err).toBeInstanceOf(BadRequestException);
    const body = err.getResponse() as Record<string, unknown>;
    expect(body.errorCode).toBe('UNSUPPORTED_FORMAT');
    expect(body.message).toBe(original.message);
  });

  it('transforms PageOutOfRangeException → BadRequestException with errorCode PAGE_OUT_OF_RANGE', async () => {
    const original = new PageOutOfRangeException('Page number must be >= 1, got 0.');
    const err = await intercept(original) as BadRequestException;

    expect(err).toBeInstanceOf(BadRequestException);
    const body = err.getResponse() as Record<string, unknown>;
    expect(body.errorCode).toBe('PAGE_OUT_OF_RANGE');
    expect(body.message).toBe(original.message);
  });

  it('transforms unknown Error → InternalServerErrorException and hides raw message', async () => {
    const err = await intercept(new Error('WASM heap: internal detail')) as InternalServerErrorException;
    expect(err).toBeInstanceOf(InternalServerErrorException);
    const body = err.getResponse() as string;
    expect(body).not.toContain('WASM heap');
  });

  it('transforms a thrown non-Error value → InternalServerErrorException', async () => {
    const err = await intercept('unexpected string');
    expect(err).toBeInstanceOf(InternalServerErrorException);
  });

  it('works via duck-typing when errorCode is set without class inheritance', async () => {
    // Simulates module boundary scenario where instanceof fails
    const fakeError = Object.assign(new Error('bad pdf'), { errorCode: 'INVALID_PDF' });
    const err = await intercept(fakeError) as BadRequestException;

    expect(err).toBeInstanceOf(BadRequestException);
    const body = err.getResponse() as Record<string, unknown>;
    expect(body.errorCode).toBe('INVALID_PDF');
  });

  it('every 400 response body has all required fields', async () => {
    const cases = [
      new InvalidPdfException('a'),
      new UnsupportedFormatException('b'),
      new PageOutOfRangeException('c'),
    ];
    for (const err of cases) {
      const result = await intercept(err) as BadRequestException;
      const body = result.getResponse() as Record<string, unknown>;
      expect(body).toHaveProperty('statusCode', 400);
      expect(body).toHaveProperty('error', 'Bad Request');
      expect(body).toHaveProperty('message');
      expect(body).toHaveProperty('errorCode');
    }
  });
});
