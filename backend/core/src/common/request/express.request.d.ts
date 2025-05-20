import { type JwtPayload } from 'jsonwebtoken';

interface AuthenticatedUserPayload extends JwtPayload {
  sub: string;
  role: string;
  email: string;
}

declare module 'express' {
  export interface Request {
    user?: AuthenticatedUserPayload;
  }
}
