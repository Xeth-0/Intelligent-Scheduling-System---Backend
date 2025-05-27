export class DepartmentResponseDto {
  deptId!: string;
  name!: string;
  campusId!: string;
  campus!: {
    name: string;
  };
}
