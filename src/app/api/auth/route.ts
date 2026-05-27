import { NextRequest, NextResponse } from 'next/server';
import { login } from '@/lib/miraie-api';

// In-memory token storage (resets on cold start)
let cachedAuth: {
  userId: string;
  accessToken: string;
  expiry: number;
} | null = null;

/**
 * GET /api/auth - Check authentication status
 */
export async function GET() {
  if (cachedAuth && Date.now() < cachedAuth.expiry) {
    return NextResponse.json({
      authenticated: true,
      userId: cachedAuth.userId,
    });
  }

  // Check if env vars are configured
  const userId = process.env.MIRAIE_USER_ID;
  if (userId && process.env.MIRAIE_PASSWORD) {
    try {
      const result = await login(userId, process.env.MIRAIE_PASSWORD);
      cachedAuth = {
        userId,
        accessToken: result.accessToken,
        expiry: Date.now() + 6 * 24 * 60 * 60 * 1000, // 6 days
      };
      return NextResponse.json({ authenticated: true, userId });
    } catch (error) {
      return NextResponse.json({
        authenticated: false,
        error: error instanceof Error ? error.message : 'Login failed',
      });
    }
  }

  return NextResponse.json({ authenticated: false });
}

/**
 * POST /api/auth - Login with credentials
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, password } = body;

    if (!userId || !password) {
      return NextResponse.json(
        { error: 'User ID and password are required' },
        { status: 400 }
      );
    }

    const result = await login(userId, password);

    cachedAuth = {
      userId,
      accessToken: result.accessToken,
      expiry: Date.now() + 6 * 24 * 60 * 60 * 1000,
    };

    return NextResponse.json({
      authenticated: true,
      userId,
      accessToken: result.accessToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Login failed',
      },
      { status: 401 }
    );
  }
}

/**
 * Export cached auth for use by other API routes
 */
export function getCachedAuth() {
  if (cachedAuth && Date.now() < cachedAuth.expiry) {
    return cachedAuth;
  }
  return null;
}
