import { NextResponse } from "next/server";

import { requireApiSession } from "@/lib/auth/session";
import { listContacts } from "@/lib/repos/entities";

export const dynamic = "force-dynamic";

export async function GET() {
  const unauth = await requireApiSession();
  if (unauth) return unauth;

  const contacts = await listContacts();
  return NextResponse.json({ contacts });
}
