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

  const timeslots = await Promise.all([
    prisma.timeslot.create({
      data: {
        code: '0800_0900',
        label: '08:00-09:00',
        startTime: '08:00',
        endTime: '09:00',
        order: 1,
      },
    }),
    prisma.timeslot.create({
      data: {
        code: '0900_1000',
        label: '09:00-10:00',
        startTime: '09:00',
        endTime: '10:00',
        order: 2,
      },
    }),
    prisma.timeslot.create({
      data: {
        code: '1000_1100',
        label: '10:00-11:00',
        startTime: '10:00',
        endTime: '11:00',
        order: 3,
      },
    }),
    prisma.timeslot.create({
      data: {
        code: '1100_1200',
        label: '11:00-12:00',
        startTime: '11:00',
        endTime: '12:00',
        order: 4,
      },
    }),
    prisma.timeslot.create({
      data: {
        code: '1200_1300',
        label: '12:00-13:00',
        startTime: '12:00',
        endTime: '13:00',
        order: 5,
      },
    }),
    prisma.timeslot.create({
      data: {
        code: '1300_1400',
        label: '13:00-14:00',
        startTime: '13:00',
        endTime: '14:00',
        order: 6,
      },
    }),
    prisma.timeslot.create({
      data: {
        code: '1400_1500',
        label: '14:00-15:00',
        startTime: '14:00',
        endTime: '15:00',
        order: 7,
      },
    }),
    prisma.timeslot.create({
      data: {
        code: '1500_1600',
        label: '15:00-16:00',
        startTime: '15:00',
        endTime: '16:00',
        order: 8,
      },
    }),
    prisma.timeslot.create({
      data: {
        code: '1600_1700',
        label: '16:00-17:00',
        startTime: '16:00',
        endTime: '17:00',
        order: 9,
      },
    }),
    prisma.timeslot.create({
      data: {
        code: '1700_1800',
        label: '17:00-18:00',
        startTime: '17:00',
        endTime: '18:00',
        order: 10,
      },
    }),
  ]);

  console.log('Created timeslots:', timeslots.length);
  return timeslots;
}
