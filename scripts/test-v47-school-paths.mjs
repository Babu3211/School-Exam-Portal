import assert from 'node:assert/strict';
import {schoolCollectionPath,schoolDocumentPath} from '../v47/school-paths.mjs';
assert.equal(schoolCollectionPath('school_001','students'),'schools/school_001/students');
assert.equal(schoolDocumentPath('school_001','marks','mark_1'),'schools/school_001/marks/mark_1');
for(const id of ['../other','x','a/b',''])assert.throws(()=>schoolCollectionPath(id,'students'));
assert.throws(()=>schoolCollectionPath('school_001','secrets'));
console.log('V47 school path tests passed');
