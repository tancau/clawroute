/**
 * User Preferences API
 *
 * GET - Get user's full preferences (optimization goal, model preferences, budget, excluded models)
 * POST - Save user's preferences
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/pg';

// ===== Types =====

export interface UserPreferences {
  optimizationGoal: 'cost' | 'quality' | 'speed' | 'balanced';
  modelPreferences: {
    coding: 'free' | 'paid';
    reasoning: 'free' | 'paid';
    translation: 'free' | 'paid';
    creative: 'free' | 'paid';
  };
  budget: {
    maxPerRequest: number;
    dailyLimit: number;
    autoDowngrade: boolean;
  };
  excludedModels: string[];
  updatedAt: string;
}

// ===== Helper Functions =====

async function getUserId(request: NextRequest): Promise<string | null> {
  // Try Authorization header
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    // Try cookie
    const cookieToken = request.cookies.get('auth_token')?.value;
    if (!cookieToken) return null;

    // Verify JWT (simplified - in production use proper JWT verification)
    try {
      const parts = cookieToken.split('.');
      if (parts.length !== 3 || !parts[1]) return null;
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      return payload.userId || null;
    } catch {
      return null;
    }
  }

  // Verify JWT
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || !parts[1]) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return payload.userId || null;
  } catch {
    return null;
  }
}

// Ensure table exists
async function ensurePreferencesTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS user_preferences (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      optimization_goal TEXT NOT NULL DEFAULT 'balanced',
      coding_preference TEXT NOT NULL DEFAULT 'free',
      reasoning_preference TEXT NOT NULL DEFAULT 'paid',
      translation_preference TEXT NOT NULL DEFAULT 'free',
      creative_preference TEXT NOT NULL DEFAULT 'paid',
      max_per_request REAL NOT NULL DEFAULT 0.01,
      daily_limit REAL NOT NULL DEFAULT 1.0,
      auto_downgrade BOOLEAN NOT NULL DEFAULT true,
      excluded_models TEXT[] DEFAULT '{}',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `;

  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id)`;
  } catch {
    // Index may already exist
  }
}

// ===== API Handlers =====

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    await ensurePreferencesTable();

    const result = await sql`
      SELECT * FROM user_preferences WHERE user_id = ${userId}
    `;

    if (result.rows.length === 0) {
      // Return default preferences
      return NextResponse.json({
        preferences: {
          optimizationGoal: 'balanced',
          modelPreferences: {
            coding: 'free',
            reasoning: 'paid',
            translation: 'free',
            creative: 'paid',
          },
          budget: {
            maxPerRequest: 0.01,
            dailyLimit: 1.0,
            autoDowngrade: true,
          },
          excludedModels: [],
          updatedAt: new Date().toISOString(),
        },
      });
    }

    const row = result.rows[0];
    if (!row) {
      // This should not happen since we checked rows.length === 0 above
      throw new Error('No row found after check');
    }

    const preferences: UserPreferences = {
      optimizationGoal: (row.optimization_goal as 'cost' | 'quality' | 'speed' | 'balanced') || 'balanced',
      modelPreferences: {
        coding: (row.coding_preference as 'free' | 'paid') || 'free',
        reasoning: (row.reasoning_preference as 'free' | 'paid') || 'paid',
        translation: (row.translation_preference as 'free' | 'paid') || 'free',
        creative: (row.creative_preference as 'free' | 'paid') || 'paid',
      },
      budget: {
        maxPerRequest: Number(row.max_per_request) || 0.01,
        dailyLimit: Number(row.daily_limit) || 1.0,
        autoDowngrade: Boolean(row.auto_downgrade),
      },
      excludedModels: (row.excluded_models as string[]) || [],
      updatedAt: new Date(Number(row.updated_at)).toISOString(),
    };

    return NextResponse.json({ preferences });
  } catch (error) {
    console.error('Get user preferences error:', error);
    return NextResponse.json(
      { error: 'Failed to get preferences' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate input
    const validGoals = ['cost', 'quality', 'speed', 'balanced'];
    const validPreferences = ['free', 'paid'];

    const optimizationGoal = validGoals.includes(body.optimizationGoal)
      ? body.optimizationGoal
      : 'balanced';

    const modelPreferences = {
      coding: validPreferences.includes(body.modelPreferences?.coding) ? body.modelPreferences.coding : 'free',
      reasoning: validPreferences.includes(body.modelPreferences?.reasoning) ? body.modelPreferences.reasoning : 'paid',
      translation: validPreferences.includes(body.modelPreferences?.translation) ? body.modelPreferences.translation : 'free',
      creative: validPreferences.includes(body.modelPreferences?.creative) ? body.modelPreferences.creative : 'paid',
    };

    const budget = {
      maxPerRequest: typeof body.budget?.maxPerRequest === 'number' ? Math.max(0, body.budget.maxPerRequest) : 0.01,
      dailyLimit: typeof body.budget?.dailyLimit === 'number' ? Math.max(0, body.budget.dailyLimit) : 1.0,
      autoDowngrade: typeof body.budget?.autoDowngrade === 'boolean' ? body.budget.autoDowngrade : true,
    };

    const excludedModels = Array.isArray(body.excludedModels)
      ? body.excludedModels.filter((m: unknown) => typeof m === 'string')
      : [];

    await ensurePreferencesTable();

    const now = Date.now();
    const id = `pref_${userId}`;

    // Upsert
    await sql`
      INSERT INTO user_preferences (
        id, user_id, optimization_goal, coding_preference, reasoning_preference,
        translation_preference, creative_preference, max_per_request, daily_limit,
        auto_downgrade, excluded_models, created_at, updated_at
      ) VALUES (
        ${id}, ${userId}, ${optimizationGoal}, ${modelPreferences.coding},
        ${modelPreferences.reasoning}, ${modelPreferences.translation},
        ${modelPreferences.creative}, ${budget.maxPerRequest}, ${budget.dailyLimit},
        ${budget.autoDowngrade}, ${excludedModels}, ${now}, ${now}
      )
      ON CONFLICT (user_id) DO UPDATE SET
        optimization_goal = ${optimizationGoal},
        coding_preference = ${modelPreferences.coding},
        reasoning_preference = ${modelPreferences.reasoning},
        translation_preference = ${modelPreferences.translation},
        creative_preference = ${modelPreferences.creative},
        max_per_request = ${budget.maxPerRequest},
        daily_limit = ${budget.dailyLimit},
        auto_downgrade = ${budget.autoDowngrade},
        excluded_models = ${excludedModels},
        updated_at = ${now}
    `;

    const preferences: UserPreferences = {
      optimizationGoal,
      modelPreferences,
      budget,
      excludedModels,
      updatedAt: new Date(now).toISOString(),
    };

    return NextResponse.json({
      success: true,
      preferences,
      message: 'Preferences saved successfully',
    });
  } catch (error) {
    console.error('Save user preferences error:', error);
    return NextResponse.json(
      { error: 'Failed to save preferences' },
      { status: 500 }
    );
  }
}