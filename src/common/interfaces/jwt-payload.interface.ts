import { Role } from '../../generated/prisma/enums';

export interface JwtPayload {
  sub: number;
  email: string;
  role: Role;
  jti: string;
  exp?: number;
  iat?: number;
}
