
import { Injectable } from '@nestjs/common';
import { fileTypes } from './dtos/validation-result.dto';
import { PrismaService } from '@/prisma/prisma.service';
import { Role } from '@prisma/client';
@Injectable()
export class SeedDatabase {
  constructor(private readonly prismaService: PrismaService) {}

  async seed(data: Array<Record<string, any>>, tableName: fileTypes) {
    const results = {
      errors: [] as any[],
      erroneousItems: [] as any[],
      successfulRecords: 0,
    };

    const operations = data.map(async (item) => {
      try {
        await this.processItem(item, tableName);
        results.successfulRecords++;
      } catch (error) {
        results.errors.push(error);
        results.erroneousItems.push(item);
      }
    });

    await Promise.all(operations);

    return results;
  }

  private async processItem(item: Record<string, any>, tableName: fileTypes) {
    if (tableName === fileTypes.STUDENT || tableName === fileTypes.TEACHER) {
      return this.processUserRelatedEntity(item, tableName);
    } else if (tableName === fileTypes.SGCOURSE) {
      return this.processStudentGroupCourse(item);
    } else {
      return this.processGenericEntity(item, tableName);
    }
  }

  private async processUserRelatedEntity(item: Record<string, any>, tableName: fileTypes) {
    const userData = {
      userId: item.userId,
      firstName: item.firstName,
      lastName: item.lastName,
      email: item.email,
      passwordHash: item.passwordHash ?? 'default_hash', // Provide default if needed
      role: tableName === fileTypes.STUDENT ? Role.STUDENT : Role.TEACHER,
      phone: item.phone,
      needWheelchairAccessibleRoom: item.needWheelchairAccessibleRoom ?? false,
    };

    const user = await this.prismaService.user.create({ data: userData });

    const entityData = tableName === fileTypes.STUDENT 
      ? { userId: user.userId, studentGroupId: item.studentGroupId ?? null }
      : { userId: user.userId, departmentId: item.departmentId };

    await this.prismaService[tableName].create({ data: entityData });
  }

  private async processStudentGroupCourse(item: Record<string, any>) {
    await this.prismaService.studentGroup.update({
      where: { studentGroupId: item.studentGroupId },
      data: {
        courses: {
          connect: { courseId: item.courseId },
        },
      },
    });
  }

  private async processGenericEntity(item: Record<string, any>, tableName: fileTypes) {
    const table = this.selectTable(tableName);
    await table.create({ data: item });
  }

  private selectTable(tableName: fileTypes) {
    const tableMap: Record<fileTypes, any> = {
      [fileTypes.TEACHER]: this.prismaService.teacher,
      [fileTypes.COURSE]: this.prismaService.course,
      [fileTypes.CLASSROOM]: this.prismaService.classroom,
      [fileTypes.DEPARTMENT]: this.prismaService.department,
      [fileTypes.STUDENT]: this.prismaService.student,
      [fileTypes.STUDENTGROUP]: this.prismaService.studentGroup,
      [fileTypes.SGCOURSE]: this.prismaService.studentGroup, // Note: Not used in create operations
    };

    const table = tableMap[tableName];
    if (!table) {
      throw new Error(`Unsupported table type: ${tableName}`);
    }
    return table;
  }
}