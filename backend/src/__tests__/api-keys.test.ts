import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { initDatabase, db } from '../db';
import { createApiKey, listApiKeys, listTeamApiKeys, getApiKey, validateApiKey, revokeApiKey, updateApiKey, deleteApiKey, getApiKeyUsage } from '../api-keys';

describe('Developer API Keys', () => {
  let userId: string;
  let teamId: string;
  
  beforeAll(() => {
    initDatabase();
    
    // Create test user first (needed for foreign key constraint)
    const testEmail = 'api-test@example.com';
    const testUserId = 'user-api-test';
    
    db.prepare(`
      INSERT OR IGNORE INTO users (id, email, password_hash, credits, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(testUserId, testEmail, 'hashed_password', 1000, Date.now());
    
    userId = testUserId;
    teamId = 'team-456';
    
    // Create test team
    db.prepare('INSERT OR IGNORE INTO teams (id, name, owner_id, created_at) VALUES (?, ?, ?, ?)').run(teamId, 'Test Team', userId, Date.now());
    db.exec("DELETE FROM developer_api_keys");
  });

  beforeEach(() => {
    db.exec("DELETE FROM developer_api_keys");
  });

  describe('createApiKey', () => {
    it('should create a new API key with raw key returned once', () => {
      const { apiKey, rawKey } = createApiKey({ userId, name: 'Test Key' });
      
      expect(apiKey).toBeDefined();
      expect(apiKey.id).toBeDefined();
      expect(apiKey.name).toBe('Test Key');
      expect(apiKey.userId).toBe(userId);
      expect(apiKey.prefix).toMatch(/^cr_[a-zA-Z0-9]+...\w{4}$/);
      expect(rawKey).toMatch(/^cr_[a-zA-Z0-9_-]+$/);
      expect(apiKey.key).toBeDefined(); // hashed
    });

    it('should include optional team ID', () => {
      const { apiKey } = createApiKey({ userId, teamId, name: 'Team Key' });
      
      expect(apiKey.teamId).toBe(teamId);
    });

    it('should respect custom permissions', () => {
      const perms = ['chat:completion', 'models:list'];
      const { apiKey } = createApiKey({ userId, name: 'Test', permissions: perms });
      
      expect(apiKey.permissions).toEqual(perms);
    });

    it('should respect custom rate/usage limits', () => {
      const { apiKey } = createApiKey({ userId, name: 'Test', rateLimit: 100, usageLimit: 50000 });
      
      expect(apiKey.rateLimit).toBe(100);
      expect(apiKey.usageLimit).toBe(50000);
    });
  });

  describe('listApiKeys', () => {
    it('should list all keys for a user', () => {
      createApiKey({ userId, name: 'Key 1' });
      createApiKey({ userId, name: 'Key 2' });
      createApiKey({ userId: 'other-user', name: 'Other Key' });

      const keys = listApiKeys(userId);
      
      expect(keys).toHaveLength(2);
    });

    it('should return empty array for user with no keys', () => {
      const keys = listApiKeys('new-user');
      expect(keys).toHaveLength(0);
    });
  });

  describe('listTeamApiKeys', () => {
    it('should list keys for a team', () => {
      createApiKey({ userId, teamId, name: 'Team Key 1' });
      createApiKey({ userId, teamId, name: 'Team Key 2' });
      createApiKey({ userId, name: 'Personal Key' });

      const keys = listTeamApiKeys(teamId);
      
      expect(keys).toHaveLength(2);
    });
  });

  describe('getApiKey', () => {
    it('should retrieve existing key', () => {
      const { apiKey: created } = createApiKey({ userId, name: 'Test Key' });
      const retrieved = getApiKey(created.id);
      
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.name).toBe('Test Key');
    });

    it('should return null for non-existent key', () => {
      const result = getApiKey('fake-id');
      expect(result).toBeNull();
    });
  });

  describe('validateApiKey', () => {
    it('should validate correct raw key', () => {
      const { apiKey, rawKey } = createApiKey({ userId, name: 'Test' });
      
      const validated = validateApiKey(rawKey);
      
      expect(validated).toBeDefined();
      expect(validated?.id).toBe(apiKey.id);
    });

    it('should return null for invalid key', () => {
      const result = validateApiKey('cr_invalid_key');
      expect(result).toBeNull();
    });

    it('should increment usage count on validation', () => {
      const { rawKey } = createApiKey({ userId, name: 'Test', usageLimit: 100 });
      
      validateApiKey(rawKey);
      validateApiKey(rawKey);
      validateApiKey(rawKey);
      
      const usage = getApiKeyUsage(getApiKey(listApiKeys(userId)[0].id)!.id);
      expect(usage?.usageCount).toBe(3);
    });
  });

  describe('revokeApiKey', () => {
    it('should deactivate a key', () => {
      const { apiKey } = createApiKey({ userId, name: 'Test' });
      
      const revoked = revokeApiKey(apiKey.id);
      
      expect(revoked).toBe(true);
      expect(getApiKey(apiKey.id)?.isActive).toBe(false);
    });
  });

  describe('updateApiKey', () => {
    it('should update key name', () => {
      const { apiKey } = createApiKey({ userId, name: 'Old Name' });
      
      const updated = updateApiKey(apiKey.id, { name: 'New Name' });
      
      expect(updated?.name).toBe('New Name');
    });

    it('should update permissions', () => {
      const { apiKey } = createApiKey({ userId, name: 'Test', permissions: ['chat:completion'] });
      
      const updated = updateApiKey(apiKey.id, { permissions: ['chat:completion', 'models:list'] });
      
      expect(updated?.permissions).toContain('models:list');
    });

    it('should return null for non-existent key', () => {
      const result = updateApiKey('fake-id', { name: 'Test' });
      expect(result).toBeNull();
    });
  });

  describe('deleteApiKey', () => {
    it('should permanently delete a key', () => {
      const { apiKey } = createApiKey({ userId, name: 'Test' });
      
      const deleted = deleteApiKey(apiKey.id);
      
      expect(deleted).toBe(true);
      expect(getApiKey(apiKey.id)).toBeNull();
    });
  });

  describe('getApiKeyUsage', () => {
    it('should return usage statistics', () => {
      const { rawKey, apiKey } = createApiKey({ userId, name: 'Test', usageLimit: 1000 });
      
      validateApiKey(rawKey);
      validateApiKey(rawKey);
      
      const usage = getApiKeyUsage(apiKey.id);
      
      expect(usage?.usageCount).toBe(2);
      expect(usage?.usageLimit).toBe(1000);
      expect(usage?.percentUsed).toBe(0); // 2/1000 = 0%
      expect(usage?.lastUsedAt).toBeGreaterThan(0);
    });
  });
});