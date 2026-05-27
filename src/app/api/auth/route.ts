import { NextRequest, NextResponse } from 'next/server';
import { login } from '@/lib/miraie-api';
import { getCachedAuth, setCachedAuth } from '@/lib/auth-state';

/**
 * GET /api/auth - Check authentication status
 */
export async function GET() {
  const auth = getCachedAuth();
  if (auth) {
    return NextResponse.json({
      authenticated: true,
      userId: auth.userId,
    });
  }

  // Check if env vars are configured
  const userId = process.env.MIRAIE_USER_ID;
  if (userId && process.env.MIRAIE_PASSWORD) {
    try {
      const result = await login(userId, process.env.MIRAIE_PASSWORD);
      setCachedAuth(userId, result.accessToken);
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
    setCachedAuth(userId, result.accessToken);

    return NextResponse.json({
      authenticated: true,
      userId,
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
