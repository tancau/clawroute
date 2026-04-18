import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${BACKEND_URL}/v1/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const isNetworkError = message.includes('fetch') || message.includes('ECONNREFUSED') || message.includes('connect');

    return NextResponse.json(
      {
        error: {
          code: isNetworkError ? 'BACKEND_UNAVAILABLE' : 'INTERNAL_ERROR',
          message: isNetworkError
            ? 'Backend service is not available. Please ensure the backend is running or try again later.'
            : 'Registration failed. Please try again.',
        },
      },
      { status: isNetworkError ? 503 : 500 }
    );
  }
}
