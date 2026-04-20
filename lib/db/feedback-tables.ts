/**
 * Model Feedback Database Tables
 * 
 * Tables for storing user feedback on model capabilities
 */

import { sql } from '@vercel/postgres';

// ===== Model Feedback Table =====

export async function ensureModelFeedbackTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS model_feedback (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      model_id TEXT NOT NULL,
      
      -- User scores (1-10 scale)
      coding_score DECIMAL(2,1),
      reasoning_score DECIMAL(2,1),
      translation_score DECIMAL(2,1),
      creative_score DECIMAL(2,1),
      analysis_score DECIMAL(2,1),
      math_score DECIMAL(2,1),
      long_context_score DECIMAL(2,1),
      chinese_score DECIMAL(2,1),
      
      -- User reported pricing
      input_cost DECIMAL(10,4),
      output_cost DECIMAL(10,4),
      
      -- Text feedback
      comment TEXT,
      
      -- Metadata
      created_at INTEGER NOT NULL,
      verified BOOLEAN DEFAULT FALSE,
      upvotes INTEGER DEFAULT 0,
      quality_score DECIMAL(2,1) DEFAULT 5.0
    )
  `;
  
  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_model_feedback_model_id ON model_feedback(model_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_model_feedback_user_id ON model_feedback(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_model_feedback_verified ON model_feedback(verified)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_model_feedback_created_at ON model_feedback(created_at)`;
  } catch {
    // Index may already exist
  }
}

// ===== Model Info Contributions Table =====

export async function ensureModelInfoContributionsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS model_info_contributions (
      id TEXT PRIMARY KEY,
      model_id TEXT NOT NULL,
      field TEXT NOT NULL,
      value TEXT NOT NULL,
      source TEXT,
      user_id TEXT,
      created_at INTEGER NOT NULL,
      verified BOOLEAN DEFAULT FALSE,
      upvotes INTEGER DEFAULT 0
    )
  `;
  
  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_model_contrib_model_id ON model_info_contributions(model_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_model_contrib_field ON model_info_contributions(field)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_model_contrib_verified ON model_info_contributions(verified)`;
  } catch {
    // Index may already exist
  }
}

// ===== User Reputation Table =====

export async function ensureUserReputationTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS user_reputation (
      user_id TEXT PRIMARY KEY,
      total_feedbacks INTEGER DEFAULT 0,
      verified_feedbacks INTEGER DEFAULT 0,
      total_upvotes INTEGER DEFAULT 0,
      reputation_score DECIMAL(3,1) DEFAULT 0.0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `;
  
  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_user_reputation_score ON user_reputation(reputation_score)`;
  } catch {
    // Index may already exist
  }
}

// ===== Ensure all feedback tables =====

export async function ensureAllFeedbackTables() {
  await Promise.all([
    ensureModelFeedbackTable(),
    ensureModelInfoContributionsTable(),
    ensureUserReputationTable(),
  ]);
}
