import assert from "node:assert/strict";
import {mountV47SchoolWorkspace} from "../src/v47/school-workspace-view.mjs";
class FakeElement {
 constructor(tag){this.tag=tag;this.textContent="";this.value="";this.hidden=false;this.children=[];this.onclick=null;}
 setAttribute(name,value){this[name]=value;}
 append(...items){this.children.push(...items);}
 replaceChildren(...items){this.children=items;}
}
const document={createElement:tag=>new FakeElement(tag)};
const root=new FakeElement("main");
const urls=[];
const view=mountV47SchoolWorkspace({bsToAd:()=> "2026-04-14",adToBs:()=> "2083-01-01",root,document,getIdToken:async()=>"valid",fetchImpl:async url=>{
 urls.push(url);
 if(url.endsWith("/schools"))return {ok:true,json:async()=>({schools:[{schoolId:"school_A001",schoolName:"School A",roles:["viewer"]}]})};
 if(url.includes("/dashboard?"))return {ok:true,json:async()=>({dashboard:{schoolId:"school_A001",schoolName:"School A",roles:["viewer"],readOnly:true}})};
 if(url.includes("/records?"))return {ok:true,json:async()=>({records:[{id:"student1"}]})};
 if(url.includes("/marks?"))return {ok:true,json:async()=>({marks:[{id:"m1"}]})};
 if(url.includes("/attendance?"))return {ok:true,json:async()=>({attendance:[{id:"a1",date:"2026-04-14"}]})};
 throw Error("Unexpected endpoint");
}});
const [heading,loadSchools,schoolInput,open,clear,status,panel]=root.children;
assert.equal(heading.textContent,"V47 School Workspace");
assert.equal(panel.hidden,true);
for(const index of [8,9,10,11]){
 assert.equal(panel.children[index].hidden,true,"Edit controls must be hidden before login authorization");
 assert.equal(panel.children[index].disabled,true,"Edit controls must be disabled before login authorization");
}
await loadSchools.onclick();
schoolInput.value="school_A001";
await open.onclick();
assert.equal(panel.hidden,false);
assert.match(status.textContent,/School A/);
const [classInput,subjectInput,dateInput,marks,attendance,result]=panel.children;
const studentClassInput=panel.children[10];
const expectedClasses=["ECD","LKG","UKG",...Array.from({length:12},(_,i)=>String(i+1))];
assert.deepEqual(classInput.children.map(option=>option.value),expectedClasses);
assert.deepEqual(studentClassInput.children.map(option=>option.value),expectedClasses);
assert.equal(panel.children[9]["aria-label"],"Student name in English");
assert.equal(panel.children[12].hidden,true,"Viewer must never see Save student");
assert.equal(panel.children[12].disabled,true,"Viewer save button must be disabled");
const beforeForbiddenSave=urls.length;
await panel.children[12].onclick();
assert.equal(urls.length,beforeForbiddenSave,"Programmatic viewer save must not make a request");
for(const index of [8,9,10,11]){
 assert.equal(panel.children[index].hidden,true,"Viewer must not see student editing controls");
 assert.equal(panel.children[index].disabled,true,"Viewer student editing controls must be disabled");
}
classInput.value="9";subjectInput.value="Computer";dateInput.value="2083-01-01";
await marks.onclick();
assert.match(result.textContent,/m1/);
await attendance.onclick();
assert.match(result.textContent,/a1/);
assert.match(result.textContent,/2083-01-01/);
assert.doesNotMatch(result.textContent,/2026-04-14/);
const [recordsSelect,recordsButton]=panel.children.slice(6);
recordsSelect.value="students";
await recordsButton.onclick();
assert.match(result.textContent,/student1/);
assert.equal(urls.length,5);
panel.children[8].value="previous-school-student";
panel.children[9].value="Previous Student";
studentClassInput.value="9";
await loadSchools.onclick();
assert.equal(panel.children[8].value,"");
assert.equal(panel.children[9].value,"");
assert.equal(studentClassInput.value,"ECD");
assert.equal(panel.hidden,true);
for(const index of [8,9,10,11])assert.equal(panel.children[index].disabled,true,"School reload must revoke editing");
assert.equal(result.textContent,"","Reloading schools must clear previous tenant results");
assert.equal(panel.children[12].hidden,true,"Reloading schools must disable student writes");
schoolInput.value="school_A001";
await open.onclick();
assert.equal(panel.hidden,false);
const studentId=panel.children[8],studentName=panel.children[9];
studentId.value="s001";studentName.value="Student Example";studentClassInput.value="9";
clear.onclick();
assert.equal(studentId.value,"");
assert.equal(studentName.value,"");
assert.equal(studentClassInput.value,"ECD");
assert.equal(panel.children[12].hidden,true);
assert.equal(panel.hidden,true);
assert.equal(result.textContent,"");
for(const index of [8,9,10,11])assert.equal(panel.children[index].disabled,true,"Clear school must disable editing");
view.clearSession();
assert.equal(panel.hidden,true);
assert.equal(result.textContent,"");
assert.equal(schoolInput.children.length,0);
for(const index of [8,9,10,11])assert.equal(panel.children[index].disabled,true,"Logout must disable editing");
await open.onclick();
assert.equal(panel.hidden,true,"Cannot reopen a school after session clear without reloading memberships");
const afterLogoutRequests=urls.length;
await marks.onclick();
await attendance.onclick();
await recordsButton.onclick();
assert.equal(urls.length,afterLogoutRequests,"Hidden workspace handlers must not request tenant data after logout");
view.dispose();
assert.equal(root.children.length,0);

