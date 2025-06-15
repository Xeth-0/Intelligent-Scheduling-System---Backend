import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { Request } from 'express';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    // console.debug('Required roles:', requiredRoles);
    const request = context.switchToHttp().getRequest<Request>();
    // console.debug('User in request:', request.user);

    const user = request.user;

    if (!requiredRoles) {
      // console.debug('No roles required, allowing access');
      return true;
    }
    if (!user) {
      // console.debug('No user found in request');
      return false;
    }

    // console.debug('User role:', user.role);
    const hasRole = requiredRoles.some((role) => role === user.role);
    // console.debug('Has required role:', hasRole);
    return hasRole;
  }
}
