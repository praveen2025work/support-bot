export type Role = 'admin' | 'builder' | 'viewer';

export const ROLE_HIERARCHY: Record<Role, number> = {
  viewer: 1,
  builder: 2,
  admin: 3,
};

export const VALID_ROLES: Role[] = ['admin', 'builder', 'viewer'];

// Permission definitions per resource
export const PERMISSIONS = {
  // Admin only
  'users.manage': 'admin',
  'settings.update': 'admin',
  'groups.delete': 'admin',
  'audit.view': 'admin',
  'logs.delete': 'admin',

  // Builder and above
  'queries.create': 'builder',
  'queries.update': 'builder',
  'queries.delete': 'builder',
  'filters.manage': 'builder',
  'intents.manage': 'builder',
  'templates.manage': 'builder',
  'files.manage': 'builder',
  'groups.create': 'builder',
  'groups.update': 'builder',
  'learning.manage': 'builder',

  // Viewer and above
  'queries.read': 'viewer',
  'groups.read': 'viewer',
  'analytics.view': 'viewer',
  'logs.view': 'viewer',
  'settings.read': 'viewer',
} as const;

export function hasPermission(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function checkPermission(userRole: Role, permission: keyof typeof PERMISSIONS): boolean {
  const requiredRole = PERMISSIONS[permission] as Role;
  return hasPermission(userRole, requiredRole);
}

export function isValidRole(role: string): role is Role {
  return VALID_ROLES.includes(role as Role);
}
