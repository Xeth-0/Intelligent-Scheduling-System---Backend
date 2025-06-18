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
import { ScheduleEvaluationResponse } from './dtos/schedule.dto';
import { ISchedulingService } from '../__interfaces__/scheduling.service.interface';
import { ConstraintService } from '../constraints/constraints.service';
import { TimeslotService } from '../timeslots/timeslots.service';
import * as puppeteer from 'puppeteer';
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
        createdAt: schedule.createdAt,
        sessions: sessions.map((session) =>
          this._mapSessionToResponse(session),
        ),
      });
    }
    return plainToInstance(GeneralScheduleResponse, {
      scheduleId: schedule.scheduleId,
      scheduleName: schedule.scheduleName,
      createdAt: schedule.createdAt,
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

    // handle teacherID (can sometimes be userID)
    if (body.teacherId) {
      const teacher = await this.prismaService.teacher.findFirst({
        where: {
          teacherId: body.teacherId,
        },
      });
      if (!teacher) {
        // check if the given ID is a userID instead
        const user = await this.prismaService.user.findFirst({
          where: {
            userId: body.teacherId,
          },
          include: {
            teacher: true,
          },
        });
        if (user && user.teacher) {
          body.teacherId = user.teacher.teacherId;
        } else {
          throw new BadRequestException('Invalid teacher ID');
        }
      }
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
   * Exports a schedule as PDF based on search parameters
   * @param userId - ID of the user requesting the export
   * @param body - Search parameters to filter the schedule
   * @returns Buffer containing the PDF data
   */
  async exportScheduleToPdf(
    userId: string,
    body: SearchSessionsBody,
  ): Promise<Buffer> {
    // Get user information to determine role
    const user = await this.prismaService.user.findFirst({
      where: { userId },
      include: {
        admin: true,
        teacher: true,
        student: {
          include: {
            studentGroup: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Get filtered sessions using existing search logic
    const scheduleResponse = await this.searchSessions(userId, body);
    const sessions = scheduleResponse.sessions || [];

    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();

      // Generate HTML based on user role
      let html: string;
      if (user.role === Role.ADMIN) {
        html = await this._generateAdminHtml(scheduleResponse, sessions);
      } else {
        html = await this._generateUserHtml(scheduleResponse, sessions, user);
      }

      // Set content and generate PDF
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        landscape: true,
        margin: {
          top: '20px',
          bottom: '20px',
          left: '20px',
          right: '20px',
        },
        printBackground: true,
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  private async _generateAdminHtml(
    scheduleResponse: any,
    sessions: any[],
  ): Promise<string> {
    // Group sessions by student group
    const sessionsByGroup = new Map<string, any[]>();

    for (const session of sessions) {
      const groupId = session.classGroupIds || 'No Group';
      if (!sessionsByGroup.has(groupId)) {
        sessionsByGroup.set(groupId, []);
      }
      sessionsByGroup.get(groupId)!.push(session);
    }

    // Get student group names
    const studentGroups = await this.prismaService.studentGroup.findMany({
      where: {
        studentGroupId: {
          in: Array.from(sessionsByGroup.keys()).filter(
            (id) => id !== 'No Group',
          ),
        },
      },
    });

    const groupNames = new Map(
      studentGroups.map((g) => [g.studentGroupId, g.name]),
    );

    // Generate HTML for each student group
    let groupsHtml = '';
    for (const [groupId, groupSessions] of sessionsByGroup) {
      const groupName = groupNames.get(groupId) || 'Unassigned Group';
      const scheduleHtml = this._generateScheduleGrid(groupSessions);

      groupsHtml += `
        <div class="schedule-page">
          <div class="header">
            <h1>${scheduleResponse.scheduleName}</h1>
            <h2>Schedule for ${groupName}</h2>
          </div>
          ${scheduleHtml}
        </div>
        ${groupId !== Array.from(sessionsByGroup.keys()).pop() ? '<div class="page-break"></div>' : ''}
      `;
    }

    return this._wrapInHtmlTemplate(groupsHtml);
  }

  private async _generateUserHtml(
    scheduleResponse: any,
    sessions: any[],
    user: any,
  ): Promise<string> {
    let subtitle = 'Personal Schedule';

    if (user.role === Role.TEACHER) {
      subtitle = `Teacher Schedule - ${user.firstName} ${user.lastName}`;
    } else if (user.role === Role.STUDENT && user.student?.studentGroup) {
      subtitle = `Student Schedule - ${user.student.studentGroup.name}`;
    }

    const scheduleHtml = this._generateScheduleGrid(sessions);

    const content = `
      <div class="schedule-page">
        <div class="header">
          <h1>${scheduleResponse.scheduleName}</h1>
          <h2>${subtitle}</h2>
        </div>
        ${scheduleHtml}
      </div>
    `;

    return this._wrapInHtmlTemplate(content);
  }

  private _generateScheduleGrid(sessions: any[]): string {
    const days = [
      'MONDAY',
      'TUESDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
      'SATURDAY',
      'SUNDAY',
    ];
    const timeSlots = [
      '08:30-09:30',
      '09:30-10:30',
      '10:30-11:30',
      '11:30-12:30',
      '13:30-14:30',
      '14:30-15:30',
      '15:30-16:30',
      '16:30-17:30',
    ];

    // Group sessions by day and time
    const schedule = new Map<string, Map<string, any>>();
    days.forEach((day) => {
      schedule.set(day, new Map());
    });

    sessions.forEach((session) => {
      const day = session.day.toUpperCase();
      const timeslot = session.timeslot;
      if (schedule.has(day)) {
        schedule.get(day)!.set(timeslot, session);
      }
    });

    // Generate grid HTML
    let gridHtml = `
      <div class="schedule-grid">
        <div class="time-header">Time Range</div>
    `;

    // Day headers
    days.forEach((day) => {
      gridHtml += `<div class="day-header">${day.charAt(0) + day.slice(1).toLowerCase()}</div>`;
    });

    // Time slots and sessions
    timeSlots.forEach((timeSlot) => {
      gridHtml += `<div class="time-slot">${timeSlot}</div>`;

      days.forEach((day) => {
        const session = schedule.get(day)?.get(timeSlot);
        if (session) {
          gridHtml += `
            <div class="session-cell">
              <div class="course-name">${session.courseName}</div>
              <div class="course-details">
                <div class="teacher">${session.teacherName}</div>
                <div class="room">${session.classroomName}</div>
              </div>
            </div>
          `;
        } else {
          gridHtml += `<div class="empty-cell"></div>`;
        }
      });
    });

    gridHtml += '</div>';
    return gridHtml;
  }

  private _wrapInHtmlTemplate(content: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Schedule Export</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: 'Arial', sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
            background: white;
          }

          .schedule-page {
            width: 100%;
            page-break-after: avoid;
            margin-bottom: 20px;
          }

          .page-break {
            page-break-before: always;
          }

          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 15px;
          }

          .header h1 {
            font-size: 24px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }

          .header h2 {
            font-size: 16px;
            color: #64748b;
            font-weight: 500;
          }

          .schedule-grid {
            display: grid;
            grid-template-columns: 120px repeat(7, 1fr);
            gap: 1px;
            background-color: #e2e8f0;
            border: 2px solid #e2e8f0;
          }

          .time-header {
            background-color: #1e40af;
            color: white;
            font-weight: bold;
            text-align: center;
            padding: 12px 8px;
            font-size: 13px;
          }

          .day-header {
            background-color: #3b82f6;
            color: white;
            font-weight: bold;
            text-align: center;
            padding: 12px 8px;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .time-slot {
            background-color: #f1f5f9;
            font-weight: 600;
            text-align: center;
            padding: 15px 8px;
            border-right: 1px solid #cbd5e1;
            color: #475569;
            font-size: 11px;
          }

          .session-cell {
            background-color: white;
            padding: 8px;
            min-height: 60px;
            border: 1px solid #e2e8f0;
            position: relative;
          }

          .course-name {
            font-weight: bold;
            font-size: 11px;
            color: #1e40af;
            margin-bottom: 4px;
            line-height: 1.2;
          }

          .course-details {
            font-size: 10px;
            color: #64748b;
          }

          .teacher {
            font-weight: 500;
            margin-bottom: 2px;
          }

          .room {
            color: #059669;
            font-weight: 500;
          }

          .empty-cell {
            background-color: #f8fafc;
            min-height: 60px;
            border: 1px solid #e2e8f0;
          }

          /* Print-specific styles */
          @media print {
            body {
              font-size: 11px;
            }
            
            .schedule-page {
              break-inside: avoid;
            }
            
            .page-break {
              page-break-before: always;
            }
          }
        </style>
      </head>
      <body>
        ${content}
      </body>
      </html>
    `;
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

    // Check if the given name is unique for that campus
    const existingSchedule = await this.prismaService.schedule.findFirst({
      where: {
        scheduleName: scheduleName,
        campusId: admin.campusId,
      },
    });
    if (existingSchedule) {
      throw new BadRequestException('Schedule name must be unique');
    }

    // Prepare the data for the generate schedule endpoint
    // first teacher in the list takes that course for now
    // ! Schema needs updating to disallow multiple teachers per course
    const courses = await this.prismaService.course.findMany({
      where: {
        teacherId: {
          not: null,
        },
      },
      include: {
        teacher: true,
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
        teacherId: course.teacherId,
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

  /**
   * Evaluates an existing schedule by calling the Python fitness evaluation service
   * @param userId - ID of the user requesting the evaluation
   * @param scheduleId - ID of the schedule to evaluate
   * @returns Promise with the fitness evaluation report
   */
  async deleteSchedule(userId: string, scheduleId: string) {
    const { admin } = await this._findSchedule(scheduleId, userId);

    if (!admin) {
      throw new ForbiddenException('User is not an admin');
    }

    try {
      await this.prismaService.schedule.delete({
        where: {
          scheduleId: scheduleId,
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Schedule not found');
        }
      }
      throw new InternalServerErrorException('An unexpected error occurred');
    }
  }

  async evaluateSchedule(
    userId: string,
    scheduleId: string,
  ): Promise<ScheduleEvaluationResponse> {
    const { schedule } = await this._findSchedule(scheduleId, userId);

    // Get all sessions for this schedule
    const sessions = await this._fetchSessions(scheduleId);

    if (sessions.length === 0) {
      throw new NotFoundException('No sessions found for this schedule');
    }

    // Get additional data needed for evaluation
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

    const courses = await this.prismaService.course.findMany({
      include: {
        teacher: true,
        studentGroups: true,
      },
    });

    // Get constraints and timeslots for evaluation
    const constraints =
      await this.constraintService.getConstraintsForScheduling(
        schedule.campusId,
      );
    const timeslots = await this.timeslotService.getAllTimeslots();

    // Convert sessions to the format expected by Python service
    const timeslotMap = new Map(
      timeslots.map((slot) => [slot.timeslotId, slot]),
    );

    const scheduleItems = sessions.map((session) => {
      const timeslot = timeslotMap.get(session.timeslotId);
      if (!timeslot) {
        throw new InternalServerErrorException(
          `Timeslot not found for session: ${session.timeslotId}`,
        );
      }

      return {
        courseId: session.courseId,
        courseName: session.course.name,
        teacherId: session.teacherId,
        classroomId: session.classroomId,
        studentGroupIds: [session.studentGroupId], // Convert single ID to array
        day: session.day,
        timeslot: timeslot.code,
        sessionType: session.sessionType,
      };
    });

    // Prepare evaluation payload
    const payload = {
      schedule: scheduleItems,
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
      courses: courses.map((course) => ({
        courseId: course.courseId,
        name: course.name,
        description: course.description ?? 'No description available',
        ectsCredits: course.ectsCredits,
        department: course.departmentId,
        teacherId: course.teacher?.teacherId ?? '',
        studentGroupIds: course.studentGroups.map((sg) => sg.studentGroupId),
        sessionType: course.sessionType,
        sessionsPerWeek: course.sessionsPerWeek,
      })),
      constraints: constraints,
      timeslots: timeslots.map((slot) => ({
        timeslotId: slot.timeslotId,
        code: slot.code,
        label: slot.label,
        startTime: slot.startTime,
        endTime: slot.endTime,
        order: slot.order,
      })),
    };

    // Call the evaluation endpoint
    const route = this.configService.get<string>(
      'services.scheduling_microservice.url',
    );

    try {
      const response = await axios.post(
        `${route}/api/scheduler/evaluate`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.status !== 200) {
        throw new Error('Failed to evaluate schedule');
      }

      return {
        scheduleId: schedule.scheduleId,
        scheduleName: schedule.scheduleName,
        evaluation: response.data,
      };
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        throw new InternalServerErrorException(
          `Error evaluating schedule: ${e.message}`,
        );
      }
      throw new InternalServerErrorException('Failed to evaluate schedule');
    }
  }
}
