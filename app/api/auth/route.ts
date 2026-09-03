// Temporary authentication endpoint for the Core Engine front page.
//
// This exists so the client talks to a real request/response shape today and
// the swap to the real Core Engine identity service is a backend-only change.
// It verifies a single shared password and issues an opaque session cookie.
//
// The password is read from CE_DEMO_PASSWORD (server-side env only — never
// bundled into client JS). In local development it falls back to `coreengine`.
// This is a placeholder until real authentication is implemented.

import { NextResponse } from "next/server";
import type { AuthResult } from "@/app/login/_auth/types";

const DEMO_PASSWORD =
  process.env.CE_DEMO_PASSWORD ??
  (process.env.NODE_ENV === "production" ? null : "coreengine");
const SESSION_COOKIE = "ce_session";
const SESSION_MAX_AGE = 60 * 60 * 8; // 8 hours

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Malformed request" }, 400);
  }

  const record = (body ?? {}) as Record<string, unknown>;
  const identifier = String(record.identifier ?? "").trim();
  const password = String(record.password ?? "");

  // Simulate network + verification latency.
  await new Promise((resolve) =>
    setTimeout(resolve, 420 + Math.random() * 380),
  );

  if (!DEMO_PASSWORD) {
    // Misconfigured production deployment — fail closed rather than open.
    return json({ ok: false, error: "Authentication is not configured" }, 503);
  }

  if (!identifier || !password) {
    return json({ ok: false, error: "Enter your credentials" }, 400);
  }

  if (password !== DEMO_PASSWORD) {
    return json({ ok: false, error: "Access denied" }, 401);
  }

  const name = identifier.includes("@")
    ? identifier.split("@")[0]
    : identifier;

  const response = NextResponse.json<AuthResult>({
    ok: true,
    token: "demo-session-token",
    user: { name: name || "Operator", email: identifier },
  });

  response.cookies.set(SESSION_COOKIE, "demo-session-token", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}

function json(payload: AuthResult | { ok: true }, status: number) {
  return NextResponse.json(payload, { status });
}
