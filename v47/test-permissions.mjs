import assert from 'node:assert/strict';
import {canAccessSchool,canManageSchools} from './permissions.mjs';
const sid='12345678';
const superAdmin={uid:'super-1',role:'super_admin',active:true};
const admin={uid:'admin-1',role:'school_admin',schoolId:sid,active:true};
const teacher={uid:'teacher-1',role:'teacher',schoolId:sid,active:true};
const viewer={uid:'viewer-1',role:'viewer',schoolId:sid,active:true};
for(const actor of [superAdmin,admin,teacher,viewer])assert.equal(canAccessSchool(actor,sid,'read'),true);
assert.equal(canAccessSchool(admin,sid,'write'),true);
assert.equal(canAccessSchool(superAdmin,sid,'write'),false,'Super Admin cannot directly edit tenant academic records');
for(const actor of [teacher,viewer])assert.equal(canAccessSchool(actor,sid,'write'),false);
for(const operation of ['delete','create','update','publish','admin','',null,undefined,42]){
 if(operation===undefined)continue; // undefined means the documented default read
 for(const actor of [superAdmin,admin,teacher,viewer])
  assert.equal(canAccessSchool(actor,sid,operation),false,'Unexpected operation must be denied: '+String(operation));
}
for(const actor of [admin,teacher,viewer]){
 assert.equal(canAccessSchool(actor,'87654321','read'),false);
 assert.equal(canAccessSchool(actor,'87654321','write'),false);
}
for(const actor of [superAdmin,admin,teacher,viewer]){
 assert.equal(canAccessSchool({...actor,active:false},sid,'read'),false);
 assert.equal(canAccessSchool({...actor,active:false},sid,'write'),false);
}
assert.equal(canManageSchools(superAdmin),true);
for(const actor of [admin,teacher,viewer,{...superAdmin,active:false},null])
 assert.equal(canManageSchools(actor),false);
for(const actor of [superAdmin,admin,teacher,viewer]){
 for(const uid of [null,undefined,'',' ',42]){
  assert.equal(canAccessSchool({...actor,uid},sid,'read'),false);
  assert.equal(canAccessSchool({...actor,uid},sid,'write'),false);
  assert.equal(canManageSchools({...actor,uid}),false);
 }
 for(const invalidSchool of ['',null,undefined,'../other','1234','1'.repeat(21)]){
  assert.equal(canAccessSchool(actor,invalidSchool,'read'),false);
  assert.equal(canAccessSchool(actor,invalidSchool,'write'),false);
 }
}
console.log('V47 permission operation and tenant isolation checks passed');
