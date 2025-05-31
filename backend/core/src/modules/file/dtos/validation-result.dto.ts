import { type ClassroomType, type SessionType } from '@prisma/client';

export class ValidationResultDto<T> {
  success!: boolean;
  errors!: Array<string>;
  data!: T;
  type!: fileTypes;
}

export class RabbitDto<T> {
  taskId!: string;
  result!: ValidationResultDto<T>;
}

export enum fileTypes {
  TEACHER = 'TEACHER',
  COURSE = 'COURSE',
  CLASSROOM = 'CLASSROOM',
  DEPARTMENT = 'DEPARTMENT',
  STUDENT = 'STUDENT',
  STUDENTGROUP = 'STUDENTGROUP',
  SGCOURSE = 'SGCOURSE',
}

export type ValidatedDataType =
  | Department
  | Course
  | Teacher
  | Classroom
  | StudentGroup
  | Student
  | SGCourse;
export interface Department {
  departmentId: string;
  name: string;
  campusId: string;
}

export interface Course {
  courseId: string;
  name: string;
  code: string;
  departmentId: Department['departmentId'];
  description?: string;
  sessionType?: SessionType;
  sessionsPerWeek: number;
}

export interface User {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  passwordHash?: string;
  role: string;
}
export interface Teacher extends User {
  teacherId: string;

  needWheelchairAccessibleRoom: boolean;
  departmentId: Department['departmentId'];
}

export interface Classroom {
  classroomId: string;
  name: string;
  capacity: number;
  type: ClassroomType;
  campusId: string;
  buildingId: string;
  floor: number;
  isWheelchairAccessible: boolean;
  openingTime?: string;
  closingTime?: string;
  departmentId: Department['departmentId'];
}

export interface StudentGroup {
  studentGroupId: string;
  name: string;
  size: number;
  accessibilityRequirement: boolean;
  departmentId: Department['departmentId'];
}

export interface Student extends User {
  studentId: string;

  needWheelchairAccessibleRoom: boolean;
  studentGroupId: StudentGroup['studentGroupId'];
}

export interface SGCourse {
  studentGroupId: StudentGroup['studentGroupId'];
  courseId: Course['courseId'];
}
