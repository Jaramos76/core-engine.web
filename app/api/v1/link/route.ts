import { NextRequest, NextResponse } from "next/server";
import { gatewayJson } from "@/lib/core-engine-gateway";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { response, data } = await gatewayJson("/api/links");
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { error: "Link registry is unavailable" },
      { status: 503 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { response, data } = await gatewayJson(
      "/api/link",
      { method: "POST", body: JSON.stringify(body) },
      20_000,
    );
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { error: "Link request could not complete" },
      { status: 503 },
    );
  }
}
