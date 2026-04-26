import { Hono } from 'hono';
import { z } from 'zod';
import {
  getCustomRules,
  getEnabledCustomRules,
  createCustomRule,
  updateCustomRule,
  deleteCustomRule,
  getCustomRuleById,
  updateCustomRulePriority,
} from '../../../db/custom-rules';
import type { IntentType } from '../../../tools/types';
import { verifyJWT } from '../../server';
import { getEditableRules } from '../../../tools/classify/rules';

const router = new Hono();

// IntentType list
const INTENT_TYPES: IntentType[] = [
  'coding', 'analysis', 'creative', 'casual_chat',
  'trading', 'translation', 'long_context', 'reasoning', 'knowledge',
] as const;

// System rule names (cannot be deleted)
const SYSTEM_RULE_NAMES = new Set([
  'code_block', 'code_keywords', 'trading', 'long_context',
  'math_analysis', 'translation', 'creative_writing', 'reasoning',
  'knowledge', 'chinese_casual', 'english_casual',
]);

// Input validation schemas
const CreateRuleSchema = z.object({
  keyword: z.string().min(1).max(100),
  intent: z.enum(INTENT_TYPES),
  priority: z.number().min(0).max(1000).optional().default(50),
});

const UpdateRuleSchema = z.object({
  keyword: z.string().min(1).max(100).optional(),
  intent: z.enum(INTENT_TYPES).optional(),
  priority: z.number().min(0).max(1000).optional(),
  enabled: z.boolean().optional(),
});

const ReorderSchema = z.object({
  rules: z.array(z.object({
    id: z.string(),
    priority: z.number().min(0).max(1000),
  })),
});

// ==================== Auth Middleware ====================

/** Extract and verify JWT from request, returns userId or null */
function extractUserId(c: any): string | null {
  // Prefer from X-User-Id header (API Key auth)
  const userIdHeader = c.req.header('X-User-Id');
  if (userIdHeader) return userIdHeader;

  // Try JWT token
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const jwtSecret = process.env.JWT_SECRET || 'hopllm-dev-secret';
    const payload = verifyJWT(token, jwtSecret);
    if (payload?.userId) return payload.userId;
  }

  return null;
}

// ==================== Routing Rules API (new unified endpoint) ====================

// GET /api/user/rules/routing-rules - Get all editable rules (system + custom)
router.get('/routing-rules', async (c) => {
  const userId = extractUserId(c);
  if (!userId) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, 401);
  }

  try {
    const customRules = getCustomRules(userId);
    const rules = getEditableRules(userId, customRules);
    return c.json({ rules });
  } catch (error) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get rules' } }, 500);
  }
});

// POST /api/user/rules/routing-rules - Create custom rule
router.post('/routing-rules', async (c) => {
  const userId = extractUserId(c);
  if (!userId) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, 401);
  }

  try {
    const body = await c.req.json();
    const parseResult = CreateRuleSchema.safeParse(body);

    if (!parseResult.success) {
      return c.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: parseResult.error.flatten(),
        },
      }, 400);
    }

    const rule = createCustomRule({
      userId,
      keyword: parseResult.data.keyword,
      intent: parseResult.data.intent,
      priority: parseResult.data.priority,
    });

    return c.json({ rule }, 201);
  } catch (error) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create rule' } }, 500);
  }
});

// PUT /api/user/rules/routing-rules/:id - Update rule (priority/enabled)
router.put('/routing-rules/:id', async (c) => {
  const userId = extractUserId(c);
  if (!userId) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, 401);
  }

  const ruleId = c.req.param('id');

  try {
    const body = await c.req.json();
    const parseResult = UpdateRuleSchema.safeParse(body);

    if (!parseResult.success) {
      return c.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: parseResult.error.flatten(),
        },
      }, 400);
    }

    // System rules: only allow enabled toggle
    if (SYSTEM_RULE_NAMES.has(ruleId)) {
      if (parseResult.data.priority !== undefined || parseResult.data.keyword !== undefined) {
        return c.json({
          error: { code: 'FORBIDDEN', message: 'Cannot modify system rule priority or keyword' },
        }, 403);
      }
      // System rules have no persistent storage - return success
      return c.json({ success: true, rule: { id: ruleId, enabled: parseResult.data.enabled ?? true } });
    }

    // Custom rules: allow all updates
    const rule = updateCustomRule(ruleId, userId, parseResult.data);
    if (!rule) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Rule not found' } }, 404);
    }

    return c.json({ rule });
  } catch (error) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update rule' } }, 500);
  }
});

