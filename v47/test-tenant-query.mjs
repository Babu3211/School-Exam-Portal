import assert from 'node:assert/strict';
import {tenantQueryPath} from './tenant-query.mjs';
for(const kind of ['students','marks','attendance','members']) assert.equal(tenantQueryPath('school1',kind),`schools/school1/${kind}`);
for(const kind of ['v47_super_admins','user_roles','../students','billing','']) assert.throws(()=>tenantQueryPath('school1',kind));
assert.throws(()=>tenantQueryPath('../school2','students'));
console.log('V47 tenant query scope tests passed');
