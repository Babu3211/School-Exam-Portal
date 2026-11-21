import assert from 'node:assert/strict';
import {assertSchoolId,schoolDocumentPath} from './school-scope.mjs';
for(const id of ['12345','00123456','12345678901234567890']) assert.equal(assertSchoolId(id),id);
for(const id of ['../87654321','a/b','', ' ']) assert.throws(()=>assertSchoolId(id));
assert.equal(schoolDocumentPath('12345678','members','user_1'),'schools/12345678/members/user_1');
assert.notEqual(schoolDocumentPath('12345678','members','user_1'),schoolDocumentPath('87654321','members','user_1'));
console.log('V47 registry identifier tests passed');
