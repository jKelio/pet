import { type UserRole, type Permission, hasPermission, canDeleteSession } from '@pet/shared';

export class Role {
  private constructor(private readonly value: UserRole) {}

  static create(raw: string): Role {
    const valid: UserRole[] = ['club_admin', 'coach', 'analyst'];
    if (!valid.includes(raw as UserRole)) {
      throw new InvalidRoleError(raw);
    }
    return new Role(raw as UserRole);
  }

  can(permission: Permission): boolean {
    return hasPermission(this.value, permission);
  }

  canDelete(isOwner: boolean): boolean {
    return canDeleteSession(this.value, isOwner);
  }

  toString(): UserRole {
    return this.value;
  }
}

export class InvalidRoleError extends Error {
  constructor(role: string) {
    super(`Invalid role: "${role}"`);
    this.name = 'InvalidRoleError';
  }
}
