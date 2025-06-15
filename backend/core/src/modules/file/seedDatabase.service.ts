import { Injectable, Logger } from '@nestjs/common';
import {
  Classroom,
  Course,
  Department,
  fileTypes,
  SGCourse,
  Student,
  StudentGroup,
  Teacher,
  ValidatedDataType,
} from './dtos/validation-result.dto';
import { PrismaService } from '@/prisma/prisma.service';
import { Role, TaskSeverity } from '@prisma/client';

import { Prisma } from '@prisma/client';
import { TaskError } from './dtos/task.dto';

const extractColumnFromMeta = (
  error: Prisma.PrismaClientKnownRequestError,
): string => {
  // Case 1: Prisma provides the exact column(s)
  if (Array.isArray(error.meta?.target) && error.meta.target.length > 0) {
    return error.meta.target[0] as string;
  }

  // Case 2: Constraint string contains column info
  if (typeof error.meta?.constraint === 'string') {
    // Try pattern like "Course_departmentId_fkey"
    // const match = error.meta.constraint.match(/_(\w+)_fkey$/);
    const regex = /_(\w+)_fkey$/;
    const match = regex.exec(error.meta.constraint);
    if (match) {
      if (match) {
        return match[1];
      }
      return match[1];
    }

    // Fallback for underscore-separated constraint names
    const parts = error.meta.constraint.split('_');
    if (parts.length >= 2) {
      return parts.slice(1, -1).join('_'); // best guess
    }
  }

  return ''; // Unknown
};

const convertErrorToTaskError = (
  error: Prisma.PrismaClientKnownRequestError,
  rowNumber: number,
  message: string,
  severity: TaskSeverity,
  taskId: string,
): TaskError => {
  const column = extractColumnFromMeta(error);
  return {
    row: rowNumber,
    column,
    message,
    taskId,
    createdAt: new Date(),
    severity,
  };
};

function formatPrismaError(
  error: unknown,
  rowNumber: number,
  taskId: string,
): TaskError {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    console.log('error Meta: ', error.meta);
    switch (error.code) {
      case 'P2002':
        return convertErrorToTaskError(
          error,
          rowNumber,
          'Duplicate entry for unique field',
          TaskSeverity.ERROR,
          taskId,
        );
      case 'P2003':
        return convertErrorToTaskError(
          error,
          rowNumber,
          'Foreign key constraint failed - referenced item not found',
          TaskSeverity.ERROR,
          taskId,
        );
      case 'P2000':
        return convertErrorToTaskError(
          error,
          rowNumber,
          'Field value too long',
          TaskSeverity.ERROR,
          taskId,
        );
      case 'P2025':
        return convertErrorToTaskError(
          error,
          rowNumber,
          'Entity not found',
          TaskSeverity.ERROR,
          taskId,
        );
      default:
        return convertErrorToTaskError(
          error,
          rowNumber,
          `Database error - ${error.message}`,
          TaskSeverity.ERROR,
          taskId,
        );
    }
  }
  return {
    row: rowNumber,
    column: '',
    message: 'Unknown database error',
    taskId: '',
    severity: 'ERROR',
    createdAt: new Date(),
  } as TaskError;
}

@Injectable()
export class SeedDatabase {
  constructor(private readonly prismaService: PrismaService) {}
  private logger = new Logger(SeedDatabase.name);
  async seed(data: ValidatedDataType[], tableName: fileTypes, taskid: string) {
    const results = {
      errors: [] as TaskError[],
      erroneousItems: [] as ValidatedDataType[],
      successfulRecords: 0,
    };

    const operations = data.map(async (item, idx) => {
      try {
        await this.processItem(item, tableName);
        results.successfulRecords++;
      } catch (error) {
        results.errors.push(formatPrismaError(error, idx + 1, taskid));

        results.erroneousItems.push(item);
        this.logger.error('Error processing item', item, error);
      }
    });

    await Promise.all(operations);
    return results;
  }

  private async processItem(item: ValidatedDataType, tableName: fileTypes) {
    switch (tableName) {
      case fileTypes.TEACHER:
        await this.createTeacher(item as Teacher);
        break;
      case fileTypes.COURSE:
        await this.createCourse(item as Course);
        break;
      case fileTypes.CLASSROOM:
        await this.createClassroom(item as Classroom);
        break;
      case fileTypes.DEPARTMENT:
        await this.createDepartment(item as Department);
        break;
      case fileTypes.STUDENT:
        await this.createStudent(item as Student);
        break;
      case fileTypes.STUDENTGROUP:
        await this.createStudentGroup(item as StudentGroup);
        break;
      case fileTypes.SGCOURSE:
        await this.updateSGCourse(item as SGCourse);
        break;
      default:
        throw new Error('Invalid table name');
    }
  }
  private async createUser(item: Teacher | Student, tableName: fileTypes) {
    // eslint-disable-next-line @typescript-eslint/dot-notation
    const userId = (item['teacherId'] ?? item['studentId']) as string;

    const userData = {
      userId: userId,
      firstName: item.firstName,
      lastName: item.lastName,
      email: item.email,
      passwordHash: item.passwordHash ?? 'default_hash', // Provide default if needed
      role: tableName === fileTypes.STUDENT ? Role.STUDENT : Role.TEACHER,
      phone: item.phone,
      needWheelchairAccessibleRoom: item.needWheelchairAccessibleRoom ?? false,
    };
    const user = await this.prismaService.user.create({ data: userData });
    return user;
  }
  private async createTeacher(item: Teacher) {
    const user = await this.createUser(item, fileTypes.TEACHER);
    const teacher = {
      teacherId: user.userId,
      departmentId: item.departmentId,
      userId: user.userId,
    };
    await this.prismaService.teacher.create({
      data: teacher,
    });
  }
  private async createStudent(item: Student) {
    const user = await this.createUser(item, fileTypes.STUDENT);
    const student = {
      studentId: user.userId,
      studentGroupId: item.studentGroupId,
      userId: user.userId,
    };
    await this.prismaService.student.create({
      data: student,
    });
  }
  private async createCourse(item: Course) {
    await this.prismaService.course.create({
      data: item,
    });
  }
  private async createClassroom(item: Classroom) {
    await this.prismaService.classroom.create({
      data: item,
    });
  }
  private async createDepartment(item: Department) {
    await this.prismaService.department.create({
      data: item,
    });
  }
  private async createStudentGroup(item: StudentGroup) {
    await this.prismaService.studentGroup.create({
      data: item,
    });
  }
  private async updateSGCourse(item: SGCourse) {
    await this.prismaService.studentGroup.update({
      where: { studentGroupId: item.studentGroupId },
      data: {
        courses: {
          connect: { courseId: item.courseId },
        },
      },
    });
  }
}
