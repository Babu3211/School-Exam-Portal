import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {IemisEntryGrid,normalizeIemisEntryScores,iemisEntrySchema,iemisEntryDraft,iemisEntryValues,iemisEntryBatches} from '../iemis-entry.js';
import {iemisSummary} from '../iemis-ledger.js';

for(const cl of [1,2,3,4,5])for(const term of ['first','second','annual']){
 const schema=iemisEntrySchema(cl,term,'Nepali');assert.deepEqual(schema.map(c=>c.label),['No. Of Learning Achievement','Full Marks','Obtained Learning Achievement']);
 const valid=iemisEntryValues(schema,{values:{count:'5',obtained:'17'},isAbsent:false});assert.equal(valid.totalFullMarks,20);assert.equal(valid.totalObtained,17);assert.equal(valid.scores[1].obtained,null);
 assert.equal(iemisSummary(valid,{primary:true}).obtained,17);
 assert.throws(()=>iemisEntryValues(schema,{values:{count:'5',obtained:'21'},isAbsent:false}),/from 0 to 20/);
 assert.throws(()=>iemisEntryValues(schema,{values:{count:'',obtained:'0'},isAbsent:false}),/both/);
 assert.equal(iemisEntryValues(schema,{values:{count:'',obtained:''},isAbsent:false}),null);
 const absent=iemisEntryValues(schema,{values:{count:'5',obtained:'17'},isAbsent:true});assert.ok(absent.scores.every(s=>s.obtained===null));assert.equal(absent.totalObtained,0);assert.equal(iemisSummary(absent,{primary:true}).absent,true);
}
for(const cl of [6,7,8,9,10])for(const term of ['first','second','annual'])for(const subject of ['Mathematics','OPT.II COMPUTER SCIENCE (3031)','कम्प्युटर विज्ञान']){
 const schema=iemisEntrySchema(cl,term,subject),computer=cl>=9&&/computer|कम्प्युटर/i.test(subject);
 assert.deepEqual(schema.map(c=>c.max),[cl<=8||computer?4:3,cl<=8||computer?36:16,cl<=8||computer?10:6,...(term==='annual'?[cl<=8||computer?50:75]:[])]);
 assert.match(schema[2].label,term==='annual'?/^Total of Term/:term==='first'?/^First Term/:/^Second Term/);
 const values=Object.fromEntries(schema.map(c=>[c.key,String(c.max)]));
 const result=iemisEntryValues(schema,{values,isAbsent:false});assert.equal(result.totalFullMarks,term==='annual'?100:cl<=8||computer?50:25);
 assert.equal(result.totalObtained,result.totalFullMarks);
 assert.throws(()=>iemisEntryValues(schema,{values:{...values,participation:String(schema[0].max+1)},isAbsent:false}),/Participation/);
}
// Cross-class, cross-term regression: incomplete input must remain incomplete, not silently zero-filled.
for(const cl of [6,7,8,9,10])for(const term of ['first','second','annual']){
 const schema=iemisEntrySchema(cl,term,'Nepali');
 const blank=Object.fromEntries(schema.map(c=>[c.key,'']));
 assert.equal(iemisEntryValues(schema,{values:blank,isAbsent:false}),null,`Blank marks must stay unentered for class ${cl} ${term}`);
 const zero=Object.fromEntries(schema.map(c=>[c.key,'0']));
 const savedZero=iemisEntryValues(schema,{values:zero,isAbsent:false});
 assert.equal(savedZero.totalObtained,0,`Zero is a real entered score for class ${cl} ${term}`);
 assert.equal(savedZero.scores.length,schema.length);
 const absent=iemisEntryValues(schema,{values:zero,isAbsent:true});
 assert.equal(absent.isAbsent,true);
 assert.ok(absent.scores.every(c=>c.obtained===null));
 const invalid={...zero,participation:String(schema[0].max+1)};
 assert.throws(()=>iemisEntryValues(schema,{values:invalid,isAbsent:false}),/Participation/);
 const fractional={...zero,practical:'0.5'};
 assert.equal(iemisEntryValues(schema,{values:fractional,isAbsent:false}).totalObtained,0.5);
}
assert.throws(()=>iemisEntrySchema(11,'annual'),/1–10/);
const schema=iemisEntrySchema(6,'annual','Mathematics');
const old={scores:[{name:'TH (Theory)',fullMarks:50,obtained:20},{name:'Participation',fullMarks:4,obtained:3},{name:'Practical/Project',fullMarks:36,obtained:25},{name:'First Term Examination',fullMarks:10,obtained:6}]};
const before=structuredClone(old),draft=iemisEntryDraft(old,schema);assert.equal(draft.values.theory,'20');assert.equal(draft.values.term,'6');assert.equal(draft.incompatible,false);assert.deepEqual(old,before);
const normalized=normalizeIemisEntryScores(6,'annual','Mathematics',old.scores);assert.equal(normalized.at(-1).name,'TH (Theory)');assert.equal(normalized.at(-1).obtained,20);assert.equal(normalized[2].name,'Total of Term');assert.deepEqual(old,before);

