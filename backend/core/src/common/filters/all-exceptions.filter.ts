import {
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Request, Response } from 'express';
import { ApiResponse } from '../response/api-response.dto';

@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    console.error('AllExceptionsFilter: Exception caught');
    console.error('Exception type:', exception?.constructor?.name);
    console.error('Exception details:', exception);

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    console.error('Determined status:', status);

    const message =
      typeof exception === 'string'
        ? exception
        : ((exception as { message: string }).message ??
          'Internal Server Error. Unknown error occurred');

    const apiResponse = ApiResponse.error(status, message);

    // Debugging logs
    console.error(`[${request.method}] ${request.url} ${status} `, message);
    console.error(
      'Request details - Method:',
      request.method,
      'URL:',
      request.url,
    );
    console.error(
      'Stack trace:',
      exception instanceof Error ? exception.stack : 'No stack trace available',
    );
    console.error('API response being sent:', apiResponse);

    response.status(status).json({
      ...apiResponse,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
    console.error('Error response sent successfully');
  }
}
