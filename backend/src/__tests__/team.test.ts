import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { initDatabase, db } from '../db';
import { createTeam, getTeam, getUserTeams, inviteMember, acceptInvitation, removeMember, updateRole, deleteTeam, getMemberRole, getTeamInvitations, getUserInvitations } from '../team';

describe('Team Management', () => {
  beforeAll(() => {
    initDatabase();
    // Clean up
    db.exec("DELETE FROM team_members");
    db.exec("DELETE FROM teams");
    db.exec("DELETE FROM team_invitations");
  });

  beforeEach(() => {
    // Clean before each test
    db.exec("DELETE FROM team_members");
    db.exec("DELETE FROM teams");
    db.exec("DELETE FROM team_invitations");
  });

  describe('createTeam', () => {
    it('should create a new team with owner as member', () => {
      const team = createTeam('user-123', 'My Team');
      
      expect(team).toBeDefined();
      expect(team.id).toBeDefined();
      expect(team.name).toBe('My Team');
      expect(team.ownerId).toBe('user-123');
      expect(team.members).toHaveLength(1);
      expect(team.members[0].role).toBe('owner');
      expect(team.members[0].userId).toBe('user-123');
      expect(team.createdAt).toBeDefined();
    });

    it('should create team with unique IDs', () => {
      const team1 = createTeam('user-1', 'Team One');
      const team2 = createTeam('user-2', 'Team Two');
      
      expect(team1.id).not.toBe(team2.id);
    });
  });

  describe('getTeam', () => {
    it('should retrieve existing team', () => {
      const created = createTeam('user-123', 'Test Team');
      const retrieved = getTeam(created.id);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.name).toBe('Test Team');
    });

    it('should return null for non-existent team', () => {
      const result = getTeam('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('getUserTeams', () => {
    it('should return teams user belongs to', () => {
      const team1 = createTeam('user-123', 'Team 1');
      createTeam('user-456', 'Team 2');
      
      const teams = getUserTeams('user-123');
      
      expect(teams).toHaveLength(1);
      expect(teams[0].name).toBe('Team 1');
    });

    it('should return empty array for user with no teams', () => {
      const teams = getUserTeams('new-user');
      expect(teams).toHaveLength(0);
    });
  });

  describe('inviteMember', () => {
    it('should create an invitation', () => {
      const team = createTeam('owner-123', 'Test Team');
      const invitation = inviteMember(team.id, 'new@example.com', 'member', 'owner-123');
      
      expect(invitation).toBeDefined();
      expect(invitation.teamId).toBe(team.id);
      expect(invitation.email).toBe('new@example.com');
      expect(invitation.role).toBe('member');
      expect(invitation.status).toBe('pending');
    });

    it('should set expiration to 7 days', () => {
      const team = createTeam('owner-123', 'Test Team');
      const invitation = inviteMember(team.id, 'test@example.com', 'admin', 'owner-123');
      
      const expectedExpiry = Date.now() + 7 * 24 * 60 * 60 * 1000;
      expect(invitation.expiresAt).toBeGreaterThan(Date.now() + 6 * 24 * 60 * 60 * 1000);
      expect(invitation.expiresAt).toBeLessThan(Date.now() + 8 * 24 * 60 * 60 * 1000);
    });
  });

  describe('acceptInvitation', () => {
    it('should add user to team on acceptance', () => {
      const team = createTeam('owner-123', 'Test Team');
      const invitation = inviteMember(team.id, 'new@example.com', 'member', 'owner-123');
      
      const member = acceptInvitation(invitation.id, 'user-456');
      
      expect(member).toBeDefined();
      expect(member?.teamId).toBe(team.id);
      expect(member?.userId).toBe('user-456');
      expect(member?.role).toBe('member');
    });

    it('should fail for non-existent invitation', () => {
      const member = acceptInvitation('fake-id', 'user-123');
      expect(member).toBeNull();
    });
  });

  describe('removeMember', () => {
    it('should remove member from team', () => {
      const team = createTeam('owner-123', 'Test Team');
      const invitation = inviteMember(team.id, 'member@example.com', 'member', 'owner-123');
      acceptInvitation(invitation.id, 'member-user-123');
      
      const removed = removeMember(team.id, 'member-user-123');
      
      expect(removed).toBe(true);
      const updatedTeam = getTeam(team.id);
      expect(updatedTeam?.members).toHaveLength(1); // Only owner remains
    });

    it('should not allow removing owner', () => {
      const team = createTeam('owner-123', 'Test Team');
      
      const removed = removeMember(team.id, 'owner-123');
      
      expect(removed).toBe(false);
    });
  });

  describe('updateRole', () => {
    it('should update member role', () => {
      const team = createTeam('owner-123', 'Test Team');
      const invitation = inviteMember(team.id, 'admin@example.com', 'member', 'owner-123');
      acceptInvitation(invitation.id, 'admin-user');
      
      const updated = updateRole(team.id, 'admin-user', 'admin');
      
      expect(updated?.role).toBe('admin');
    });

    it('should not allow changing owner role', () => {
      const team = createTeam('owner-123', 'Test Team');
      
      const updated = updateRole(team.id, 'owner-123', 'viewer');
      
      expect(updated).toBeNull();
    });
  });

  describe('deleteTeam', () => {
    it('should delete team when called by owner', () => {
      const team = createTeam('owner-123', 'Test Team');
      
      const deleted = deleteTeam(team.id, 'owner-123');
      
      expect(deleted).toBe(true);
      expect(getTeam(team.id)).toBeNull();
    });

    it('should not delete team when called by non-owner', () => {
      const team = createTeam('owner-123', 'Test Team');
      
      const deleted = deleteTeam(team.id, 'other-user');
      
      expect(deleted).toBe(false);
      expect(getTeam(team.id)).toBeDefined();
    });
  });
});