assert.equal(iemisEntryDraft({scores:[{name:'Custom Exam',fullMarks:100,obtained:50}]},schema).incompatible,true);
const root=()=>({innerHTML:'',addEventListener(){},removeEventListener(){},querySelectorAll(){return [];}});
const makeGrid=onSave=>new IemisEntryGrid(root(),{classNo:1,term:'first',examId:'exam-test',subjects:['Nepali','English'],students:[{id:'student-test',studentName:'Synthetic Student',studentIemisNo:'TEST',symbolNo:'TEST01'}],records:[],canEdit:()=>true,onSave,message:()=>{}});
let calls=0;const grid=makeGrid(async entries=>{calls++;return {savedKeys:entries.map(e=>e.key)};});
grid.selectedSubjects=new Set([0,1]);assert.equal(grid.pending().length,0);
for(const j of [0,1]){const d=grid.draft(0,j);d.values={count:'3',obtained:'10'};d.dirty=true;}
grid.selectedSubjects=new Set([0]);await grid.save();assert.equal(calls,1);assert.equal(grid.draft(0,0).dirty,false);assert.equal(grid.draft(0,1).dirty,true,'Unselected drafts must remain unsaved');
await grid.save();assert.equal(calls,1,'Repeated Save must not overwrite unchanged records');
const entries=Array.from({length:23},(_,i)=>({student:{id:'test-'+i},key:String(i)}));assert.deepEqual(iemisEntryBatches(entries).map(b=>b.length),[10,10,3]);

// Execute the production persistence controller with an isolated in-memory transaction adapter.
const html=readFileSync('index.html','utf8'),start=html.indexOf('async function saveIemisEntryRecords('),end=html.indexOf('function mountIemisEntryGrid()',start);
assert.ok(start>0&&end>start);
function persistence({failBatch=0,confirm=true,allowed=true,initial=new Map()}={}){
 const saved=new Map(initial);let batches=0,writes=0;
 const students=entries.map(e=>({...e.student,class:'1',section:'A'}));
 const dependencies={roleHas:()=>false,iemisEntryContext:()=> 'context',auth:{currentUser:{uid:'teacher-test'}},marksStudents:students,iemisEntryAllowed:()=>allowed,crypto:globalThis.crypto,TextEncoder,doc:(_db,_collection,id)=>({id}),db:null,currentSchoolSettings:{academicYear:'2083'},smssExamTermKey:()=> 'first',smssTermLabel:()=> 'First Term',window:{confirm:()=>confirm},iemisEntryBatches,runTransaction:async(_db,fn)=>{batches++;if(batches===failBatch)throw new Error('Synthetic transaction failure');const pending=[];await fn({get:async ref=>({exists:()=>saved.has(ref.id),data:()=>saved.get(ref.id)}),set:(ref,data)=>pending.push([ref.id,data]),update:(ref,data)=>pending.push([ref.id,{...saved.get(ref.id),...data}])});for(const [id,data] of pending){saved.set(id,data);writes++;}},serverTimestamp:()=>({seconds:1,nanoseconds:0}),getDoc:async ref=>({id:ref.id,exists:()=>saved.has(ref.id),data:()=>saved.get(ref.id)}),existingMarks:[],writeAuditLog:async()=>true,markVersion:r=>JSON.stringify(r?.scores),safeNoticeError:e=>e.message};
 const save=new Function(...Object.keys(dependencies),html.slice(start,end)+';return saveIemisEntryRecords;')(...Object.values(dependencies));
 const plans=entries.map((entry,i)=>({key:entry.key,student:students[i],subject:'Nepali',old:null,data:iemisEntryValues(iemisEntrySchema(1,'first'),{values:{count:'3',obtained:'10'},isAbsent:false})}));
 return {save,plans,saved,counts:()=>({batches,writes})};
}
const success=persistence();const result=await success.save(success.plans,'context',{id:'exam-test',academicYear:'2083'},'1','teacher-test');assert.equal(result.savedKeys.length,23);assert.equal(success.counts().batches,3);assert.equal(success.saved.size,23);
const denied=persistence({allowed:false});await assert.rejects(()=>denied.save(denied.plans,'context',{id:'exam-test'},'1','teacher-test'),/अनुमति/);assert.equal(denied.counts().writes,0);
const cancel=persistence({confirm:false});assert.equal(await cancel.save(cancel.plans,'context',{id:'exam-test'},'1','teacher-test'),false);assert.equal(cancel.counts().writes,0);
const stale=persistence();await assert.rejects(()=>stale.save(stale.plans,'different-context',{id:'exam-test'},'1','teacher-test'),/परिवर्तन/);assert.equal(stale.counts().writes,0);
const partial=persistence({failBatch:2});let failure;try{await partial.save(partial.plans,'context',{id:'exam-test'},'1','teacher-test');}catch(error){failure=error;}assert.equal(failure.savedKeys.length,10);assert.equal(partial.saved.size,10);assert.match(failure.message,/10\/23/);
const conflict=persistence({initial:new Map([['old-record',{scores:[{name:'changed',obtained:9}]}]])});conflict.plans[0].old={id:'old-record',section:'A',scores:[{name:'previous',obtained:8}]};await assert.rejects(()=>conflict.save([conflict.plans[0]],'context',{id:'exam-test'},'1','teacher-test'),/overwrite/);assert.equal(conflict.counts().writes,0);
console.log('All 1–5/6–8/9–10 term schemas, editable grid plans, absence, learning totals, dirty-only saves, transactions, conflict and partial-save tests passed.');
