import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const r=readFileSync(new URL('./firestore.rules',import.meta.url),'utf8');
for(const s of ['match /schools/{sid}','match /members/{uid}','match /students/{id}','match /marks/{id}','match /attendance/{id}','allow read, write: if false;','activeMember(sid)','request.resource.data.uid == uid']) assert.ok(r.includes(s),s);
assert.equal((r.match(/match \/schools\/\{sid\}/g)||[]).length,1);
assert.equal((r.match(/match \/students\/\{id\}/g)||[]).length,1);
assert.ok(!r.includes('allow read, write: if true'));
console.log('V47 tenant rules static integrity checks passed; emulator tests still required');
