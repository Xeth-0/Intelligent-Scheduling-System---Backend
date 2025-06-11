import { PrismaClient } from '@prisma/client';

// Import all seeding modules
import {
  seedCampus,
  seedBuildings,
  seedClassrooms,
  seedTimeslots,
} from './seed/infrastructure';
import { seedAdmins, seedTeachers, seedStudents } from './seed/users';
import {
  seedDepartment,
  seedStudentGroups,
  seedCourses,
} from './seed/academic';
import {
  seedConstraintTypes,
  seedCampusConstraints,
  seedTeacherConstraints,
} from './seed/constraints';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Only seed if campus table is empty (avoid duplicate seeding)
  const campusCount = await prisma.campus.count();
  if (campusCount > 0) {
    console.log('Database already seeded. Skipping seeding.');
    return;
  }

  try {
    // 1. Infrastructure Setup
    console.log('\n📍 Setting up infrastructure...');
    const campus = await seedCampus(prisma);
    const buildings = await seedBuildings(prisma);
    const classrooms = await seedClassrooms(prisma, campus, buildings);
    const timeslots = await seedTimeslots(prisma);

    // 2. Academic Structure
    console.log('\n🏫 Setting up academic structure...');
    const department = await seedDepartment(prisma, campus);
    const studentGroups = await seedStudentGroups(prisma, department);

    // 3. Users (order matters: admins, teachers, then students)
    console.log('\n👥 Creating user accounts...');
    const admins = await seedAdmins(prisma, campus);
    const teachers = await seedTeachers(prisma, department);
    await seedStudents(prisma, studentGroups);

    // 4. Academic Content
    console.log('\n📚 Setting up courses...');
    await seedCourses(prisma, department, teachers);

    // 5. Constraints System
    console.log('\n⚙️ Setting up constraints system...');
    await seedConstraintTypes(prisma);
    await seedCampusConstraints(prisma, campus);
    await seedTeacherConstraints(
      prisma,
      teachers,
      timeslots,
      classrooms,
      buildings,
    );

    console.log('\n✅ Database seeding completed successfully!');
    console.log('📊 Summary:');
    console.log(`  - Campus: 1`);
    console.log(`  - Buildings: ${buildings.length}`);
    console.log(`  - Classrooms: ${classrooms.length}`);
    console.log(`  - Timeslots: ${timeslots.length}`);
    console.log(`  - Departments: 1`);
    console.log(`  - Student Groups: ${studentGroups.length}`);
    console.log(`  - Admins: ${admins.length}`);
    console.log(`  - Teachers: ${teachers.length}`);
    console.log(
      `  - Constraint Types: ${Object.keys(await prisma.constraintType.findMany()).length}`,
    );
    console.log(`  - Total Constraints: ${await prisma.constraint.count()}`);
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Fatal error during seeding:', e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
