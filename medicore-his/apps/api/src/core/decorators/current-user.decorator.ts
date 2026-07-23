import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { RequestUser } from '../../modules/auth/types/request-user.type';

// Usage: @CurrentUser() user: RequestUser
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser => {
    const request = ctx.switchToHttp().getRequest<{ user: RequestUser }>();
    return request.user;
  },
);
