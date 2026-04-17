import { describe, it, expect, beforeAll } from 'vitest';
import { initDatabase, db } from '../db';
import {
  initBrandingTables,
  getBrandConfig,
  updateBrandConfig,
  deleteBrandConfig,
  validateCustomDomain,
  registerCustomDomain,
  verifyCustomDomain,
  getCustomDomain,
  deleteCustomDomain,
} from '../branding';

describe('Branding', () => {
  let teamId: string;
  
  beforeAll(async () => {
    initDatabase();
    initBrandingTables();
    teamId = 'test-brand-team';
    // Clean up
    db.exec("DELETE FROM brand_configs WHERE team_id = ?", [teamId]);
    db.exec("DELETE FROM custom_domains WHERE team_id = ?", [teamId]);
  });

  describe('Brand Config', () => {
    it('should get default brand config', () => {
      const config = getBrandConfig(teamId);
      
      expect(config).toBeDefined();
      expect(config.teamId).toBe(teamId);
      expect(config.primaryColor).toBe('#00c9ff');
      expect(config.secondaryColor).toBe('#92fe9d');
    });

    it('should update brand config', () => {
      const config = updateBrandConfig(teamId, {
        logoUrl: 'https://example.com/logo.png',
        primaryColor: '#ff0000',
        secondaryColor: '#00ff00',
        features: {
          hideClawRouterBranding: true,
          customFooter: '© 2024 Test',
        },
      });
      
      expect(config.logoUrl).toBe('https://example.com/logo.png');
      expect(config.primaryColor).toBe('#ff0000');
      expect(config.features?.hideClawRouterBranding).toBe(true);
    });

    it('should preserve existing values on partial update', () => {
      updateBrandConfig(teamId, { primaryColor: '#0000ff' });
      const config = getBrandConfig(teamId);
      
      expect(config.primaryColor).toBe('#0000ff');
      expect(config.logoUrl).toBe('https://example.com/logo.png');
    });

    it('should reject invalid colors', () => {
      expect(() => 
        updateBrandConfig(teamId, { primaryColor: 'not-a-color' })
      ).toThrow('Invalid primary color');
    });

    it('should delete brand config', () => {
      const deleted = deleteBrandConfig(teamId);
      expect(deleted).toBe(true);
      
      const config = getBrandConfig(teamId);
      expect(config.primaryColor).toBe('#00c9ff');
    });
  });

  describe('Custom Domains', () => {
    it('should validate valid domain', () => {
      const result = validateCustomDomain('example.com');
      expect(result.valid).toBe(true);
    });

    it('should reject invalid domain format', () => {
      const result = validateCustomDomain('invalid!!!');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid');
    });

    it('should reject blocked domains', () => {
      const result = validateCustomDomain('localhost');
      expect(result.valid).toBe(false);
    });

    it('should register custom domain', () => {
      const domain = registerCustomDomain(teamId, 'testbrand.com');
      
      expect(domain).toBeDefined();
      expect(domain.domain).toBe('testbrand.com');
      expect(domain.teamId).toBe(teamId);
      expect(domain.verificationToken).toContain('verify_');
      expect(domain.verified).toBe(false);
    });

    it('should get custom domain', () => {
      const domain = getCustomDomain('testbrand.com');
      expect(domain).toBeDefined();
      expect(domain?.domain).toBe('testbrand.com');
    });

    it('should verify domain with token', () => {
      const domain = getCustomDomain('testbrand.com');
      expect(domain).toBeDefined();
      
      const verified = verifyCustomDomain('testbrand.com', domain!.verificationToken);
      expect(verified).toBe(true);
      
      const updated = getCustomDomain('testbrand.com');
      expect(updated?.verified).toBe(true);
    });

    it('should delete custom domain', () => {
      const deleted = deleteCustomDomain('testbrand.com');
      expect(deleted).toBe(true);
      
      const domain = getCustomDomain('testbrand.com');
      expect(domain).toBeNull();
    });
  });
});