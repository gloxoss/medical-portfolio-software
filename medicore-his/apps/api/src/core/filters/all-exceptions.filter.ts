import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';

/**
 * Global exception filter — catches ALL unhandled errors.
 *
 * Behaviour:
 * - Known HttpExceptions (400/401/403/404/422) → forward status + message
 * - Unknown errors (500) → log full stack, return generic message
 * - Correlation ID (X-Request-Id header) included in every error response
 * - Stack traces never leak to the client in production
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(AllExceptionsFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const requestId =
      (request.headers['x-request-id'] as string | undefined) ??
      crypto.randomUUID();

    let status: number;
    let message: string | string[];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as { message?: string | string[] }).message ??
            exception.message;
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';

      // Log the full error with stack — never send to client
      this.logger.error(
        {
          requestId,
          method: request.method,
          url: request.url,
          err: exception instanceof Error
            ? { message: exception.message, stack: exception.stack }
            : exception,
        },
        'Unhandled exception',
      );
    }

    // Log all 5xx at error, 4xx at warn
    if (status >= 500) {
      this.logger.error({ requestId, status, method: request.method, url: request.url }, String(message));
    } else {
      this.logger.warn({ requestId, status, method: request.method, url: request.url }, String(message));
    }

    response.status(status).json({
      statusCode: status,
      message,
      requestId,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
