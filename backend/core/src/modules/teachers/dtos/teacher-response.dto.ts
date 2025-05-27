export class TeacherResponseDto {
  teacherId!: string;
  userId!: string;
  departmentId!: string;
  user!: {
    firstName: string;
    lastName: string;
    email: string;
  };
  department!: {
    name: string;
    campusId: string;
  };
}
