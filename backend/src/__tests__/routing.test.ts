import { describe, it, expect, beforeAll } from 'vitest';
import { initDatabase, db } from '../db';
import {
  initCustomRoutingTables,
  createCustomRule,
  listCustomRules,
  getCustomRule,
  updateCustomRule,
  deleteCustomRule,
  evaluateRule,
  applyCustomRules,
} from '../routing/custom';

describe('Custom Routing', () => {
  let teamId: string;
  
  beforeAll(async () => {
    initDatabase();
    initCustomRoutingTables();
    teamId = 'test-routing-team';
    // Clean up
    db.exec("DELETE FROM custom_routing_rules WHERE team_id = ?", [teamId]);
  });

  describe('Create Custom Rule', () => {
    it('should create a custom rule', () => {
      const rule = createCustomRule(teamId, {
        name: 'Coding Models Rule',
        condition: {
          intent: ['coding', 'code'],
        },
        action: {
          preferredModels: ['claude-3-opus', 'gpt-4'],
          excludedModels: ['claude-3-haiku'],
        },
        priority: 10,
        enabled: true,
      });
      
      expect(rule).toBeDefined();
      expect(rule.id).toBeDefined();
      expect(rule.name).toBe('Coding Models Rule');
      expect(rule.action.preferredModels).toContain('claude-3-opus');
      expect(rule.priority).toBe(10);
    });

    it('should require name', () => {
      expect(() => 
        createCustomRule(teamId, {
          name: '',
          action: { preferredModels: ['gpt-4'] },
        } as any)
      ).toThrow('Rule name is required');
    });

    it('should require preferred models', () => {
      expect(() => 
        createCustomRule(teamId, {
          name: 'Test',
          action: { preferredModels: [] },
        })
      ).toThrow('At least one preferred model is required');
    });
  });

  describe('List Custom Rules', () => {
    it('should list team rules sorted by priority', () => {
      // Create rules with different priorities
      createCustomRule(teamId, { name: 'Low Priority', action: { preferredModels: ['a'] }, priority: 1 });
      createCustomRule(teamId, { name: 'High Priority', action: { preferredModels: ['b'] }, priority: 100 });
      
      const rules = listCustomRules(teamId);
      
      expect(rules.length).toBeGreaterThan(0);
      expect(rules[0].priority).toBeGreaterThanOrEqual(rules[1].priority);
    });

    it('should get rule by id', () => {
      const rule = createCustomRule(teamId, { name: 'Get Test', action: { preferredModels: ['test'] } });
      const get = getCustomRule(rule.id);
      
      expect(get?.id).toBe(rule.id);
      expect(get?.name).toBe('Get Test');
    });
  });

  describe('Update Custom Rule', () => {
    it('should update rule', () => {
      const rule = createCustomRule(teamId, { name: 'Update Test', action: { preferredModels: ['old'] } });
      
      const updated = updateCustomRule(rule.id, {
        name: 'Updated Name',
        action: { preferredModels: ['new'], excludedModels: ['old'] },
      });
      
      expect(updated?.name).toBe('Updated Name');
      expect(updated?.action.preferredModels).toContain('new');
    });

    it('should update priority', () => {
      const rule = createCustomRule(teamId, { name: 'Priority Test', action: { preferredModels: ['test'] }, priority: 0 });
      
      const updated = updateCustomRule(rule.id, { priority: 50 });
      
      expect(updated?.priority).toBe(50);
    });

    it('should toggle enabled', () => {
      const rule = createCustomRule(teamId, { name: 'Toggle Test', action: { preferredModels: ['test'] }, enabled: true });
      
      const disabled = updateCustomRule(rule.id, { enabled: false });
      expect(disabled?.enabled).toBe(false);
      
      const reenabled = updateCustomRule(rule.id, { enabled: true });
      expect(reenabled?.enabled).toBe(true);
    });
  });

  describe('Delete Custom Rule', () => {
    it('should delete rule', () => {
      const rule = createCustomRule(teamId, { name: 'Delete Test', action: { preferredModels: ['test'] } });
      
      const deleted = deleteCustomRule(rule.id);
      expect(deleted).toBe(true);
      
      const get = getCustomRule(rule.id);
      expect(get).toBeNull();
    });
  });

  describe('Evaluate Rule', () => {
    it('should match intent condition', () => {
      const rule = createCustomRule(teamId, {
        name: 'Intent Rule',
        condition: { intent: ['coding'] },
        action: { preferredModels: ['gpt-4'] },
      });
      
      const context = { intent: 'coding' };
      expect(evaluateRule(rule, context)).toBe(true);
    });

    it('should not match non-intent condition', () => {
      const rule = createCustomRule(teamId, {
        name: 'Intent Rule',
        condition: { intent: ['coding'] },
        action: { preferredModels: ['gpt-4'] },
      });
      
      const context = { intent: 'chat' };
      expect(evaluateRule(rule, context)).toBe(false);
    });

    it('should check cost limit', () => {
      const rule = createCustomRule(teamId, {
        name: 'Cost Rule',
        condition: { costLimit: 1000 },
        action: { preferredModels: ['gpt-4'] },
      });
      
      expect(evaluateRule(rule, { estimatedCost: 500 })).toBe(true);
      expect(evaluateRule(rule, { estimatedCost: 1500 })).toBe(false);
    });

    it('should check time range', () => {
      const rule = createCustomRule(teamId, {
        name: 'Time Rule',
        condition: { timeRange: { start: '09:00', end: '17:00' } },
        action: { preferredModels: ['gpt-4'] },
      });
      
      // Current time should be within range
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      expect(evaluateRule(rule, { timestamp: now.getTime() })).toBe(true);
    });

    it('should ignore disabled rule', () => {
      const rule = createCustomRule(teamId, {
        name: 'Disabled Rule',
        condition: { intent: ['coding'] },
        action: { preferredModels: ['gpt-4'] },
        enabled: false,
      });
      
      expect(evaluateRule(rule, { intent: 'coding' })).toBe(false);
    });
  });

  describe('Apply Custom Rules', () => {
    it('should apply highest priority matching rule', () => {
      createCustomRule(teamId, {
        name: 'Low Priority',
        condition: { intent: ['coding'] },
        action: { preferredModels: ['claude-3-haiku'] },
        priority: 1,
      });
      
      createCustomRule(teamId, {
        name: 'High Priority',
        condition: { intent: ['coding'] },
        action: { preferredModels: ['claude-3-opus', 'gpt-4'] },
        priority: 100,
      });
      
      const decision = applyCustomRules(teamId, { 
        intent: 'coding',
        availableModels: ['claude-3-opus', 'gpt-4', 'claude-3-haiku'] 
      });
      
      expect(decision).toBeDefined();
      expect(decision?.selectedModel).toBe('claude-3-opus');
      expect(decision?.ruleName).toBe('High Priority');
    });

    it('should return null when no rules match', () => {
      createCustomRule(teamId, {
        name: 'Non-matching',
        condition: { intent: ['none'] },
        action: { preferredModels: ['gpt-4'] },
      });
      
      const decision = applyCustomRules(teamId, { intent: 'chat' });
      
      expect(decision).toBeNull();
    });

    it('should use fallback model', () => {
      createCustomRule(teamId, {
        name: 'Fallback Rule',
        condition: {},
        action: { 
          preferredModels: ['expensive-model'],
          excludedModels: [],
          fallbackModel: 'cheap-model',
        },
      });
      
      const decision = applyCustomRules(teamId, { 
        availableModels: ['cheap-model'] 
      });
      
      expect(decision?.selectedModel).toBe('cheap-model');
    });

    it('should exclude models', () => {
      createCustomRule(teamId, {
        name: 'Exclude Rule',
        condition: {},
        action: { 
          preferredModels: ['model-a', 'model-b'],
          excludedModels: ['model-a'],
          fallbackModel: 'model-c',
        },
      });
      
      const decision = applyCustomRules(teamId, { 
        availableModels: ['model-a', 'model-b', 'model-c'] 
      });
      
      expect(decision?.selectedModel).toBe('model-b');
    });
  });
});