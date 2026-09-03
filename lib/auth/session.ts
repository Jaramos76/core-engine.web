import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const SESSION_COOKIE = "ce_session";

/** True when the request carries a valid session cookie. */
export async function hasSession(): Promise<boolean> {
  const jar = await cookies();
  return Boolean(jar.get(SESSION_COOKIE)?.value);
}

/**
 * For route handlers: returns a 401 response when unauthenticated, else null.
 *
 *   const unauth = await requireApiSession();
 *   if (unauth) return unauth;
 */
export async function requireApiSession(): Promise<NextResponse | null> {
  if (await hasSession()) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
