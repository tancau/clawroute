import { db } from '../db';
import crypto from 'crypto';

// ==================== Types ====================

export interface CustomRoutingRule {
  id: string;
  teamId: string;
  name: string;
  condition: {
    intent?: string[];
    userGroup?: string[];
    timeRange?: { start: string; end: string };
    costLimit?: number;
  };
  action: {
    preferredModels: string[];
    excludedModels: string[];
    fallbackModel?: string;
  };
  priority: number;
  enabled: boolean;
}

export interface RoutingRequest {
  intent?: string;
  userGroup?: string;
  timestamp?: number;
  estimatedCost?: number;
  availableModels?: string[];
}

export interface RoutingDecision {
  selectedModel: string;
  ruleId?: string;
  ruleName?: string;
  reason: string;
  alternatives: string[];
}

// ==================== Table Init ====================

export function initCustomRoutingTables(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS custom_routing_rules (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      name TEXT NOT NULL,
      condition TEXT,
      action TEXT,
      priority INTEGER DEFAULT 0,
      enabled INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_custom_routing_team ON custom_routing_rules(team_id);
    CREATE INDEX IF NOT EXISTS idx_custom_routing_enabled ON custom_routing_rules(enabled);
    CREATE INDEX IF NOT EXISTS idx_custom_routing_priority ON custom_routing_rules(priority DESC);
  `);
}

// ==================== Rule CRUD ====================

export function createCustomRule(
  teamId: string,
  rule: Omit<CustomRoutingRule, 'id' | 'teamId' | 'createdAt'>
): CustomRoutingRule {
  // Validate
  if (!rule.name || rule.name.trim().length === 0) {
    throw new Error('Rule name is required');
  }

  if (!rule.action || !rule.action.preferredModels || rule.action.preferredModels.length === 0) {
    throw new Error('At least one preferred model is required');
  }

  const id = crypto.randomUUID();
  const now = Date.now();

  db.prepare(
    'INSERT INTO custom_routing_rules (id, team_id, name, condition, action, priority, enabled, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    id,
    teamId,
    rule.name,
    JSON.stringify(rule.condition || {}),
    JSON.stringify(rule.action),
    rule.priority ?? 0,
    rule.enabled !== false ? 1 : 0,
    now
  );

  return {
    id,
    teamId,
    name: rule.name,
    condition: rule.condition || {},
    action: rule.action,
    priority: rule.priority ?? 0,
    enabled: rule.enabled !== false,
  };
}

export function listCustomRules(teamId: string): CustomRoutingRule[] {
  const rows = db.prepare(
    'SELECT * FROM custom_routing_rules WHERE team_id = ? ORDER BY priority DESC, created_at ASC'
  ).all(teamId) as any[];
  return rows.map(mapRuleRow);
}

export function getCustomRule(ruleId: string): CustomRoutingRule | null {
  const row = db.prepare('SELECT * FROM custom_routing_rules WHERE id = ?').get(ruleId) as any;
  return row ? mapRuleRow(row) : null;
}

export function updateCustomRule(
  ruleId: string,
  updates: Partial<Pick<CustomRoutingRule, 'name' | 'condition' | 'action' | 'priority' | 'enabled'>>
): CustomRoutingRule | null {
  const existing = getCustomRule(ruleId);
  if (!existing) return null;

  const setClauses: string[] = [];
  const values: any[] = [];

  if (updates.name !== undefined) {
    if (updates.name.trim().length === 0) {
      throw new Error('Rule name cannot be empty');
    }
    setClauses.push('name = ?');
    values.push(updates.name);
  }

  if (updates.condition !== undefined) {
    setClauses.push('condition = ?');
    values.push(JSON.stringify(updates.condition));
  }

  if (updates.action !== undefined) {
    if (!updates.action.preferredModels || updates.action.preferredModels.length === 0) {
      throw new Error('At least one preferred model is required');
    }
    setClauses.push('action = ?');
    values.push(JSON.stringify(updates.action));
  }

  if (updates.priority !== undefined) {
    setClauses.push('priority = ?');
    values.push(updates.priority);
  }

  if (updates.enabled !== undefined) {
    setClauses.push('enabled = ?');
    values.push(updates.enabled ? 1 : 0);
  }

  if (setClauses.length === 0) return existing;

  values.push(ruleId);
  db.prepare(`UPDATE custom_routing_rules SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);

  return getCustomRule(ruleId);
}

