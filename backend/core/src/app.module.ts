import "./common/sentry/instrument";

import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { SentryModule } from '@sentry/nestjs/setup';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { SentryGlobalFilter } from '@sentry/nestjs/setup';
import { UsersModule } from './modules/users/users.module';
import { HealthModule } from './modules/health/health.module';
import { SchedulingModule } from './modules/scheduling/scheduling.module';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule, // Injectable anywhere for orm queries
    AuthModule,
    SchedulingModule,

    UsersModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
  ],
})
export class AppModule {}
