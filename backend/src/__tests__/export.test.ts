import { describe, it, expect, beforeAll } from 'vitest';
import { initDatabase, db } from '../db';
import {
  initExportTables,
  createExportJob,
  getExportJob,
  getExportJobs,
  getExportJobs as getUserExportJobs,
  getDownloadUrl,
  deleteExportJob,
} from '../export';

describe('Export', () => {
  let teamId: string;
  let userId: string;
  
  beforeAll(async () => {
    initDatabase();
    initExportTables();
    teamId = 'test-export-team';
    userId = 'test-user';
  });

  describe('Create Export Job', () => {
    it('should create analytics export job', () => {
      const job = createExportJob(teamId, userId, 'analytics', 'json', { days: 30 });
      
      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
      expect(job.teamId).toBe(teamId);
      expect(job.userId).toBe(userId);
      expect(job.type).toBe('analytics');
      expect(job.format).toBe('json');
      expect(job.status).toBe('pending');
    });

    it('should create usage csv export job', () => {
      const job = createExportJob(teamId, userId, 'usage', 'csv', { days: 7 });
      
      expect(job.type).toBe('usage');
      expect(job.format).toBe('csv');
    });

    it('should create earnings export job', () => {
      const job = createExportJob(teamId, userId, 'earnings', 'json', {});
      
      expect(job.type).toBe('earnings');
    });

    it('should create audit export job', () => {
      const job = createExportJob(teamId, userId, 'audit', 'csv', {});
      
      expect(job.type).toBe('audit');
    });

    it('should reject invalid type', () => {
      expect(() => 
        createExportJob(teamId, userId, 'invalid' as any, 'json', {})
      ).toThrow('Invalid export type');
    });

    it('should reject invalid format', () => {
      expect(() => 
        createExportJob(teamId, userId, 'analytics', 'invalid' as any, {})
      ).toThrow('Invalid export format');
    });
  });

  describe('Get Export Jobs', () => {
    it('should get export job by id', () => {
      const created = createExportJob(teamId, userId, 'analytics', 'json', {});
      const job = getExportJob(created.id);
      
      expect(job).toBeDefined();
      expect(job?.id).toBe(created.id);
      expect(job?.type).toBe('analytics');
    });

    it('should list team export jobs', () => {
      const jobs = getExportJobs(teamId);
      
      expect(jobs.length).toBeGreaterThan(0);
      expect(jobs.every(j => j.teamId === teamId)).toBe(true);
    });

    it('should list user export jobs', () => {
      const jobs = getUserExportJobs(userId);
      
      expect(jobs.length).toBeGreaterThan(0);
      expect(jobs.every(j => j.userId === userId)).toBe(true);
    });
  });

  describe('Delete Export Job', () => {
    it('should delete export job', () => {
      const created = createExportJob(teamId, userId, 'analytics', 'json', {});
      const deleted = deleteExportJob(created.id);
      expect(deleted).toBe(true);
      
      const job = getExportJob(created.id);
      expect(job).toBeNull();
    });
  });
});