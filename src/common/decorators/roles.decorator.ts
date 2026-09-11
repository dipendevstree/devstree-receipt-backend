import { SetMetadata } from '@nestjs/common';
import { RoleName } from '../enums/role.enum';

export const ROLES_KEY = 'requiredRoles';

export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);
