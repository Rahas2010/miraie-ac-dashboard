import { NextRequest, NextResponse } from 'next/server';
import { login } from '@/lib/miraie-api';
import { getCachedAuth, setCachedAuth, clearCachedAuth } from '@/lib/auth-state';

/**
 * GET /api/auth - Check current session status
 */
export async function GET() {
  const auth = getCachedAuth();
  if (auth) {
    return NextResponse.json({
      authenticated: true,
      userId: auth.userId,
    });
  }
  return NextResponse.json({ authenticated: false });
}

/**
 * POST /api/auth - Login with MirAIe credentials
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, password } = body;

    if (!userId || !password) {
      return NextResponse.json(
        { error: 'Email/Mobile and Password are required' },
        { status: 400 }
      );
    }

    // Attempt to login to Panasonic servers
    const result = await login(userId, password);
    
    // Store in memory (server-side)
    setCachedAuth(userId, result.accessToken);

    return NextResponse.json({
      authenticated: true,
      userId,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Login failed. Please check your credentials.' },
      { status: 401 }
    );
  }
}

/**
 * DELETE /api/auth - Logout
 */
export async function DELETE() {
  clearCachedAuth();
  return NextResponse.json({ authenticated: false });
}
