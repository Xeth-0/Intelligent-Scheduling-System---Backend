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

    let message: string;
    if (exception instanceof HttpException) {
      console.error('Processing HttpException');
      const responsePayload = exception.getResponse();
      console.error('HttpException response payload:', responsePayload);

      if (typeof responsePayload === 'string') {
        message = responsePayload;
        console.error('Message from string payload:', message);
      } else if (
        typeof responsePayload === 'object' &&
        responsePayload !== null
      ) {
        const errorResponse = responsePayload as { message: string };
        message = errorResponse.message || 'An error occurred';
        console.error('Message from object payload:', message);
      } else {
        message = 'An error occurred';
        console.error('Default message for unknown payload type');
      }
    } else {
      message = 'Internal server error';
      console.error('Non-HttpException, using default message:', message);
    }

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

    const apiResponse = ApiResponse.error(status, message);
    console.error('API response being sent:', apiResponse);

    response.status(status).json({
      ...apiResponse,
      path: request.url,
      timestamp: new Date().toISOString(),
    });

    console.error('Response sent successfully');
  }
}