const adminRoot=new FakeElement("main");
let releaseSave;
const pendingSave=new Promise(resolve=>{releaseSave=resolve;});
let saveRequests=0;
let capturedSaveBody=null;
const adminView=mountV47SchoolWorkspace({
 bsToAd:()=> "2026-04-14",adToBs:()=> "2083-01-01",root:adminRoot,document,
 getIdToken:async()=>"valid",
 fetchImpl:async (url,options)=>{
  if(url.endsWith("/schools"))return {ok:true,json:async()=>({schools:[{schoolId:"school_A001",schoolName:"School A",roles:["school_admin"]}]})};
  if(url.includes("/dashboard?"))return {ok:true,json:async()=>({dashboard:{schoolId:"school_A001",schoolName:"School A",roles:["school_admin"],readOnly:false}})};
  if(url.endsWith("/students/write")){saveRequests++;capturedSaveBody=JSON.parse(options.body);await pendingSave;return {ok:true,json:async()=>({result:{schoolId:"school_A001",studentId:"s001"}})};}
  throw Error("Unexpected admin endpoint: "+url);
 }
});
const [,adminLoad,adminSchool,adminOpen,,,adminPanel]=adminRoot.children;
await adminLoad.onclick();
adminSchool.value="school_A001";
await adminOpen.onclick();
const adminSave=adminPanel.children[12];
assert.equal(adminSave.disabled,false,"Admin can save after authorization");
adminPanel.children[8].value="s001";
adminPanel.children[9].value="Example";
const firstSave=adminSave.onclick();
adminPanel.children[9].value="Changed after click";
const duplicateSave=adminSave.onclick();
assert.equal(adminSave.disabled,true,"Save disabled while request pending");
for(const index of [8,9,10,11])assert.equal(adminPanel.children[index].disabled,true,"Student form locked while save pending");
await duplicateSave;
releaseSave();
await firstSave;
assert.equal(saveRequests,1,"Double-click must submit exactly once");
assert.equal(capturedSaveBody.values.name,"Example","Save must use student fields captured at click time");
assert.equal(adminSave.disabled,false,"Save enabled after completion");
for(const index of [8,9,10,11])assert.equal(adminPanel.children[index].disabled,false,"Authorized student form restored after save");
adminView.dispose();

// An in-flight write must never restore edit permission after logout.
const logoutRoot=new FakeElement("main");
let releaseLogoutSave;
const logoutPending=new Promise(resolve=>{releaseLogoutSave=resolve;});
const logoutView=mountV47SchoolWorkspace({
 bsToAd:()=> "2026-04-14",adToBs:()=> "2083-01-01",root:logoutRoot,document,
 getIdToken:async()=>"valid",
 fetchImpl:async url=>{
  if(url.endsWith("/schools"))return {ok:true,json:async()=>({schools:[{schoolId:"school_A001",schoolName:"School A",roles:["school_admin"]}]})};
  if(url.includes("/dashboard?"))return {ok:true,json:async()=>({dashboard:{schoolId:"school_A001",schoolName:"School A",roles:["school_admin"],readOnly:false}})};
  if(url.endsWith("/students/write")){await logoutPending;return {ok:true,json:async()=>({result:{schoolId:"school_A001",studentId:"s001"}})};}
  throw Error("Unexpected endpoint: "+url);
 }
});
const [,logoutLoad,logoutSchool,logoutOpen,,,logoutPanel]=logoutRoot.children;
await logoutLoad.onclick();logoutSchool.value="school_A001";await logoutOpen.onclick();
logoutPanel.children[8].value="s001";logoutPanel.children[9].value="Example";
const logoutSave=logoutPanel.children[12];
const inFlightSave=logoutSave.onclick();
logoutView.clearSession();
releaseLogoutSave();await inFlightSave;
assert.equal(logoutPanel.hidden,true,"Logout must keep workspace hidden after pending save");
assert.equal(logoutSave.disabled,true,"Pending save must not restore disabled button after logout");
logoutView.dispose();

