import assert from 'node:assert/strict';
import {V47_SCHOOL_COLLECTIONS,tenantCollection,tenantDocument,assertTenantPath} from './tenant-paths.mjs';
for(const name of V47_SCHOOL_COLLECTIONS){
 assert.equal(tenantCollection('12345678',name),'schools/12345678/'+name);
 assert.equal(tenantDocument('12345678',name,'record_1'),'schools/12345678/'+name+'/record_1');
 assert.equal(assertTenantPath('12345678','schools/12345678/'+name),'schools/12345678/'+name);
 assert.equal(assertTenantPath('12345678','schools/12345678/'+name+'/record_1'),'schools/12345678/'+name+'/record_1');
 assert.throws(()=>assertTenantPath('87654321','schools/12345678/'+name+'/record_1'),TypeError);
}
for(const path of ['students','schools/12345678','schools/12345678/marks/x/children/y','schools/12345678/../87654321/marks','schools/12345678/unknown','schools/12345678/marks/','schools/87654321/marks/x']){
 assert.throws(()=>assertTenantPath('12345678',path),TypeError,path);
}
assert.throws(()=>tenantCollection('12345678','user_roles'),TypeError);
for(const denied of ['teachers','audit_logs','results','assessment_settings','question_papers'])assert.throws(()=>tenantCollection('12345678',denied),TypeError);
assert.throws(()=>tenantDocument('12345678','members','../../other'),TypeError);
assert.throws(()=>tenantCollection('invalid/id','students'),TypeError);
console.log('V47 tenant path isolation tests passed');
