/**
 * GET /api/credits/balance
 * 获取用户 Credits 余额
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, getCredits } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // 验证 JWT
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const payload = verifyJWT(token, process.env.JWT_SECRET || 'clawrouter-dev-secret');
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const userId = payload.userId as string;

    // 获取 Credits
    const credits = await getCredits(userId);

    return NextResponse.json({ 
      success: true, 
      data: { userId, credits }
    });
  } catch (error) {
    console.error('[Credits Balance] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}