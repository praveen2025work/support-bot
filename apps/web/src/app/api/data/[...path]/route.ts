import { NextRequest, NextResponse } from "next/server";
import { proxyToEngine } from "@/lib/engine-proxy";

/**
 * Catch-all proxy for /api/data/* → engine /api/data/*
 * Supports GET and POST methods.
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const subPath = path.join("/");
  const qs = request.nextUrl.search; // includes leading '?'
  try {
    const engineRes = await proxyToEngine(`/api/data/${subPath}${qs}`);
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch {
    return NextResponse.json({ error: "Engine unavailable" }, { status: 502 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const subPath = path.join("/");
  try {
    const body = await request.json();
    const engineRes = await proxyToEngine(`/api/data/${subPath}`, {
      method: "POST",
      body,
    });
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch {
    return NextResponse.json({ error: "Engine unavailable" }, { status: 502 });
  }
}
