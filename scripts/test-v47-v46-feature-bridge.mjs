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
assert.equal(b.results,undefined,"Public result publishing requires separate reviewed gateway");
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
 getDocsFn:async()=>({docs:[{id:"one",data:()=>({className:"1",id:"spoofed"})}]}),
 getDocFn:async()=>({exists:()=>true,id:"one",data:()=>({name:"Student",id:"spoofed"})})
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
await assert.rejects(()=>tenantCollection.get("bad\\u0000id"),/Invalid document ID/);
const integratedBridge=createV46FeatureBridge({
 session:{schoolId:"school_A001",roles:["viewer"]},
 legacyFeatures:implementations,
 tenantGateway:browserGateway
});
assert.deepEqual(await integratedBridge.students().context.gateway.list(),[{id:"one",className:"1"}]);
assert.equal(integratedBridge.marks().context.gateway.path,"schools/school_A001/marks");
assert.equal(integratedBridge.attendance().context.gateway.path,"schools/school_A001/attendance");
assert.equal(integratedBridge.results,undefined,"Public result publishing must remain blocked");
assert.equal(typeof integratedBridge.students().context.gateway.save,"function");
assert.throws(()=>integratedBridge.students().context.gateway.save(),/read-only/);
assert.equal(typeof tenantCollection.save,"undefined");
// Every reused V46 module must remain tenant-scoped and viewer read-only.
const expectedCollections={
 students:"students",staff:"staff",classes:"classes",subjects:"subjects",
 exams:"exams",marks:"marks",attendance:"attendance",
 certificates:"certificates",markSettings:"mark_settings",
 settings:"school_settings"
};
assert.deepEqual([...V46_REUSED_FEATURES].sort(),Object.keys(expectedCollections).sort());
for(const [feature,collection] of Object.entries(expectedCollections)){
 const context=viewerBridge[feature]().context;
 assert.equal(context.gateway.path,`schools/school_B001/${collection}`);
 assert.equal(context.readOnly,true);
 assert.equal(context.gateway.read(),"allowed");
 for(const operation of ["save","update","delete"]){
  assert.throws(()=>context.gateway[operation](),/read-only/,
   `${feature} must deny viewer ${operation}`);
 }
}
// Verify tenant boundary across every V46 collection, not only students.
for(const collection of Object.values(expectedCollections)){
 assert.equal(browserGateway.forCollection(`schools/school_A001/${collection}`).path,
  `schools/school_A001/${collection}`);
 assert.throws(()=>browserGateway.forCollection(`schools/school_B001/${collection}`),/cross-school/);
 assert.throws(()=>browserGateway.forCollection(`schools/school_A001/${collection}/nested`),/cross-school/);
}
assert.throws(()=>browserGateway.forCollection("schools/school_A001/students/../marks"),/cross-school/);
const pageCalls=[];
const firstDoc={id:"s01",ref:{path:"schools/school_A001/students/s01"},data:()=>({name:"Student One",id:"spoofed"})};
const pagedGateway=createV46BrowserTenantGateway({
 db:{},verifiedSchoolId:"school_A001",
 collectionFn:(_db,...parts)=>parts.join("/"),
 docFn:(_db,...parts)=>parts.join("/"),
 queryFn:(ref,...clauses)=>{pageCalls.push({ref,clauses});return {ref,clauses};},
 limitFn:n=>({limit:n}),orderByFn:field=>({orderBy:field}),
 startAfterFn:cursor=>({after:cursor.id}),
 getDocsFn:async()=>({docs:[firstDoc]}),
 getDocFn:async()=>({exists:()=>false})
});
const pagedStudents=pagedGateway.forCollection("schools/school_A001/students");
const page1=await pagedStudents.listPage({pageSize:1});
assert.deepEqual(page1.records,[{id:"s01",name:"Student One"}]);
assert.equal(page1.nextCursor,firstDoc);
assert.equal(Object.isFrozen(page1.records),true);
const page2=await pagedStudents.listPage({pageSize:1,cursor:page1.nextCursor});
assert.deepEqual(page2.records,page1.records);
assert.deepEqual(pageCalls[0].clauses,[{orderBy:"__name__"},{limit:1}]);
assert.deepEqual(pageCalls[1].clauses,[{orderBy:"__name__"},{after:"s01"},{limit:1}]);
await assert.rejects(()=>pagedStudents.listPage({pageSize:51}),/Page size/);
await assert.rejects(()=>pagedStudents.listPage({cursor:"s01"}),/cursor/);
await assert.rejects(()=>pagedStudents.listPage({pageSize:1,cursor:{...firstDoc}}),/cursor/);
const anotherCollection=pagedGateway.forCollection("schools/school_A001/students");
await assert.rejects(()=>anotherCollection.listPage({pageSize:1,cursor:page1.nextCursor}),/cursor/);

await assert.rejects(()=>pagedStudents.listPage({pageSize:1,cursor:{...firstDoc,ref:{path:"schools/school_B001/students/s01"}}}),/cursor/);
await assert.rejects(()=>pagedStudents.listPage({pageSize:1,cursor:{...firstDoc,ref:{path:"schools/school_A001/marks/s01"}}}),/cursor/);

await assert.rejects(()=>pagedStudents.listPage({cursor:{id:"../bad",data(){}}}),/cursor/);
await assert.rejects(()=>tenantCollection.listPage(),/adapters required/);
console.log("V47 V46 feature reuse bridge contract tests passed");
