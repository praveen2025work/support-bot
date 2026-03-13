import { promises as fs } from 'fs';
import path from 'path';
import { timeoutSignal } from '@/lib/generate-id';

const USERS_JSON_PATH = path.join(process.cwd(), 'src/config/users.json');

export type Role = 'admin' | 'builder' | 'viewer';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  userid: string;
  brid: string;
  role: Role;
}

interface AdminCheckResult {
  isAdmin: boolean;
  user?: AdminUser;
}

/**
 * Read the users database from users.json.
 */
async function readUsers(): Promise<{ users: AdminUser[] }> {
  const raw = await fs.readFile(USERS_JSON_PATH, 'utf-8');
  return JSON.parse(raw);
}

/**
 * Check if a user (identified by their AD samAccountName and/or email)
 * is registered as an admin in users.json.
 *
 * Matching priority:
 * 1. userid field matches samAccountName (AD account name)
 * 2. email field matches emailAddress (fallback)
 */
export async function checkAdminByIdentity(
  samAccountName?: string,
  emailAddress?: string
): Promise<AdminCheckResult> {
  try {
    const data = await readUsers();

    // Primary match: userid === samAccountName
    if (samAccountName) {
      const match = data.users.find(
        (u) => u.userid.toLowerCase() === samAccountName.toLowerCase()
      );
      if (match) {
        return { isAdmin: match.role === 'admin', user: match };
      }
    }

    // Fallback match: email === emailAddress
    if (emailAddress) {
      const match = data.users.find(
        (u) => u.email.toLowerCase() === emailAddress.toLowerCase()
      );
      if (match) {
        return { isAdmin: match.role === 'admin', user: match };
      }
    }

    // No match found — not registered, not admin
    return { isAdmin: false };
  } catch {
    // If users.json can't be read, deny access
    return { isAdmin: false };
  }
}

/**
 * Server-side helper for Next.js API routes.
 * Fetches the current user's identity from /api/userinfo and checks admin status.
 *
 * Pass the incoming request so we can forward cookies/auth headers.
 */
export async function isRequestAdmin(
  request: Request
): Promise<AdminCheckResult> {
  try {
    // Build the internal URL for userinfo
    const url = new URL(request.url);
    const userInfoUrl = `${url.origin}/api/userinfo`;

    // Forward relevant auth headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const cookie = request.headers.get('cookie');
    if (cookie) headers['Cookie'] = cookie;
    const auth = request.headers.get('authorization');
    if (auth) headers['Authorization'] = auth;

    const res = await fetch(userInfoUrl, {
      method: 'GET',
      headers,
      signal: timeoutSignal(5_000),
    });

    if (!res.ok) {
      return { isAdmin: false };
    }

    const userInfo = await res.json();
    return checkAdminByIdentity(userInfo.samAccountName, userInfo.emailAddress);
  } catch {
    return { isAdmin: false };
  }
}
