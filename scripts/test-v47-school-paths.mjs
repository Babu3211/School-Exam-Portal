import assert from 'node:assert/strict';
import {schoolCollectionPath,schoolDocumentPath} from '../v47/school-paths.mjs';
assert.equal(schoolCollectionPath('12345678','students'),'schools/12345678/students');
assert.equal(schoolDocumentPath('12345678','marks','mark_1'),'schools/12345678/marks/mark_1');
for(const id of ['../other','x','a/b','','1234','123456789012345678901','1234a',' 12345'])assert.throws(()=>schoolCollectionPath(id,'students'));
assert.throws(()=>schoolCollectionPath('12345678','secrets'));
console.log('V47 school path tests passed');
