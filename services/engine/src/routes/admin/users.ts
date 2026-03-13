import { Router, Request, Response } from 'express';
import { promises as fsPromises } from 'fs';
import { join } from 'path';
import { logger } from '@/lib/logger';
import { logAudit } from '@/lib/audit-logger';
import { requirePermission } from '@/middleware/rbac';
import { Role, isValidRole } from '@/lib/rbac';

const router = Router();

const PROJECT_ROOT = process.cwd();
const USERS_JSON_PATH = join(PROJECT_ROOT, 'src/config/users.json');

async function readUsers() { return JSON.parse(await fsPromises.readFile(USERS_JSON_PATH, 'utf-8')); }
async function writeUsers(data: unknown) { await fsPromises.writeFile(USERS_JSON_PATH, JSON.stringify(data, null, 2), 'utf-8'); }

router.get('/', requirePermission('users.manage'), async (_req: Request, res: Response) => {
  try { const data = await readUsers(); return res.json({ users: data.users }); }
  catch (error) { logger.error({ error }, 'Failed to read users'); return res.status(500).json({ users: [] }); }
});

router.post('/', requirePermission('users.manage'), async (req: Request, res: Response) => {
  try {
    const { name, email, userid, brid, role, updatedBy } = req.body;
    if (!name || !email || !userid) return res.status(400).json({ error: 'name, email, and userid are required' });

    // Validate role if provided
    const userRole: Role = role && isValidRole(role) ? role : 'viewer';

    const data = await readUsers();
    if (data.users.some((u: { userid: string }) => u.userid === userid)) return res.status(409).json({ error: `User "${userid}" already exists` });
    if (data.users.some((u: { email: string }) => u.email === email)) return res.status(409).json({ error: `Email "${email}" already exists` });
    const maxNum = data.users.map((u: { id: string }) => parseInt(u.id.replace('u', ''), 10)).filter((n: number) => !isNaN(n)).reduce((max: number, n: number) => Math.max(max, n), 0);
    const now = new Date().toISOString();
    const newUser = { id: `u${maxNum + 1}`, name, email, userid, brid: brid || '', role: userRole, createdAt: now, updatedBy: updatedBy || 'system', updatedOn: now };
    data.users.push(newUser);
    await writeUsers(data);
    await logAudit({ action: 'create', resource: 'user', resourceId: newUser.id, details: { name, email, userid, role: newUser.role }, ip: req.ip });
    return res.status(201).json(newUser);
  } catch (error) { logger.error({ error }, 'Failed to create user'); return res.status(500).json({ error: 'Failed to create user' }); }
});

router.get('/:id', requirePermission('users.manage'), async (req: Request, res: Response) => {
  try {
    const data = await readUsers();
    const user = data.users.find((u: { id: string }) => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json(user);
  } catch (error) { logger.error({ error }, 'Failed to get user'); return res.status(500).json({ error: 'Failed to get user' }); }
});

router.patch('/:id', requirePermission('users.manage'), async (req: Request, res: Response) => {
  try {
    const data = await readUsers();
    const idx = data.users.findIndex((u: { id: string }) => u.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'User not found' });
    const user = data.users[idx];
    const body = req.body;
    if (body.name !== undefined) user.name = body.name;
    if (body.email !== undefined) user.email = body.email;
    if (body.userid !== undefined) user.userid = body.userid;
    if (body.brid !== undefined) user.brid = body.brid;
    if (body.role !== undefined) {
      if (!isValidRole(body.role)) {
        return res.status(400).json({ error: `Invalid role "${body.role}". Must be one of: admin, builder, viewer` });
      }
      user.role = body.role;
    }
    if (body.updatedBy !== undefined) user.updatedBy = body.updatedBy;
    user.updatedOn = new Date().toISOString();
    data.users[idx] = user;
    await writeUsers(data);
    await logAudit({ action: 'update', resource: 'user', resourceId: req.params.id, details: body, ip: req.ip });
    return res.json(user);
  } catch (error) { logger.error({ error }, 'Failed to update user'); return res.status(500).json({ error: 'Failed to update user' }); }
});

router.delete('/:id', requirePermission('users.manage'), async (req: Request, res: Response) => {
  try {
    const data = await readUsers();
    const idx = data.users.findIndex((u: { id: string }) => u.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'User not found' });
    const user = data.users[idx];
    if (user.role === 'admin') {
      const adminCount = data.users.filter((u: { role: string }) => u.role === 'admin').length;
      if (adminCount <= 1) return res.status(400).json({ error: 'Cannot delete the last admin user' });
    }
    data.users.splice(idx, 1);
    await writeUsers(data);
    await logAudit({ action: 'delete', resource: 'user', resourceId: req.params.id, details: { name: user.name, email: user.email }, ip: req.ip });
    return res.json({ success: true, deletedUserId: req.params.id });
  } catch (error) { logger.error({ error }, 'Failed to delete user'); return res.status(500).json({ error: 'Failed to delete user' }); }
});

export default router;