// POST /api/user/rules/routing-rules/reorder - Batch update priorities
router.post('/routing-rules/reorder', async (c) => {
  const userId = extractUserId(c);
  if (!userId) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, 401);
  }

  try {
    const body = await c.req.json();
    const parseResult = ReorderSchema.safeParse(body);

    if (!parseResult.success) {
      return c.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: parseResult.error.flatten(),
        },
      }, 400);
    }

    // Only update custom rules (system rules ignored)
    const updated: string[] = [];
    for (const { id, priority } of parseResult.data.rules) {
      if (!SYSTEM_RULE_NAMES.has(id)) {
        const result = updateCustomRulePriority(id, userId, priority);
        if (result) updated.push(id);
      }
    }

    return c.json({ success: true, updated });
  } catch (error) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to reorder rules' } }, 500);
  }
});

// DELETE /api/user/rules/routing-rules/:id - Delete custom rule
router.delete('/routing-rules/:id', async (c) => {
  const userId = extractUserId(c);
  if (!userId) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, 401);
  }

  const ruleId = c.req.param('id');

  if (SYSTEM_RULE_NAMES.has(ruleId)) {
    return c.json({ error: { code: 'FORBIDDEN', message: 'Cannot delete system rule' } }, 403);
  }

  try {
    const deleted = deleteCustomRule(ruleId, userId);
    if (!deleted) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Rule not found' } }, 404);
    }
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete rule' } }, 500);
  }
});

// ==================== Legacy Rules API ====================

// GET /api/user/rules - Get user custom rules (legacy)
router.get('/', async (c) => {
  const userId = extractUserId(c);
  if (!userId) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, 401);
  }

  try {
    const rules = getCustomRules(userId);
    return c.json({ rules });
  } catch (error) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get rules' } }, 500);
  }
});

// POST /api/user/rules - Create rule (legacy)
router.post('/', async (c) => {
  const userId = extractUserId(c);
  if (!userId) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, 401);
  }

  try {
    const body = await c.req.json();
    const parseResult = CreateRuleSchema.safeParse(body);

    if (!parseResult.success) {
      return c.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: parseResult.error.flatten(),
        },
      }, 400);
    }

    const rule = createCustomRule({
      userId,
      keyword: parseResult.data.keyword,
      intent: parseResult.data.intent,
      priority: parseResult.data.priority,
    });

    return c.json({ rule }, 201);
  } catch (error) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create rule' } }, 500);
  }
});

// PUT /api/user/rules/:id - Update rule (legacy)
router.put('/:id', async (c) => {
  const userId = extractUserId(c);
  if (!userId) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, 401);
  }

  const ruleId = c.req.param('id');

  try {
    const body = await c.req.json();
    const parseResult = UpdateRuleSchema.safeParse(body);

    if (!parseResult.success) {
      return c.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: parseResult.error.flatten(),
        },
      }, 400);
    }

    const rule = updateCustomRule(ruleId, userId, parseResult.data);
    if (!rule) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Rule not found' } }, 404);
    }

    return c.json({ rule });
  } catch (error) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update rule' } }, 500);
  }
});

// DELETE /api/user/rules/:id - Delete rule (legacy)
router.delete('/:id', async (c) => {
  const userId = extractUserId(c);
  if (!userId) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, 401);
  }

  const ruleId = c.req.param('id');

  try {
    const deleted = deleteCustomRule(ruleId, userId);
    if (!deleted) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Rule not found' } }, 404);
    }
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete rule' } }, 500);
  }
});

export default router;
