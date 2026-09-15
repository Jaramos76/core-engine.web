import {mkdir,writeFile,readFile,readdir,lstat,rename} from 'node:fs/promises';
import path from 'node:path';
export const MAX_SKILL_BYTES=128*1024;
export function parseSkill(content:string){
 if(Buffer.byteLength(content,'utf8')>MAX_SKILL_BYTES||content.includes('\0'))throw new Error('Use a UTF-8 Markdown file smaller than 128 KB.');
 const normalized=content.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n');
 const match=normalized.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
 if(!match)throw new Error('Include YAML frontmatter with name and description, followed by Markdown instructions.');
 const fields:Record<string,string>={};
 for(const line of match[1].split('\n')){const m=line.match(/^([a-z_]+):\s*(.*)$/);if(m)fields[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,'');}
 const name=fields.name||'',description=fields.description||'',instructions=match[2].trim();
 if(!/^[a-z0-9][a-z0-9-]{0,63}$/.test(name))throw new Error('Name must be 1–64 lowercase letters, numbers or hyphens.');
 if(!description||description.length>500||description==='|'||description==='>')throw new Error('Provide a single-line description of 1–500 characters.');
 if(!instructions)throw new Error('Add instructions for the skill.');
 return {name,description,instructions,content:normalized,version:fields.version||'1.0.0'};
}
export async function saveSkill(root:string,content:string){
 const skill=parseSkill(content);await mkdir(root,{recursive:true});
 const dir=path.join(root,skill.name);await mkdir(dir); // Exclusive directory creation rejects duplicates and symlinks.
 await writeFile(path.join(dir,'.SKILL.tmp'),skill.content,{flag:'wx',mode:0o640});
 await rename(path.join(dir,'.SKILL.tmp'),path.join(dir,'SKILL.md'));
 return skill;
}
export async function localSkills(root:string){
 const result=[];
 let entries;try{entries=await readdir(root,{withFileTypes:true});}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return [];throw e;}
 for(const entry of entries){if(!entry.isDirectory()||!/^\w[\w-]*$/.test(entry.name))continue;const file=path.join(root,entry.name,'SKILL.md');try{const info=await lstat(file);if(!info.isFile()||info.isSymbolicLink()||info.size>MAX_SKILL_BYTES)continue;result.push(parseSkill(await readFile(file,'utf8')));}catch{continue;}}
 return result;
}
