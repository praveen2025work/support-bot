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

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  try {
    const data = await readUsers();
    const user = data.users.find((u) => u.id === id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json(user);
  } catch (error) {
    logger.error({ error }, 'Failed to get user');
    return NextResponse.json({ error: 'Failed to get user' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Admin-only: modifying users requires admin role
  const auth = await isRequestAdmin(request);
  if (!auth.isAdmin) {
    return NextResponse.json({ error: 'Forbidden — admin access required' }, { status: 403 });
  }

  const { id } = params;
  try {
    const body = await request.json();
    const data = await readUsers();
    const idx = data.users.findIndex((u) => u.id === id);

    if (idx === -1) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = data.users[idx];

    if (body.name !== undefined) user.name = body.name;
    if (body.email !== undefined) user.email = body.email;
    if (body.userid !== undefined) user.userid = body.userid;
    if (body.brid !== undefined) user.brid = body.brid;
    if (body.role !== undefined) {
      if (!VALID_ROLES.includes(body.role)) {
        return NextResponse.json(
          { error: `Invalid role "${body.role}". Must be one of: admin, builder, viewer` },
          { status: 400 }
        );
      }
      user.role = body.role;
    }
    if (body.updatedBy !== undefined) user.updatedBy = body.updatedBy;
    user.updatedOn = new Date().toISOString();

    data.users[idx] = user;
    await writeUsers(data);

    return NextResponse.json(user);
  } catch (error) {
    logger.error({ error }, 'Failed to update user');
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Admin-only: deleting users requires admin role
  const auth = await isRequestAdmin(request);
  if (!auth.isAdmin) {
    return NextResponse.json({ error: 'Forbidden — admin access required' }, { status: 403 });
  }

  const { id } = params;
  try {
    const data = await readUsers();
    const idx = data.users.findIndex((u) => u.id === id);

    if (idx === -1) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent deleting the last admin
    const user = data.users[idx];
    if (user.role === 'admin') {
      const adminCount = data.users.filter((u) => u.role === 'admin').length;
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot delete the last admin user' },
          { status: 400 }
        );
      }
    }

    data.users.splice(idx, 1);
    await writeUsers(data);

    return NextResponse.json({ success: true, deletedUserId: id });
  } catch (error) {
    logger.error({ error }, 'Failed to delete user');
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
