import assert from 'node:assert/strict';import {auditSubjectCatalog} from '../v47/subject-catalog-audit.mjs';
const good={schoolClass:'6',subjects:[{id:'math',name:'Mathematics',class:'6'}]};
assert.deepEqual(auditSubjectCatalog(good),{valid:true,issues:[],count:1,iemisVerified:false});
assert.ok(auditSubjectCatalog({...good,subjects:[]}).issues.includes('empty_subject_catalog'));
assert.ok(auditSubjectCatalog({...good,subjects:[good.subjects[0],good.subjects[0]]}).issues.includes('duplicate_subject_id'));
assert.ok(auditSubjectCatalog({...good,subjects:[{id:'math',name:'M',class:'7'}]}).issues.includes('wrong_subject_class'));
assert.ok(auditSubjectCatalog({...good,subjects:[{...good.subjects[0],active:'yes'}]}).issues.includes('invalid_subject_active_flag'));
assert.throws(()=>auditSubjectCatalog({...good,schoolClass:'13'}));
console.log('V47 subject catalog audit passed');
