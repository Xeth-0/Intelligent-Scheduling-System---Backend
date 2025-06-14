import {
  Role,
  type PrismaClient,
  type Campus,
  type Department,
  type StudentGroup,
  type Admin,
  type Teacher,
} from '@prisma/client';
import { hash } from 'bcrypt';
import { getRandomName } from './helpers';

/**
 * Seed user data: admins, teachers, students
 */

export async function seedAdmins(
  prisma: PrismaClient,
  campus: Campus,
): Promise<Admin[]> {
  console.log('Creating admin users...');

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
  return admins;
}

export async function seedTeachers(
  prisma: PrismaClient,
  department: Department,
): Promise<Teacher[]> {
  console.log('Creating teacher users...');

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
  const teachers = await Promise.all([
    createTeacher(
      '1',
      'Abrham',
      'Gebremedhin',
      'teacher1@email.email',
      '01234567890',
      true,
    ),
    createTeacher(
      '002',
      'Natinael',
      'Wondimu',
      'natinael@gmail.com',
      '1234567890',
      true,
    ),
    createTeacher(
      '003',
      'Nebiat',
      'Tekle',
      'nebiat@gmail.com',
      '1234567890',
      false,
    ),
    createTeacher(
      '004',
      'Amanuel',
      'Tadesse',
      'amanuel@gmail.com',
      '1234567890',
      false,
    ),
    createTeacher(
      '005',
      'Bereket',
      'Haile',
      'teacher5@gmail.com',
      '1234567890',
      false,
    ),
    createTeacher(
      '006',
      'Dawit',
      'Solomon',
      'teacher6@gmail.com',
      '1234567890',
      false,
    ),
    createTeacher(
      '007',
      'Eyob',
      'Kifle',
      'teacher7@gmail.com',
      '1234567890',
      false,
    ),
    createTeacher(
      '008',
      'Fitsum',
      'Tesfaye',
      'teacher8@gmail.com',
      '1234567890',
      false,
    ),
    createTeacher(
      '009',
      'Goitom',
      'Tsegay',
      'teacher9@gmail.com',
      '1234567890',
      false,
    ),
  ]);

  console.log('Created teachers:', teachers.length);
  return teachers;
}

export async function seedStudents(
  prisma: PrismaClient,
  studentGroups: StudentGroup[],
) {
  console.log('Creating student accounts...');

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
}
