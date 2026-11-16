import assert from "node:assert/strict";
import {createV46VerifiedReadSession} from "../src/v47/v46-verified-read-session.mjs";
let active=true,uid="user_1",readCount=0,memberRoles=["viewer"];
const auth={currentUser:{uid}};
const schoolId="school_A001";
const options={
 db:{},auth,schoolId,
 docFn:(_db,...parts)=>parts.join("/"),
 collectionFn:(_db,...parts)=>parts.join("/"),
 queryFn:(path,...clauses)=>({path,clauses}),
 limitFn:n=>({limit:n}),
 getDocFn:async path=>{
  readCount++;
  const isSchool=path==="schools/"+schoolId;
  return {
   exists:()=>active,
   id:path.split("/").at(-1),
   data:()=>isSchool?{schoolId,status:"active"}:
    path.includes("/members/")?{schoolId,uid:path.split("/").at(-1),active,roles:memberRoles}:{name:"Student"}
  };
 },
 getDocsFn:async q=>{
  assert.equal(q.path,"schools/"+schoolId+"/students");
  return {docs:[{id:"student1",data:()=>({name:"Test"})}]};
 }
};
assert.throws(()=>createV46VerifiedReadSession({...options,schoolId:"../other-school"}));
assert.throws(()=>createV46VerifiedReadSession({...options,schoolId:""}));
const session=createV46VerifiedReadSession(options);
assert.deepEqual(await session.list("students"),[{name:"Test",id:"student1"}]);
assert.equal(readCount,4);
assert.deepEqual(await session.get("students","student1"),{name:"Student",id:"student1"});
await assert.rejects(session.list("public_results"));
active=false;
await assert.rejects(session.list("students"));
active=true;
const changed=createV46VerifiedReadSession({...options,getDocsFn:async()=>{active=false;return {docs:[]};}});
await assert.rejects(changed.list("students"));
active=true;
const pageDoc={id:"student1",ref:{path:"schools/"+schoolId+"/students/student1"},data:()=>({name:"Test"})};
let pageIndex=0;
const paging=createV46VerifiedReadSession({...options,
 orderByFn:field=>({field}),startAfterFn:cursor=>({after:cursor.id}),
 getDocsFn:async q=>{
  assert.equal(q.path,"schools/"+schoolId+"/students");
  return {docs:pageIndex++===0?[pageDoc]:[]};
 }
});
const first=await paging.listPage("students",{pageSize:1});
assert.deepEqual(first.records,[{name:"Test",id:"student1"}]);
assert.deepEqual(first.nextCursor,{pageToken:true});
assert.equal(Object.hasOwn(first.nextCursor,"ref"),false);
assert.equal(Object.hasOwn(first.nextCursor,"data"),false);
const second=await paging.listPage("students",{pageSize:1,cursor:first.nextCursor});
assert.deepEqual(second.records,[]);
assert.equal(second.nextCursor,null);
await assert.rejects(paging.listPage("students",{pageSize:1,cursor:first.nextCursor}));
await assert.rejects(paging.listPage("staff",{cursor:first.nextCursor}));
auth.currentUser={uid:"other_user"};
await assert.rejects(paging.listPage("students",{pageSize:1,cursor:first.nextCursor}));
auth.currentUser={uid};
memberRoles=["class_teacher"];
await assert.rejects(paging.listPage("students",{pageSize:1,cursor:first.nextCursor}));
memberRoles=["viewer"];
await assert.rejects(paging.listPage("public_results"));
await assert.rejects(paging.listPage("students",{pageSize:51}));
await assert.rejects(paging.listPage("students",{cursor:{id:"student1",ref:pageDoc.ref,data:pageDoc.data}}));
// A page read that loses membership before the final check must not return
// records or an issued next-page token. A fresh verified read may recover.
let revokeOnPage=true;
const revokedPaging=createV46VerifiedReadSession({...options,
 orderByFn:field=>({field}),startAfterFn:cursor=>({after:cursor.id}),
 getDocsFn:async()=>{
  if(revokeOnPage)active=false;
  return {docs:[pageDoc]};
 }
});
await assert.rejects(revokedPaging.listPage("students",{pageSize:1}),/School access unavailable/);
active=true;
revokeOnPage=false;
const recovered=await revokedPaging.listPage("students",{pageSize:1});
assert.deepEqual(recovered.records,[{name:"Test",id:"student1"}]);
assert.deepEqual(recovered.nextCursor,{pageToken:true});
assert.equal(Object.hasOwn(session,"write"),false);
assert.equal(Object.hasOwn(session,"collection"),false);
console.log("Verified V46 school read session checks passed");
