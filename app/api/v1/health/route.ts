/**
 * Health check endpoint for API Routes
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: 'v1',
    endpoints: {
      chat_completions: '/api/v1/chat/completions',
    },
  });
}