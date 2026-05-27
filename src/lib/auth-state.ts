/**
 * In-memory auth state for the serverless functions
 * This persists across warm invocations on Vercel
 */

let cachedAuth: {
  userId: string;
  accessToken: string;
  expiry: number;
} | null = null;

export function getCachedAuth() {
  if (cachedAuth && Date.now() < cachedAuth.expiry) {
    return cachedAuth;
  }
  return null;
}

export function setCachedAuth(userId: string, accessToken: string) {
  cachedAuth = {
    userId,
    accessToken,
    expiry: Date.now() + 6 * 24 * 60 * 60 * 1000, // 6 days
  };
}

export function clearCachedAuth() {
  cachedAuth = null;
}
