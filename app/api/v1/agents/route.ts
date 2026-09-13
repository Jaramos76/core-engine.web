import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORE_ENGINE_GATEWAY_URL =
  process.env.CORE_ENGINE_GATEWAY_URL ?? "http://172.16.1.1:8765";

export async function GET() {
  const token = process.env.CORE_ENGINE_WEB_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: "Core Engine gateway is not configured" },
      { status: 503 },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(
      `${CORE_ENGINE_GATEWAY_URL}/api/agents`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      console.error(
        "Core Engine agents request failed:",
        response.status,
      );

      return NextResponse.json(
        { error: "Core Engine agents are unavailable" },
        { status: 502 },
      );
    }

    const data = await response.json();

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error(
      "Core Engine agents proxy error:",
      error instanceof Error ? error.name : "UnknownError",
    );

    return NextResponse.json(
      { error: "Core Engine agents are unavailable" },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
