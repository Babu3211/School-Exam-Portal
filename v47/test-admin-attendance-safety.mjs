import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const s=readFileSync(new URL('./school-admin-features.mjs',import.meta.url),'utf8');
assert.match(s,/span\.textContent=x\.name\+' — '\+\(present\?'Present':'Absent'\)/,'Attendance must update the saved row');
assert.doesNotMatch(s,/await attendance\(\)\}catch/,'Do not reload entire roster after each mark');
assert.match(s,/new Date\(date\+'T00:00:00Z'\)\.toISOString\(\)\.slice\(0,10\)!==date/,'Reject impossible dates');
assert.match(s,/student\.data\(\)\.schoolId!==schoolId\|\|subject\.data\(\)\.schoolId!==schoolId/,'Check assignment tenant');
assert.match(s,/current\.data\(\)\.schoolId!==ctx\(\)\.schoolId/,'Check membership tenant');
console.log('V47 attendance and admin security static checks passed');
