import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ErrorCode } from '../constants/error-codes';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { Permission } from '../enums/permission.enum';
import { RoleName } from '../enums/role.enum';
import { AppException } from '../exceptions/app.exception';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const requiredRoles = this.reflector.getAllAndOverride<RoleName[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions?.length && !requiredRoles?.length) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      throw AppException.unauthorized(ErrorCode.UNAUTHORIZED, 'Authentication is required.');
    }

    if (requiredRoles?.length && !requiredRoles.includes(user.roleName as RoleName)) {
      throw AppException.forbidden(
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        'Your role does not allow this action.',
      );
    }

    if (requiredPermissions?.length) {
      const granted = new Set(user.permissions);
      const missing = requiredPermissions.filter((permission) => !granted.has(permission));
      if (missing.length > 0) {
        throw AppException.forbidden(
          ErrorCode.INSUFFICIENT_PERMISSIONS,
          'You do not have permission to perform this action.',
        );
      }
    }

    return true;
  }
}
