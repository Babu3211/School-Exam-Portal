// Offline review export only. Never writes marks or grants publication rights.
export function buildClassReviewCsv({json,studentNames={}}){
 if(typeof json!=='string'||new TextEncoder().encode(json).length>900000)throw new Error('Review JSON exceeds safe size');
 const p=JSON.parse(json);
 if(p?.format!=='smss-v47-class-mark-review-v1'||p.writeAuthorized!==false||p.publicationAllowed!==false||
  !Array.isArray(p.entries)||p.entries.length<1||p.entries.length>1500||
  !Array.isArray(p.componentLimits)||p.componentLimits.length<1||p.componentLimits.length>50||
  p.rosterCount!==p.entries.length)throw new Error('Complete read-only review required');
 const keys=p.componentLimits.map(c=>c.key),seen=new Set();
 if(keys.some(k=>typeof k!=='string'||!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(k)||seen.has(k)||(seen.add(k),false)))throw new Error('Invalid review components');
 const escape=value=>{
  let s=String(value??'');
  if(/^[\s\uFEFF]*[=+@\-\t\r]/u.test(s))s="'"+s;
  return '"'+s.replace(/"/g,'""')+'"';
 };
 const rows=[['Student ID','Student Name','Absent',...p.componentLimits.map(c=>c.name+' (max '+c.fullMarks+')'),'Total Obtained']];
 const ids=new Set();
 for(const row of p.entries){
  if(!row||typeof row.studentId!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(row.studentId)||ids.has(row.studentId)||typeof row.isAbsent!=='boolean')throw new Error('Invalid review student');
  ids.add(row.studentId);
  if(row.isAbsent){if(row.totalObtained!==0||row.values!==null)throw new Error('Invalid absent student review');}
  else{
   if(!row.values||typeof row.values!=='object'||Array.isArray(row.values)||Object.keys(row.values).length!==keys.length||
    keys.some(k=>!Object.hasOwn(row.values,k)||typeof row.values[k]!=='number'||!Number.isFinite(row.values[k])||row.values[k]<0)||
    typeof row.totalObtained!=='number'||!Number.isFinite(row.totalObtained))throw new Error('Invalid student component review');
   if(keys.some((k,i)=>row.values[k]>p.componentLimits[i].fullMarks)||
    Math.abs(keys.reduce((s,k)=>s+row.values[k],0)-row.totalObtained)>1e-7)throw new Error('Review marks exceed configured limits');
  }
  rows.push([row.studentId,Object.hasOwn(studentNames,row.studentId)?studentNames[row.studentId]:'',row.isAbsent?'Yes':'No',...keys.map(k=>row.isAbsent?'':row.values[k]),row.totalObtained]);
 }
 return '\uFEFF'+rows.map(row=>row.map(escape).join(',')).join('\r\n')+'\r\n';
}
