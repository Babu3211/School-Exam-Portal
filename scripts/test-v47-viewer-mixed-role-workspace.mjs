import assert from "node:assert/strict";
import {createV47SchoolWorkspace} from "../src/v47/school-workspace-controller.mjs";
import {mountV47SchoolWorkspace} from "../src/v47/school-workspace-view.mjs";
let writes=0;
const fetchImpl=async url=>{
 if(url.endsWith("/schools"))return {ok:true,json:async()=>({schools:[{schoolId:"school_A001",schoolName:"A",roles:["school_admin","viewer"]}]})};
 if(url.includes("/dashboard?"))return {ok:true,json:async()=>({dashboard:{schoolId:"school_A001",schoolName:"A",roles:["school_admin","viewer"],readOnly:true}})};
 if(url.includes("/students/write")){writes++;throw Error("Write must not be called");}
 throw Error("Unexpected endpoint: "+url);
};
const params={getIdToken:async()=> "token",fetchImpl};
const controller=createV47SchoolWorkspace(params);
await controller.selectSchool("school_A001");
await assert.rejects(controller.saveStudent({studentId:"s001",mode:"create",values:{name:"Test",className:"9"}}),/School admin required/);
assert.equal(writes,0);
class Element{constructor(tag){this.tag=tag;this.children=[];this.value="";this.hidden=false;this.textContent="";}setAttribute(){}append(...items){this.children.push(...items);}replaceChildren(...items){this.children=items;}}
const root=new Element("main");
const view=mountV47SchoolWorkspace({...params,root,document:{createElement:tag=>new Element(tag)},bsToAd:()=> "2026-04-14",adToBs:()=> "2083-01-01"});
const [,load,select,open,,,,]=root.children;
await load.onclick();select.value="school_A001";await open.onclick();
const panel=root.children[6];
const save=panel.children.at(-1);
assert.equal(save.hidden,true);
assert.equal(writes,0);
view.dispose();
console.log("V47 mixed-role viewer cannot save via controller or browser view");
