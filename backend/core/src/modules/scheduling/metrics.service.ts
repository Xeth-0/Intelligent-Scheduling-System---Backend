import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CampusValidationService } from '@/common/services/campus-validation.service';
import {
  MetricDto,
  RoomUtilizationDto,
  TeacherWorkloadDto,
  TeacherPreferenceTrendDto,
  CrowdedTimeslotDto,
  ScheduleQualityDto,
  BuildingUtilizationDto,
  AlertDto,
} from './dtos/metrics.dto';

@Injectable()
export class MetricsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly campusValidationService: CampusValidationService,
  ) {}

  /**
   * Get basic dashboard metrics (total counts)
   */
  async getDashboardMetrics(userId: string): Promise<MetricDto[]> {
    const campusId =
      await this.campusValidationService.getCampusIdForUser(userId);

    // Get counts for basic metrics
    const [coursesCount, teachersCount, classroomsCount, studentGroupsCount] =
      await Promise.all([
        this.prismaService.course.count({
          where: {
            department: {
              campusId,
            },
          },
        }),
        this.prismaService.teacher.count({
          where: {
            department: {
              campusId,
            },
          },
        }),
        this.prismaService.classroom.count({
          where: {
            campusId,
          },
        }),
        this.prismaService.studentGroup.count({
          where: {
            department: {
              campusId,
            },
          },
        }),
      ]);

    // Get historical data from tasks table for comparison
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const historicalTasks = await this.prismaService.task.findMany({
      where: {
        campusId,
        createdAt: {
          gte: oneWeekAgo,
        },
        status: 'COMPLETED',
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 1,
    });

    // If no historical data, use current counts as baseline
    const [
      prevCoursesCount,
      prevTeachersCount,
      prevClassroomsCount,
      prevStudentGroupsCount,
    ] =
      historicalTasks.length > 0
        ? [
            Math.max(0, coursesCount - 1), // Previous week estimate
            Math.max(0, teachersCount - 1),
            Math.max(0, classroomsCount),
            Math.max(0, studentGroupsCount),
          ]
        : [coursesCount, teachersCount, classroomsCount, studentGroupsCount];

    const calculateChange = (current: number, previous: number) => {
      if (previous === 0)
        return { type: 'no-change' as const, value: 'No data' };
      const diff = current - previous;
      const percentage = Math.abs((diff / previous) * 100).toFixed(1);

      if (diff > 0)
        return { type: 'increase' as const, value: `+${percentage}%` };
      if (diff < 0)
        return { type: 'decrease' as const, value: `-${percentage}%` };
      return { type: 'no-change' as const, value: '0%' };
    };

    return [
      {
        id: 'courses',
        title: 'Total Courses',
        value: coursesCount,
        change: calculateChange(coursesCount, prevCoursesCount),
        icon: 'courses',
      },
      {
        id: 'teachers',
        title: 'Total Teachers',
        value: teachersCount,
        change: calculateChange(teachersCount, prevTeachersCount),
        icon: 'teachers',
      },
      {
        id: 'classrooms',
        title: 'Total Classrooms',
        value: classroomsCount,
        change: calculateChange(classroomsCount, prevClassroomsCount),
        icon: 'rooms',
      },
      {
        id: 'student-groups',
        title: 'Student Groups',
        value: studentGroupsCount,
        change: calculateChange(studentGroupsCount, prevStudentGroupsCount),
        icon: 'student-groups',
      },
    ];
  }

  /**
   * Calculate room utilization metrics
   */
  async getRoomUtilization(
    userId: string,
    scheduleId?: string,
  ): Promise<RoomUtilizationDto> {
    const campusId =
      await this.campusValidationService.getCampusIdForUser(userId);

    // Get active schedule if no scheduleId provided
    const targetScheduleId =
      scheduleId || (await this.getActiveScheduleId(campusId));

    if (!targetScheduleId) {
      return {
        overall: 0,
        byBuilding: [],
      };
    }

    // Calculate dynamic session duration
    const sessionDuration = await this.calculateSessionDuration();

    // Get all scheduled sessions for this schedule
    const sessions = await this.prismaService.scheduledSession.findMany({
      where: {
        scheduleId: targetScheduleId,
      },
      include: {
        timeslot: true,
        classroom: {
          include: {
            building: true,
          },
        },
      },
    });

    // Get all classrooms on campus
    const classrooms = await this.prismaService.classroom.findMany({
      where: {
        campusId,
      },
      include: {
        building: true,
      },
    });

    // Get all timeslots
    const timeslots = await this.prismaService.timeslot.findMany();

    // Calculate utilization
    const utilizationByBuilding = new Map<
      string,
      {
        buildingId: string;
        buildingName: string;
        totalMinutesScheduled: number;
        totalMinutesAvailable: number;
      }
    >();

    // Initialize buildings
    const buildings = [
      ...new Set(classrooms.map((c) => c.building?.name).filter(Boolean)),
    ];
    buildings.forEach((buildingName) => {
      const building = classrooms.find(
        (c) => c.building?.name === buildingName,
      )?.building;
      if (building) {
        utilizationByBuilding.set(building.buildingId, {
          buildingId: building.buildingId,
          buildingName: building.name,
          totalMinutesScheduled: 0,
          totalMinutesAvailable: 0,
        });
      }
    });

    // Calculate available minutes per building (classrooms * timeslots * 5 days * session duration)
    classrooms.forEach((classroom) => {
      if (!classroom.building) return;

      const buildingData = utilizationByBuilding.get(
        classroom.building.buildingId,
      );
      if (buildingData) {
        // Using dynamic session duration and 5 working days
        buildingData.totalMinutesAvailable +=
          timeslots.length * 5 * sessionDuration;
      }
    });

    // Calculate scheduled minutes
    sessions.forEach((session) => {
      if (!session.classroom?.building) return;

      const buildingData = utilizationByBuilding.get(
        session.classroom.building.buildingId,
      );
      if (buildingData) {
        // Using dynamic session duration
        buildingData.totalMinutesScheduled += sessionDuration;
      }
    });

    const buildingUtilizations: BuildingUtilizationDto[] = Array.from(
      utilizationByBuilding.values(),
    ).map((data) => ({
      ...data,
      utilization:
        data.totalMinutesAvailable > 0
          ? (data.totalMinutesScheduled / data.totalMinutesAvailable) * 100
          : 0,
    }));

    // Calculate overall utilization
    const totalScheduled = buildingUtilizations.reduce(
      (sum, b) => sum + b.totalMinutesScheduled,
      0,
    );
    const totalAvailable = buildingUtilizations.reduce(
      (sum, b) => sum + b.totalMinutesAvailable,
      0,
    );
    const overall =
      totalAvailable > 0 ? (totalScheduled / totalAvailable) * 100 : 0;

    return {
      overall,
      byBuilding: buildingUtilizations,
    };
  }

  /**
   * Calculate teacher workload metrics
   */
  async getTeacherWorkload(
    userId: string,
    scheduleId?: string,
  ): Promise<TeacherWorkloadDto[]> {
    const campusId =
      await this.campusValidationService.getCampusIdForUser(userId);
    const targetScheduleId =
      scheduleId || (await this.getActiveScheduleId(campusId));

    if (!targetScheduleId) {
      return [];
    }

    // Get all teachers on campus
    const teachers = await this.prismaService.teacher.findMany({
      where: {
        department: {
          campusId,
        },
      },
      include: {
        user: true,
      },
    });

    // Get scheduled sessions grouped by teacher
    const sessions = await this.prismaService.scheduledSession.findMany({
      where: {
        scheduleId: targetScheduleId,
      },
      include: {
        timeslot: true,
        teacher: {
          include: {
            user: true,
          },
        },
      },
    });

    const teacherWorkloads: TeacherWorkloadDto[] = await Promise.all(
      teachers.map(async (teacher) => {
        const teacherSessions = sessions.filter(
          (s) => s.teacherId === teacher.teacherId,
        );

        // Calculate daily sessions (assuming 5 working days)
        const dailySessions = [0, 0, 0, 0, 0]; // Mon-Fri
        const dayMap = {
          MONDAY: 0,
          TUESDAY: 1,
          WEDNESDAY: 2,
          THURSDAY: 3,
          FRIDAY: 4,
        };

        teacherSessions.forEach((session) => {
          const dayIndex = dayMap[session.day as keyof typeof dayMap];
          if (dayIndex !== undefined) {
            dailySessions[dayIndex]++;
          }
        });

        // Calculate preference satisfaction ratio based on actual constraints
        const preferenceSatisfactionRatio =
          await this.calculateActualTeacherPreferenceSatisfaction(
            teacher.teacherId,
            teacherSessions,
            campusId,
          );

        return {
          teacherId: teacher.teacherId,
          teacherName: `${teacher.user.firstName} ${teacher.user.lastName}`,
          totalSessions: teacherSessions.length,
          preferenceSatisfactionRatio,
          dailySessions,
        };
      }),
    );

    return teacherWorkloads;
  }

  /**
   * Get teacher preference trends across all timeslots
   */
  async getTeacherPreferenceTrends(
    userId: string,
  ): Promise<TeacherPreferenceTrendDto[]> {
    const campusId =
      await this.campusValidationService.getCampusIdForUser(userId);

    // Get all timeslots
    const timeslots = await this.prismaService.timeslot.findMany({
      orderBy: { order: 'asc' },
    });

    // Get all time preference constraints for campus teachers
    const constraints = await this.prismaService.constraint.findMany({
      where: {
        teacher: {
          department: {
            campusId,
          },
        },
        constraintType: {
          name: 'Time Preference',
        },
        isActive: true,
      },
    });

    const preferenceTrends: TeacherPreferenceTrendDto[] = timeslots.map(
      (timeslot) => {
        let preferCount = 0;
        let avoidCount = 0;
        let neutralCount = 0;

        constraints.forEach((constraint) => {
          const value = constraint.value as {
            preferences?: {
              PREFER?: { timeslotCodes?: string[][] };
              AVOID?: { timeslotCodes?: string[][] };
              NEUTRAL?: { timeslotCodes?: string[][] };
            };
          };

          if (value?.preferences) {
            // Check if this timeslot is in any preference category
            const checkTimeslot = (prefs?: { timeslotCodes?: string[][] }) => {
              if (!prefs?.timeslotCodes) return false;
              return prefs.timeslotCodes.some((codes: string[]) =>
                codes.includes(timeslot.code),
              );
            };

            if (checkTimeslot(value.preferences.PREFER)) preferCount++;
            else if (checkTimeslot(value.preferences.AVOID)) avoidCount++;
            else if (checkTimeslot(value.preferences.NEUTRAL)) neutralCount++;
          }
        });

        return {
          timeslot: timeslot.label,
          preferCount,
          avoidCount,
          neutralCount,
        };
      },
    );

    return preferenceTrends;
  }

  /**
   * Calculate crowded timeslots
   */
  async getCrowdedTimeslots(
    userId: string,
    scheduleId?: string,
  ): Promise<CrowdedTimeslotDto[]> {
    const campusId =
      await this.campusValidationService.getCampusIdForUser(userId);
    const targetScheduleId =
      scheduleId || (await this.getActiveScheduleId(campusId));

    if (!targetScheduleId) {
      return [];
    }

    // Get all sessions
    const sessions = await this.prismaService.scheduledSession.findMany({
      where: {
        scheduleId: targetScheduleId,
      },
      include: {
        timeslot: true,
      },
    });

    // Get total rooms available
    const totalRooms = await this.prismaService.classroom.count({
      where: {
        campusId,
      },
    });

    // Get timeslots
    const timeslots = await this.prismaService.timeslot.findMany({
      orderBy: { order: 'asc' },
    });

    const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
    const crowdedTimeslots: CrowdedTimeslotDto[] = [];

    days.forEach((day) => {
      timeslots.forEach((timeslot) => {
        const sessionsInSlot = sessions.filter(
          (s) => s.day === day && s.timeslot.code === timeslot.code,
        );

        const usagePercentage =
          totalRooms > 0 ? (sessionsInSlot.length / totalRooms) * 100 : 0;

        crowdedTimeslots.push({
          day,
          timeslot: timeslot.label,
          usagePercentage,
          sessionCount: sessionsInSlot.length,
          roomsAvailable: totalRooms,
        });
      });
    });

    return crowdedTimeslots.sort(
      (a, b) => b.usagePercentage - a.usagePercentage,
    );
  }

  /**
   * Calculate overall schedule quality metrics
   */
  async getScheduleQuality(
    userId: string,
    scheduleId?: string,
  ): Promise<ScheduleQualityDto> {
    const campusId =
      await this.campusValidationService.getCampusIdForUser(userId);
    const targetScheduleId =
      scheduleId || (await this.getActiveScheduleId(campusId));

    if (!targetScheduleId) {
      return {
        roomUtilization: 0,
        teacherPreferenceSatisfaction: 0,
        teacherWorkloadBalance: 0,
        studentGroupConflictRate: 0,
        scheduleCompactness: 0,
        overallScore: 0,
      };
    }

    // Get room utilization
    const roomUtil = await this.getRoomUtilization(userId, targetScheduleId);

    // Get teacher workload for balance calculation
    const workloads = await this.getTeacherWorkload(userId, targetScheduleId);

    // Calculate metrics
    const roomUtilization = roomUtil.overall;

    // Teacher preference satisfaction (average of all teachers)
    const teacherPreferenceSatisfaction =
      workloads.length > 0
        ? (workloads.reduce(
            (sum, w) => sum + w.preferenceSatisfactionRatio,
            0,
          ) /
            workloads.length) *
          100
        : 0;

    // Teacher workload balance (1 - Gini coefficient)
    const teacherWorkloadBalance = this.calculateWorkloadBalance(workloads);

    // Student group conflict rate (inverted)
    const studentGroupConflictRate =
      await this.calculateStudentGroupConflictRate(targetScheduleId);

    // Schedule compactness (gaps per teacher)
    const scheduleCompactness =
      await this.calculateScheduleCompactness(targetScheduleId);

    // Overall score with weighted importance (business priorities)
    const weights = {
      studentGroupConflictRate: 0.35, // Most critical - no conflicts
      teacherPreferenceSatisfaction: 0.25, // Important for teacher satisfaction
      teacherWorkloadBalance: 0.2, // Fair distribution
      roomUtilization: 0.15, // Resource efficiency
      scheduleCompactness: 0.05, // Nice to have
    };

    const overallScore =
      roomUtilization * weights.roomUtilization +
      teacherPreferenceSatisfaction * weights.teacherPreferenceSatisfaction +
      teacherWorkloadBalance * weights.teacherWorkloadBalance +
      studentGroupConflictRate * weights.studentGroupConflictRate +
      scheduleCompactness * weights.scheduleCompactness;

    return {
      roomUtilization,
      teacherPreferenceSatisfaction,
      teacherWorkloadBalance,
      studentGroupConflictRate,
      scheduleCompactness,
      overallScore,
    };
  }

  /**
   * Helper method to get active schedule ID for a campus
   */
  private async getActiveScheduleId(campusId: string): Promise<string | null> {
    const activeSchedule = await this.prismaService.schedule.findFirst({
      where: {
        active: true,
        campus: {
          campusId,
        },
      },
    });

    return activeSchedule?.scheduleId || null;
  }

  /**
   * Helper method to calculate workload balance using Gini coefficient
   */
  private calculateWorkloadBalance(workloads: TeacherWorkloadDto[]): number {
    if (workloads.length === 0) return 100; // Perfect balance with no teachers
    if (workloads.length === 1) return 100; // Perfect balance with one teacher

    const sessions = workloads
      .map((w) => w.totalSessions)
      .sort((a, b) => a - b);
    const n = sessions.length;
    const mean = sessions.reduce((sum, s) => sum + s, 0) / n;

    if (mean === 0) return 100; // Perfect balance if no sessions

    let giniSum = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        giniSum += Math.abs(sessions[i] - sessions[j]);
      }
    }

    const giniCoeff = giniSum / (2 * n * n * mean);
    return Math.max(0, Math.min(100, (1 - giniCoeff) * 100));
  }

  /**
   * Calculate student group conflict rate (percentage without conflicts)
   */
  private async calculateStudentGroupConflictRate(
    scheduleId: string,
  ): Promise<number> {
    // Get all sessions for this schedule
    const sessions = await this.prismaService.scheduledSession.findMany({
      where: {
        scheduleId,
      },
      include: {
        studentGroup: true,
        timeslot: true,
      },
    });

    // Group sessions by student group
    const sessionsByGroup = new Map<string, typeof sessions>();
    sessions.forEach((session) => {
      if (!session.studentGroup) return;

      const groupId = session.studentGroup.studentGroupId;
      if (!sessionsByGroup.has(groupId)) {
        sessionsByGroup.set(groupId, []);
      }
      sessionsByGroup.get(groupId)!.push(session);
    });

    let totalGroups = 0;
    let groupsWithoutConflicts = 0;

    // Check each student group for conflicts
    sessionsByGroup.forEach((groupSessions) => {
      totalGroups++;
      let hasConflict = false;

      // Check for time conflicts within the group
      for (let i = 0; i < groupSessions.length && !hasConflict; i++) {
        for (let j = i + 1; j < groupSessions.length && !hasConflict; j++) {
          const session1 = groupSessions[i];
          const session2 = groupSessions[j];

          // Same day and same timeslot = conflict
          if (
            session1.day === session2.day &&
            session1.timeslot.code === session2.timeslot.code
          ) {
            hasConflict = true;
          }
        }
      }

      if (!hasConflict) {
        groupsWithoutConflicts++;
      }
    });

    return totalGroups > 0 ? (groupsWithoutConflicts / totalGroups) * 100 : 100;
  }

  /**
   * Calculate schedule compactness (fewer gaps = better)
   */
  private async calculateScheduleCompactness(
    scheduleId: string,
  ): Promise<number> {
    // Get all sessions grouped by teacher and day
    const sessions = await this.prismaService.scheduledSession.findMany({
      where: {
        scheduleId,
      },
      include: {
        teacher: true,
        timeslot: true,
      },
      orderBy: [{ day: 'asc' }, { timeslot: { order: 'asc' } }],
    });

    // Group sessions by teacher and day
    const sessionsByTeacherDay = new Map<
      string,
      Map<string, typeof sessions>
    >();
    sessions.forEach((session) => {
      if (!session.teacher) return;

      const teacherId = session.teacher.teacherId;
      const day = session.day;

      if (!sessionsByTeacherDay.has(teacherId)) {
        sessionsByTeacherDay.set(teacherId, new Map());
      }

      const teacherDays = sessionsByTeacherDay.get(teacherId)!;
      if (!teacherDays.has(day)) {
        teacherDays.set(day, []);
      }

      teacherDays.get(day)!.push(session);
    });

    let totalGaps = 0;
    let totalTeacherDays = 0;

    // Calculate gaps for each teacher on each day
    sessionsByTeacherDay.forEach((teacherDays) => {
      teacherDays.forEach((daySessions) => {
        if (daySessions.length <= 1) return; // No gaps possible with 0 or 1 session

        totalTeacherDays++;

        // Sort sessions by timeslot order
        const sortedSessions = daySessions.sort(
          (a, b) => a.timeslot.order - b.timeslot.order,
        );

        // Count gaps between consecutive sessions
        for (let i = 0; i < sortedSessions.length - 1; i++) {
          const currentOrder = sortedSessions[i].timeslot.order;
          const nextOrder = sortedSessions[i + 1].timeslot.order;

          // If there's a gap in the sequence, count it
          if (nextOrder - currentOrder > 1) {
            totalGaps += nextOrder - currentOrder - 1;
          }
        }
      });
    });

    // Calculate compactness score (fewer gaps = higher score)
    // Calculate theoretical maximum gaps: if every teacher worked every day with maximum spread
    const totalTimeslots = await this.prismaService.timeslot.count();
    const maxPossibleGaps = Math.max(
      1,
      totalTeacherDays * (totalTimeslots - 1),
    );

    const compactnessScore =
      maxPossibleGaps > 0
        ? Math.max(0, (1 - totalGaps / maxPossibleGaps) * 100)
        : 100;

    return Math.min(100, compactnessScore);
  }

  /**
   * Get system alerts for the dashboard
   */
  async getSystemAlerts(userId: string): Promise<AlertDto[]> {
    const campusId =
      await this.campusValidationService.getCampusIdForUser(userId);
    const alerts: AlertDto[] = [];

    // Check if there's an active schedule
    const activeSchedule = await this.getActiveScheduleId(campusId);
    if (!activeSchedule) {
      alerts.push({
        id: 'no-active-schedule',
        type: 'warning',
        title: 'No Active Schedule',
        message:
          'There is currently no active schedule. Generate a new schedule to begin.',
        actionLink: '/admin/schedule/generate',
        actionText: 'Generate Schedule',
      });
    }

    // Check for failed tasks
    const failedTasks = await this.prismaService.task.count({
      where: {
        admin: {
          user: {
            userId,
          },
        },
        status: 'FAILED',
      },
    });

    if (failedTasks > 0) {
      alerts.push({
        id: 'failed-tasks',
        type: 'error',
        title: 'Failed Tasks',
        message: `${failedTasks} data import tasks have failed. Please review and retry.`,
        actionLink: '/admin/data/csv-upload',
        actionText: 'View Tasks',
      });
    }

    // Check for rooms with low utilization
    if (activeSchedule) {
      const roomUtil = await this.getRoomUtilization(userId, activeSchedule);
      if (roomUtil.overall < 30) {
        alerts.push({
          id: 'low-room-utilization',
          type: 'info',
          title: 'Low Room Utilization',
          message: `Current room utilization is ${roomUtil.overall.toFixed(1)}%. Consider optimizing the schedule.`,
          actionLink: '/admin/schedule',
          actionText: 'View Schedule',
        });
      }
    }

    // Check for schedule quality issues
    if (activeSchedule) {
      const quality = await this.getScheduleQuality(userId, activeSchedule);
      if (quality.overallScore < 60) {
        alerts.push({
          id: 'low-schedule-quality',
          type: 'warning',
          title: 'Schedule Quality Issues',
          message: `Current schedule quality score is ${quality.overallScore.toFixed(1)}%. Consider regenerating.`,
          actionLink: '/admin/schedule/generate',
          actionText: 'Regenerate Schedule',
        });
      }
    }

    return alerts;
  }

  /**
   * Calculate actual teacher preference satisfaction based on scheduled sessions vs constraints
   */
  private async calculateActualTeacherPreferenceSatisfaction(
    teacherId: string,
    scheduledSessions: Array<{
      day: string;
      timeslot: { code: string };
    }>,
    campusId: string,
  ): Promise<number> {
    if (scheduledSessions.length === 0) {
      return 0.6; // Neutral score for teachers with no sessions
    }

    // Get teacher's time preference constraints
    const constraints = await this.prismaService.constraint.findMany({
      where: {
        teacherId,
        constraintType: {
          name: 'Time Preference',
        },
        isActive: true,
      },
    });

    if (constraints.length === 0) {
      return 0.7; // Default score for teachers without explicit preferences
    }

    let totalScore = 0;
    let sessionCount = 0;

    // Evaluate each scheduled session against preferences
    scheduledSessions.forEach((session) => {
      constraints.forEach((constraint) => {
        const value = constraint.value as {
          preferences?: {
            PREFER?: { timeslotCodes?: string[][] };
            AVOID?: { timeslotCodes?: string[][] };
            NEUTRAL?: { timeslotCodes?: string[][] };
          };
        };

        if (value?.preferences) {
          const checkTimeslot = (prefs?: { timeslotCodes?: string[][] }) => {
            if (!prefs?.timeslotCodes) return false;
            return prefs.timeslotCodes.some((codes: string[]) =>
              codes.includes(session.timeslot.code),
            );
          };

          if (checkTimeslot(value.preferences.PREFER)) {
            totalScore += 1.0; // Perfect score for preferred times
          } else if (checkTimeslot(value.preferences.AVOID)) {
            totalScore += 0.2; // Low score for avoided times
          } else if (checkTimeslot(value.preferences.NEUTRAL)) {
            totalScore += 0.7; // Neutral score
          } else {
            totalScore += 0.6; // Default score for unspecified times
          }
          sessionCount++;
        }
      });
    });

    return sessionCount > 0 ? totalScore / sessionCount : 0.6;
  }

  /**
   * Calculate dynamic session duration from timeslot data
   */
  private async calculateSessionDuration(): Promise<number> {
    const timeslots = await this.prismaService.timeslot.findMany({
      orderBy: { order: 'asc' },
      take: 2,
    });

    if (timeslots.length >= 2) {
      // Extract hour and minute from time format (assuming HH:MM format)
      const parseTime = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
      };

      const firstStart = parseTime(timeslots[0].startTime);
      const firstEnd = parseTime(timeslots[0].endTime);

      return firstEnd - firstStart; // Return duration in minutes
    }

    return 90; // Fallback to 90 minutes if we can't determine from data
  }
}
