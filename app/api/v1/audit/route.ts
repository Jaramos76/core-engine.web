import { NextResponse } from "next/server";
import { gatewayJson } from "@/lib/core-engine-gateway";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { response, data } = await gatewayJson("/api/audit");
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { error: "Audit history is unavailable" },
      { status: 503 },
    );
  }
}

export async function POST() {
  try {
    const { response, data } = await gatewayJson(
      "/api/audit/run",
      { method: "POST", body: "{}" },
      45_000,
    );
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { error: "Core Engine audit could not complete" },
      { status: 503 },
    );
  }
}
