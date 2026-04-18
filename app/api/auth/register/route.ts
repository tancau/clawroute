import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail, createUser, generateTokens } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    if (!body.email || !body.password) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Email and password are required' } },
        { status: 400 }
      );
    }

    if (body.password.length < 6) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Password must be at least 6 characters' } },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existing = await findUserByEmail(body.email);
    if (existing) {
      return NextResponse.json(
        { error: { code: 'EMAIL_EXISTS', message: 'Email already registered' } },
        { status: 409 }
      );
    }

    // Create user
    const user = await createUser(body.email, body.password, body.name);
    const tokens = generateTokens(user.id, user.tier);

    return NextResponse.json(
      { user, ...tokens },
      { status: 201 }
    );
  } catch (err) {
    console.error('Registration error:', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Registration failed. Please try again.' } },
      { status: 500 }
    );
  }
}
