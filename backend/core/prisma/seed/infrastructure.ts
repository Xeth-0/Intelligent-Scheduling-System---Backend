import {
  ClassroomType,
  type PrismaClient,
  type Campus,
  type Building,
} from '@prisma/client';

/**
 * Seed infrastructure data: campus, buildings, classrooms, timeslots
 */

export async function seedCampus(prisma: PrismaClient): Promise<Campus> {
  console.log('Creating campus...');

  const campus = await prisma.campus.create({
    data: {
      campusId: 'campus-001',
      name: 'Main Campus',
      location: 'Addis Ababa, Ethiopia',
    },
  });

  console.log('Created campus:', campus.name);
  return campus;
}

export async function seedBuildings(prisma: PrismaClient): Promise<Building[]> {
  console.log('Creating buildings...');

  const building = await prisma.building.create({
    data: {
      buildingId: 'building-001',
      name: 'NB Building',
      floor: 3,
    },
  });

  console.log('Created building:', building.name);
  return [building];
}

export async function seedClassrooms(
  prisma: PrismaClient,
  campus: Campus,
  buildings: Building[],
) {
  console.log('Creating classrooms...');

  const building = buildings[0];

  const classrooms = await Promise.all([
    prisma.classroom.create({
      data: {
        classroomId: 'classroom-001',
        name: 'NB111',
        capacity: 300,
        type: ClassroomType.LECTURE,
        buildingId: building.buildingId,
        campusId: campus.campusId,
        isWheelchairAccessible: true,
        openingTime: '08:00',
        closingTime: '18:00',
        floor: 2,
      },
    }),
    prisma.classroom.create({
      data: {
        classroomId: 'classroom-002',
        name: 'NB112',
        capacity: 100,
        type: ClassroomType.LECTURE,
        buildingId: building.buildingId,
        campusId: campus.campusId,
        isWheelchairAccessible: true,
        openingTime: '08:00',
        closingTime: '18:00',
        floor: 2,
      },
    }),
    prisma.classroom.create({
      data: {
        classroomId: 'classroom-003',
        name: 'NB113',
        capacity: 50,
        type: ClassroomType.LECTURE,
        buildingId: building.buildingId,
        campusId: campus.campusId,
        isWheelchairAccessible: false,
        openingTime: '08:00',
        closingTime: '18:00',
        floor: 2,
      },
    }),
    prisma.classroom.create({
      data: {
        classroomId: 'classroom-004',
        name: 'NB114',
        capacity: 200,
        type: ClassroomType.LAB,
        buildingId: building.buildingId,
        campusId: campus.campusId,
        isWheelchairAccessible: true,
        openingTime: '08:00',
        closingTime: '18:00',
        floor: 2,
      },
    }),
    prisma.classroom.create({
      data: {
        classroomId: 'classroom-005',
        name: 'NB115',
        capacity: 50,
        type: ClassroomType.LAB,
        buildingId: building.buildingId,
        campusId: campus.campusId,
        isWheelchairAccessible: false,
        openingTime: '08:00',
        closingTime: '18:00',
        floor: 2,
      },
    }),
  ]);

  console.log('Created classrooms:', classrooms.length);
  return classrooms;
}

export async function seedTimeslots(prisma: PrismaClient) {
  console.log('Creating timeslots...');

  // Timeslots: Start at 2:30, 1hr sessions, 1hr gap after 12:30, stop at 16:30
  const timeslots = await Promise.all([
    prisma.timeslot.create({
      data: {
        code: '0830_0930',
        label: '08:30-09:30',
        startTime: '08:30',
        endTime: '09:30',
        order: 7,
      },
    }),
    prisma.timeslot.create({
      data: {
        code: '0930_1030',
        label: '09:30-10:30',
        startTime: '09:30',
        endTime: '10:30',
        order: 8,
      },
    }),
    prisma.timeslot.create({
      data: {
        code: '1030_1130',
        label: '10:30-11:30',
        startTime: '10:30',
        endTime: '11:30',
        order: 9,
      },
    }),
    prisma.timeslot.create({
      data: {
        code: '1130_1230',
        label: '11:30-12:30',
        startTime: '11:30',
        endTime: '12:30',
        order: 10,
      },
    }),
    // 1hr gap after 12:30, next session starts at 13:30
    prisma.timeslot.create({
      data: {
        code: '1330_1430',
        label: '13:30-14:30',
        startTime: '13:30',
        endTime: '14:30',
        order: 11,
      },
    }),
    prisma.timeslot.create({
      data: {
        code: '1430_1530',
        label: '14:30-15:30',
        startTime: '14:30',
        endTime: '15:30',
        order: 12,
      },
    }),
    prisma.timeslot.create({
      data: {
        code: '1530_1630',
        label: '15:30-16:30',
        startTime: '15:30',
        endTime: '16:30',
        order: 13,
      },
    }),
  ]);

  console.log('Created timeslots:', timeslots.length);
  return timeslots;
}
