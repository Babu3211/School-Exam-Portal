import assert from 'node:assert/strict';
import {normalizeSchoolList,visibleSchoolList} from './school-directory.mjs';
const schools=[{id:'schoolB',name:'Zeta',active:true},{id:'schoolA',name:'Alpha',active:true},{id:'schoolC',name:'Closed',active:false}];
assert.deepEqual(normalizeSchoolList(schools).map(s=>s.id),['schoolA','schoolC','schoolB']);
assert.deepEqual(visibleSchoolList(schools,['schoolA','schoolC']).map(s=>s.id),['schoolA']);
assert.equal(visibleSchoolList(schools,['schoolB'],{isSuperAdmin:true}).length,3);
assert.throws(()=>normalizeSchoolList([{id:'../x',name:'Bad'}]));
console.log('V47 school directory tests passed');
