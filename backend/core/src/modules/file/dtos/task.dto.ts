import { TaskStatus } from '@prisma/client';

export class TaskDto {
  taskId!: string;
  adminId!: string;
  campusId?: string | null;
  status!: TaskStatus;
  errorCount!: number;
  createdAt!: Date;
  updatedAt!: Date;
}

export class TaskDetailDto {
  taskId!: string;
  errors!: string[];
}
