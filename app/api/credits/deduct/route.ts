/**
 * POST /api/credits/deduct
 * 扣减 Credits
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, deductCredits, getCredits } from '@/lib/auth';

interface DeductRequest {
  amount: number;
  reason?: string;
}

export async function POST(request: NextRequest) {
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

    // 解析请求
    const body: DeductRequest = await request.json();
    
    if (!body.amount || body.amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid amount' },
        { status: 400 }
      );
    }

    // 执行扣减
    const success = await deductCredits(userId, body.amount);
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Insufficient credits' },
        { status: 402 } // Payment Required
      );
    }

    // 获取最新余额
    const newBalance = await getCredits(userId);

    return NextResponse.json({ 
      success: true, 
      data: { 
        userId,
        deducted: body.amount,
        newBalance,
        reason: body.reason || 'API request'
      }
    });
  } catch (error) {
    console.error('[Credits Deduct] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}