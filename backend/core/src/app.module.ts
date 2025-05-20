import './common/sentry/instrument';

import { SentryGlobalFilter } from '@sentry/nestjs/setup';
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { SentryModule } from '@sentry/nestjs/setup';
import { AppService } from './app.service';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { HealthModule } from './modules/health/health.module';
import { SchedulingModule } from './modules/scheduling/scheduling.module';
import { dbConfig, jwtConfig, validateEnv, servicesConfig } from './config';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [dbConfig, jwtConfig, servicesConfig],
      validate: validateEnv,
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
