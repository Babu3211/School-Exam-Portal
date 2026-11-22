import assert from 'node:assert/strict';
import {CLASS_DRAFT_MAX_BYTES,CLASS_DRAFT_FORMAT,completeClassDraftId,prepareCompleteClassDraft} from './complete-class-draft-document.mjs';
const schoolId='300160003',classId='9',subjectId='computer',examId='final';
const actor={uid:'admin_a',role:'school_admin',active:true,schoolId};
const settings={settingsId:'9_computer_final',schoolId,classId,subjectId,examId,active:true,components:[
 {key:'participation',name:'Participation',fullMarks:7},
 {key:'practical',name:'Practical',fullMarks:63},
 {key:'term',name:'Term',fullMarks:30}
]};
const mk=(studentId,values={participation:7,practical:63,term:30})=>({studentId,isAbsent:false,values});
const args={schoolId,classId,subjectId,examId,actor,settings,expectedStudentIds:['s2','s1'],drafts:[mk('s2'),mk('s1')]};
const result=prepareCompleteClassDraft(args);
assert.equal(result.docId,'9_computer_final');
assert.equal(result.data.format,CLASS_DRAFT_FORMAT);
assert.equal(result.data.state,'draft');
assert.equal(result.data.revision,1);
assert.equal(result.expectedRevision,0);
assert.equal(result.rosterCount,2);
assert.deepEqual(result.data.entries.map(x=>x.studentId),['s1','s2']);
assert.equal(result.data.entries[0].totalObtained,100);
assert.equal(result.publicationAllowed,false);
assert.equal(result.writeAuthorized,false);
assert.equal(result.bytes<=CLASS_DRAFT_MAX_BYTES,true);
assert.equal(result.data.schoolId,schoolId);
assert.equal(Object.hasOwn(result.data,'updatedAt'),false);
assert.equal(Object.hasOwn(result.data,'published'),false);
assert.equal(Object.hasOwn(result.data,'official'),false);
const updated=prepareCompleteClassDraft({...args,expectedRevision:8});
assert.equal(updated.data.revision,9);
const absent=prepareCompleteClassDraft({...args,drafts:[mk('s1'),{studentId:'s2',isAbsent:true}]});
assert.equal(absent.data.entries[1].values,null);
assert.equal(absent.data.entries[1].totalObtained,0);
for(const [input,message] of [
 [{...args,actor:{...actor,role:'viewer'}},/School Admin/],
 [{...args,actor:{...actor,role:'teacher'}},/School Admin/],
 [{...args,actor:{...actor,schoolId:'999999999'}},/School Admin/],
 [{...args,settings:{...settings,settingsId:'wrong'}},/Settings ID/],
 [{...args,drafts:[mk('s1')]},/Complete class/],
 [{...args,drafts:[mk('s1'),mk('s1')]},/Duplicate/],
 [{...args,drafts:[mk('s1'),mk('foreign')]},/out-of-roster/],
 [{...args,drafts:[mk('s1'),mk('s2',{participation:8,practical:63,term:30})]},/Complete class/],
 [{...args,expectedRevision:-1},/revision/],
 [{...args,expectedRevision:1.2},/revision/],
 [{...args,settings:{...settings,components:[{key:'x',name:'X',fullMarks:0}]}},/Invalid/]
 ])assert.throws(()=>prepareCompleteClassDraft(input),message);
assert.throws(()=>completeClassDraftId({classId:'9',subjectId:'x'.repeat(126),examId:'final'}),/limit/);
assert.throws(()=>completeClassDraftId({classId:'9',subjectId:'../math',examId:'final'}),/Invalid/);
const bigIds=Array.from({length:1500},(_,i)=>'s'+String(i).padStart(4,'0'));
const many=prepareCompleteClassDraft({...args,expectedStudentIds:bigIds,drafts:bigIds.map(id=>mk(id))});
assert.equal(many.data.entries.length,1500);
assert(many.bytes<CLASS_DRAFT_MAX_BYTES);
assert.equal(many.data.revision,1);
assert.equal(many.data.entries.every(r=>r.totalObtained===100),true);
assert.throws(()=>prepareCompleteClassDraft({...args,expectedStudentIds:[...bigIds,'s1500'],drafts:[...bigIds,'s1500'].map(id=>mk(id))}),/roster/);
console.log('PASS V47 1500-student single-doc configured Draft (not publish), settings maxima, revision & tenant safety');
