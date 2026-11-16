import assert from "node:assert/strict";
import {createV46VerifiedReadSession} from "../src/v47/v46-verified-read-session.mjs";
let active=true,uid="user_1",readCount=0;
const auth={currentUser:{uid}};
const schoolId="school_A001";
const options={
 db:{},auth,schoolId,
 docFn:(_db,...parts)=>parts.join("/"),
 collectionFn:(_db,path)=>path,
 queryFn:(path,...clauses)=>({path,clauses}),
 limitFn:n=>({limit:n}),
 getDocFn:async path=>{
  readCount++;
  const isSchool=path==="schools/"+schoolId;
  return {
   exists:()=>active,
   id:path.split("/").at(-1),
   data:()=>isSchool?{schoolId,status:"active"}:
    path.includes("/members/")?{schoolId,uid,active,roles:["viewer"]}:{name:"Student"}
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
assert.equal(Object.hasOwn(session,"write"),false);
assert.equal(Object.hasOwn(session,"collection"),false);
console.log("Verified V46 school read session checks passed");
