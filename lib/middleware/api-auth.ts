/**
 * API Authentication Middleware
 * Unified authentication check for API routes
 * 
 * Supports:
 * 1. JWT token (from Authorization header or cookie)
 * 2. API Key (from Authorization header)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, findUserByApiKey } from '@/lib/auth';

// Public APIs that don't require authentication
const PUBLIC_API_PATHS = [
  '/api/ping',
  '/api/health',
  '/api/health/db',
  '/api/v1/health',
];

// APIs that allow optional auth (work without auth but may use auth for enhanced features)
const OPTIONAL_AUTH_PATHS = [
  '/api/v1/chat/completions', // Can use system API keys or user API keys
];

export interface AuthResult {
  authenticated: boolean;
  userId?: string;
  tier?: string;
  type?: 'jwt' | 'api_key' | 'public' | 'optional';
  error?: string;
}

/**
 * Check if a path is public (no auth required)
 */
export function isPublicPath(pathname: string): boolean {
  return PUBLIC_API_PATHS.some(p => pathname.startsWith(p));
}

/**
 * Check if a path allows optional auth
 */
export function isOptionalAuthPath(pathname: string): boolean {
  return OPTIONAL_AUTH_PATHS.some(p => pathname.startsWith(p));
}

/**
 * Authenticate an API request
 * 
 * @param request - Next.js request object
 * @returns AuthResult with user info or error
 */
export async function authenticateApiRequest(request: NextRequest): Promise<AuthResult> {
  const { pathname } = request.nextUrl;
  
  // Skip auth for public paths
  if (isPublicPath(pathname)) {
    return { authenticated: true, type: 'public' };
  }
  
  // Get token from Authorization header or cookie
  const authHeader = request.headers.get('authorization');
  const headerToken = authHeader?.replace('Bearer ', '');
  const cookieToken = request.cookies.get('accessToken')?.value || 
                       request.cookies.get('auth_token')?.value;
  
  const token = headerToken || cookieToken;
  
  if (!token) {
    // For optional auth paths, allow without auth
    if (isOptionalAuthPath(pathname)) {
      return { authenticated: true, type: 'optional', tier: 'free' };
    }
    
    return {
      authenticated: false,
      error: 'Authentication required. Provide a valid JWT token or API key.',
    };
  }
  
  // Try JWT verification first
  const secret = process.env.JWT_SECRET || 'hopllm-dev-secret';
  const jwtPayload = verifyJWT(token, secret);
  
  if (jwtPayload && jwtPayload.userId) {
    return {
      authenticated: true,
      userId: jwtPayload.userId as string,
      tier: (jwtPayload.tier as string) || 'free',
      type: 'jwt',
    };
  }
  
  // Try API Key verification
  const user = await findUserByApiKey(token);
  
  if (user) {
    return {
      authenticated: true,
      userId: user.id,
      tier: user.tier,
      type: 'api_key',
    };
  }
  
  // For optional auth paths, allow even with invalid auth (will use system keys)
  if (isOptionalAuthPath(pathname)) {
    return { authenticated: true, type: 'optional', tier: 'free' };
  }
  
  return {
    authenticated: false,
    error: 'Invalid token or API key.',
  };
}

/**
 * Create an unauthorized response
 */
export function unauthorizedResponse(error?: string): NextResponse {
  return NextResponse.json(
    {
      error: {
        code: 'UNAUTHORIZED',
        message: error || 'Authentication required',
      },
    },
    { status: 401 }
  );
}

/**
 * Wrapper for API routes that require authentication
 * 
 * Usage:
 * export const GET = withApiAuth(async (request, auth) => {
 *   // auth.userId and auth.tier are available
 *   return NextResponse.json({ data: ... });
 * });
 */
export function withApiAuth<T extends NextRequest>(
  handler: (request: T, auth: AuthResult) => Promise<NextResponse>
): (request: T) => Promise<NextResponse> {
  return async (request: T): Promise<NextResponse> => {
    const auth = await authenticateApiRequest(request);
    
    if (!auth.authenticated) {
      return unauthorizedResponse(auth.error);
    }
    
    return handler(request, auth);
  };
}