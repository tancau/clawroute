import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { initDatabase, db } from '../db';
import { createTeam, inviteMember, acceptInvitation, getMemberRole } from '../team';
import { hasPermission, hasAnyPermission, hasAllPermissions, getPermissions, roleHasPermission, checkResourceAccess, getEffectiveRole } from '../auth/permissions';

describe('Permissions (RBAC)', () => {
  let teamId: string;
  
  beforeAll(() => {
    initDatabase();
    // Clean up
    db.exec("DELETE FROM team_members");
    db.exec("DELETE FROM teams");
    db.exec("DELETE FROM team_invitations");
  });

  beforeEach(() => {
    db.exec("DELETE FROM team_members");
    db.exec("DELETE FROM teams");
    db.exec("DELETE FROM team_invitations");
    teamId = createTeam('owner-123', 'Test Team').id;
  });

  describe('getPermissions', () => {
    it('should return all permissions for owner', () => {
      const perms = getPermissions('owner');
      expect(perms).toContain('team:admin');
      expect(perms).toContain('team:write');
      expect(perms).toContain('keys:delete');
      expect(perms).toContain('billing:write');
    });

    it('should return limited permissions for viewer', () => {
      const perms = getPermissions('viewer');
      expect(perms).toContain('team:read');
      expect(perms).toContain('keys:read');
      expect(perms).not.toContain('keys:delete');
      expect(perms).not.toContain('team:admin');
    });
  });

  describe('roleHasPermission', () => {
    it('should return true when role has permission', () => {
      expect(roleHasPermission('owner', 'team:admin')).toBe(true);
      expect(roleHasPermission('member', 'keys:read')).toBe(true);
      expect(roleHasPermission('viewer', 'team:read')).toBe(true);
    });

    it('should return false when role lacks permission', () => {
      expect(roleHasPermission('viewer', 'team:admin')).toBe(false);
      expect(roleHasPermission('member', 'keys:delete')).toBe(false);
    });
  });

  describe('hasPermission', () => {
    it('should return true for owner with correct permission', () => {
      const result = hasPermission('owner-123', teamId, 'team:write');
      expect(result).toBe(true);
    });

    it('should return false for non-member', () => {
      const result = hasPermission('random-user', teamId, 'team:read');
      expect(result).toBe(false);
    });

    it('should return false when member lacks permission', () => {
      // member can't delete keys
      const result = hasPermission('owner-123', teamId, 'keys:delete'); // owner can, let's test member
      // Add a member
      const inv = inviteMember(teamId, 'member@test.com', 'member', 'owner-123');
      acceptInvitation(inv.id, 'member-user');
      
      const memberHasDelete = hasPermission('member-user', teamId, 'keys:delete');
      expect(memberHasDelete).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true if user has any of the permissions', () => {
      const inv = inviteMember(teamId, 'member@test.com', 'member', 'owner-123');
      acceptInvitation(inv.id, 'member-user');
      
      const result = hasAnyPermission('member-user', teamId, ['keys:delete', 'team:admin', 'keys:read']);
      expect(result).toBe(true); // has keys:read
    });

    it('should return false if user has none of the permissions', () => {
      const inv = inviteMember(teamId, 'viewer@test.com', 'viewer', 'owner-123');
      acceptInvitation(inv.id, 'viewer-user');
      
      const result = hasAnyPermission('viewer-user', teamId, ['keys:delete', 'team:admin']);
      expect(result).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true if user has all permissions', () => {
      const result = hasAllPermissions('owner-123', teamId, ['team:read', 'team:write']);
      expect(result).toBe(true);
    });

    it('should return false if user lacks any permission', () => {
      const inv = inviteMember(teamId, 'viewer@test.com', 'viewer', 'owner-123');
      acceptInvitation(inv.id, 'viewer-user');
      
      const result = hasAllPermissions('viewer-user', teamId, ['team:read', 'keys:write']);
      expect(result).toBe(false);
    });
  });

  describe('checkResourceAccess', () => {
    it('should return true for team member', () => {
      const result = checkResourceAccess('owner-123', teamId);
      expect(result).toBe(true);
    });

    it('should return false for non-member', () => {
      const result = checkResourceAccess('random-user', teamId);
      expect(result).toBe(false);
    });
  });

  describe('getEffectiveRole', () => {
    it('should return owner role for owner', () => {
      const role = getEffectiveRole('owner-123', teamId);
      expect(role).toBe('owner');
    });

    it('should return null for non-member', () => {
      const role = getEffectiveRole('random-user', teamId);
      expect(role).toBeNull();
    });
  });
});