export function deleteCustomRule(ruleId: string): boolean {
  const result = db.prepare('DELETE FROM custom_routing_rules WHERE id = ?').run(ruleId);
  return result.changes > 0;
}

// ==================== Rule Evaluation ====================

/**
 * Evaluate whether a rule's conditions match the given context.
 */
export function evaluateRule(rule: CustomRoutingRule, context: RoutingRequest): boolean {
  if (!rule.enabled) return false;

  const cond = rule.condition;

  // Check intent match
  if (cond.intent && cond.intent.length > 0) {
    if (!context.intent || !cond.intent.includes(context.intent)) {
      return false;
    }
  }

  // Check user group match
  if (cond.userGroup && cond.userGroup.length > 0) {
    if (!context.userGroup || !cond.userGroup.includes(context.userGroup)) {
      return false;
    }
  }

  // Check time range
  if (cond.timeRange) {
    const now = context.timestamp || Date.now();
    const date = new Date(now);
    const currentTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

    if (cond.timeRange.start && currentTime < cond.timeRange.start) {
      return false;
    }
    if (cond.timeRange.end && currentTime > cond.timeRange.end) {
      return false;
    }
  }

  // Check cost limit
  if (cond.costLimit !== undefined && context.estimatedCost !== undefined) {
    if (context.estimatedCost > cond.costLimit) {
      return false;
    }
  }

  return true;
}

/**
 * Apply custom routing rules for a team and request context.
 * Returns a routing decision with the selected model.
 */
export function applyCustomRules(teamId: string, request: RoutingRequest): RoutingDecision | null {
  const rules = listCustomRules(teamId);

  // Sort by priority (highest first) — already sorted from query
  for (const rule of rules) {
    if (evaluateRule(rule, request)) {
      const action = rule.action;

      // Find the first available preferred model
      let selectedModel: string | undefined;
      if (request.availableModels && request.availableModels.length > 0) {
        for (const model of action.preferredModels) {
          if (request.availableModels.includes(model)) {
            selectedModel = model;
            break;
          }
        }
      } else {
        selectedModel = action.preferredModels[0];
      }

      if (!selectedModel) {
        // No preferred model is available, use fallback
        if (action.fallbackModel) {
          selectedModel = action.fallbackModel;
        } else {
          continue; // Skip this rule, try next
        }
      }

      // Filter out excluded models
      if (action.excludedModels && action.excludedModels.includes(selectedModel)) {
        if (action.fallbackModel) {
          selectedModel = action.fallbackModel;
        } else {
          continue;
        }
      }

      // Build alternatives list (other preferred models that aren't excluded)
      const alternatives = action.preferredModels.filter(
        m => m !== selectedModel && !(action.excludedModels || []).includes(m)
      );

      return {
        selectedModel,
        ruleId: rule.id,
        ruleName: rule.name,
        reason: `Matched custom rule: ${rule.name} (priority: ${rule.priority})`,
        alternatives,
      };
    }
  }

  // No custom rule matched
  return null;
}

// ==================== Helpers ====================

function mapRuleRow(row: any): CustomRoutingRule {
  return {
    id: row.id,
    teamId: row.team_id,
    name: row.name,
    condition: JSON.parse(row.condition || '{}'),
    action: JSON.parse(row.action || '{}'),
    priority: row.priority,
    enabled: row.enabled === 1,
  };
}
