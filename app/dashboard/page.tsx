import type { Metadata } from 'next';
import {redirect} from 'next/navigation';
import { SecondBrain } from './_os/SecondBrain';
import './os.css';
import './second-brain.css';
export const metadata: Metadata = { title: 'Second Brain · Core Engine', robots: { index: false, follow: false } };
export default async function DashboardPage({searchParams}:{searchParams:Promise<{view?:string}>}) {
  const {view}=await searchParams;
  if(view==='spatial') redirect('/dashboard?view=tools');
  return <SecondBrain key={view||'overview'} initialView={view==='calendar'||view==='lola'||view==='skills'||view==='tools'||view==='agents'?view:'overview'} />;
}
