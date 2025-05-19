import axios from 'axios';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { SchedulingApiResponseDto } from './dtos/schedulingApiResponse.dto';

@Injectable()
export class SchedulingService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async generateSchedule() {
    // Prepare the data for the generate schedule endpoint
    // first teacher in the list takes that course for now
    // ! Schema needs updating to disallow multiple teachers per course
    const courses = await this.prismaService.course.findMany({
      include: {
        teachers: true,
        studentGroups: true,
      },
    });

    const teachers = await this.prismaService.teacher.findMany({
      include: {
        user: true,
      },
    });

    const studentGroups = await this.prismaService.studentGroup.findMany({
      include: {
        students: true,
      },
    });

    const rooms = await this.prismaService.classroom.findMany({
      include: {
        building: true,
      },
    });

    const payload = {
      courses: courses.map((course) => ({
        courseId: course.courseId,
        name: course.name,
        description: course.description ?? 'some fucking description',
        ectsCredits: 0,
        department: course.departmentId,
        teacherId: course.teachers[0].teacherId,
        studentGroupIds: course.studentGroups.map(
          (studentGroup) => studentGroup.studentGroupId,
        ),
        sessionType: course.sessionType,
        sessionsPerWeek: course.sessionsPerWeek,
      })),
      teachers: teachers.map((teacher) => ({
        teacherId: teacher.teacherId,
        name: `${teacher.user.firstName} ${teacher.user.lastName}`,
        email: teacher.user.email,
        phone: teacher.user.phone,
        department: teacher.departmentId,
        needsWheelchairAccessibleRoom:
          teacher.user.needWheelchairAccessibleRoom,
      })),
      studentGroups: studentGroups.map((studentGroup) => ({
        studentGroupId: studentGroup.studentGroupId,
        name: studentGroup.name,
        size: studentGroup.students.length,
        department: studentGroup.departmentId,
        accessibilityRequirement: studentGroup.accessibilityRequirement,
      })),
      rooms: rooms.map((room) => ({
        classroomId: room.classroomId,
        name: room.name,
        capacity: room.capacity,
        type: room.type,
        buildingId: room.buildingId || 'some building id',
        floor: room.building?.floor ?? 0,
        isWheelchairAccessible: room.isWheelchairAccessible,
      })),
    };

    // Call the generate schedule endpoint
    const route = this.configService.get<string>('SCHEDULING_SERVICE_URL');
    try {
      const jsonPayload = JSON.stringify(payload);

      const response = await axios.post(
        `${route}/api/scheduler/`,
        jsonPayload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.status !== 201) {
        throw new Error('Failed to generate schedule');
      }
      const responseDto = plainToInstance(
        SchedulingApiResponseDto,
        response.data as unknown,
      );
      console.log('payload sent to scheduling service: ', jsonPayload);
      console.log(responseDto);

      // Save the schedule to the database
      const schedule = responseDto.data.best_schedule;

      const newSchedule = await this.prismaService.schedule.create({
        data: {
          scheduleItems: {
            createMany: {
              data: schedule.map((scheduledItem) => ({
                courseId: scheduledItem.courseId,
                teacherId: scheduledItem.teacherId,
                studentGroupId: scheduledItem.studentGroupIds[0],
                sessionType: scheduledItem.sessionType,
                classroomId: scheduledItem.classroomId,
                startTime: scheduledItem.timeslot.split('-')[0],
                endTime: scheduledItem.timeslot.split('-')[1],
                day: scheduledItem.day,
              })),
            },
          },
        },
      });

      // Return the Schedule
      return schedule;
    } catch (e: unknown) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        throw new Error(e.message);
      }
      throw e;
    }
  }
}
