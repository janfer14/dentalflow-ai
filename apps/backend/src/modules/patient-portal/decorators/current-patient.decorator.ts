import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedPatient } from '../types/authenticated-patient.type';

export const CurrentPatient = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedPatient => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user: AuthenticatedPatient }>();
    return request.user;
  },
);
