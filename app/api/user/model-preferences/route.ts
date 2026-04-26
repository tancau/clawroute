/**
 * User Model Preferences API
 *
 * GET - Get user's model preferences
 * POST - Save user's model preferences
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/pg';

// ===== Types =====

export interface ModelPreferences {
  preset?: 'optimal' | 'economy' | 'power';
  models: {
    default?: string;
    coding?: string;
    reasoning?: string;
    creative?: string;
    cheap?: string;
    math?: string;
    translation?: string;
    chinese?: string;
    longContext?: string;
  };
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
async function ensureModelPreferencesTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS model_preferences (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      preset TEXT,
      default_model TEXT,
      coding_model TEXT,
      reasoning_model TEXT,
      creative_model TEXT,
      cheap_model TEXT,
      math_model TEXT,
      translation_model TEXT,
      chinese_model TEXT,
      long_context_model TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `;

  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_model_preferences_user_id ON model_preferences(user_id)`;
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
    
    await ensureModelPreferencesTable();
    
    const result = await sql`
      SELECT * FROM model_preferences WHERE user_id = ${userId}
    `;
    
    if (result.rows.length === 0) {
      return NextResponse.json({
        preferences: {
          preset: 'optimal',
          models: {},
          updatedAt: new Date().toISOString(),
        },
      });
    }
    
    const row = result.rows[0]!;
    const preferences: ModelPreferences = {
      preset: row.preset as 'optimal' | 'economy' | 'power' | undefined,
      models: {
        default: row.default_model as string | undefined,
        coding: row.coding_model as string | undefined,
        reasoning: row.reasoning_model as string | undefined,
        creative: row.creative_model as string | undefined,
        cheap: row.cheap_model as string | undefined,
        math: row.math_model as string | undefined,
        translation: row.translation_model as string | undefined,
        chinese: row.chinese_model as string | undefined,
        longContext: row.long_context_model as string | undefined,
      },
      updatedAt: new Date(Number(row.updated_at)).toISOString(),
    };
    
    return NextResponse.json({ preferences });
  } catch (error) {
    console.error('Get model preferences error:', error);
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
    
    await ensureModelPreferencesTable();
    
    const now = Date.now();
    const id = `pref_${userId}`;
    
    // Upsert
    await sql`
      INSERT INTO model_preferences (
        id, user_id, preset, default_model, coding_model, reasoning_model,
        creative_model, cheap_model, math_model, translation_model,
        chinese_model, long_context_model, created_at, updated_at
      ) VALUES (
        ${id}, ${userId}, ${body.preset || null}, ${body.models?.default || null},
        ${body.models?.coding || null}, ${body.models?.reasoning || null},
        ${body.models?.creative || null}, ${body.models?.cheap || null},
        ${body.models?.math || null}, ${body.models?.translation || null},
        ${body.models?.chinese || null}, ${body.models?.longContext || null},
        ${now}, ${now}
      )
      ON CONFLICT (user_id) DO UPDATE SET
        preset = ${body.preset || null},
        default_model = ${body.models?.default || null},
        coding_model = ${body.models?.coding || null},
        reasoning_model = ${body.models?.reasoning || null},
        creative_model = ${body.models?.creative || null},
        cheap_model = ${body.models?.cheap || null},
        math_model = ${body.models?.math || null},
        translation_model = ${body.models?.translation || null},
        chinese_model = ${body.models?.chinese || null},
        long_context_model = ${body.models?.longContext || null},
        updated_at = ${now}
    `;
    
    const preferences: ModelPreferences = {
      preset: body.preset,
      models: body.models || {},
      updatedAt: new Date(now).toISOString(),
    };
    
    return NextResponse.json({
      success: true,
      preferences,
      message: 'Model preferences saved successfully',
    });
  } catch (error) {
    console.error('Save model preferences error:', error);
    return NextResponse.json(
      { error: 'Failed to save preferences' },
      { status: 500 }
    );
  }
}