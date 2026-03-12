import { NextResponse } from 'next/server';

// GET /api/userinfo — monolith mode fallback (when ENGINE_URL is not set)
export async function GET() {
  const userInfoUrl = process.env.USER_INFO_URL;

  if (userInfoUrl) {
    try {
      const response = await fetch(userInfoUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        return NextResponse.json({ error: 'Failed to fetch user info' }, { status: response.status });
      }

      const data = await response.json();
      return NextResponse.json(data);
    } catch {
      return NextResponse.json({ error: 'User info service unavailable' }, { status: 502 });
    }
  }

  // Local dev fallback
  return NextResponse.json({
    samAccountName: 'local_dev',
    displayName: 'Local Developer',
    emailAddress: 'dev@localhost',
    employeeId: 'DEV001',
    givenName: 'Local',
    surname: 'Developer',
    userName: 'LOCAL\\dev',
    department: 'Development',
    location: 'Local',
    role: 'Developer',
  });
}
