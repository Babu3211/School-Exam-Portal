import {assertSchoolId} from './school-scope.mjs';
export function normalizeSchoolList(records){
 if(!Array.isArray(records)) throw new TypeError('School list must be an array');
 return records.map(x=>{
   if(!x||typeof x!=='object') throw new TypeError('Invalid school');
   assertSchoolId(x.id);
   if(typeof x.name!=='string') throw new TypeError('Invalid name');
   return {id:x.id,name:x.name,active:x.active===true,iemisCode:typeof x.iemisCode==='string'?x.iemisCode:''};
 }).sort((a,b)=>a.name.localeCompare(b.name,'en',{sensitivity:'base'})||a.id.localeCompare(b.id));
}
export function visibleSchoolList(records,memberSchoolIds,{isSuperAdmin=false}={}){
 const schools=normalizeSchoolList(records);
 if(isSuperAdmin)return schools;
 const ids=new Set(memberSchoolIds||[]);
 return schools.filter(s=>s.active&&ids.has(s.id));
}
