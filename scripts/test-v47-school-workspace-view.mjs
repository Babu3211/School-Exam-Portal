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
await loadSchools.onclick();
schoolInput.value="school_A001";
await open.onclick();
assert.equal(panel.hidden,false);
assert.match(status.textContent,/School A/);
const [classInput,subjectInput,dateInput,marks,attendance,result]=panel.children;
const studentClassInput=panel.children[10];
const expectedClasses=["ECD",...Array.from({length:12},(_,i)=>String(i+1))];
assert.deepEqual(classInput.children.map(option=>option.value),expectedClasses);
assert.deepEqual(studentClassInput.children.map(option=>option.value),expectedClasses);
assert.equal(panel.children[9]["aria-label"],"Student name in English");
assert.equal(panel.children[12].hidden,true,"Viewer must never see Save student");
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
view.clearSession();
assert.equal(panel.hidden,true);
assert.equal(result.textContent,"");
assert.equal(schoolInput.children.length,0);
await open.onclick();
assert.equal(panel.hidden,true,"Cannot reopen a school after session clear without reloading memberships");
view.dispose();
assert.equal(root.children.length,0);
console.log("V47 isolated school workspace browser view tests passed");
