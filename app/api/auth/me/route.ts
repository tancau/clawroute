/**
 * Get current user info
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, findUserById } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header or cookie
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('auth_token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'No authentication token provided' } },
        { status: 401 }
      );
    }
    
    // Verify token
    const payload = verifyJWT(token, process.env.JWT_SECRET || 'clawrouter-dev-secret');
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' } },
        { status: 401 }
      );
    }
    
    // Get user info by userId from JWT
    const user = await findUserById(payload.userId as string);
    if (!user) {
      return NextResponse.json(
        { error: { code: 'USER_NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      );
    }
    
    // Return safe user info
    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      tier: user.tier,
      credits: user.credits,
      apiKey: user.apiKey,
      createdAt: user.createdAt
    });
  } catch (err) {
    console.error('[Auth Me] Error:', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to get user info' } },
      { status: 500 }
    );
  }
}