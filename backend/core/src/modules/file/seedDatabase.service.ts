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
    taskId: taskId,
    severity: TaskSeverity.ERROR,
    createdAt: new Date(),
  } as TaskError;
}

@Injectable()
export class SeedDatabase {
  constructor(private readonly prismaService: PrismaService) {}
  private logger = new Logger(SeedDatabase.name);
  async seed(
    data: ValidatedDataType[],
    tableName: fileTypes,
    taskid: string,
    adminId: string,
    adminCampusId: string,
  ) {
    const results = {
      errors: [] as TaskError[],
      erroneousItems: [] as ValidatedDataType[],
      successfulRecords: 0,
    };

    // Process items sequentially to avoid race conditions
    for (let idx = 0; idx < data.length; idx++) {
      const item = data[idx];
      try {
        await this.processItem(item, tableName, adminCampusId);
        results.successfulRecords++;
      } catch (error) {
        results.errors.push(formatPrismaError(error, idx + 1, taskid));
        results.erroneousItems.push(item);
        this.logger.error('Error processing item', item, error);
      }
    }

    return results;
  }

  private async processItem(
    item: ValidatedDataType,
    tableName: fileTypes,
    adminCampusId: string,
  ) {
    switch (tableName) {
      case fileTypes.TEACHER:
        await this.createTeacher(item as Teacher, adminCampusId);
        break;
      case fileTypes.COURSE:
        await this.createCourse(item as Course, adminCampusId);
        break;
      case fileTypes.CLASSROOM:
        await this.createClassroom(item as Classroom, adminCampusId);
        break;
      case fileTypes.DEPARTMENT:
        await this.createDepartment(item as Department, adminCampusId);
        break;
      case fileTypes.STUDENT:
        await this.createStudent(item as Student, adminCampusId);
        break;
      case fileTypes.STUDENTGROUP:
        await this.createStudentGroup(item as StudentGroup, adminCampusId);
        break;
      case fileTypes.SGCOURSE:
        await this.updateSGCourse(item as SGCourse, adminCampusId);
        break;
      default:
        throw new Error('Invalid table name');
    }
  }

  private async createTeacher(item: Teacher, adminCampusId: string) {
    // Use transaction to ensure both User and Teacher are created together
    return await this.prismaService.$transaction(async (tx) => {
      // Prefix teacherID with campusID to ensure uniqueness across campuses
      const userId = `${item.teacherId}`;

      // Also prefix departmentId to match the department that was created
      const departmentId = `${adminCampusId}${item.departmentId}`;

      // Upsert user to handle conflicts gracefully
      const user = await tx.user.upsert({
        where: { userId },
        update: {
          firstName: item.firstName,
          lastName: item.lastName,
          email: item.email,
          phone: item.phone,
          needWheelchairAccessibleRoom:
            item.needWheelchairAccessibleRoom ?? false,
        },
        create: {
          userId,
          firstName: item.firstName,
          lastName: item.lastName,
          email: item.email,
          passwordHash: item.passwordHash || 'default_hash',
          role: Role.TEACHER,
          phone: item.phone,
          needWheelchairAccessibleRoom:
            item.needWheelchairAccessibleRoom ?? false,
        },
      });

      // Upsert teacher to handle conflicts gracefully
      await tx.teacher.upsert({
        where: { teacherId: userId },
        update: {
          departmentId: departmentId,
        },
        create: {
          teacherId: userId,
          departmentId: departmentId,
          userId: user.userId,
        },
      });
    });
  }

  private async createStudent(item: Student, adminCampusId: string) {
    // Use transaction to ensure both User and Student are created together
    return await this.prismaService.$transaction(async (tx) => {
      const userId = item.studentId;

      // Upsert user to handle conflicts gracefully
      const user = await tx.user.upsert({
        where: { userId },
        update: {
          firstName: item.firstName,
          lastName: item.lastName,
          email: item.email,
          phone: item.phone,
          needWheelchairAccessibleRoom:
            item.needWheelchairAccessibleRoom ?? false,
        },
        create: {
          userId,
          firstName: item.firstName,
          lastName: item.lastName,
          email: item.email,
          passwordHash: item.passwordHash || 'default_hash',
          role: Role.STUDENT,
          phone: item.phone,
          needWheelchairAccessibleRoom:
            item.needWheelchairAccessibleRoom ?? false,
        },
      });

      // Upsert student to handle conflicts gracefully
      await tx.student.upsert({
        where: { studentId: userId },
        update: {
          studentGroupId: item.studentGroupId,
        },
        create: {
          studentId: userId,
          studentGroupId: item.studentGroupId,
          userId: user.userId,
        },
      });
    });
  }

