import {
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';

import { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

export const CurrentUser = createParamDecorator(
  (
    field: keyof JwtPayload | undefined,
    context: ExecutionContext,
  ) => {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();

    if (field) {
      return request.user[field];
    }

    return request.user;
  },
);