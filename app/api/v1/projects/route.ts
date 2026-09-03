import { NextResponse } from "next/server";

import { requireApiSession } from "@/lib/auth/session";
import { createProject, listProjects, type NewProjectInput } from "@/lib/repos/projects";

export const dynamic = "force-dynamic";

export async function GET() {
  const unauth = await requireApiSession();
  if (unauth) return unauth;

  const projects = await listProjects();
  return NextResponse.json({ projects });
}

export async function POST(req: Request) {
  const unauth = await requireApiSession();
  if (unauth) return unauth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;
  const s = (k: string): string | undefined =>
    typeof b[k] === "string" ? (b[k] as string) : undefined;

  const input: NewProjectInput = {
    number: s("number") ?? "",
    name: s("name") ?? "",
    status: s("status"),
    addressLine: s("addressLine"),
    city: s("city"),
    state: s("state"),
    zip: s("zip"),
    projectType: s("projectType"),
    scopeOfWork: s("scopeOfWork"),
    currentPhase: s("currentPhase"),
    priority: s("priority"),
    client: s("client"),
    architect: s("architect"),
    projectManager: s("projectManager"),
    disciplines: Array.isArray(b.disciplines)
      ? (b.disciplines as unknown[]).filter((x): x is string => typeof x === "string")
      : undefined,
    ahj: s("ahj"),
    permitNumber: s("permitNumber"),
    permitStatus: s("permitStatus"),
    startDate: s("startDate"),
    targetDate: s("targetDate"),
    nextAction: s("nextAction"),
    nextActionDue: s("nextActionDue"),
    health: s("health"),
  };

  const result = await createProject(input);
  if (!result.ok) {
    const status = /already exists/.test(result.error) ? 409 : 400;
    return NextResponse.json({ error: result.error, field: result.field }, { status });
  }
  return NextResponse.json(
    { ok: true, id: result.id, number: result.number },
    { status: 201 },
  );
}
