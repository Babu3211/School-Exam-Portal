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
assert.ok(source.includes("'disabled-school-admin'"),'Disabled school admin UID must not be rewritten');
assert.ok(!source.includes('disabled-300160001dmin'),'School ID replacement corrupted a user ID');
assert.ok(source.includes("'300160003'"),'New school creation must use a numeric ID');
assert.ok(source.includes("iemisCode:'300160003'"),'School create must include matching IEMIS code');
assert.ok(!source.includes("assertSucceeds(setDoc(doc(db('super-a'),'schools','school-new')"),'Non-numeric school creation must not succeed');
console.log('PASS: emulator school fixtures follow numeric IEMIS school ID contract');
