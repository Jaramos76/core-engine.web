import { NextResponse } from "next/server";

import { requireApiSession } from "@/lib/auth/session";
import { listDocuments } from "@/lib/repos/entities";

export const dynamic = "force-dynamic";

export async function GET() {
  const unauth = await requireApiSession();
  if (unauth) return unauth;

  const documents = await listDocuments();
  return NextResponse.json({ documents });
}
