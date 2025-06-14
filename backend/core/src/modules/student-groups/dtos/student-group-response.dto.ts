export class StudentGroupResponseDto {
  studentGroupId!: string;
  name!: string;
  size!: number;
  accessibilityRequirement!: boolean;
  departmentId!: string;
  department!: {
    name: string;
    campusId: string;
  };
  students?: {
    studentId: string;
    userId: string;
  }[] = [];
}
