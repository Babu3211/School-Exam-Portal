import assert from 'node:assert/strict';
import {validatePageSize,nextPageState} from '../v47/pagination.mjs';
assert.equal(validatePageSize(),100);
assert.throws(()=>validatePageSize(501));
const next=nextPageState([{id:'a'}],[{id:'a'},{id:'b'}],true);
assert.deepEqual(next.records.map(x=>x.id),['a','b']);assert.equal(next.hasMore,true);
assert.throws(()=>nextPageState([], [{bad:1}],false));
console.log('V47 pagination validation passed');
