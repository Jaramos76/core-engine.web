import { NextResponse } from "next/server";

import { requireApiSession } from "@/lib/auth/session";
import { getProjectBundle } from "@/lib/repos/projects";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const unauth = await requireApiSession();
  if (unauth) return unauth;

  const { id } = await ctx.params;
  const bundle = await getProjectBundle(decodeURIComponent(id));
  if (!bundle) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  return NextResponse.json(bundle);
}
