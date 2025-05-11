import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiRequest } from '../../request/api-request.dto';
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<ApiRequest>();
    if (!request.user) {
      throw new UnauthorizedException('User not found');
    }
    return data
      ? request.user[data as keyof typeof request.user]
      : request.user;
  },
);
