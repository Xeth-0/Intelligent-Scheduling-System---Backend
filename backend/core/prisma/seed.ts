/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  PrismaClient,
  ClassroomType,
  Role,
  SessionType,
  type Teacher,
} from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create Campus (not in sample data - creating default)
  const campus = await prisma.campus.create({
    data: {
      campusId: 'campus-001',
      name: 'Main Campus',
      location: 'Addis Ababa, Ethiopia',
    },
  });

  console.log('Created campus:', campus.name);

  // Create Building
  const building = await prisma.building.create({
    data: {
      buildingId: 'building-001',
      name: 'NB Building',
      floor: 3,
    },
  });

  console.log('Created building:', building.name);

  // Create Department
  const department = await prisma.department.create({
    data: {
      deptId: 'dept-cs-001',
      name: 'Computer Science',
      campusId: campus.campusId,
    },
  });

  console.log('Created department:', department.name);

  // Create admin users
  const createAdmin = async (
    id: string,
    firstName: string,
    lastName: string,
  ) => {
    const email = `admin${id}@email.email`;
    const passwordHash = await hash(`adminpassword${id}`, 10);

    // Create user first
    const user = await prisma.user.create({
      data: {
        userId: `user-admin-${id}`,
        firstName,
        lastName,
        email,
        passwordHash,
        role: Role.ADMIN,
        phone: `+251911${id}${id}${id}${id}`,
      },
    });

    // Create admin linked to user and campus
    const admin = await prisma.admin.create({
      data: {
        adminId: `admin-${id}`,
        userId: user.userId,
        campusId: campus.campusId,
      },
    });

    return admin;
  };

  // Create three admin users
  const admins = [
    await createAdmin('1', 'Samrawit', 'Elias'),
    await createAdmin('2', 'Daniel', 'Mekonnen'),
    await createAdmin('3', 'Rahel', 'Abebe'),
  ];

  console.log('Created admins:', admins.length);

  // Create teacher users with passwords
  const createTeacher = async (
    id: string,
    firstName: string,
    lastName: string,
    email: string,
    phone: string,
    needsAccessible: boolean,
  ) => {
    // Create user first
    const passwordHash = await hash(`teacher${id}password`, 10);

    const user = await prisma.user.create({
      data: {
        userId: `user-${id}`,
        firstName,
        lastName,
        email,
        passwordHash,
        role: Role.TEACHER,
        phone,
        needWheelchairAccessibleRoom: needsAccessible,
      },
    });

    // Then create teacher linked to user
    const teacher = await prisma.teacher.create({
      data: {
        teacherId: `teacher-${id}`,
        userId: user.userId,
        departmentId: department.deptId,
      },
    });

    return teacher;
  };

  // Create teachers with clear first and last names
  const teachers = [
    await createTeacher(
      '1',
      'Abrham',
      'Gebremedhin',
      'teacher1@email.email',
      '01234567890',
      true,
    ),
    await createTeacher(
      '002',
      'Natinael',
      'Wondimu',
      'natinael@gmail.com',
      '1234567890',
      true,
    ),
    await createTeacher(
      '003',
      'Nebiat',
      'Tekle',
      'nebiat@gmail.com',
      '1234567890',
      false,
    ),
    await createTeacher(
      '004',
      'Amanuel',
      'Tadesse',
      'amanuel@gmail.com',
      '1234567890',
      false,
    ),
    await createTeacher(
      '005',
      'Bereket',
      'Haile',
      'teacher5@gmail.com',
      '1234567890',
      false,
    ),
    await createTeacher(
      '006',
      'Dawit',
      'Solomon',
      'teacher6@gmail.com',
      '1234567890',
      false,
    ),
    await createTeacher(
      '007',
      'Eyob',
      'Kifle',
      'teacher7@gmail.com',
      '1234567890',
      false,
    ),
    await createTeacher(
      '008',
      'Fitsum',
      'Tesfaye',
      'teacher8@gmail.com',
      '1234567890',
      false,
    ),
    await createTeacher(
      '009',
      'Goitom',
      'Tsegay',
      'teacher9@gmail.com',
      '1234567890',
      false,
    ),
  ];

  console.log('Created teachers:', teachers.length);

  // Create student groups with custom IDs
  const studentGroups = await Promise.all([
    prisma.studentGroup.create({
      data: {
        studentGroupId: 'sg-y1-001',
        name: 'Year 1',
        size: 50,
        accessibilityRequirement: false,
        departmentId: department.deptId,
      },
    }),
    prisma.studentGroup.create({
      data: {
        studentGroupId: 'sg-y2-001',
        name: 'Year 2',
        size: 50,
        accessibilityRequirement: true,
        departmentId: department.deptId,
      },
    }),
    prisma.studentGroup.create({
      data: {
        studentGroupId: 'sg-y3-se-s1',
        name: '3rd Year Software Engineering Section 1',
        size: 52,
        accessibilityRequirement: false,
        departmentId: department.deptId,
      },
    }),
    prisma.studentGroup.create({
      data: {
        studentGroupId: 'sg-y3-se-s2',
        name: '3rd Year Software Engineering Section 2',
        size: 45,
        accessibilityRequirement: true,
        departmentId: department.deptId,
      },
    }),
    prisma.studentGroup.create({
      data: {
        studentGroupId: 'sg-y3-se-s3',
        name: '3rd Year Software Engineering Section 3',
        size: 60,
        accessibilityRequirement: false,
        departmentId: department.deptId,
      },
    }),
    prisma.studentGroup.create({
      data: {
        studentGroupId: 'sg-y3-se-s4',
        name: '3rd Year Software Engineering Section 4',
        size: 40,
        accessibilityRequirement: false,
        departmentId: department.deptId,
      },
    }),
    prisma.studentGroup.create({
      data: {
        studentGroupId: 'sg-y4-se-s1',
        name: '4th Year Software Engineering Section 1',
        size: 33,
        accessibilityRequirement: false,
        departmentId: department.deptId,
      },
    }),
    prisma.studentGroup.create({
      data: {
        studentGroupId: 'sg-y4-se-s2',
        name: '4th Year Software Engineering Section 2',
        size: 48,
        accessibilityRequirement: true,
        departmentId: department.deptId,
      },
    }),
    prisma.studentGroup.create({
      data: {
        studentGroupId: 'sg-y4-ai',
        name: '4th Year Artificial Intelligence',
        size: 70,
        accessibilityRequirement: false,
        departmentId: department.deptId,
      },
    }),
    prisma.studentGroup.create({
      data: {
        studentGroupId: 'sg-y4-cy',
        name: '4th Year Cybersecurity',
        size: 35,
        accessibilityRequirement: true,
        departmentId: department.deptId,
      },
    }),
    prisma.studentGroup.create({
      data: {
        studentGroupId: 'sg-y4-it',
        name: '4th Year Information Technology',
        size: 61,
        accessibilityRequirement: false,
        departmentId: department.deptId,
      },
    }),
    prisma.studentGroup.create({
      data: {
        studentGroupId: 'sg-y5-s1',
        name: '5th Year Section 1',
        size: 28,
        accessibilityRequirement: false,
        departmentId: department.deptId,
      },
    }),
    prisma.studentGroup.create({
      data: {
        studentGroupId: 'sg-y5-s2',
        name: '5th Year Section 2',
        size: 39,
        accessibilityRequirement: true,
        departmentId: department.deptId,
      },
    }),
  ]);

  console.log('Created student groups:', studentGroups.length);

  // Create student users for each student group
  console.log('Creating student accounts...');

  // First name pools for generating random student names
  const maleFirstNames = [
    'Abebe',
    'Bekele',
    'Dawit',
    'Ephrem',
    'Fikru',
    'Girma',
    'Hailu',
    'Iskinder',
    'Jemal',
    'Kebede',
    'Lemma',
    'Melaku',
    'Negash',
    'Omer',
    'Petros',
    'Robel',
    'Samuel',
    'Tadesse',
    'Worku',
    'Yonas',
    'Zelalem',
    'Amanuel',
    'Berhanu',
    'Dereje',
    'Endalkachew',
    'Fasil',
    'Getachew',
    'Henok',
    'Ibrahim',
    'Kirubel',
    'Liya',
    'Mekonnen',
  ];

  const femaleFirstNames = [
    'Abeba',
    'Bethlehem',
    'Desta',
    'Eden',
    'Feven',
    'Genet',
    'Hanna',
    'Rahel',
    'Jerusalem',
    'Kidist',
    'Liya',
    'Meron',
    'Nardos',
    'Rahel',
    'Sara',
    'Tigist',
    'Wubet',
    'Yordanos',
    'Zemenay',
    'Almaz',
    'Bezawit',
    'Dagmawit',
    'Eyerusalem',
    'Frehiwot',
    'Gelila',
    'Haregewoin',
    'Iman',
    'Konjit',
    'Lidya',
    'Mahlet',
  ];

  const lastNames = [
    'Abebe',
    'Bekele',
    'Chala',
    'Demeke',
    'Endale',
    'Fikadu',
    'Girma',
    'Hailu',
    'Ibrahim',
    'Jemal',
    'Kebede',
    'Lemma',
    'Megersa',
    'Negash',
    'Olana',
    'Petros',
    'Regassa',
    'Sahle',
    'Tadesse',
    'Umer',
    'Woldemariam',
    'Yilma',
    'Zeleke',
    'Assefa',
    'Bogale',
    'Desalegn',
    'Endalkachew',
    'Fantahun',
    'Gebre',
    'Haddis',
    'Iyasu',
  ];

  // Helper function to create a student
  const createStudent = async (
    id: string,
    firstName: string,
    lastName: string,
    email: string,
    studentGroupId: string,
    groupIdentifier: string,
  ) => {
    // Create user first
    const passwordHash = await hash(
      `student${groupIdentifier}password${id}`,
      10,
    );

    const user = await prisma.user.create({
      data: {
        userId: `user-student-${groupIdentifier}-${id}`,
        firstName,
        lastName,
        email,
        passwordHash,
        role: Role.STUDENT,
        phone: `+251922${id.padStart(6, '0')}`,
      },
    });

    // Create student linked to user and student group
    const student = await prisma.student.create({
      data: {
        studentId: `student-${groupIdentifier}-${id}`,
        userId: user.userId,
        studentGroupId,
      },
    });

    return student;
  };

  // Function to get a random name
  const getRandomName = (isFemale: boolean) => {
    const firstName = isFemale
      ? femaleFirstNames[Math.floor(Math.random() * femaleFirstNames.length)]
      : maleFirstNames[Math.floor(Math.random() * maleFirstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    return { firstName, lastName };
  };

  // Create students for each student group
  let totalStudentsCreated = 0;
  for (const group of studentGroups) {
    // Extract a simple identifier from the group ID
    const groupIdentifier = group.studentGroupId.replace('sg-', '');

    // Create the specified number of students for this group
    const studentsToCreate = group.size;
    console.log(
      `Creating ${studentsToCreate} students for group: ${group.name}`,
    );

    for (let i = 1; i <= studentsToCreate; i++) {
      // Alternate between male and female names
      const isFemale = i % 2 === 0;
      const { firstName, lastName } = getRandomName(isFemale);

      // Create unique ID and email for each student
      const studentNumber = totalStudentsCreated + i;
      const studentId = studentNumber.toString().padStart(3, '0');
      const email = `student${groupIdentifier}${studentId}@email.email`;

      await createStudent(
        studentId,
        firstName,
        lastName,
        email,
        group.studentGroupId,
        groupIdentifier,
      );

      // Log progress for every 50 students
      if (i % 50 === 0) {
        console.log(
          `  Created ${i}/${studentsToCreate} students for ${group.name}`,
        );
      }
    }

    totalStudentsCreated += studentsToCreate;
  }

  console.log(`Total students created: ${totalStudentsCreated}`);

  // Create classrooms with custom IDs
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

  // Create courses with connections to teachers and student groups
  const courseData = [
    {
      id: 'course-001',
      name: 'Fundamental of Electrical Circuits and Electronics',
      code: 'ECE301',
      description: 'Fundamental of Electrical Circuits and Electronics',
      teacherEmail: 'teacher1@email.email',
      sessionTypes: ['LECTURE', 'LAB'],
      sessionsPerWeek: [2, 1],
      studentGroups: [
        ['sg-y3-se-s1', 'sg-y3-se-s2'],
        ['sg-y3-se-s3', 'sg-y3-se-s4'],
      ],
    },
    {
      id: 'course-002',
      name: 'Computer Architecture and Organization',
      code: 'CS302',
      description: 'Computer Architecture and Organization',
      teacherEmail: 'teacher1@email.email',
      sessionTypes: ['LECTURE'],
      sessionsPerWeek: [2],
      studentGroups: [
        ['sg-y3-se-s1', 'sg-y3-se-s2'],
        ['sg-y3-se-s3', 'sg-y3-se-s4'],
      ],
    },
    {
      id: 'course-003',
      name: 'Web Design and Development',
      code: 'CS303',
      description: 'Web Design and Development',
      teacherEmail: 'natinael@gmail.com',
      sessionTypes: ['LECTURE', 'LAB'],
      sessionsPerWeek: [2, 1],
      studentGroups: [
        ['sg-y3-se-s1', 'sg-y3-se-s2'],
        ['sg-y3-se-s3', 'sg-y3-se-s4'],
      ],
    },
    {
      id: 'course-004',
      name: 'Human Computer Interaction',
      code: 'CS304',
      description: 'Human Computer Interaction',
      teacherEmail: 'teacher1@email.email',
      sessionTypes: ['LECTURE'],
      sessionsPerWeek: [2],
      studentGroups: [
        ['sg-y3-se-s1', 'sg-y3-se-s2'],
        ['sg-y3-se-s3', 'sg-y3-se-s4'],
      ],
    },
    {
      id: 'course-005',
      name: 'Fundamentals of Software Engineering',
      code: 'SE301',
      description: 'Fundamentals of Software Engineering',
      teacherEmail: 'nebiat@gmail.com',
      sessionTypes: ['LECTURE', 'LAB'],
      sessionsPerWeek: [2, 1],
      studentGroups: [
        ['sg-y3-se-s1', 'sg-y3-se-s2'],
        ['sg-y3-se-s3', 'sg-y3-se-s4'],
      ],
    },
    {
      id: 'course-006',
      name: 'Software Project Management',
      code: 'SE401',
      description: 'Software Project Management',
      teacherEmail: 'teacher1@email.email',
      sessionTypes: ['LECTURE'],
      sessionsPerWeek: [2],
      studentGroups: [
        ['sg-y4-se-s1', 'sg-y4-se-s2'],
        ['sg-y4-ai'],
        ['sg-y4-cy', 'sg-y4-it'],
      ],
    },
    {
      id: 'course-007',
      name: 'Enterprise Application Development',
      code: 'SE402',
      description: 'Enterprise Application Development',
      teacherEmail: 'natinael@gmail.com',
      sessionTypes: ['LECTURE', 'LAB'],
      sessionsPerWeek: [2, 1],
      studentGroups: [['sg-y4-se-s1', 'sg-y4-se-s2']],
    },
    {
      id: 'course-008',
      name: 'History of Ethiopia and the Horn',
      code: 'HIS401',
      description: 'History of Ethiopia and the Horn',
      teacherEmail: 'amanuel@gmail.com',
      sessionTypes: ['LECTURE'],
      sessionsPerWeek: [2],
      studentGroups: [
        ['sg-y4-se-s1', 'sg-y4-se-s2'],
        ['sg-y4-ai'],
        ['sg-y4-cy'],
        ['sg-y4-it'],
      ],
    },
    {
      id: 'course-009',
      name: 'Machine Learning and Big Data',
      code: 'ML401',
      description: 'Machine Learning and Big Data',
      teacherEmail: 'teacher5@gmail.com',
      sessionTypes: ['LECTURE', 'LAB'],
      sessionsPerWeek: [2, 1],
      studentGroups: [['sg-y4-se-s1', 'sg-y4-se-s2', 'sg-y4-cy']],
    },
  ];

  // Get teacher mapping by email for easier reference
  const teacherMap: Record<string, Teacher> = {};
  for (const teacher of teachers) {
    const user = await prisma.user.findUnique({
      where: { userId: teacher.userId },
    });

    if (user) {
      teacherMap[user.email] = teacher;
    }
  }

  // Process each course
  let courseCounter = 0;
  for (const course of courseData) {
    const teacher = teacherMap[course.teacherEmail];

    if (!teacher) {
      console.log(`Teacher not found for email: ${course.teacherEmail}`);
      continue;
    }

    // For each session type
    for (let i = 0; i < course.sessionTypes.length; i++) {
      const sessionType = course.sessionTypes[i] as
        | 'LECTURE'
        | 'LAB'
        | 'SEMINAR';
      const sessionsPerWeek = course.sessionsPerWeek[i];
      const sessionTypeMapped =
        sessionType === 'LECTURE'
          ? SessionType.LECTURE
          : sessionType === 'LAB'
            ? SessionType.LAB
            : SessionType.SEMINAR;

      // Create a unique session type code
      const sessionTypeCode =
        sessionType === 'LECTURE' ? 'L' : sessionType === 'LAB' ? 'P' : 'S';

      // For each group combination (each subarray in studentGroups)
      for (let j = 0; j < course.studentGroups.length; j++) {
        const groupSet = course.studentGroups[j];
        // Create a unique ID and code that includes the session type and group index
        const uniqueId = `${course.id}-${sessionTypeCode}-G${j + 1}`;
        const uniqueCode = `${course.code}-${sessionTypeCode}-G${j + 1}`;

        // Create course with session type for this specific student group combination
        const createdCourse = await prisma.course.create({
          data: {
            courseId: uniqueId,
            name: course.name,
            code: uniqueCode,
            description: course.description,
            sessionType: sessionTypeMapped,
            sessionsPerWeek: sessionsPerWeek,
            departmentId: department.deptId,
            teachers: {
              connect: { teacherId: teacher.teacherId },
            },
          },
        });

        // Connect all student groups in this group set to the course
        for (const groupId of groupSet) {
          await prisma.course.update({
            where: { courseId: createdCourse.courseId },
            data: {
              studentGroups: {
                connect: { studentGroupId: groupId },
              },
            },
          });
        }

        courseCounter++;
        console.log(
          `Created course: ${course.name} (${sessionType}, Group ${j + 1})`,
        );
      }
    }
  }

  console.log(`Total courses created: ${courseCounter}`);
  console.log('Database seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
