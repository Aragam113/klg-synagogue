import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

export const BAD_REQUEST_RU = 'Некорректный запрос';
const CYRILLIC = /[А-Яа-яЁё]/;

/**
 * Ошибки в обёртке шаблона:
 * `{ success: false, statusCode, message, error, fields?, timestamp, path }`.
 * `fields` — ошибки валидации по полям (см. FieldValidationPipe).
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (response.headersSent) {
      return;
    }

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Внутренняя ошибка сервера';
    let error = 'Internal Server Error';
    let fields: Record<string, string> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exception.name;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as Record<string, unknown>;
        message = (responseObj.message as string | string[]) || message;
        error = (responseObj.error as string) || exception.name;
        fields = responseObj.fields as Record<string, string> | undefined;
      }
    }

    // 400 из самого фреймворка (битый JSON у body-parser, кривой URL) приходят
    // с английским текстом — наружу отдаём русский, исходный текст остаётся в логе.
    let logMessage = Array.isArray(message) ? message.join(', ') : message;
    if (
      status === 400 &&
      typeof message === 'string' &&
      !CYRILLIC.test(message)
    ) {
      logMessage = `${BAD_REQUEST_RU} (${message})`;
      message = BAD_REQUEST_RU;
    }

    const path = request.url.split('?')[0];
    const logText = `${request.method} ${path} - ${status} - ${logMessage}`;
    if (status >= 500) {
      this.logger.error(
        logText,
        exception instanceof Error ? exception.stack : undefined
      );
    } else {
      this.logger.warn(logText);
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      error,
      ...(fields ? { fields } : {}),
      timestamp: new Date().toISOString(),
      path,
    });
  }
}
