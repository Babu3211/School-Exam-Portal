import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readSchoolSubjectCatalog} from './subject-catalog-view.mjs';
const schoolId='12345678',uid='u1',base='schools/'+schoolId;
const actor={schoolId,uid,active:true,role:'viewer'};
let member={...actor},docs=[{id:'math',ref:{path:base+'/subjects/math'},data:()=>({schoolId,class:'9',name:'Mathematics',active:true,theoryFullMarks:75,practicalFullMarks:25})}];
const api={doc:(_db,...p)=>p.join('/'),collection:(_db,...p)=>p.join('/'),where:(...v)=>v,orderBy:(...v)=>v,limit:n=>n,query:(...v)=>v,
 getDocFromServer:async path=>({exists:()=>true,data:()=>path===base?{id:schoolId,active:true}:member}),
 getDocsFromServer:async q=>{assert.equal(q[0],base+'/subjects');assert.deepEqual(q[1],['class','==','9']);return {docs}},
 setDoc:()=>{throw Error('Read-only')},runTransaction:()=>{throw Error('Read-only')}};
const args={db:{},api,actor,schoolId,schoolClass:'9',assertCurrent:()=>{}};
for(const role of ['viewer','teacher','school_admin']){
 actor.role=role;member={...actor};const [row]=await readSchoolSubjectCatalog(args);
 assert.equal(row.name,'Mathematics');assert.equal(row.creditHour,null);assert.equal(row.theoryFullMarks,75);
}
member.active=false;await assert.rejects(readSchoolSubjectCatalog(args),/Membership unavailable/);member={...actor};
await assert.rejects(readSchoolSubjectCatalog({...args,schoolId:'87654321'}),/membership/);
await assert.rejects(readSchoolSubjectCatalog({...args,assertCurrent:()=>{throw Error('Session changed')}}),/Session changed/);
docs=[];assert.deepEqual(await readSchoolSubjectCatalog(args),[]);
docs=[{id:'bad',data:()=>({schoolId:'87654321',class:'9'})}];await assert.rejects(readSchoolSubjectCatalog(args),/Foreign/);
const html=readFileSync(new URL('./subjects.html',import.meta.url),'utf8'),js=readFileSync(new URL('./subjects-console.mjs',import.meta.url),'utf8');
assert.match(html,/id="catalogWork" hidden/);assert.match(js,/\$\('work'\)\.hidden=!canEdit\(\)/);
assert.match(js,/\$\('repairWork'\)\.hidden=!canEdit\(\)/);
assert.match(js,/if\(busy\|\|!canEdit\(\)\)return/);
console.log('PASS all school roles can view subject catalogue; foreign, stale and inactive sessions denied; editor remains Admin only');
