import { NextResponse } from "next/server";
import { gatewayJson } from "@/lib/core-engine-gateway";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { response, data } = await gatewayJson("/api/models");
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { error: "Model status is unavailable" },
      { status: 503 },
    );
  }
}
