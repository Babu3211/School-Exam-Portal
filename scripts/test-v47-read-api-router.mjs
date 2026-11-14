import assert from "node:assert/strict";
import {createV47NodeReadHandler} from "../src/v47/read-api-router.mjs";
const auth={verifyIdToken:async()=>({uid:"user_1"})};
const firestore={doc:()=>({get:async()=>({exists:false})}),collection:()=>({})};
const handler=createV47NodeReadHandler({auth,firestore});
async function call(url,method="GET",headers={}){
 const res={headers:{},setHeader(k,v){this.headers[k]=v;},end(body){this.body=JSON.parse(body);}};
 await handler({url,method,headers},res);
 return res;
}
assert.equal((await call("/api/v47/missing")).statusCode,404);
assert.equal((await call("/api/v47/dashboard","POST")).statusCode,405);
assert.equal((await call("/api/v47/dashboard?schoolId=school_001")).statusCode,401);
assert.equal((await call("/api/v47/dashboard?schoolId=school_001&schoolId=school_002",{toString:()=>""})).statusCode,400);
assert.equal((await call("/api/v47/dashboard?schoolId=school_001","GET",{authorization:"Bearer token"})).statusCode,403);
assert.equal((await call("/api/v47/marks?schoolId=school_001")).statusCode,401);
assert.equal((await call("/api/v47/attendance?schoolId=school_001")).statusCode,401);
assert.equal((await call("/api/v47/dashboard")).headers["Cache-Control"],"no-store");
console.log("V47 isolated Node read API router security tests passed");
