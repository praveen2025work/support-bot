import { NextRequest, NextResponse } from 'next/server';
import { isRequestAdmin } from '@/lib/admin-auth';

/**
 * GET /api/admin/auth — Check if the current user is an admin.
 * Returns { isAdmin: boolean, user?: { id, name, email, role } }
 */
export async function GET(request: NextRequest) {
  const result = await isRequestAdmin(request);

  return NextResponse.json({
    isAdmin: result.isAdmin,
    user: result.user
      ? {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          userid: result.user.userid,
          role: result.user.role,
        }
      : null,
  });
}
