import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { initDatabase, db } from '../db';
import { createTeam } from '../team';
import { logAudit, getAuditLogs, getUserAuditLogs, exportAuditLogs, countAuditLogs } from '../audit';

describe('Audit Logs', () => {
  let teamId: string;
  
  beforeAll(() => {
    initDatabase();
    // Clean up
    db.exec("DELETE FROM audit_logs");
  });

  beforeEach(() => {
    db.exec("DELETE FROM audit_logs");
    teamId = createTeam('user-123', 'Test Team').id;
  });

  describe('logAudit', () => {
    it('should create an audit log entry', () => {
      const log = logAudit({
        userId: 'user-123',
        teamId,
        action: 'team.create',
        resource: 'team',
        resourceId: teamId,
      });

      expect(log).toBeDefined();
      expect(log.id).toBeDefined();
      expect(log.userId).toBe('user-123');
      expect(log.teamId).toBe(teamId);
      expect(log.action).toBe('team.create');
      expect(log.resource).toBe('team');
      expect(log.timestamp).toBeDefined();
    });

    it('should include optional details', () => {
      const log = logAudit({
        userId: 'user-123',
        teamId,
        action: 'api_key.create',
        resource: 'api_key',
        details: { name: 'My Key', permissions: ['chat:completion'] },
      });

      expect(log.details).toEqual({ name: 'My Key', permissions: ['chat:completion'] });
    });

    it('should handle missing optional fields', () => {
      const log = logAudit({
        userId: 'user-123',
        action: 'user.login',
        resource: 'user',
      });

      expect(log.teamId).toBeUndefined();
      expect(log.resourceId).toBeUndefined();
      expect(log.ip).toBe('');
    });
  });

  describe('getAuditLogs', () => {
    it('should return logs for a team', () => {
      logAudit({ userId: 'user-123', teamId, action: 'team.create', resource: 'team' });
      logAudit({ userId: 'user-456', teamId, action: 'team.invite', resource: 'team' });
      logAudit({ userId: 'user-789', teamId: 'other-team', action: 'team.create', resource: 'team' });

      const logs = getAuditLogs(teamId);
      
      expect(logs).toHaveLength(2);
      expect(logs[0].action).toBe('team.invite'); // Most recent first
    });

    it('should filter by action', () => {
      logAudit({ userId: 'user-123', teamId, action: 'team.create', resource: 'team' });
      logAudit({ userId: 'user-456', teamId, action: 'team.invite', resource: 'team' });

      const logs = getAuditLogs(teamId, { action: 'team.invite' });
      
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('team.invite');
    });

    it('should respect limit and offset', () => {
      for (let i = 0; i < 15; i++) {
        logAudit({ userId: `user-${i}`, teamId, action: 'api_call', resource: 'api' });
      }

      const firstPage = getAuditLogs(teamId, { limit: 5, offset: 0 });
      const secondPage = getAuditLogs(teamId, { limit: 5, offset: 5 });

      expect(firstPage).toHaveLength(5);
      expect(secondPage).toHaveLength(5);
    });
  });

  describe('getUserAuditLogs', () => {
    it('should return logs for a specific user across teams', () => {
      const otherTeamId = createTeam('user-456', 'Other Team').id;
      logAudit({ userId: 'user-123', teamId, action: 'team.create', resource: 'team' });
      logAudit({ userId: 'user-123', teamId: otherTeamId, action: 'team.update', resource: 'team' });
      logAudit({ userId: 'user-456', teamId, action: 'team.invite', resource: 'team' });

      const logs = getUserAuditLogs('user-123');
      
      expect(logs).toHaveLength(2);
    });
  });

  describe('countAuditLogs', () => {
    it('should return count of logs for team', () => {
      logAudit({ userId: 'user-123', teamId, action: 'team.create', resource: 'team' });
      logAudit({ userId: 'user-456', teamId, action: 'team.invite', resource: 'team' });

      const count = countAuditLogs(teamId);
      expect(count).toBe(2);
    });
  });

  describe('exportAuditLogs', () => {
    it('should export in JSON format', () => {
      logAudit({ userId: 'user-123', teamId, action: 'team.create', resource: 'team' });

      const json = exportAuditLogs(teamId, 'json');
      const parsed = JSON.parse(json);
      
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].action).toBe('team.create');
    });

    it('should export in CSV format', () => {
      logAudit({ userId: 'user-123', teamId, action: 'team.create', resource: 'team' });

      const csv = exportAuditLogs(teamId, 'csv');
      
      expect(csv).toContain('id,userId,teamId,action,resource');
      expect(csv).toContain('team.create');
    });
  });
});