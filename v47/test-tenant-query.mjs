import assert from 'node:assert/strict';
import {tenantQueryPath} from './tenant-query.mjs';
for(const kind of ['students','marks','attendance','subject_assignments','component_marks','members']) assert.equal(tenantQueryPath('12345678',kind),`schools/12345678/${kind}`);
for(const kind of ['v47_super_admins','user_roles','../students','billing','']) assert.throws(()=>tenantQueryPath('12345678',kind));
assert.throws(()=>tenantQueryPath('../school2','students'));
console.log('V47 tenant query scope tests passed');
