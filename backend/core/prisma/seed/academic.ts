import {
  type PrismaClient,
  SessionType,
  type Campus,
  type Department,
  type Teacher,
} from '@prisma/client';

/**
 * Seed academic data: departments, student groups, courses
 */

export async function seedDepartment(
  prisma: PrismaClient,
  campus: Campus,
): Promise<Department> {
  console.log('Creating department...');

  const department = await prisma.department.create({
    data: {
      deptId: 'dept-cs-001',
      name: 'Computer Science',
      campusId: campus.campusId,
    },
  });

  console.log('Created department:', department.name);
  return department;
}

export async function seedStudentGroups(
  prisma: PrismaClient,
  department: Department,
) {
  console.log('Creating student groups...');

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
  return studentGroups;
}

export async function seedCourses(
  prisma: PrismaClient,
  department: Department,
  teachers: Teacher[],
) {
  console.log('Creating courses...');

  // Course data with teacher assignments
  const courseData = [
    {
      id: 'course-001',
      name: 'Fundamental of Electrical Circuits and Electronics',
      code: 'ECE301',
      description: 'Fundamental of Electrical Circuits and Electronics',
      ectsCredits: 5,
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
      ectsCredits: 6,
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
      ectsCredits: 5,
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
      ectsCredits: 4,
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
      ectsCredits: 6,
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
      ectsCredits: 5,
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
      ectsCredits: 7,
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
      ectsCredits: 3,
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
      ectsCredits: 7,
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
            ectsCredits: course.ectsCredits,
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
}
