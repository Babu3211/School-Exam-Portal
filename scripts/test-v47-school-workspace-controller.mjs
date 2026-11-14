import assert from "node:assert/strict";
import {createV47SchoolWorkspace} from "../src/v47/school-workspace-controller.mjs";
const calls=[];
let resolvePending;
const workspace=createV47SchoolWorkspace({
 getIdToken:async()=>"token",
 fetchImpl:async(url)=>{
  calls.push(url);
  if(url.includes("/dashboard?")) {
   const schoolId=new URL(url,"https://local.test").searchParams.get("schoolId");
   return {ok:true,json:async()=>({dashboard:{schoolId,schoolName:schoolId,roles:["viewer"],readOnly:true}})};
  }
  if(url.includes("/marks?"))return {ok:true,json:async()=>({marks:[{id:"m1"}]})};
  if(url.includes("/attendance?"))return {ok:true,json:async()=>({attendance:[{id:"a1"}]})};
  throw Error("Unexpected endpoint");
 }
});
await assert.rejects(workspace.readMarks({className:"9",subject:"Computer"}),/Select an authorized school/);
assert.equal((await workspace.selectSchool("school_A001")).readOnly,true);
assert.deepEqual(await workspace.readMarks({className:"9",subject:"Computer"}),[{id:"m1"}]);
assert.deepEqual(await workspace.readAttendance({className:"9",date:"2026-04-14"}),[{id:"a1"}]);
await workspace.selectSchool("school_B001");
assert.equal(workspace.getSelectedSchool().schoolId,"school_B001");
assert.ok(calls.some(url=>url.includes("school_B001")));
workspace.clear();
assert.equal(workspace.getSelectedSchool(),null);
await assert.rejects(workspace.readAttendance({className:"9",date:"2026-04-14"}),/Select an authorized school/);
const deferred=createV47SchoolWorkspace({
 getIdToken:async()=>"token",
 fetchImpl:async(url)=>{
  if(url.includes("/dashboard?"))return {ok:true,json:async()=>({dashboard:{schoolId:"school_A001",schoolName:"A",roles:["viewer"],readOnly:true}})};
  if(url.includes("/marks?"))return new Promise(resolve=>{resolvePending=resolve;});
 }
});
await deferred.selectSchool("school_A001");
const pending=deferred.readMarks({className:"9",subject:"Computer"});
await Promise.resolve();
await Promise.resolve();
deferred.clear();
resolvePending({ok:true,json:async()=>({marks:[{id:"stale"}]})});
await assert.rejects(pending,/School selection changed/);
// All read endpoints must discard old-school responses after a school switch.
for(const [endpoint,read,field] of [
 ["records?",app=>app.readRecords({collection:"students"}),"records"],
 ["attendance?",app=>app.readAttendance({className:"9",date:"2026-04-14"}),"attendance"],
 ["marks?",app=>app.readMarks({className:"9",subject:"Computer"}),"marks"]
]){
 let release;
 let requested;
 const started=new Promise(resolve=>{requested=resolve;});
 const switching=createV47SchoolWorkspace({
  getIdToken:async()=>"token",
  fetchImpl:async url=>{
   if(url.includes("/dashboard?")){
    const schoolId=new URL(url,"https://local.test").searchParams.get("schoolId");
    return {ok:true,json:async()=>({dashboard:{schoolId,schoolName:schoolId,roles:["viewer"],readOnly:true}})};
   }
   if(url.includes("/"+endpoint)){
    requested();
    return new Promise(resolve=>{release=resolve;});
   }
   throw Error("Unexpected endpoint "+url);
  }
 });
 await switching.selectSchool("school_A001");
 const oldRead=read(switching);
 await started;
 await switching.selectSchool("school_B001");
 release({ok:true,json:async()=>({[field]:[{id:"old-school-secret"}]})});
 await assert.rejects(oldRead,/School selection changed/,endpoint+" must reject stale data");
 assert.equal(switching.getSelectedSchool().schoolId,"school_B001");
}
// An admin role must not override a server-declared read-only dashboard.
let writeCalls=0;
const readOnlyAdmin=createV47SchoolWorkspace({
 getIdToken:async()=>"token",
 fetchImpl:async url=>{
  if(url.includes("/dashboard?"))return {ok:true,json:async()=>({dashboard:{
   schoolId:"school_A001",schoolName:"A",roles:["school_admin"],readOnly:true
  }})};
  if(url.includes("/students/write"))writeCalls++;
  throw Error("Unexpected endpoint");
 }
});
await readOnlyAdmin.selectSchool("school_A001");
await assert.rejects(readOnlyAdmin.saveStudent({studentId:"s001",mode:"create",values:{name:"Test",className:"9"}}),/School admin required/);
assert.equal(writeCalls,0);
console.log("V47 school workspace switch and stale read tests passed");
