import { NextRequest, NextResponse } from 'next/server';
import { login, refreshToken as miraieRefreshToken } from '@/lib/miraie-api';

/**
 * POST /api/auth - Establish the Unbroken Link
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, password, refreshToken } = body;

    // SCENARIO 1: We have a Refresh Token (Silent Re-auth)
    if (refreshToken) {
      const data = await miraieRefreshToken(refreshToken);
      return NextResponse.json({
        authenticated: true,
        token: data.accessToken,
        refreshToken: data.refreshToken || refreshToken // Keep the old one if no new one given
      });
    }

    // SCENARIO 2: Initial Login (Mobile/Email + Password)
    if (userId && password) {
      const data = await login(userId, password);
      return NextResponse.json({
        authenticated: true,
        token: data.accessToken,
        refreshToken: data.refreshToken, // This is the "Permanent Key"
        userId,
      });
    }

    return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'IDP Handshake Failed' }, { status: 401 });
  }
}
