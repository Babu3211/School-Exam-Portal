import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const workflow=readFileSync(new URL('./school-exam-workflows.mjs',import.meta.url),'utf8');
const rules=readFileSync(new URL('./firestore.rules',import.meta.url),'utf8');
const terms=['weekly','monthly','1st','2nd','3rd','final'];
for(const term of terms){assert.ok(workflow.includes("'"+term+"'"),'Missing workflow term '+term);assert.ok(rules.includes("'"+term+"'"),'Missing rules term '+term)}
assert.match(workflow,/assignment\.data\(\)\.schoolId!==schoolId/);
assert.match(workflow,/assignment\.data\(\)\.studentId!==studentId/);
assert.match(workflow,/assignment\.data\(\)\.subjectId!==subjectId/);
assert.match(workflow,/Classes 1–10 require the verified V46 CDC\/IEMIS component-entry workflow/);
assert.match(workflow,/api\.where\('class','==',klass\),api\.where\('term','==',term\),api\.orderBy\('__name__'\)/);
assert.match(workflow,/api\.startAfter\(cursor\)/);
assert.match(workflow,/refusing to display an incomplete ledger/);
console.log('V47 exam workflow static safety checks passed');
