import {NextResponse} from 'next/server';
import {requireApiSession} from '@/lib/auth/session';
import {gatewayJson} from '@/lib/core-engine-gateway';
export const dynamic='force-dynamic';
export async function GET(){const denied=await requireApiSession();if(denied)return denied;try{const {response,data}=await gatewayJson('/api/tools');return response.ok?NextResponse.json({tools:data.tools||[]}):NextResponse.json({error:'Tools are unavailable.'},{status:502});}catch{return NextResponse.json({error:'Could not load tools.'},{status:503});}}
