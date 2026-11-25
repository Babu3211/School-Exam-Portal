// Offline, read-only class roster completeness preview. Never saves student marks.
import {inspectIemisDraft} from './iemis-draft-inspector.mjs';
export function inspectIemisClassDraft({classNo,term,subject,students,drafts,allowAbsent=false}){
 if(!Array.isArray(students)||students.length===0||students.length>1500)throw Error('A complete class roster is required');
 if(!drafts||typeof drafts!=='object'||Array.isArray(drafts))throw Error('Class marks drafts are required');
 const ids=students.map(s=>s?.id);
 if(ids.some(id=>typeof id!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(id))||new Set(ids).size!==ids.length)throw Error('Class roster contains invalid or duplicate student IDs');
 const rosterIds=new Set(ids);
 if(Reflect.ownKeys(drafts).some(key=>typeof key!=='string'))throw Error('Marks drafts contain unsupported symbol keys');
 const unknown=Object.getOwnPropertyNames(drafts).filter(id=>!rosterIds.has(id));
 if(unknown.length)throw Error('Marks drafts contain students outside the selected class roster');
 const missing=[],invalid=[];
 for(const id of ids){
  if(!Object.hasOwn(drafts,id)){missing.push(id);continue}
  const result=inspectIemisDraft(classNo,term,subject,drafts[id],{allowAbsent});
  if(!result.valid)invalid.push({studentId:id,reason:result.reason});
 }
 return {complete:missing.length===0&&invalid.length===0,total:ids.length,missing,invalid};
}
