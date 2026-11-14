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
clear.onclick();
assert.equal(panel.hidden,true);
assert.equal(result.textContent,"");
view.dispose();
assert.equal(root.children.length,0);
console.log("V47 isolated school workspace browser view tests passed");
