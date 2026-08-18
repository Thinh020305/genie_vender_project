import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface NestExceptionResponse {
  statusCode?: number;
  message?: string | string[];
  error?: string;
}

// Structural (duck-typed) checks instead of `instanceof Prisma.X` — same
// style as `isUniqueConstraintError` in classification-rules.service.ts.
// Avoids depending on exactly what the generated client (provider
// "prisma-client") re-exports, which isn't guaranteed to mirror the classic
// "prisma-client-js" `Prisma` namespace shape.
interface PrismaKnownRequestErrorLike {
  name: 'PrismaClientKnownRequestError';
  code: string;
}

const PRISMA_CODE_PATTERN = /^P\d{4}$/;

const isPrismaKnownRequestError = (
  exception: unknown,
): exception is PrismaKnownRequestErrorLike =>
  typeof exception === 'object' &&
  exception !== null &&
  (exception as { name?: unknown }).name === 'PrismaClientKnownRequestError' &&
  PRISMA_CODE_PATTERN.test((exception as { code?: unknown }).code as string);

// Raw Postgres SQLSTATE codes for input that's syntactically valid (passes
// ParseIntPipe, DTO validation, etc.) but is rejected by the database itself
// — e.g. an id bigger than a `int4` column can hold. These come from the
// underlying `pg` driver via @prisma/adapter-pg, not from Prisma's own
// P-code catalogue, so they need a separate check.
const POSTGRES_CLIENT_ERROR_CODES = new Set([
  '22003', // numeric_value_out_of_range
  '22P02', // invalid_text_representation
  '22007', // invalid_datetime_format
  '22008', // datetime_field_overflow
]);

const getPgErrorCode = (exception: unknown): string | undefined => {
  if (typeof exception !== 'object' || exception === null) {
    return undefined;
  }

  const code = (exception as { code?: unknown }).code;
  if (typeof code === 'string') {
    return code;
  }

  // Prisma (or the adapter) may wrap the original driver error as `.cause`
  // rather than surfacing its `.code` directly — check one level down.
  const cause = (exception as { cause?: unknown }).cause;
  if (typeof cause === 'object' && cause !== null) {
    const causeCode = (cause as { code?: unknown }).code;
    if (typeof causeCode === 'string') {
      return causeCode;
    }
  }

  return undefined;
};

const isPostgresClientError = (exception: unknown): boolean => {
  const code = getPgErrorCode(exception);
  return code !== undefined && POSTGRES_CLIENT_ERROR_CODES.has(code);
};

const mapPrismaCodeToStatus = (code: string): number => {
  switch (code) {
    case 'P2002': // unique constraint violation
    case 'P2003': // foreign key constraint violation
      return HttpStatus.CONFLICT;
    case 'P2025': // record not found (e.g. update/delete on missing row)
      return HttpStatus.NOT_FOUND;
    default:
      // Any other "known" Prisma error is still a request-shaped problem
      // (bad value, bad relation, etc.), not a server failure.
      return HttpStatus.BAD_REQUEST;
  }
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const httpContext = host.switchToHttp();

    const response = httpContext.getResponse<Response>();
    const request = httpContext.getRequest<Request>();

    const status = this.getStatus(exception);
    const message = this.getMessage(exception);

    if (!(exception instanceof HttpException)) {
      if (exception instanceof Error) {
        this.logger.error(
          `${request.method} ${request.originalUrl} - ${exception.message}`,
          exception.stack,
        );
      } else {
        this.logger.error(
          `${request.method} ${request.originalUrl} - Unknown exception`,
        );
      }
    }

    response.status(status).json({
      status,
      message,
      data: null,
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
    });
  }

  private getStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    if (isPrismaKnownRequestError(exception)) {
      return mapPrismaCodeToStatus(exception.code);
    }

    if (isPostgresClientError(exception)) {
      return HttpStatus.BAD_REQUEST;
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getMessage(exception: unknown): string | string[] {
    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        return exceptionResponse;
      }

      const responseObject = exceptionResponse as NestExceptionResponse;

      return responseObject.message ?? exception.message;
    }

    if (isPrismaKnownRequestError(exception)) {
      return this.getPrismaMessage(exception.code);
    }

    if (isPostgresClientError(exception)) {
      return 'Invalid request data';
    }

    return 'Internal server error';
  }

  private getPrismaMessage(code: string): string {
    switch (code) {
      case 'P2002':
        return 'A record with this value already exists';
      case 'P2003':
        return 'This operation violates a related record constraint';
      case 'P2025':
        return 'Record not found';
      default:
        return 'Invalid request data';
    }
  }
}
