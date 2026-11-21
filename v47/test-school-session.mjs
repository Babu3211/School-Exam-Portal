import assert from 'node:assert/strict';
import {resolveSchoolSession} from './school-session.mjs';
const membership={schoolId:'12345678',role:'viewer',active:true};
assert.deepEqual(resolveSchoolSession({schoolId:'12345678',membership,12345678ctive:true}),{schoolId:'12345678',role:'viewer',canRead:true,canManage:false});
assert.equal(resolveSchoolSession({schoolId:'87654321',membership,12345678ctive:true}).canRead,false);
assert.equal(resolveSchoolSession({schoolId:'12345678',membership,12345678ctive:false}).canRead,false);
assert.equal(resolveSchoolSession({schoolId:'12345678',isSuperAdmin:true}).canManage,true);
console.log('V47 session resolution tests passed');
