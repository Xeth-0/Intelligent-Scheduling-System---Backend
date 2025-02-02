export class CustomApiResponse<T> {
    success: boolean;
    message?: string;
    data: T;
    error?: string;
  
    constructor(partial: Partial<CustomApiResponse<T>> & { data: T }) {
      Object.assign(this, partial);
    }
  } 