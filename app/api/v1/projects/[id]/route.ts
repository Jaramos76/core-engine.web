import { NextResponse } from "next/server";
import {eq} from "drizzle-orm";
import {db} from "@/lib/db/client";
import {projects} from "@/lib/db/schema";

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

export async function PATCH(req: Request, ctx: {params:Promise<{id:string}>}) {
  const unauth=await requireApiSession(); if(unauth)return unauth;
  const origin=req.headers.get('origin');
  if(origin&&new URL(origin).host!==req.headers.get('host'))return NextResponse.json({error:'Origin not allowed'},{status:403});
  const {id}=await ctx.params;
  let body:Record<string,unknown>;
  try{body=await req.json();}catch{return NextResponse.json({error:'Malformed body'},{status:400});}
  if(!body||typeof body!=='object'||Array.isArray(body))return NextResponse.json({error:'Invalid project fields'},{status:400});
  const allowed=['name','currentPhase','nextAction','targetDate','status'];
  if(!Object.keys(body).length||Object.keys(body).some(k=>!allowed.includes(k))||Object.values(body).some(v=>typeof v!=='string'||v.length>2000)||('name' in body&&!(body.name as string).trim()))return NextResponse.json({error:'Provide valid project fields and a nonempty name'},{status:400});
  const bundle=await getProjectBundle(decodeURIComponent(id));
  if(!bundle)return NextResponse.json({error:'Project not found'},{status:404});
  if(body.targetDate&&body.targetDate!==bundle.project.targetDate&&(!/^\d{4}-\d{2}-\d{2}$/.test(String(body.targetDate))||!Number.isFinite(Date.parse(String(body.targetDate)))||new Date(String(body.targetDate)).toISOString().slice(0,10)!==body.targetDate))return NextResponse.json({error:'Invalid target date'},{status:400});
  const patch:Partial<typeof projects.$inferInsert>={updatedAt:new Date()};
  for(const key of allowed)if(key in body)Object.assign(patch,{[key]:(body[key] as string).trim()||null});
  await db.update(projects).set(patch).where(eq(projects.id,bundle.project.id));
  return NextResponse.json({ok:true});
}
