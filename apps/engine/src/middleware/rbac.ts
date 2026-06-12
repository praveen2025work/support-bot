import { Request, Response, NextFunction } from 'express';
import { Role, checkPermission, PERMISSIONS } from '@/lib/rbac';

/**
 * Middleware factory that checks if the user has the required permission.
 * Expects `req.userRole` to be set by the admin router's role-extraction middleware.
 */
export function requirePermission(permission: keyof typeof PERMISSIONS) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = (req as any).userRole as Role | undefined;
    if (!userRole) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!checkPermission(userRole, permission)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: permission,
        userRole,
      });
    }
    next();
  };
}
