import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';
import {verifySchoolSession} from './verified-school-session.mjs';

const source=readFileSync(new URL('./report-preview-console.mjs',import.meta.url),'utf8');
const begin=source.indexOf('async function withVerifiedReportSnapshot(');
const end=source.indexOf("\ndocument.addEventListener('visibilitychange'",begin);
assert.ok(begin>=0&&end>begin,'Report access guard must exist');
const guard=source.slice(begin,end);
const session={schoolId:'12345',verifiedUid:'admin123'};
function fixture(){
 const messages=[],state={cleared:0,reads:0,rendered:0,valid:true,expire:false,schoolActive:true,role:'viewer',schoolId:'12345'};
 const auth={currentUser:{uid:'admin123'}};
 const context=createContext({
  reportRows:session,busy:false,loggingOut:false,auth,authSdk:{},db:{},
  firestoreApi:{doc:(_db,...segments)=>segments.join('/'),getDocFromServer:async path=>{
   state.reads++;
   if(!state.valid)throw Error('Membership revoked');
   if(path==='schools/12345')return {exists:()=>true,data:()=>({id:state.schoolId,active:state.schoolActive})};
   if(path==='schools/12345/members/admin123')return {exists:()=>true,data:()=>({uid:'admin123',schoolId:state.schoolId,role:state.role,active:state.valid})};
   throw Error('Unexpected Firestore path: '+path);
  }},
  epoch:1,
  enforceSchoolIdle:async()=>!state.expire,
  verifySchoolSession,
  currentSession:(attempt,uid)=>attempt===1&&auth.currentUser?.uid===uid,
  clear:()=>{state.cleared++;context.reportRows=null;context.epoch++},
  status:message=>messages.push(message),
  Error,
 });
 runInContext('let verifyingReport=false; '+guard+'; globalThis.runReportGuard=withVerifiedReportSnapshot',context);
 return {state,auth,context,messages,run:callback=>context.runReportGuard(callback)};
}
{
 const test=fixture();
 await test.run(()=>test.state.rendered++);
 assert.equal(test.state.rendered,1);
 assert.equal(test.state.reads,2);
 assert.equal(test.state.cleared,0);
}
{
 const test=fixture();test.state.valid=false;
 await test.run(()=>test.state.rendered++);
 assert.equal(test.state.rendered,0);
 assert.equal(test.state.cleared,1);
 assert.match(test.messages[0],/फेरि Login/);
}
{
 const test=fixture();test.state.expire=true;
 await test.run(()=>test.state.rendered++);
 assert.equal(test.state.rendered,0);
 assert.equal(test.state.cleared,1);
 assert.equal(test.state.reads,0);
}
{
 const test=fixture();
 test.context.firestoreApi.getDocFromServer=async path=>{
  const response=path==='schools/12345'?{id:'12345',active:true}:{uid:'admin123',schoolId:'12345',role:'viewer',active:true};
  test.auth.currentUser={uid:'other'};return {exists:()=>true,data:()=>response};
 };
 await test.run(()=>test.state.rendered++);
 assert.equal(test.state.rendered,0);
 assert.equal(test.state.cleared,1);
}
{
 const test=fixture();
 let release;
 const barrier=new Promise(resolve=>{release=resolve});
 test.context.enforceSchoolIdle=()=>barrier;
 const first=test.run(()=>test.state.rendered++);
 await test.run(()=>test.state.rendered++);
 release(true);await first;
 assert.equal(test.state.rendered,1,'Repeated clicks must not render twice');
}
{
 const test=fixture();test.state.schoolActive=false;
 await test.run(()=>test.state.rendered++);
 assert.equal(test.state.rendered,0);
 assert.equal(test.state.cleared,1);
}
{
 const test=fixture();test.state.role='invalid-role';
 await test.run(()=>test.state.rendered++);
 assert.equal(test.state.rendered,0);
 assert.equal(test.state.cleared,1);
}
{
 const test=fixture();test.state.schoolId='67890';
 await test.run(()=>test.state.rendered++);
 assert.equal(test.state.rendered,0);
 assert.equal(test.state.cleared,1);
}
console.log('V47 report access guard dynamic tests passed: valid, revoked, expired, swapped login and concurrent checks');
