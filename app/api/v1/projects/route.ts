import { NextResponse } from "next/server";

import { requireApiSession } from "@/lib/auth/session";
import { listProjects } from "@/lib/repos/projects";

export const dynamic = "force-dynamic";

export async function GET() {
  const unauth = await requireApiSession();
  if (unauth) return unauth;

  const projects = await listProjects();
  return NextResponse.json({ projects });
}
