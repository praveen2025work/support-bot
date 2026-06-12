import { promises as fs } from "fs";
import { paths } from "@/lib/env-config";

interface StoredUser {
  id: string;
  userid: string;
  role: string;
  dataRoles?: string[];
  [key: string]: unknown;
}

/**
 * Look up a user by their userid (login name) and return their data-access roles
 * plus whether they are an admin (bypasses data-role checks).
 */
export async function getUserDataRoles(
  userid: string | undefined,
): Promise<{ dataRoles: string[]; isAdmin: boolean }> {
  if (!userid) return { dataRoles: [], isAdmin: false };

  try {
    const raw = await fs.readFile(paths.config.users, "utf-8");
    const data = JSON.parse(raw) as { users: StoredUser[] };
    const user = data.users.find(
      (u) => u.userid.toLowerCase() === userid.toLowerCase(),
    );
    if (!user) return { dataRoles: [], isAdmin: false };
    return {
      dataRoles: Array.isArray(user.dataRoles) ? user.dataRoles : [],
      isAdmin: user.role === "admin",
    };
  } catch {
    return { dataRoles: [], isAdmin: false };
  }
}
