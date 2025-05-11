import { Request } from 'express';

export interface ApiRequest extends Request {
  user: {
    userId: string;
  };
}
