import { SetMetadata } from '@nestjs/common';

import { ROLES_KEY } from '../constants/metadata-key.constant';
import { Role } from '../../generated/prisma/enums';

export const Roles = (...roles: Role[]) =>
  SetMetadata(ROLES_KEY, roles);