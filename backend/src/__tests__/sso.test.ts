import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { initDatabase, db } from '../db';
import {
  initSSOTables,
  listSSOProviders,
  getSSOProvider,
  createSSOConnection,
  getSSOConnection,
  deleteSSOConnection,
  verifySSOAccess,
  initiateSSO,
  handleSSOCallback,
} from '../sso';

describe('SSO', () => {
  let teamId: string;
  
  beforeAll(async () => {
    initDatabase();
    initSSOTables();
    teamId = 'test-sso-team';
  });

  beforeEach(() => {
    // Clean up before each test
    db.exec("DELETE FROM sso_connections");
  });

  describe('SSO Providers', () => {
    it('should list built-in providers', () => {
      const providers = listSSOProviders();
      expect(providers.length).toBeGreaterThan(0);
      expect(providers.some(p => p.name === 'Google Workspace')).toBe(true);
      expect(providers.some(p => p.type === 'oidc')).toBe(true);
    });

    it('should get provider by id', () => {
      const provider = getSSOProvider('google-workspace');
      expect(provider).toBeDefined();
      expect(provider?.name).toBe('Google Workspace');
      expect(provider?.enabled).toBe(true);
    });
  });

  describe('SSO Connections', () => {
    it('should create SSO connection', () => {
      const conn = createSSOConnection(teamId, 'google-workspace', 'example.com', {
        clientId: 'test-client-id',
        clientSecret: 'test-secret',
      });
      
      expect(conn).toBeDefined();
      expect(conn.teamId).toBe(teamId);
      expect(conn.providerId).toBe('google-workspace');
      expect(conn.domain).toBe('example.com');
    });

    it('should get SSO connection by team', () => {
      const conn = getSSOConnection(teamId);
      expect(conn).toBeDefined();
      expect(conn?.domain).toBe('example.com');
    });

    it('should throw on invalid domain', () => {
      expect(() => 
        createSSOConnection(teamId, 'google-workspace', 'invalid-domain!!!', {})
      ).toThrow('Invalid domain');
    });

    it('should delete SSO connection', () => {
      const deleted = deleteSSOConnection(teamId);
      expect(deleted).toBe(true);
      
      const conn = getSSOConnection(teamId);
      expect(conn).toBeNull();
    });
  });

  describe('verifySSOAccess', () => {
    it('should verify matching domain', () => {
      const result = verifySSOAccess('user@example.com', 'example.com');
      expect(result).toBe(true);
    });

    it('should reject non-matching domain', () => {
      const result = verifySSOAccess('user@other.com', 'example.com');
      expect(result).toBe(false);
    });

    it('should be case insensitive', () => {
      const result = verifySSOAccess('user@EXAMPLE.COM', 'example.com');
      expect(result).toBe(true);
    });
  });

  describe('SSO Flow', () => {
    it('should initiate SSO', () => {
      const conn = createSSOConnection(teamId, 'google-workspace', 'example.com', {
        clientId: 'test-client',
      });
      
      const result = initiateSSO(conn.id, 'https://app.clawroute.com/callback');
      
      expect(result).toBeDefined();
      expect(result.authorizationUrl).toContain('authorize');
      expect(result.state).toBeDefined();
      expect(result.nonce).toBeDefined();
    });

    it('should handle callback validation', async () => {
      expect(handleSSOCallback('oidc', {
        connectionId: 'fake-id',
        code: 'fake-code',
        state: 'fake-state',
        redirectUri: 'https://app.clawroute.com/callback',
      })).rejects.toThrow();
    });
  });
});