import assert from 'node:assert/strict';
import {assertSchoolId,schoolDocumentPath} from './school-scope.mjs';
for(const id of ['smss001','school_2','school-30']) assert.equal(assertSchoolId(id),id);
for(const id of ['../schoolB','a/b','', ' ']) assert.throws(()=>assertSchoolId(id));
assert.equal(schoolDocumentPath('schoolA','members','user_1'),'schools/schoolA/members/user_1');
assert.notEqual(schoolDocumentPath('schoolA','members','user_1'),schoolDocumentPath('schoolB','members','user_1'));
console.log('V47 registry identifier tests passed');
