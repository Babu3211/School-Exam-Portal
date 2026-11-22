import assert from 'node:assert/strict';
import {prepareVerifiedClassMarkStaging} from './verified-class-mark-staging.mjs';
const schoolId='12345678',classId='9',term='final',subjectId='computer';
const actor={uid:'admin',role:'school_admin',schoolId,active:true};
const ids=Array.from({length:1500},(_,i)=>'student_'+String(i+1).padStart(4,'0'));
const settings={schoolId,class:classId,active:true,creditHour:2,theoryFullMarks:40,practicalFullMarks:60};
const entries=ids.map(studentId=>({studentId,subjectId,class:classId,term,theory:20,practical:30}));
let writes=0,reads=0;
const api={
 collection:(_db,...parts)=>parts.join('/'),
 query:(...parts)=>parts,
 where:(...parts)=>parts,
 orderBy:(...parts)=>parts,
 limit:n=>n,
 startAfter:id=>({after:id}),
 getDocs:async query=>{
  reads++;
  assert.equal(query[0],'schools/'+schoolId+'/students');
  const after=query.find(x=>x&&typeof x==='object'&&'after' in x)?.after;
  const start=after?ids.indexOf(after)+1:0;
  return {docs:ids.slice(start,start+101).map(id=>({id,data:()=>({schoolId,class:classId,active:true})}))};
 },
 doc:(_db,...parts)=>parts.join('/'),
 getDoc:async ref=>{
  assert.equal(ref,'schools/'+schoolId+'/subjects/'+subjectId);
  return {exists:()=>true,data:()=>settings};
 },
 setDoc:async()=>{writes++;throw new Error('Never write in preflight')}
};
const base={db:{},api,actor,schoolId,classId,term,subjectId,entries};
const plan=await prepareVerifiedClassMarkStaging(base);
assert.equal(plan.studentCount,1500);
assert.equal(plan.chunkCount,8);
assert.equal(plan.rosterPages,15);
assert.equal(reads,15);
assert.equal(writes,0);
assert.equal(plan.canPublish,false);
await assert.rejects(prepareVerifiedClassMarkStaging({...base,entries:entries.slice(1)}),/Cannot save/);
await assert.rejects(prepareVerifiedClassMarkStaging({...base,actor:{...actor,role:'viewer'}}),/permission required/i);
await assert.rejects(prepareVerifiedClassMarkStaging({...base,api:{...api,getDoc:async()=>({exists:()=>false})}}),/Active subject/);
await assert.rejects(prepareVerifiedClassMarkStaging({...base,api:{...api,getDoc:async()=>({exists:()=>true,data:()=>({...settings,schoolId:'87654321'})})}}),/Active subject/);
await assert.rejects(prepareVerifiedClassMarkStaging({...base,api:{...api,getDocs:async q=>({docs:[{id:'student_0001',data:()=>({schoolId,class:classId,active:false})}]})}}),/Inactive student/);
const changing={...actor};
await assert.rejects(prepareVerifiedClassMarkStaging({...base,actor:changing,api:{...api,getDoc:async()=>{changing.active=false;return {exists:()=>true,data:()=>settings}}}}),/identity changed/);
await assert.rejects(prepareVerifiedClassMarkStaging({...base,api:{...api,getDoc:async()=>({exists:()=>true,data:()=>({...settings,creditHour:null})})}}),/credit hours/);
await assert.rejects(prepareVerifiedClassMarkStaging({...base,subjectId:'../foreign'}),/Invalid subject ID/);
await assert.rejects(prepareVerifiedClassMarkStaging({...base,api:{...api,getDoc:async()=>({exists:()=>true,data:()=>({...settings,id:'wrong'})})}}),/Invalid Examination Settings/);
const revokedInAccessor={...actor};
await assert.rejects(prepareVerifiedClassMarkStaging({...base,actor:revokedInAccessor,api:{...api,getDoc:async()=>({exists:()=>true,data:()=>{revokedInAccessor.active=false;return settings}})}}),/identity changed/);
assert.equal(writes,0);
console.log('V47 authoritative 1500-student read-only staging preparation checks passed');
