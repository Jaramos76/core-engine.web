import type { Metadata } from 'next';
import { OSProvider } from './_os/OSProvider';
import { AgenticWorkspace } from './_os/AgenticWorkspace';
import { SecondBrain } from './_os/SecondBrain';
import './os.css';
import './second-brain.css';
export const metadata: Metadata = { title: 'Second Brain · Core Engine', robots: { index: false, follow: false } };
export default async function DashboardPage({searchParams}:{searchParams:Promise<{view?:string}>}) {
  const {view}=await searchParams;
  if(view==='spatial') return <><a className="sb-return" href="/dashboard">← Back to Second Brain</a><OSProvider><AgenticWorkspace /></OSProvider></>;
  return <SecondBrain initialView={view==='calendar'||view==='lola'?view:'overview'} />;
}
