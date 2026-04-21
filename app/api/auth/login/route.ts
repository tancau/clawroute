import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail, verifyPassword, generateTokens, isUsingPostgres } from '@/lib/auth';

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
    console.log('[Login] ========== LOGIN ATTEMPT ==========');
    console.log('[Login] Email:', normalizedEmail);
    console.log('[Login] Using PostgreSQL:', isUsingPostgres());
    
    const user = await findUserByEmail(normalizedEmail);
    console.log('[Login] User found:', !!user);
    
    if (!user) {
      console.log('[Login] User not found for email:', normalizedEmail);
      return NextResponse.json(
        { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } },
        { status: 401 }
      );
    }

    // Verify password
    console.log('[Login] User ID:', user.id);
    console.log('[Login] Stored passwordHash length:', user.passwordHash.length);
    console.log('[Login] Stored passwordHash format check (should have colon):', user.passwordHash.includes(':'));
    
    const passwordValid = verifyPassword(body.password, user.passwordHash);
    console.log('[Login] Password valid:', passwordValid);
    
    if (!passwordValid) {
      console.log('[Login] Password verification failed for user:', user.id);
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
    
    console.log('[Login] Login successful for user:', user.id);
    console.log('[Login] ====================================');

    return NextResponse.json(
      { user: safeUser, ...tokens },
      { status: 200 }
    );
  } catch (err) {
    console.error('[Login] Login error:', err);
    console.error('[Login] Error stack:', err instanceof Error ? err.stack : 'No stack');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Login failed. Please try again.' } },
      { status: 500 }
    );
  }
}
