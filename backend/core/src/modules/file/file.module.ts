import { Module } from '@nestjs/common';
import { FileController } from './file.controller';
import { FileService } from './file.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ValidationService } from './validation.service';
import { SeedDatabase } from './seedDatabase.service';
import { ValidationController } from './validation.controller';

@Module({
  controllers: [FileController, ValidationController],
  providers: [FileService, ValidationService, SeedDatabase],
  imports: [
    ClientsModule.register([
      {
        name: 'CSV_SERVICE', // Name of the client
        transport: Transport.RMQ, // Use RabbitMQ transport
        options: {
          urls: [process.env.RABBITMQ_URL ?? ''], // RabbitMQ connection URL
          queue: 'csv_validation_request', // Queue for sending CSV files
          queueOptions: {
            durable: true, // Persistent queue
          },
        },
      },
    ]),
  ],
  exports: [ValidationService],
})
export class FileModule {}
/**
 * TODO:
 * - [x] send campusId  and adminId with the queue request nad use it to ensure uniqueness for all id fields
 * - [x] keep track of teskId and status as well as errors
 * - [x] parse db prisma errors to a readable error
 * - [x] create an endpoint for status check
 */
