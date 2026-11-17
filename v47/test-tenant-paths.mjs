import assert from 'node:assert/strict';
import {V47_SCHOOL_COLLECTIONS,tenantCollection,tenantDocument,assertTenantPath} from './tenant-paths.mjs';
for(const name of V47_SCHOOL_COLLECTIONS){
 assert.equal(tenantCollection('school_A',name),'schools/school_A/'+name);
 assert.equal(tenantDocument('school_A',name,'record_1'),'schools/school_A/'+name+'/record_1');
 assert.equal(assertTenantPath('school_A','schools/school_A/'+name),'schools/school_A/'+name);
 assert.equal(assertTenantPath('school_A','schools/school_A/'+name+'/record_1'),'schools/school_A/'+name+'/record_1');
 assert.throws(()=>assertTenantPath('school_B','schools/school_A/'+name+'/record_1'),TypeError);
}
for(const path of ['students','schools/school_A','schools/school_A/marks/x/children/y','schools/school_A/../school_B/marks','schools/school_A/unknown','schools/school_A/marks/','schools/school_B/marks/x']){
 assert.throws(()=>assertTenantPath('school_A',path),TypeError,path);
}
assert.throws(()=>tenantCollection('school_A','user_roles'),TypeError);
assert.throws(()=>tenantDocument('school_A','members','../../other'),TypeError);
assert.throws(()=>tenantCollection('invalid/id','students'),TypeError);
console.log('V47 tenant path isolation tests passed');
