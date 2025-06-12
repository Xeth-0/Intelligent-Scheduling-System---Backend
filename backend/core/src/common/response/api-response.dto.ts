export class PaginationData {
  totalItems!: number;
  currentPage!: number;
  totalPages!: number;
  itemsPerPage!: number;
}
export class PaginatedResponse<T> {
  data!: Array<T>;
  pagination!: PaginationData;
  constructor(data: Array<T>, pagination: PaginationData) {
    this.data = data;
    this.pagination = pagination;
  }
}
export class ApiResponse<T> {
  success!: boolean;
  statusCode!: number;
  data?: T | null;
  message?: string;
  pagination?: PaginationData | null;
  meta?: unknown;

  constructor(partial: Partial<ApiResponse<T>> & { data: T }) {
    Object.assign(this, partial);
  }

  static success<T>(
    statusNumber: number,
    data: T,
    message?: string,
    pagination?: PaginationData | null,
  ): ApiResponse<T> {
    return new ApiResponse({
      statusCode: statusNumber,
      success: true,
      data,
      message,
      pagination,
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
