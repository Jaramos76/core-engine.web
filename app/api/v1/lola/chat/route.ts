export const maxDuration = 600;

import { NextResponse } from "next/server";
import {requireApiSession} from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORE_ENGINE_GATEWAY_URL =
  process.env.CORE_ENGINE_GATEWAY_URL ?? "http://172.16.1.1:8765";

async function processChat(request: Request) {
  const unauth=await requireApiSession(); if(unauth)return unauth;
  const origin=request.headers.get("origin");
  if(origin&&new URL(origin).host!==request.headers.get("host"))return NextResponse.json({error:"Origin not allowed"},{status:403});
  try {
    const body = await request.json();
    const message =
      typeof body?.message === "string" ? body.message.trim() : "";

    if (!message) {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 },
      );
    }

    const token = process.env.CORE_ENGINE_WEB_TOKEN;

    if (!token) {
      console.error("CORE_ENGINE_WEB_TOKEN is not configured");
      return NextResponse.json(
        { error: "Core Engine gateway is not configured" },
        { status: 503 },
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 600_000);

    try {
      const response = await fetch(
        `${CORE_ENGINE_GATEWAY_URL}/api/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message }),
          signal: controller.signal,
          cache: "no-store",
        },
      );

      if (!response.ok) {
        const detail = await response.text();

        console.error(
          "Core Engine gateway request failed:",
          response.status,
          detail.slice(0, 500),
        );

        return NextResponse.json(
          { error: "Core Engine request failed" },
          { status: 502 },
        );
      }

      const data = await response.json();

      const reply =
        typeof data?.reply === "string" ? data.reply.trim() : "";

      if (!reply) {
        return NextResponse.json(
          { error: "Core Engine returned an empty response" },
          { status: 502 },
        );
      }

      return NextResponse.json({
        reply,
        route: Array.isArray(data?.route) ? data.route : [],
        outputs:
          data?.outputs && typeof data.outputs === "object"
            ? data.outputs
            : {},
        provider: "core-engine",
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error("Lola chat error:", error);

    return NextResponse.json(
      { error: "Lola is temporarily unavailable" },
      { status: 500 },
    );
  }
}

// Keep the connection active while the agent works, including behind proxy idle timeouts.
export async function POST(request: Request) {
  const unauth = await requireApiSession();
  if (unauth) return unauth;
  const origin = request.headers.get('origin');
  try { if (!origin || new URL(origin).host !== request.headers.get('host')) return NextResponse.json({error:'Origin not allowed'},{status:403}); }
  catch { return NextResponse.json({error:'Invalid origin'},{status:403}); }
  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | undefined;
  let closed = false;
  const stream = new ReadableStream({
    start(controller) {
      const write = (text: string) => { if (!closed) controller.enqueue(encoder.encode(text)); };
      write(' ');
      timer = setInterval(() => write(' '), 15000);
      void processChat(request).then(async response => {
        write(await response.text());
      }).catch(() => write(JSON.stringify({error:'Lola could not complete this request.'}))).finally(() => {
        clearInterval(timer);
        if (!closed) {closed=true;controller.close();}
      });
    },
    cancel() {closed=true;clearInterval(timer);},
  });
  return new Response(stream,{headers:{'Content-Type':'application/json','Cache-Control':'no-store, no-transform','X-Accel-Buffering':'no','Content-Encoding':'identity'}});
}
