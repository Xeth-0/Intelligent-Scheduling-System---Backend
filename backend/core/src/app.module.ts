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
import { TeachersModule } from './modules/teachers/teachers.module';
import { ClassroomsModule } from './modules/classrooms/classrooms.module';
import { CoursesModule } from './modules/courses/courses.module';
import { dbConfig, jwtConfig, validateEnv, servicesConfig } from './config';
import { BuildingsModule } from './modules/buildings/buildings.module';
import { StudentGroupsModule } from './modules/student-groups/student-groups.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { FileModule } from './modules/file/file.module';
import { ConstraintsModule } from './modules/constraints/constraints.module';
import { ValidationService } from './modules/file/validation.service';

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
    FileModule,
    UsersModule,
    HealthModule,
    TeachersModule,
    ClassroomsModule,
    CoursesModule,
    BuildingsModule,
    DepartmentsModule,
    StudentGroupsModule,
    ConstraintsModule,
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
