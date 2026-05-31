import { NextResponse } from "next/server";
import { buildHealthResponse } from "@/server/health/health";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(buildHealthResponse());
}
