import assert from 'node:assert/strict';
import {resolveSchoolSession} from './school-session.mjs';
const membership={schoolId:'schoolA',role:'viewer',active:true};
assert.deepEqual(resolveSchoolSession({schoolId:'schoolA',membership,schoolActive:true}),{schoolId:'schoolA',role:'viewer',canRead:true,canManage:false});
assert.equal(resolveSchoolSession({schoolId:'schoolB',membership,schoolActive:true}).canRead,false);
assert.equal(resolveSchoolSession({schoolId:'schoolA',membership,schoolActive:false}).canRead,false);
assert.equal(resolveSchoolSession({schoolId:'schoolA',isSuperAdmin:true}).canManage,true);
console.log('V47 session resolution tests passed');
