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
import { Role } from '@prisma/client';
@Injectable()
export class SeedDatabase {
  constructor(private readonly prismaService: PrismaService) {}
  private logger = new Logger(SeedDatabase.name);
  async seed(data: ValidatedDataType[], tableName: fileTypes) {
    const results = {
      errors: [] as Error[],
      erroneousItems: [] as ValidatedDataType[],
      successfulRecords: 0,
    };

    const operations = data.map(async (item) => {
      try {
        await this.processItem(item, tableName);
        results.successfulRecords++;
      } catch (error) {
        results.errors.push(
          error instanceof Error ? error : new Error(error as string),
        );
        results.erroneousItems.push(item);
        this.logger.error('Error processing item', item, error);
      }
    });

    await Promise.all(operations);
    this.logger.debug(results.errors);
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
