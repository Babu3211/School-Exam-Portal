import assert from 'node:assert/strict';
import {normalizeSchoolList,visibleSchoolList} from './school-directory.mjs';
const schools=[{id:'87654321',name:'Zeta',active:true},{id:'12345678',name:'Alpha',active:true},{id:'23456789',name:'Closed',active:false}];
assert.deepEqual(normalizeSchoolList(schools).map(s=>s.id),['12345678','23456789','87654321']);
assert.deepEqual(visibleSchoolList(schools,['12345678','23456789']).map(s=>s.id),['12345678']);
assert.equal(visibleSchoolList(schools,['87654321'],{isSuperAdmin:true}).length,3);
assert.throws(()=>normalizeSchoolList([{id:'../x',name:'Bad'}]));
console.log('V47 school directory tests passed');