// School switching must revoke edits before the next dashboard responds.
const switchRoot=new FakeElement("main");
let releaseDashboard;
let dashboardCalls=0;
const delayedDashboard=new Promise(resolve=>{releaseDashboard=resolve;});
const switchView=mountV47SchoolWorkspace({
 bsToAd:()=> "2026-04-14",adToBs:()=> "2083-01-01",root:switchRoot,document,
 getIdToken:async()=>"valid",
 fetchImpl:async url=>{
  if(url.endsWith("/schools"))return {ok:true,json:async()=>({schools:[{schoolId:"school_A001",schoolName:"School A",roles:["school_admin"]}]})};
  if(url.includes("/dashboard?")){
   dashboardCalls++;
   if(dashboardCalls===2)await delayedDashboard;
   return {ok:true,json:async()=>({dashboard:{schoolId:"school_A001",schoolName:"School A",roles:["school_admin"],readOnly:false}})};
  }
  throw Error("Unexpected endpoint: "+url);
 }
});
const [,switchLoad,switchSchool,switchOpen,,,switchPanel]=switchRoot.children;
await switchLoad.onclick();switchSchool.value="school_A001";await switchOpen.onclick();
assert.equal(switchPanel.children[12].disabled,false,"Authorized admin starts with save enabled");
const switching=switchOpen.onclick();
assert.equal(switchPanel.hidden,true,"Switch must hide prior school immediately");
for(const index of [8,9,10,11,12])assert.equal(switchPanel.children[index].disabled,true,"Switch must immediately revoke edit permission");
releaseDashboard();await switching;
switchView.dispose();

// A pending write must remain locked even if a school is reopened.
const pendingRoot=new FakeElement("main");
let releasePendingWrite;
const pendingWrite=new Promise(resolve=>{releasePendingWrite=resolve;});
let pendingWriteCount=0;
const pendingView=mountV47SchoolWorkspace({
 bsToAd:()=> "2026-04-14",adToBs:()=> "2083-01-01",root:pendingRoot,document,
 getIdToken:async()=>"valid",
 fetchImpl:async url=>{
  if(url.endsWith("/schools"))return {ok:true,json:async()=>({schools:[{schoolId:"school_A001",schoolName:"School A",roles:["school_admin"]}]})};
  if(url.includes("/dashboard?"))return {ok:true,json:async()=>({dashboard:{schoolId:"school_A001",schoolName:"School A",roles:["school_admin"],readOnly:false}})};
  if(url.endsWith("/students/write")){pendingWriteCount++;await pendingWrite;return {ok:true,json:async()=>({result:{schoolId:"school_A001",studentId:"s001"}})};}
  throw Error("Unexpected endpoint: "+url);
 }
});
const [,pendingLoad,pendingSchool,pendingOpen,,,pendingPanel]=pendingRoot.children;
await pendingLoad.onclick();pendingSchool.value="school_A001";await pendingOpen.onclick();
pendingPanel.children[8].value="s001";pendingPanel.children[9].value="Example";
const pendingButton=pendingPanel.children[12];
const firstPendingSave=pendingButton.onclick();
await pendingOpen.onclick();
assert.equal(pendingButton.disabled,true,"Reopening school cannot unlock pending student save");
for(const index of [8,9,10,11])assert.equal(pendingPanel.children[index].disabled,true,"Reopening school cannot unlock student fields during pending save");
await pendingButton.onclick();
releasePendingWrite();await firstPendingSave;
assert.equal(pendingWriteCount,1,"Reopening school must not duplicate pending save");
assert.equal(pendingButton.disabled,false,"Save unlocks after pending request settles for authorized school");
for(const index of [8,9,10,11])assert.equal(pendingPanel.children[index].disabled,false,"Authorized student fields unlock after pending save settles");
pendingView.dispose();

console.log("V47 isolated school workspace browser view tests passed");
