import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { join } from "path";
import { isRequestAdmin } from "@/lib/admin-auth";

const DATA_ROLES_PATH = join(process.cwd(), "src/config/data-roles.json");

interface DataRole {
  id: string;
  label: string;
  description: string;
}

interface DataRolesFile {
  roles: DataRole[];
}

async function readRoles(): Promise<DataRolesFile> {
  try {
    const raw = await fs.readFile(DATA_ROLES_PATH, "utf-8");
    return JSON.parse(raw) as DataRolesFile;
  } catch {
    return { roles: [] };
  }
}

async function writeRoles(data: DataRolesFile): Promise<void> {
  await fs.writeFile(DATA_ROLES_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export async function GET() {
  try {
    const data = await readRoles();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ roles: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await isRequestAdmin(request);
  if (!auth.isAdmin) {
    return NextResponse.json(
      { error: "Forbidden — admin access required" },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const { id, label, description } = body;
    if (!id || !label) {
      return NextResponse.json(
        { error: "id and label are required" },
        { status: 400 },
      );
    }

    const data = await readRoles();
    if (data.roles.some((r) => r.id === id)) {
      return NextResponse.json(
        { error: `Data role "${id}" already exists` },
        { status: 409 },
      );
    }

    const newRole: DataRole = { id, label, description: description || "" };
    const updated: DataRolesFile = { roles: [...data.roles, newRole] };
    await writeRoles(updated);

    return NextResponse.json(newRole, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create data role" },
      { status: 500 },
    );
  }
}
