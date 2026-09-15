import {NextResponse} from 'next/server';
import {requireApiSession} from '@/lib/auth/session';
import {gatewayJson} from '@/lib/core-engine-gateway';
import {localSkills,saveSkill,MAX_SKILL_BYTES,parseSkill} from '@/lib/skills-store';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const root=()=>process.env.CORE_ENGINE_SKILLS_DIR||'/var/lib/core-engine-skills';
export async function GET(){
 const denied=await requireApiSession();if(denied)return denied;
 try{const {response,data}=await gatewayJson('/api/skills');if(!response.ok)return NextResponse.json({error:'The skill registry is unavailable.'},{status:502});const local=await localSkills(root());return NextResponse.json({skills:(data.skills||[]).map((s:{name:string})=>({...s,content:local.find(l=>l.name===s.name)?.content})),active:data.active||[]},{headers:{'Cache-Control':'no-store'}});}catch{return NextResponse.json({error:'Could not load skills. Try again.'},{status:503});}
}
export async function POST(req:Request){
 const denied=await requireApiSession();if(denied)return denied;
 const origin=req.headers.get('origin');if(!origin||new URL(origin).host!==req.headers.get('host'))return NextResponse.json({error:'Origin not allowed'},{status:403});
 if(Number(req.headers.get('content-length'))>MAX_SKILL_BYTES*2)return NextResponse.json({error:'Skill file is too large.'},{status:413});
 try{const raw=await req.text();if(Buffer.byteLength(raw)>MAX_SKILL_BYTES*2)return NextResponse.json({error:'Skill file is too large.'},{status:413});const body=JSON.parse(raw);if(typeof body.content!=='string')return NextResponse.json({error:'Provide Markdown content.'},{status:400});const skill=parseSkill(body.content);const {response,data}=await gatewayJson('/api/skills');if(!response.ok)return NextResponse.json({error:'Cannot verify registry. Try again later.'},{status:503});if((data.skills||[]).some((s:{name:string})=>s.name===skill.name))return NextResponse.json({error:'A skill with that name already exists.'},{status:409});await saveSkill(root(),body.content);return NextResponse.json({name:skill.name,description:skill.description},{status:201});}catch(e){if((e as NodeJS.ErrnoException).code==='EEXIST')return NextResponse.json({error:'A skill with that name already exists.'},{status:409});if((e as NodeJS.ErrnoException).code)return NextResponse.json({error:'Could not save the skill.'},{status:500});return NextResponse.json({error:e instanceof SyntaxError?'Invalid request.':e instanceof Error?e.message:'Invalid skill.'},{status:400});}
}
