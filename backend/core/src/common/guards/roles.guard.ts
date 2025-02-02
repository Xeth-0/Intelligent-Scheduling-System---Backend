import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    console.log('Required roles:', requiredRoles);

    const request = context.switchToHttp().getRequest();
    console.log('User in request:', request.user);

    if (!requiredRoles) {
      console.log('No roles required, allowing access');
      return true;
    }

    if (!request.user) {
      console.log('No user found in request');
      return false;
    }

    console.log('User role:', request.user.role);
    const hasRole = requiredRoles.includes(request.user.role);
    console.log('Has required role:', hasRole);
    return hasRole;
  }
} 