  private async createCourse(item: Course, adminCampusId: string) {
    // Prefix departmentId with campusID to match the department that was created
    const departmentId = `${adminCampusId}${item.departmentId}`;

    // Use upsert to handle conflicts gracefully
    await this.prismaService.course.upsert({
      where: { courseId: item.courseId },
      update: {
        name: item.name,
        code: item.code,
        departmentId,
        description: item.description,
        sessionType: item.sessionType,
        sessionsPerWeek: item.sessionsPerWeek,
      },
      create: {
        ...item,
        departmentId,
      },
    });
  }

  private async createClassroom(item: Classroom, adminCampusId: string) {
    // Use transaction to handle building creation and classroom creation atomically
    return await this.prismaService.$transaction(async (tx) => {
      const buildingId = item.buildingId;

      if (buildingId) {
        // Use upsert to handle building conflicts gracefully
        await tx.building.upsert({
          where: { buildingId },
          update: {
            name: `Building ${buildingId}`,
            floor: item.floor || 1,
          },
          create: {
            buildingId,
            name: `Building ${buildingId}`,
            floor: item.floor || 1,
          },
        });
      }

      // Use upsert to handle classroom conflicts gracefully
      await tx.classroom.upsert({
        where: { classroomId: item.classroomId },
        update: {
          name: item.name,
          capacity: item.capacity,
          type: item.type,
          buildingId: item.buildingId,
          isWheelchairAccessible: item.isWheelchairAccessible,
          openingTime: item.openingTime,
          closingTime: item.closingTime,
          floor: item.floor,
          campusId: adminCampusId,
        },
        create: {
          ...item,
          campusId: adminCampusId,
        },
      });
    });
  }

  private async createDepartment(item: Department, adminCampusId: string) {
    // Use upsert to handle conflicts gracefully
    // Prefix deptId with campusID to ensure uniqueness across campuses
    const deptId = `${adminCampusId}${item.deptId}`;

    console.log('Creating department: ', { ...item, deptId }, adminCampusId);
    await this.prismaService.department.upsert({
      where: { deptId },
      update: {
        name: item.name,
        campusId: adminCampusId,
      },
      create: {
        deptId,
        name: item.name,
        campusId: adminCampusId,
      },
    });
  }

  private async createStudentGroup(item: StudentGroup, adminCampusId: string) {
    // Prefix departmentId with campusID to match the department that was created
    const departmentId = `${adminCampusId}${item.departmentId}`;

    // Use upsert to handle conflicts gracefully
    await this.prismaService.studentGroup.upsert({
      where: { studentGroupId: item.studentGroupId },
      update: {
        name: item.name,
        size: item.size,
        accessibilityRequirement: item.accessibilityRequirement,
        departmentId,
      },
      create: {
        ...item,
        departmentId,
      },
    });
  }

  private async updateSGCourse(item: SGCourse, adminCampusId: string) {
    // Create course instance for specific student group + teacher combination
    return await this.prismaService.$transaction(async (tx) => {
      // Get the course template from the courses table
      const courseTemplate = await tx.course.findUnique({
        where: { courseId: item.courseId },
      });

      if (!courseTemplate) {
        throw new Error(
          `Course template not found for courseId: ${item.courseId}`,
        );
      }

      // Prefix teacherId with campusID to match the teacher that was created
      const prefixedTeacherId = `${item.teacherId}`;

      // Verify teacher exists
      const teacher = await tx.teacher.findUnique({
        where: { teacherId: prefixedTeacherId },
      });

      if (!teacher) {
        throw new Error(
          `Teacher not found for teacherId: ${prefixedTeacherId} (original: ${item.teacherId})`,
        );
      }

      // Create unique course instance ID following seeding pattern
      // Format: originalCourseId-INSTANCE-studentGroupId-teacherId
      const instanceId = `${item.courseId}-INST-${item.studentGroupId}-${item.teacherId}`;

      // Create unique course code
      const instanceCode = `${courseTemplate.code}-${item.studentGroupId}`;

      // Create course instance
      const courseInstance = await tx.course.create({
        data: {
          courseId: instanceId,
          name: courseTemplate.name,
          code: instanceCode,
          description: courseTemplate.description,
          departmentId: courseTemplate.departmentId,
          ectsCredits: courseTemplate.ectsCredits,
          sessionType: courseTemplate.sessionType,
          sessionsPerWeek: courseTemplate.sessionsPerWeek,
          teacherId: prefixedTeacherId,
        },
      });

      // Connect student group to this course instance
      await tx.course.update({
        where: { courseId: courseInstance.courseId },
        data: {
          studentGroups: {
            connect: { studentGroupId: item.studentGroupId },
          },
        },
      });

      console.log(
        `Created course instance: ${courseTemplate.name} for group ${item.studentGroupId} with teacher ${prefixedTeacherId}`,
      );
    });
  }
}
