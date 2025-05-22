import './common/sentry/instrument';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

    app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls:[process.env.RABBITMQ_URL ?? ''],
      queue: 'csv_validation_response', // Queue for validation results
      queueOptions: {
        durable: true,
      },
      noAck: false,
      prefetchCount: 1,
    },
  });
  app.enableCors({
    origin: true,
  });

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
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
