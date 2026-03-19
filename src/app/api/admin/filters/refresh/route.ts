import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { proxyToEngine } from "@/lib/engine-proxy";
import { logger } from "@/lib/logger";

const FILTER_CONFIG_PATH = path.join(
  process.cwd(),
  "src/config/filter-config.json",
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const engineRes = await proxyToEngine("/api/admin/filters/refresh", {
      method: "POST",
      body,
    });

    const data = await engineRes.json();

    if (!engineRes.ok) {
      return NextResponse.json(data, { status: engineRes.status });
    }

    // Sync local filter-config.json with engine's updated filters
    if (data.filters) {
      try {
        const localRaw = await fs.readFile(FILTER_CONFIG_PATH, "utf-8");
        const localData = JSON.parse(localRaw);
        localData.filters = data.filters;
        await fs.writeFile(
          FILTER_CONFIG_PATH,
          JSON.stringify(localData, null, 2),
          "utf-8",
        );
      } catch (syncError) {
        logger.warn(
          { error: syncError },
          "Failed to sync local filter-config.json after refresh",
        );
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    const err =
      error instanceof Error
        ? { message: error.message, stack: error.stack }
        : error;
    logger.error({ error: err }, "Filter refresh proxy error");
    return NextResponse.json(
      { error: "Engine service unreachable" },
      { status: 502 },
    );
  }
}
