import assert from 'node:assert/strict';
import {createSchoolStudent} from './student-service.mjs';
import {validateStudent} from './student-validation.mjs';
import {readFileSync} from 'node:fs';
const sid='12345678';
const actor={uid:'admin-1',schoolId:sid,role:'school_admin',active:true};
const input={name:'Student One',class:'9',rollNo:''};
const writes=[];
const api={collection:(_db,...path)=>path.join('/'),addDoc:async(path,data)=>{writes.push({path,data});return {id:'student-1'}}};
const created=await createSchoolStudent({db:{},api,actor,schoolId:sid,input});
assert.equal(created.active,true);
assert.equal(created.schoolId,sid);
assert.equal(writes[0].data.active,true);
assert.equal(writes[0].path,'schools/'+sid+'/students');
assert.equal('rollNo' in created,false,'Roll number remains optional');
assert.equal(validateStudent(input).class,'9');
for(const unauthorized of [null,{...actor,uid:''},{...actor,uid:' '},{...actor,role:'viewer'},{...actor,role:'teacher'},{...actor,active:false},{...actor,schoolId:'87654321'}]){
 const before=writes.length;
 await assert.rejects(createSchoolStudent({db:{},api,actor:unauthorized,schoolId:sid,input}),/School Admin/);
 assert.equal(writes.length,before,'Unauthorized actor must not create students');
}
for(const invalid of [{name:'A',class:'9'},{name:'Student',class:'99'},null,[]]){
 const before=writes.length;
 await assert.rejects(createSchoolStudent({db:{},api,actor,schoolId:sid,input:invalid}));
 assert.equal(writes.length,before);
}
const changing={...actor};
const changedApi={...api,collection:(_db,...parts)=>{changing.active=false;return parts.join('/')}};
const before=writes.length;
await assert.rejects(createSchoolStudent({db:{},api:changedApi,actor:changing,schoolId:sid,input}),/membership changed/);
assert.equal(writes.length,before);
const rules=readFileSync(new URL('./firestore.rules',import.meta.url),'utf8');
const studentRule=rules.slice(rules.indexOf('match /students/{id} {'),rules.indexOf('function teacherMarkAllowed'));
assert.match(studentRule,/['"]active['"]/);
assert.match(studentRule,/request\.resource\.data\.get\('active',true\) == true/);
console.log('V47 student creation and roster compatibility checks passed');
