export class ApiResponse<T> {
  success!: boolean;
  data!: T | null;
  message?: string;
  error?: string;
  meta?: unknown;

  constructor(partial: Partial<ApiResponse<T>> & { data: T }) {
    Object.assign(this, partial);
  }
}
