// Canonical browser-school/IEMIS schema must work with isolated Node API.
// No real Firebase, tokens, schools or students are used.
import assert from 'node:assert/strict';
import {assertSchoolId} from '../src/v47/tenant-domain.mjs';
import {loadVerifiedSchoolSession} from '../src/v47/verified-school-session.mjs';
import {mayAccessSchool} from '../src/v47/tenant-access.mjs';
import {assignTeacherOnTrustedServer} from '../src/v47/trusted-teacher-assignment.mjs';

const sid='12345678',uid='admin1',tid='teacher1',root='schools/'+sid;
assert.equal(assertSchoolId(sid),sid);
assert.equal(assertSchoolId('school_A001'),'school_A001','legacy isolated test compatibility');
for(const bad of ['1234','123456789012345678901','../12345678','123 45678',''])
 assert.throws(()=>assertSchoolId(bad));

const docs=new Map([
 [root,{id:sid,active:true}],
 [root+'/members/'+uid,{uid,schoolId:sid,active:true,role:'school_admin'}],
 [root+'/members/'+tid,{uid:tid,schoolId:sid,active:true,role:'teacher'}],
 [root+'/members/viewer1',{uid:'viewer1',schoolId:sid,active:true,role:'viewer'}]
]);
const firestore={
 doc:path=>({path,get:async()=>({exists:docs.has(path),data:()=>structuredClone(docs.get(path))})}),
 runTransaction:async fn=>{
  const pending=[],tx={
   get:async ref=>({exists:docs.has(ref.path),data:()=>structuredClone(docs.get(ref.path))}),
   set:(ref,data)=>pending.push([ref.path,structuredClone(data)])
  };
  const result=await fn(tx);
  for(const [p,v] of pending)docs.set(p,v);
  return result;
 }
};
const auth={verifyIdToken:async(_token,revoke)=>{assert.equal(revoke,true);return {uid:auth.currentUid,firebase:{sign_in_provider:'password'}}},currentUid:uid};
const login=async user=>{auth.currentUid=user;return loadVerifiedSchoolSession({idToken:'synthetic',schoolId:sid,auth,firestore})};
const admin=await login(uid);
assert.deepEqual(admin.roles,['school_admin']);
assert.equal(mayAccessSchool({...admin,active:true},sid,'write'),true);
const teacher=await login(tid);
assert.deepEqual(teacher.roles,['teacher']);
assert.equal(mayAccessSchool({...teacher,active:true},sid,'read'),true);
assert.equal(mayAccessSchool({...teacher,active:true},sid,'write'),false,'Teacher must use assigned-only write flow');
const viewer=await login('viewer1');
assert.deepEqual(viewer.roles,['viewer']);
assert.equal(mayAccessSchool({...viewer,active:true},sid,'read'),true);
assert.equal(mayAccessSchool({...viewer,active:true},sid,'write'),false);

const input={schoolId:sid,teacherUid:tid,classId:'9',subjectId:'computer',
 kind:'subject_teacher',terms:['first','final']};
const created=await assignTeacherOnTrustedServer({adminSession:admin,input,firestore});
assert.equal(created.schoolId,sid);
assert.equal(docs.get(root+'/assignments/'+created.id).uid,tid);
await assert.rejects(assignTeacherOnTrustedServer({adminSession:teacher,input,firestore}),/school admin/);
await assert.rejects(assignTeacherOnTrustedServer({adminSession:viewer,input,firestore}),/school admin/);
await assert.rejects(assignTeacherOnTrustedServer({adminSession:admin,input:{...input,schoolId:'87654321'},firestore}),/school admin/);

const adminPath=root+'/members/'+uid;
docs.set(adminPath,{...docs.get(adminPath),active:false});
await assert.rejects(login(uid),/No active membership/);
await assert.rejects(assignTeacherOnTrustedServer({adminSession:admin,input,firestore}),/admin membership/);
docs.set(adminPath,{uid,schoolId:sid,active:true,role:'viewer',roles:['school_admin']});
await assert.rejects(login(uid),/Conflicting/);
await assert.rejects(assignTeacherOnTrustedServer({adminSession:admin,input,firestore}),/admin membership/);
docs.set(adminPath,{uid,schoolId:sid,active:true,role:'school_admin'});
docs.set(root,{id:sid,active:false,status:'active'});
await assert.rejects(login(uid),/School is not active/);
docs.set(root,{id:sid,active:true,status:'suspended'});
await assert.rejects(login(uid),/School is not active/);
docs.set(root,{id:'87654321',active:true});
await assert.rejects(login(uid),/School is not active/);
console.log('PASS V47 canonical IEMIS school session: singular Admin/Teacher/Viewer role, assigned teacher, revoked/cross-school/mixed-role denial');
