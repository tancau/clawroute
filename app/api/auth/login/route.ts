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
    const normalizedEmail = body.email.toLowerCase().trim();
    const user = await findUserByEmail(normalizedEmail);
    console.log('[Login] Looking for email:', normalizedEmail);
    console.log('[Login] User found:', !!user);
    
    if (!user) {
      return NextResponse.json(
        { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } },
        { status: 401 }
      );
    }

    // Verify password
    console.log('[Login] Stored passwordHash format:', user.passwordHash.substring(0, 50) + '...');
    console.log('[Login] PasswordHash parts count:', user.passwordHash.split(':').length);
    const passwordValid = verifyPassword(body.password, user.passwordHash);
    console.log('[Login] Password valid:', passwordValid);
    
    if (!passwordValid) {
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
      apiKey: user.apiKey,
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
