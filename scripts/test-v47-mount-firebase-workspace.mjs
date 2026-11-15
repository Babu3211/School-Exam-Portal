import assert from "node:assert/strict";
import {mountV47FirebaseWorkspace} from "../src/v47/mount-firebase-workspace.mjs";
class Element {
 constructor(tag){this.tag=tag;this.children=[];this.textContent="";this.value="";this.hidden=false;}
 setAttribute(){}
 append(...children){this.children.push(...children);}
 replaceChildren(...children){this.children=children;}
}
const document={createElement:tag=>new Element(tag)};
const root=new Element("main");
const user1={uid:"user1",getIdToken:async()=>"token1"};
const auth={currentUser:user1};
let listener,unsubscribed=false;
const view=mountV47FirebaseWorkspace({bsToAd:()=> "2026-04-14",adToBs:()=> "2083-01-01",
 root,document,auth,fetchImpl:async url=>({ok:true,json:async()=>url.endsWith("/schools")?{schools:[{schoolId:"school_A001",schoolName:"A",roles:["viewer"]}]}:{dashboard:{schoolId:"school_A001",schoolName:"A",roles:["viewer"],readOnly:true}}}),
 subscribeAuthState:(_auth,callback)=>{listener=callback;return ()=>{unsubscribed=true;};}
});
const [,loadSchools,schoolInput,open,,status,panel]=root.children;
await loadSchools.onclick();
schoolInput.value="school_A001";
await open.onclick();
assert.equal(panel.hidden,false);
listener(user1);
assert.equal(panel.hidden,false,"Initial same-user notification should not reset");
auth.currentUser=null;
listener(null);
assert.equal(panel.hidden,true);
assert.equal(status.textContent,"Load your schools to begin");
auth.currentUser={uid:"user2",getIdToken:async()=>"token2"};
listener(auth.currentUser);
await new Promise(resolve=>setImmediate(resolve));
assert.equal(panel.hidden,true);
assert.equal(schoolInput.children.length,1,"New user should automatically load authorized schools");
assert.equal(schoolInput.children[0].value,"school_A001");
view.dispose();
assert.equal(unsubscribed,true);
assert.equal(root.children.length,0);
// Pending school list must not reappear after logout.
let releaseList,startedList;
const listStarted=new Promise(resolve=>{startedList=resolve;});
const anotherRoot=new Element("main");
const anotherAuth={currentUser:null};
let anotherListener;
const anotherView=mountV47FirebaseWorkspace({
 bsToAd:()=> "2026-04-14",adToBs:()=> "2083-01-01",
 root:anotherRoot,document,auth:anotherAuth,
 fetchImpl:async url=>{
  if(url.endsWith("/schools")){
   startedList();
   return new Promise(resolve=>{releaseList=resolve;});
  }
  throw Error("Unexpected request");
 },
 subscribeAuthState:(_auth,callback)=>{anotherListener=callback;return ()=>{};}
});
anotherAuth.currentUser={uid:"another",getIdToken:async()=>"token"};
anotherListener(anotherAuth.currentUser);
await listStarted;
anotherAuth.currentUser=null;
anotherListener(null);
releaseList({ok:true,json:async()=>({schools:[{schoolId:"school_A001",schoolName:"A",roles:["viewer"]}]})});
await new Promise(resolve=>setImmediate(resolve));
assert.equal(anotherRoot.children[2].children.length,0,"Logout must not restore stale school options");
assert.equal(anotherRoot.children[5].textContent,"Load your schools to begin");
anotherView.dispose();
console.log("V47 Firebase workspace logout and user switch tests passed");
