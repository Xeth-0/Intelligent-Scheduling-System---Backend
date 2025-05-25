export class ApiResponse<T> {
  success!: boolean;
  statusCode!: number;
  data?: T | null;
  message?: string;
  meta?: unknown;

  constructor(partial: Partial<ApiResponse<T>> & { data: T }) {
    Object.assign(this, partial);
  }

  static success<T>(
    statusNumber: number,
    data: T,
    message?: string,
  ): ApiResponse<T> {
    return new ApiResponse({
      statusCode: statusNumber,
      success: true,
      data,
      message,
    });
  }

  static error<T>(statusCode: number, error: string): ApiResponse<T> {
    return new ApiResponse({
      statusCode: statusCode,
      success: false,
      message: error,
      data: undefined as T,
    });
  }
}
