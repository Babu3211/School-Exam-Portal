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
 root,document,auth,fetchImpl:async()=>({ok:true,json:async()=>({dashboard:{schoolId:"school_A001",schoolName:"A",roles:["viewer"],readOnly:true}})}),
 subscribeAuthState:(_auth,callback)=>{listener=callback;return ()=>{unsubscribed=true;};}
});
const [,schoolInput,open,,status,panel]=root.children;
schoolInput.value="school_A001";
await open.onclick();
assert.equal(panel.hidden,false);
listener(user1);
assert.equal(panel.hidden,false,"Initial same-user notification should not reset");
auth.currentUser=null;
listener(null);
assert.equal(panel.hidden,true);
assert.equal(status.textContent,"Select a school to begin");
auth.currentUser={uid:"user2",getIdToken:async()=>"token2"};
listener(auth.currentUser);
assert.equal(panel.hidden,true);
view.dispose();
assert.equal(unsubscribed,true);
assert.equal(root.children.length,0);
console.log("V47 Firebase workspace logout and user switch tests passed");
