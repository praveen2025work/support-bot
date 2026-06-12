import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '@/lib/logger';
import { isRequestAdmin } from '@/lib/admin-auth';

const USERS_JSON_PATH = path.join(process.cwd(), 'src/config/users.json');

type Role = 'admin' | 'builder' | 'viewer';

interface User {
  id: string;
  name: string;
  email: string;
  userid: string;
  brid: string;
  role: Role;
  createdAt: string;
  updatedBy: string;
  updatedOn: string;
}

const VALID_ROLES: Role[] = ['admin', 'builder', 'viewer'];

async function readUsers(): Promise<{ users: User[] }> {
  const raw = await fs.readFile(USERS_JSON_PATH, 'utf-8');
  return JSON.parse(raw);
}

async function writeUsers(data: { users: User[] }): Promise<void> {
  await fs.writeFile(USERS_JSON_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export async function GET() {
  try {
    const data = await readUsers();
    return NextResponse.json({ users: data.users });
  } catch (error) {
    logger.error({ error }, 'Failed to read users');
    return NextResponse.json({ users: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Admin-only: creating users requires admin role
  const auth = await isRequestAdmin(request);
  if (!auth.isAdmin) {
    return NextResponse.json({ error: 'Forbidden — admin access required' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, email, userid, brid, role, updatedBy } = body;

    if (!name || !email || !userid) {
      return NextResponse.json(
        { error: 'name, email, and userid are required' },
        { status: 400 }
      );
    }

    const data = await readUsers();

    // Check for duplicate userid or email
    if (data.users.some((u) => u.userid === userid)) {
      return NextResponse.json(
        { error: `User with userid "${userid}" already exists` },
        { status: 409 }
      );
    }
    if (data.users.some((u) => u.email === email)) {
      return NextResponse.json(
        { error: `User with email "${email}" already exists` },
        { status: 409 }
      );
    }

    // Generate next ID
    const maxNum = data.users
      .map((u) => parseInt(u.id.replace('u', ''), 10))
      .filter((n) => !isNaN(n))
      .reduce((max, n) => Math.max(max, n), 0);

    const now = new Date().toISOString();
    const newUser: User = {
      id: `u${maxNum + 1}`,
      name,
      email,
      userid,
      brid: brid || '',
      role: role && VALID_ROLES.includes(role) ? role : 'viewer',
      createdAt: now,
      updatedBy: updatedBy || 'system',
      updatedOn: now,
    };

    data.users.push(newUser);
    await writeUsers(data);

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to create user');
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
