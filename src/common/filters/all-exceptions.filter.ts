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

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getMessage(exception: unknown): string | string[] {
    if (!(exception instanceof HttpException)) {
      return 'Internal server error';
    }

    const exceptionResponse = exception.getResponse();

    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    const responseObject = exceptionResponse as NestExceptionResponse;

    return responseObject.message ?? exception.message;
  }
}
