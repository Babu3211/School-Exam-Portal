import assert from 'node:assert/strict';
import {todayAssessmentDate2083,validAssessmentDate2083} from './assessment-date-2083.mjs';
const at=d=>todayAssessmentDate2083(new Date(d+'T12:00:00Z'));
const starts=['2026-04-14','2026-05-15','2026-06-15','2026-07-17','2026-08-17','2026-09-17','2026-10-18','2026-11-17','2026-12-16','2027-01-15','2027-02-13','2027-03-15'];
starts.forEach((d,i)=>assert.equal(at(d),'2083-'+String(i+1).padStart(2,'0')+'-01'));
assert.equal(at('2026-11-26'),'2083-08-10');
assert.equal(at('2027-04-13'),'2083-12-30');
assert.equal(at('2027-04-14'),'');
assert.equal(at('2026-04-13'),'');
assert.equal(todayAssessmentDate2083(new Date('2026-11-16T18:14:59Z')),'2083-07-30');
assert.equal(todayAssessmentDate2083(new Date('2026-11-16T18:15:00Z')),'2083-08-01');
const seen=new Set();
for(let i=0;i<365;i++){
 const d=todayAssessmentDate2083(new Date(Date.UTC(2026,3,14+i,12)));
 assert.ok(validAssessmentDate2083(d));assert.ok(!seen.has(d));seen.add(d);
}
for(const d of ['2083-08-30','2083-10-30','2083-01-32','2083-07-31','2083-13-01','2083-00-01','2083-01-00','2084-01-01','2083-1-1'])assert.equal(validAssessmentDate2083(d),false);
for(const d of ['2083-03-32','2083-06-31','2083-08-29','2083-10-29','2083-12-30'])assert.equal(validAssessmentDate2083(d),true);
console.log('PASS 2083 assessment calendar: all 365 dates, month boundaries, Nepal midnight and invalid dates');
