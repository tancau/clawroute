import { db } from '../db';
import { getMemberRole, type TeamRole } from '../team';

/**
 * Permission type
 */
export type Permission =
  | 'team:read' | 'team:write' | 'team:admin'
  | 'keys:read' | 'keys:write' | 'keys:delete'
  | 'analytics:read' | 'analytics:export'
  | 'billing:read' | 'billing:write';

/**
 * Role-to-permissions mapping (RBAC)
 */
export const ROLE_PERMISSIONS: Record<TeamRole, Permission[]> = {
  owner: [
    'team:read', 'team:write', 'team:admin',
    'keys:read', 'keys:write', 'keys:delete',
    'analytics:read', 'analytics:export',
    'billing:read', 'billing:write',
  ],
  admin: [
    'team:read', 'team:write',
    'keys:read', 'keys:write',
    'analytics:read', 'analytics:export',
    'billing:read',
  ],
  member: [
    'team:read',
    'keys:read', 'keys:write',
    'analytics:read',
    'billing:read',
  ],
  viewer: [
    'team:read',
    'keys:read',
    'analytics:read',
  ],
};

/**
 * Get all permissions for a role
 */
export function getPermissions(role: TeamRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(role: TeamRole, permission: Permission): boolean {
  return (ROLE_PERMISSIONS[role] ?? []).includes(permission);
}

/**
 * Check if a user has a specific permission in a team
 */
export function hasPermission(userId: string, teamId: string, permission: Permission): boolean {
  const role = getMemberRole(teamId, userId);
  if (!role) return false;
  return roleHasPermission(role, permission);
}

/**
 * Check if a user has any of the specified permissions in a team
 */
export function hasAnyPermission(userId: string, teamId: string, permissions: Permission[]): boolean {
  const role = getMemberRole(teamId, userId);
  if (!role) return false;
  const rolePerms = ROLE_PERMISSIONS[role] ?? [];
  return permissions.some((p) => rolePerms.includes(p));
}

/**
 * Check if a user has all specified permissions in a team
 */
export function hasAllPermissions(userId: string, teamId: string, permissions: Permission[]): boolean {
  const role = getMemberRole(teamId, userId);
  if (!role) return false;
  const rolePerms = ROLE_PERMISSIONS[role] ?? [];
  return permissions.every((p) => rolePerms.includes(p));
}

/**
 * Check if a user can access a resource
 * Resources are scoped by team ownership or membership
 */
export function checkResourceAccess(userId: string, resourceTeamId: string): boolean {
  const role = getMemberRole(resourceTeamId, userId);
  return role !== null;
}

/**
 * Get the effective role for a user in a team context.
 * Returns null if the user is not a member.
 */
export function getEffectiveRole(userId: string, teamId: string): TeamRole | null {
  return getMemberRole(teamId, userId);
}

/**
 * Require a specific permission, throwing an error if not granted
 */
export function requirePermission(userId: string, teamId: string, permission: Permission): void {
  if (!hasPermission(userId, teamId, permission)) {
    throw new PermissionDeniedError(userId, teamId, permission);
  }
}

/**
 * Permission denied error
 */
export class PermissionDeniedError extends Error {
  public readonly userId: string;
  public readonly teamId: string;
  public readonly permission: Permission;

  constructor(userId: string, teamId: string, permission: Permission) {
    super(`Permission denied: user ${userId} does not have '${permission}' in team ${teamId}`);
    this.name = 'PermissionDeniedError';
    this.userId = userId;
    this.teamId = teamId;
    this.permission = permission;
  }
}
