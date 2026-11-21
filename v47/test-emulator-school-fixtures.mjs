import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../scripts/test-v47-emulator-isolation.mjs',import.meta.url),'utf8');
for(const legacy of ['school-a','school-b','school-disabled']) {
 assert.equal(source.includes("'"+legacy+"'"),false,'Legacy non-IEMIS fixture: '+legacy);
}
for(const sid of ['300160001','300160002','300160099']) {
 assert.ok(source.includes("'"+sid+"'"),'Missing school fixture: '+sid);
 assert.match(sid,/^[0-9]{5,20}$/);
}
console.log('PASS: emulator school fixtures follow numeric IEMIS school ID contract');
