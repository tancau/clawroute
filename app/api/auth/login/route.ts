import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail, verifyPassword, generateTokens } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.email || !body.password) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Email and password are required' } },
        { status: 400 }
      );
    }

    // Find user
    const user = await findUserByEmail(body.email);
    if (!user) {
      return NextResponse.json(
        { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } },
        { status: 401 }
      );
    }

    // Verify password
    if (!verifyPassword(body.password, user.passwordHash)) {
      return NextResponse.json(
        { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } },
        { status: 401 }
      );
    }

    // Generate tokens (exclude passwordHash from response)
    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      tier: user.tier,
      credits: user.credits,
      createdAt: user.createdAt,
    };
    const tokens = generateTokens(safeUser.id, safeUser.tier);

    return NextResponse.json(
      { user: safeUser, ...tokens },
      { status: 200 }
    );
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Login failed. Please try again.' } },
      { status: 500 }
    );
  }
}
