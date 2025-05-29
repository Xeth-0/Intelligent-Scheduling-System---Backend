export class ValidationResultDto {
  success!: boolean;
  errors!: any[];
  data!: any[];
  type!: fileTypes;
}

export class RabbitDto {
  taskId!: string;
  result!: ValidationResultDto;
}

export enum fileTypes {
  TEACHER,
  COURSE,
  CLASSROOM,
  DEPARTMENT,
  STUDENT,
  STUDENTGROUP,
  SGCOURSE,
}
