import assert from "node:assert/strict";
import {readVerifiedV46Records} from "../src/v47/verified-v46-records-reader.mjs";
const paths=[];
const docs=new Map([
 ["schools/school_A001",{status:"active"}],
 ["schools/school_A001/members/user1",{uid:"user1",schoolId:"school_A001",active:true,roles:["viewer"]}],
 ["schools/school_B001",{status:"active"}]
]);
const firestore={
 doc:path=>({get:async()=>({exists:docs.has(path),data:()=>docs.get(path)})}),
 collection:path=>({limit:n=>({get:async()=>{paths.push([path,n]);return {docs:[{id:"student1",data:()=>({name:"Test"})}]};}})})
};
const auth={verifyIdToken:async()=>({uid:"user1"})};
const base={idToken:"valid",schoolId:"school_A001",auth,firestore};
const rows=await readVerifiedV46Records({...base,collection:"students",maxRows:25});
assert.deepEqual(rows,[{id:"student1",name:"Test"}]);
assert.deepEqual(paths,[["schools/school_A001/students",25]]);
await assert.rejects(()=>readVerifiedV46Records({...base,schoolId:"school_B001",collection:"students"}),/membership|Membership|access|denied|active/i);
await assert.rejects(()=>readVerifiedV46Records({...base,collection:"user_roles"}),/not available/);
await assert.rejects(()=>readVerifiedV46Records({...base,collection:"public_results"}),/not available/);
await assert.rejects(()=>readVerifiedV46Records({...base,collection:"students",maxRows:501}),/row limit/);
assert.equal(paths.length,1);
console.log("V47 verified bounded school records reader tests passed");
