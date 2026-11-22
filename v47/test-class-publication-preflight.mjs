import assert from 'node:assert/strict';
import {assessClassPublicationReadiness} from './class-publication-preflight.mjs';
const schoolId='12345678',actor={uid:'admin',schoolId,role:'school_admin',active:true};
const base={actor,schoolId,schoolClass:'9',term:'final',students:[{id:'s1',schoolId,class:'9',active:true}],subjects:[{id:'math',schoolId,class:'9',active:true,creditHour:4}],records:[{schoolId,studentId:'s1',subjectId:'math',class:'9',term:'final'}],coverage:{complete:true,studentCount:1,subjectCount:1,recordCount:1}};
const ok=assessClassPublicationReadiness(base);
assert.equal(ok.ready,false);
assert.equal(ok.diagnosticOnly,true);
assert.equal(ok.blockers.length,1);
assert.match(ok.blockers[0],/writes remain disabled/);
assert.equal(ok.studentCount,1);
const forged=assessClassPublicationReadiness({...base,records:[]});
assert(forged.blockers.some(x=>x.includes('verification failed')));
const missingCounts=assessClassPublicationReadiness({...base,coverage:{complete:true}});
assert(missingCounts.blockers.some(x=>x.includes('counts are missing')));
const malformedStudent=assessClassPublicationReadiness({...base,students:[null]});
assert(malformedStudent.blockers.some(x=>x.includes('inactive or foreign students')));
const malformedSubject=assessClassPublicationReadiness({...base,subjects:[null]});
assert(malformedSubject.blockers.some(x=>x.includes('malformed entries')));
const malformed=assessClassPublicationReadiness({...base,records:[null]});
assert(malformed.blockers.some(x=>x.includes('foreign or unscoped')));
assert(malformed.blockers.some(x=>x.includes('verification failed')));
const forgedCount=assessClassPublicationReadiness({...base,coverage:{...base.coverage,recordCount:99}});
assert(forgedCount.blockers.some(x=>x.includes('metadata does not match')));
const foreign=assessClassPublicationReadiness({...base,records:[{...base.records[0],schoolId:'87654321'}]});
assert(foreign.blockers.some(x=>x.includes('foreign or unscoped')));
const unscoped=assessClassPublicationReadiness({...base,records:[{...base.records[0],schoolId:undefined}]});
assert(unscoped.blockers.some(x=>x.includes('foreign or unscoped')));
const excessCredit=assessClassPublicationReadiness({...base,subjects:[{...base.subjects[0],creditHour:101}]});
assert(excessCredit.blockers.some(x=>x.includes('Missing credit hours')));
const missing=assessClassPublicationReadiness({...base,subjects:[{...base.subjects[0],creditHour:undefined}],coverage:{complete:false}});
assert(missing.blockers.some(x=>x.includes('Missing credit hours')));
assert(missing.blockers.some(x=>x.includes('coverage')));
const other=assessClassPublicationReadiness({...base,term:'monthly'});
assert(other.blockers.some(x=>x.includes('mapping not verified')));
assert.throws(()=>assessClassPublicationReadiness({...base,actor:{...actor,schoolId:'87654321'}}),/membership/);
for(const uid of [undefined,null,'','  ']){
 assert.throws(()=>assessClassPublicationReadiness({...base,actor:{...actor,uid}}),/School membership required/);
}
for(const role of ['viewer','teacher','school_admin','super_admin']){
 const validActor={...actor,role};
 const diagnostic=assessClassPublicationReadiness({...base,actor:validActor});
 assert.equal(diagnostic.ready,false,'No role may bypass release readiness');
 assert.equal(diagnostic.diagnosticOnly,true);
}
console.log('V47 class publication preflight blockers checked');
