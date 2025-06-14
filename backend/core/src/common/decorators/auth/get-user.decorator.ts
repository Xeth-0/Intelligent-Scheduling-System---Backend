import {
  createParamDecorator,
  type ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { type Request } from 'express';
import { type AuthenticatedUserPayload } from '@/common/request/express.request.d';

type UserProperty = keyof AuthenticatedUserPayload;

export const GetUser = createParamDecorator(
  (data: UserProperty | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user;
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (data && data in user) {
      return user[data] as string;
    }
    // ! Remove the hack
    user.userId = user.sub;
    return user;
  },
);
