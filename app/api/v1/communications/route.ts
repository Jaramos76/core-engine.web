import { NextResponse } from "next/server";

import { requireApiSession } from "@/lib/auth/session";
import { listCommunications } from "@/lib/repos/entities";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const unauth = await requireApiSession();
  if (unauth) return unauth;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? undefined;
  const needsReply = searchParams.get("needsReply") === "1";

  const communications = await listCommunications({ q, needsReply });
  return NextResponse.json({ communications });
}
