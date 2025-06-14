import { type ClassroomType } from '@prisma/client';

export class ClassroomResponseDto {
  classroomId!: string;
  name!: string;
  capacity!: number;
  type!: ClassroomType;
  campusId!: string;
  buildingId!: string | null;
  isWheelchairAccessible!: boolean;
  openingTime!: string | null;
  closingTime!: string | null;
  floor!: number;
  campus!: {
    name: string;
  };
  building?: {
    name: string;
  } | null;
}
