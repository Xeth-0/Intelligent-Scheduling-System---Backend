import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import {
  Course,
  Classroom,
  Prisma,
  Teacher,
  StudentGroup,
  ScheduledSession,
  Timeslot,
  Role,
  Schedule,
} from '@prisma/client';
import axios from 'axios';
import { plainToInstance } from 'class-transformer';
import { SchedulingApiResponseDto } from './dtos/schedule.microservice.dto';
import { GeneralScheduleResponse } from './dtos/schedule.dto';
import { SearchSessionsBody } from './dtos/scheduleSearch.dto';
import { ISchedulingService } from '../__interfaces__/scheduling.service.interface';
import { ConstraintService } from '../constraints/constraints.service';
import { TimeslotService } from '../timeslots/timeslots.service';
@Injectable()
export class SchedulingService implements ISchedulingService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
    private readonly timeslotService: TimeslotService,
    private readonly constraintService: ConstraintService,
  ) {}

  /**
   * Helper function to map a scheduled session to its DTO representation.
   */
  private _mapSessionToResponse(
    session: ScheduledSession & {
      course: Course;
      teacher: Teacher;
      timeslot: Timeslot;
      classroom: Classroom | null;
      studentGroup: StudentGroup | null;
    },
  ) {
    const teacher = session.teacher as unknown as {
      user: {
        firstName: string;
        lastName: string;
      };
    };
    return {
      courseId: session.courseId,
      courseName: session.course.name,
      teacherId: session.teacherId,
      teacherName: teacher.user.firstName + ' ' + teacher.user.lastName,
      classroomId: session.classroomId,
      classroomName: session.classroom?.name ?? 'None',
      classGroupIds: session.studentGroupId,
      sessionType: session.sessionType,
      timeslot: session.timeslot.startTime + '-' + session.timeslot.endTime,
      day: session.day,
    };
  }

  private _mapScheduleToResponse(
    schedule: Schedule,
    sessions?: (ScheduledSession & {
      course: Course;
      teacher: Teacher;
      timeslot: Timeslot;
      classroom: Classroom | null;
      studentGroup: StudentGroup | null;
    })[],
  ) {
    if (sessions) {
      return plainToInstance(GeneralScheduleResponse, {
        scheduleId: schedule.scheduleId,
        scheduleName: schedule.scheduleName,
        isActive: schedule.active,
        sessions: sessions.map((session) =>
          this._mapSessionToResponse(session),
        ),
      });
    }
    return plainToInstance(GeneralScheduleResponse, {
      scheduleId: schedule.scheduleId,
      scheduleName: schedule.scheduleName,
      isActive: schedule.active,
    });
  }

  /**
   * Finds a schedule by its ID and checks if the user has permission to access it
   * @param scheduleId - ID of the schedule to find
   * @param userId - ID of the user finding the schedule
   * @returns Promise with the schedule and admin details and the admin if the user is an admin
   */
  private async _findSchedule(scheduleId: string, userId: string) {
    const admin = await this.prismaService.admin.findFirst({
      where: {
        userId: userId,
      },
    });
    if (!admin) {
      console.log(`user is not an admin. User: ${userId}`);
      console.log('looking for the user in the database');
      const user = await this.prismaService.user.findFirst({
        where: {
          userId: userId,
        },
        include: {
          student: {
            include: {
              studentGroup: {
                include: {
                  department: true,
                },
              },
            },
          },
          teacher: {
            include: {
              department: true,
            },
          },
        },
      });

      let campusId: string | undefined = undefined;
      if (!user) {
        throw new UnauthorizedException('User not found');
      } else if (user.student) {
        console.log('user is a student');
        campusId = user.student.studentGroup?.department.campusId;
      } else if (user.teacher) {
        console.log('user is a teacher');
        campusId = user.teacher.department.campusId;
      } else {
        throw new UnauthorizedException('User not found');
      }

      if (!campusId) {
        throw new UnauthorizedException('User not found');
      }

      console.log(`fetching active schedule for campus: ${campusId}`);
      const schedule = await this.prismaService.schedule.findFirst({
        where: {
          campusId: campusId,
          active: true,
        },
      });
      console.log(`schedule: `, schedule);
      if (!schedule) {
        throw new NotFoundException('No active schedule found');
      }
      return { admin: null, schedule };
    }

    const schedule = await this.prismaService.schedule.findFirst({
      where: {
        scheduleId: scheduleId,
      },
    });
    if (!schedule) {
      console.error('Schedule not found');
      throw new NotFoundException('Schedule not found');
    }
    if (schedule.campusId !== admin.campusId) {
      throw new ForbiddenException(
        'You do not have permission to access this schedule',
      );
    }
    return { admin, schedule };
  }

  async getActiveSchedule(userId: string) {
    const user = await this.prismaService.user.findFirst({
      where: {
        userId: userId,
      },
      include: {
        admin: true,
        teacher: {
          include: {
            department: true,
          },
        },
        student: {
          include: {
            studentGroup: {
              include: {
                department: true,
              },
            },
          },
        },
      },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    let campusId: string | undefined = undefined;

    if (user.role === Role.STUDENT) {
      campusId = user.student?.studentGroup?.department.campusId;
    } else if (user.role === Role.TEACHER) {
      campusId = user.teacher?.department.campusId;
    } else if (user.role === Role.ADMIN) {
      campusId = user.admin?.campusId;
    }
    if (!campusId) {
      throw new UnauthorizedException('User not found');
    }

    const schedule = await this.prismaService.schedule.findFirst({
      where: {
        campusId: campusId,
        active: true,
      },
    });
    if (!schedule) {
      throw new NotFoundException('No active schedule found');
    }

    return await this.getScheduleById(userId, schedule.scheduleId);
  }

  /**
   * Activates a specified schedule and deactivates all other schedules for the campus
   * @param userId - ID of the admin user activating the schedule
   * @param scheduleId - ID of the schedule to activate
   * @returns Promise with the activated schedule details
   */
  async activateSchedule(userId: string, scheduleId: string) {
    const { admin, schedule } = await this._findSchedule(scheduleId, userId);
    if (schedule.active) {
      throw new BadRequestException('Schedule is already active');
    } else if (!admin) {
      throw new ForbiddenException('User is not an admin');
    }

    try {
      // Deactivate any currently active schedules for this campus. (Only one can be active at a time)
      await this.prismaService.schedule.updateMany({
        where: {
          campusId: admin.campusId,
          active: true,
        },
        data: {
          active: false,
        },
      });

      const activatedSchedule = await this.prismaService.schedule.update({
        where: {
          scheduleId: scheduleId,
        },
        data: {
          active: true,
        },
      });

      return this.getScheduleById(userId, activatedSchedule.scheduleId);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `DB error activating schedule: ${e.message}`,
        );
      }
      throw e;
    }
  }

  /**
   * Retrieves details of a specific schedule
   * @param userId - ID of the admin user requesting the schedule
   * @param scheduleId - ID of the schedule to retrieve
   * @returns Promise with the schedule details
   */
  async getScheduleById(userId: string, scheduleId: string) {
    try {
      console.log(`fetching the schedule by the given Id. User: ${userId}`);
      const { schedule } = await this._findSchedule(scheduleId, userId);
      const sessions = await this._fetchSessions(scheduleId);

      return this._mapScheduleToResponse(schedule, sessions);
    } catch (e) {
      throw e;
    }
  }

  /**
   * Fetches sessions for a specified schedule
   * @param scheduleId - ID of the schedule to fetch sessions for
   * @param sessionArgs - Optional Prisma query arguments for filtering and including relations
   * @returns Promise with array of scheduled sessions
   */
  private async _fetchSessions(
    scheduleId: string,
    sessionArgs: {
      where?: Prisma.ScheduledSessionWhereInput;
      include?: Prisma.ScheduledSessionInclude;
      orderBy?: Prisma.ScheduledSessionOrderByWithRelationInput;
    } = {},
  ) {
    const defaultIncludes: Prisma.ScheduledSessionInclude = {
      course: true,
      teacher: {
        include: {
          user: true,
        },
      },
      classroom: {
        include: {
          campus: true,
          building: true,
        },
      },
      studentGroup: true,
      timeslot: true,
    };

    const schedule = await this.prismaService.schedule.findUnique({
      where: {
        scheduleId: scheduleId,
      },
    });
    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }
    const sessions = await this.prismaService.scheduledSession.findMany({
      where: {
        scheduleId: scheduleId,
        ...sessionArgs.where,
      },
      include: {
        ...defaultIncludes,
        // ...sessionArgs.include,
      },
      orderBy: sessionArgs.orderBy,
    });
    return sessions;
  }

  /**
   * Retrieves all schedules for a campus
   * @param userId - ID of the admin user requesting the schedules
   * @returns Promise with array of all campus schedules
   */
  async getAllSchedules(userId: string) {
    const admin = await this.prismaService.admin.findFirst({
      where: {
        userId: userId,
      },
    });
    if (!admin) {
      throw new ForbiddenException('User is not an admin');
    }

    const schedules = await this.prismaService.schedule.findMany({
      where: {
        campusId: admin.campusId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return schedules.map((schedule) => this._mapScheduleToResponse(schedule));
  }

  async searchSessions(userId: string, body: SearchSessionsBody) {
    const { admin, schedule } = await this._findSchedule(
      body.scheduleId,
      userId,
    );

    // Non-admins can't view inactive schedules, and admins can only view inactive schedules for their own campus
    if (
      (!admin && !schedule.active) ||
      (admin && admin.campusId !== schedule.campusId)
    ) {
      throw new ForbiddenException(
        'You do not have permission to access this schedule',
      );
    }

    try {
      const sessions = await this._fetchSessions(schedule.scheduleId, {
        where: {
          teacher: {
            teacherId: body.teacherId,
            user: {
              firstName: body.teacherFirstName,
              lastName: body.teacherLastName,
            },
          },
          course: {
            courseId: body.courseId,
            name: body.courseName,
            sessionType: body.sessionType,
          },
          classroom: {
            classroomId: body.classroomId,
            name: body.classroomName,
            isWheelchairAccessible: body.classroomAccessibility,
            building: {
              buildingId: body.classroomBuildingId,
              name: body.classroomBuildingName,
            },
          },
          studentGroup: {
            studentGroupId: body.studentGroupId,
            name: body.studentGroupName,
            accessibilityRequirement: body.studentGroupAccessibility,
          },
          day: body.day,
        },
      });

      return this._mapScheduleToResponse(schedule, sessions);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generates a new schedule based on available courses, teachers,
   * student groups, and rooms from the database.
   * The newly generated schedule is automatically activated,
   * deactivating any previously active schedules for the campus.
   * @param userId - ID of the admin user generating the schedule
   * @returns Promise with the generated schedule details
   */
  async generateSchedule(userId: string, scheduleName: string) {
    const admin = await this.prismaService.admin.findFirst({
      where: {
        userId: userId,
      },
    });
    if (!admin) {
      throw new ForbiddenException('User is not an admin');
    }

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

    // Get constraints and timeslots for the campus
    const constraints =
      await this.constraintService.getConstraintsForScheduling(admin.campusId);

    console.log('constraints', constraints);
    const timeslots = await this.timeslotService.getAllTimeslots();

    const payload = {
      courses: courses.map((course) => ({
        courseId: course.courseId,
        name: course.name,
        description: course.description ?? 'No description available',
        ectsCredits: course.ectsCredits,
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
        buildingId: room.buildingId,
        floor: room.building?.floor ?? 0,
        isWheelchairAccessible: room.isWheelchairAccessible,
      })),

      // Include constraints for the genetic algorithm
      constraints: constraints,

      // Include standardized timeslots
      timeslots: timeslots.map((slot: Timeslot) => ({
        timeslotId: slot.timeslotId,
        code: slot.code,
        label: slot.label,
        startTime: slot.startTime,
        endTime: slot.endTime,
        order: slot.order,
      })),
    };

    // Call the generate schedule endpoint
    const route = this.configService.get<string>(
      'services.scheduling_microservice.url',
    );

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
      const mappedSchedulingData = plainToInstance(
        SchedulingApiResponseDto,
        response.data as unknown,
      );

      const schedule = mappedSchedulingData.data.best_schedule;

      const timeslotMap = new Map(timeslots.map((slot) => [slot.code, slot]));

      const scheduleItemsData = await Promise.all(
        schedule.map((scheduledSession) => {
          const timeslotCode = scheduledSession.timeslot;
          const timeslot = timeslotMap.get(timeslotCode);
          if (!timeslot) {
            throw new InternalServerErrorException(
              `Error generating schedule: Timeslot not found for code: ${timeslotCode}`,
            );
          }

          return {
            courseId: scheduledSession.courseId,
            teacherId: scheduledSession.teacherId,
            studentGroupId: scheduledSession.studentGroupIds[0],
            sessionType: scheduledSession.sessionType,
            classroomId: scheduledSession.classroomId,
            timeslotId: timeslot.timeslotId,
            day: scheduledSession.day,
          };
        }),
      );

      const newSchedule = await this.prismaService.schedule.create({
        data: {
          generatedByAdminId: admin.adminId,
          campusId: admin.campusId,
          scheduleName: scheduleName,
          scheduleItems: {
            createMany: {
              data: scheduleItemsData,
            },
          },
        },
      });

      await this.activateSchedule(userId, newSchedule.scheduleId);
      return this.getScheduleById(userId, newSchedule.scheduleId);
    } catch (e: unknown) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `DB error generating schedule: ${e.message}`,
        );
      }
      throw e;
    }
  }
}
