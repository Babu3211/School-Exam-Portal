import assert from "node:assert/strict";
import {createV46FeatureBridge,V46_REUSED_FEATURES} from "../src/v47/v46-feature-bridge.mjs";
const paths=[];
const gateway={forCollection:path=>{paths.push(path);return {path};}};
const implementations=Object.fromEntries(V46_REUSED_FEATURES.map(name=>[name,(context,payload)=>({context,payload,name})]));
const a=createV46FeatureBridge({session:{schoolId:"school_A001",roles:["school_admin"]},legacyFeatures:implementations,tenantGateway:gateway});
const b=createV46FeatureBridge({session:{schoolId:"school_B001",roles:["viewer"]},legacyFeatures:implementations,tenantGateway:gateway});
assert.equal(a.marks({id:"one"}).context.gateway.path,"schools/school_A001/marks");
assert.equal(b.marks({id:"one"}).context.gateway.path,"schools/school_B001/marks");
assert.equal(a.marks({id:"one"}).name,"marks");
assert.equal(a.attendance().context.schoolId,"school_A001");
assert.equal(typeof implementations.marks,"function"); // Existing implementation remains callable.
assert.throws(()=>createV46FeatureBridge({session:{schoolId:"school_A001",roles:["viewer","school_admin"]},legacyFeatures:implementations,tenantGateway:gateway}));
assert.throws(()=>createV46FeatureBridge({session:{schoolId:"school_A001",roles:["viewer"]},legacyFeatures:{},tenantGateway:gateway}),/Missing V46 feature/);
assert.equal(paths.length,14);
console.log("V47 V46 feature reuse bridge contract tests passed");
