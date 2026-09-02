// Liveness probe for the container healthcheck and the deploy pipeline.
// No auth, no side effects, no dependencies — just confirms the server is up.

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "core-engine-web",
      time: new Date().toISOString(),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
