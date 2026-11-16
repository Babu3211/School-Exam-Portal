import assert from 'node:assert/strict';
import {checkedRecords,resetOnLoadFailure} from '../v47/record-limits.mjs';
assert.equal(checkedRecords(Array(500).fill(0)).length,500);
assert.throws(()=>checkedRecords(Array(501).fill(0)),RangeError);
assert.throws(()=>checkedRecords([],501),RangeError);
assert.throws(()=>checkedRecords(null),TypeError);
const reset=resetOnLoadFailure({records:[{id:'old'}],ready:true});
assert.deepEqual(reset.records,[]);assert.equal(reset.ready,false);
console.log('V47 record-limit and stale-cache tests passed');
