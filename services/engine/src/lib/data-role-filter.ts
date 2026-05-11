import type { Query } from "@/core/api-connector/types";

/**
 * Check whether a user with the given data-roles is allowed to access a query.
 *
 * Rules:
 *  - If the query has no `allowedRoles` (undefined/empty), it is open to everyone.
 *  - If `isAdmin` is true, the user bypasses the check entirely.
 *  - Otherwise the user must hold at least one role that appears in the query's allowedRoles.
 */
export function canAccessQuery(
  query: Pick<Query, "allowedRoles">,
  userDataRoles: readonly string[],
  isAdmin: boolean,
): boolean {
  if (isAdmin) return true;
  const allowed = query.allowedRoles;
  if (!allowed || allowed.length === 0) return true;
  return userDataRoles.some((r) => allowed.includes(r));
}

/**
 * Filter a list of queries to only those the user can access.
 */
export function filterQueriesByRole<T extends Pick<Query, "allowedRoles">>(
  queries: T[],
  userDataRoles: readonly string[],
  isAdmin: boolean,
): T[] {
  return queries.filter((q) => canAccessQuery(q, userDataRoles, isAdmin));
}
