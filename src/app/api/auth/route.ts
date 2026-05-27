import { NextRequest, NextResponse } from 'next/server';
import { login } from '@/lib/miraie-api';

/**
 * POST /api/auth - Login and return token to client
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, password } = body;

    if (!userId || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    const result = await login(userId, password);
    
    return NextResponse.json({
      authenticated: true,
      token: result.accessToken,
      userId,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 401 }
    );
  }
}
