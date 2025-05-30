// import '@/common/sentry/instrument';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from '@/common/filters/all-exceptions.filter';
import { ConfigService } from '@nestjs/config';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // // Connect the microservice to RabbitMQ
  // app.connectMicroservice<MicroserviceOptions>({
  //   transport: Transport.RMQ, // Use RabbitMQ as the transport layer
  //   options: {
  //     urls: [process.env.RABBITMQ_URL ?? ''], // RabbitMQ connection URL
  //     queue: 'csv_validation_queue', // Name of the queue for CSV validation
  //     queueOptions: {
  //       durable: true, // Queue persists across RabbitMQ restarts
  //     },
  //     noAck: false, // Require manual acknowledgment for messages
  //     prefetchCount: 1, // Process one message at a time for load balancing
  //   },
  // });

  // app.connectMicroservice<MicroserviceOptions>({
  //   transport: Transport.RMQ,
  //   options: {
  //     urls: [process.env.RABBITMQ_URL ?? ''],
  //     queue: 'csv_validation_response', // Queue for validation results
  //     queueOptions: {
  //       durable: true,
  //     },
  //     noAck: false,
  //     prefetchCount: 1,
  //   },
  // });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672'],
      queue: 'csv_validation_response',
      queueOptions: {
        durable: true,
      },
      noAck: true,
      prefetchCount: 1,
      // Explicitly bind to the exchange
    },
  });
  app.enableCors({
    origin: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter(app.getHttpAdapter()));

  // Swagger Config
  const config = new DocumentBuilder()
    .setTitle('ISS API')
    .setDescription('ISS API Documentation')
    .setVersion('0.1')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  // Start all microservices
  await app.startAllMicroservices();
  const PORT = process.env.PORT ?? 3000;

  await app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

void bootstrap();
