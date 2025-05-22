import { Module } from '@nestjs/common';
import { FileController } from './file.controller';
import { FileService } from './file.service';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  controllers: [FileController],
  providers: [FileService],
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
})
export class FileModule {}
