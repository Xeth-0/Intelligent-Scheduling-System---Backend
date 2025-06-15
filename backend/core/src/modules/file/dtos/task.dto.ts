import { type TaskStatus, type TaskSeverity } from '@prisma/client';

export class TaskDto {
  taskId!: string;
  adminId!: string;
  campusId?: string | null;
  status!: TaskStatus;
  errorCount!: number;
  fileName!: string;
  description?: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class TaskDetailDto extends TaskDto {
  errors!: TaskError[];
}

export class TaskError {
  row!: number;
  column!: string | null;
  message!: string;
  taskId!: string;
  severity!: TaskSeverity;
  createdAt!: Date;
}
