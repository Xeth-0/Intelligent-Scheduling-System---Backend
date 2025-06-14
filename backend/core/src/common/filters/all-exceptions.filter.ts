import {
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Request, Response } from 'express';
import { ApiResponse } from '../response/api-response.dto';
import { SentryExceptionCaptured } from '@sentry/nestjs';

@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  @SentryExceptionCaptured()
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


    // Added better handling for validation errors
    let message: string;
    if (exception instanceof BadRequestException) {
      const response = exception.getResponse();
      if (typeof response === 'object' && (response as any).message) {
        const validatorMessages = (response as any).message;
        if (Array.isArray(validatorMessages) && validatorMessages.length > 0) {
          const firstError = validatorMessages[0];
          if (typeof firstError === 'object' && firstError.constraints) {
            const firstConstraintKey = Object.keys(firstError.constraints)[0];
            message = firstError.constraints[firstConstraintKey];
          } else {
            message = firstError;
          }
        } else if (typeof validatorMessages === 'string') {
          message = validatorMessages;
        } else {
          message = 'Validation failed';
        }
      } else {
        message = 'Bad Request';
      }
    } else if (typeof exception === 'string') {
      message = exception;
    } else if (exception instanceof Error) {
      message =
        exception.message ?? 'Internal Server Error. Unknown error occurred';
    } else {
      message = 'Internal Server Error. Unknown error occurred';
    }
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
