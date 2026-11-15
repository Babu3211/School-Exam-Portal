import {createV46BrowserTenantGateway} from "../src/v47/v46-browser-tenant-gateway.mjs";
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
assert.equal(a.classes().context.gateway.path,"schools/school_A001/classes");
assert.equal(a.subjects().context.gateway.path,"schools/school_A001/subjects");
assert.equal(a.certificates().context.gateway.path,"schools/school_A001/certificates");
assert.equal(a.markSettings().context.gateway.path,"schools/school_A001/mark_settings");
assert.equal(b.classes().context.gateway.path,"schools/school_B001/classes");
assert.equal(b.markSettings().context.gateway.path,"schools/school_B001/mark_settings");
assert.equal(a.settings().context.gateway.path,"schools/school_A001/school_settings");
assert.equal(b.results().context.gateway.path,"schools/school_B001/public_results");
const mutableSession={schoolId:"school_A001",roles:["viewer"]};
const snapshotBridge=createV46FeatureBridge({session:mutableSession,legacyFeatures:implementations,tenantGateway:gateway});
mutableSession.roles.splice(0,1,"school_admin");
assert.deepEqual(snapshotBridge.students().context.roles,["viewer"]);
assert.equal(snapshotBridge.students().context.readOnly,true);
assert.equal(a.students().context.readOnly,false);
assert.equal(b.students().context.readOnly,true);
assert.equal(Object.isFrozen(b.students().context),true);
assert.equal(Object.isFrozen(b.students().context.roles),true);
assert.throws(()=>createV46FeatureBridge({session:{schoolId:"school_A001",roles:["school_admin","school_admin"]},legacyFeatures:implementations,tenantGateway:gateway}),/Invalid school role/);
assert.throws(()=>createV46FeatureBridge({session:{schoolId:"school_A001",roles:["school_admin",null]},legacyFeatures:implementations,tenantGateway:gateway}),/Invalid school role/);
const writableGateway={forCollection:path=>({
 path,
 read(){return "allowed";},
 save(){return "written";},
 update(){return "updated";},
 delete(){return "deleted";}
})};
const viewerBridge=createV46FeatureBridge({
 session:{schoolId:"school_B001",roles:["viewer"]},
 legacyFeatures:implementations,tenantGateway:writableGateway
});
assert.equal(viewerBridge.students().context.gateway.read(),"allowed");
assert.throws(()=>viewerBridge.students().context.gateway.save(),/read-only/);
assert.throws(()=>viewerBridge.marks().context.gateway.update(),/read-only/);
assert.throws(()=>viewerBridge.attendance().context.gateway.delete(),/read-only/);
const adminBridge=createV46FeatureBridge({
 session:{schoolId:"school_A001",roles:["school_admin"]},
 legacyFeatures:implementations,tenantGateway:writableGateway
});
assert.equal(adminBridge.students().context.gateway.save(),"written");
assert.throws(()=>createV46FeatureBridge({session:{schoolId:"school_A001",roles:["platform_admin"]},legacyFeatures:implementations,tenantGateway:gateway}),/Invalid school role/);
assert.throws(()=>createV46FeatureBridge({session:{schoolId:"school_A001",roles:["administrator"]},legacyFeatures:implementations,tenantGateway:gateway}),/Invalid school role/);
assert.throws(()=>createV46FeatureBridge({session:{schoolId:"school_A001",roles:["teacher"]},legacyFeatures:implementations,tenantGateway:gateway}),/Invalid school role/);
assert.equal(typeof implementations.marks,"function"); // Existing implementation remains callable.
assert.throws(()=>createV46FeatureBridge({session:{schoolId:"school_A001",roles:["viewer","school_admin"]},legacyFeatures:implementations,tenantGateway:gateway}));
assert.throws(()=>createV46FeatureBridge({session:{schoolId:"school_A001",roles:["viewer"]},legacyFeatures:{},tenantGateway:gateway}),/Missing V46 feature/);
assert.equal(paths.length,V46_REUSED_FEATURES.length*3);
const firestoreCalls=[];
const browserGateway=createV46BrowserTenantGateway({
 db:{},verifiedSchoolId:"school_A001",
 collectionFn:(_db,...parts)=>{firestoreCalls.push(parts.join("/"));return parts.join("/");},
 docFn:(_db,...parts)=>{firestoreCalls.push(parts.join("/"));return parts.join("/");},
 queryFn:(ref,lim)=>({ref,lim}),limitFn:n=>n,
 getDocsFn:async()=>({docs:[{id:"one",data:()=>({className:"1"})}]}),
 getDocFn:async()=>({exists:()=>true,id:"one",data:()=>({name:"Student"})})
});
const tenantCollection=browserGateway.forCollection("schools/school_A001/students");
assert.deepEqual(await tenantCollection.list(),[{id:"one",className:"1"}]);
assert.deepEqual(await tenantCollection.get("one"),{id:"one",name:"Student"});
assert.deepEqual(firestoreCalls,["schools/school_A001/students","schools/school_A001/students/one"]);
assert.throws(()=>browserGateway.forCollection("schools/school_B001/students"),/cross-school/);
assert.throws(()=>browserGateway.forCollection("students"),/cross-school/);
assert.throws(()=>browserGateway.forCollection("schools/school_A001/unreviewed"),/Unreviewed/);
await assert.rejects(()=>tenantCollection.list({pageSize:100}),/Page size/);
await assert.rejects(()=>tenantCollection.get("../other"),/Invalid document ID/);
assert.equal(typeof tenantCollection.save,"undefined");
console.log("V47 V46 feature reuse bridge contract tests passed");
