'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
type Fields={name:string;currentPhase:string|null;nextAction:string|null;targetDate:string|null;status:string|null};
export function ProjectEditor({id,values}:{id:string;values:Fields}){
 const router=useRouter();const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false),[draft,setDraft]=useState(values);
 async function save(){setBusy(true);setError('');try{const r=await fetch(`/api/v1/projects/${encodeURIComponent(id)}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(Object.entries(draft).map(([k,v])=>[k,v??''])))});const b=await r.json();if(!r.ok)throw new Error(b.error||'Could not save project.');setOpen(false);setSaved(true);router.refresh();}catch(e){setError(e instanceof Error?e.message:'Could not save project.');}finally{setBusy(false);}}
 return <div className="wk-project-editor">{!open&&<button onClick={()=>{setDraft(values);setSaved(false);setOpen(true);}}>Edit project</button>}{saved&&<p role="status">Project saved.</p>}{open&&<form className="wk-edit" onSubmit={e=>{e.preventDefault();void save();}}>{(['name','status','currentPhase','nextAction','targetDate'] as const).map(key=><label key={key}>{({name:'Project name',status:'Status',currentPhase:'Phase',nextAction:'Next action',targetDate:'Target date'})[key]}<input required={key==='name'} maxLength={2000} value={draft[key]??''} onChange={e=>setDraft({...draft,[key]:e.target.value})}/></label>)}<button disabled={busy}>Save project</button><button type="button" disabled={busy} onClick={()=>setOpen(false)}>Cancel</button>{error&&<p role="alert">{error}</p>}</form>}</div>;
}
