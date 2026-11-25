import assert from 'node:assert/strict';
import {createModuleActivityTracker} from './module-activity-tracker.mjs';
const schoolId='12345',uid='test-teacher',member={schoolId,uid,role:'teacher',active:true};
let timestamp=100000,visible=true,current=true,active=true,reads=0,writes=0;
const store=new Map(),storage={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},auth={currentUser:{uid}};
const api={doc:(_db,...p)=>p.join('/'),serverTimestamp:()=>Symbol.for('server'),
 getDocFromServer:async path=>{reads++;return {exists:()=>true,data:()=>path==='schools/'+schoolId?{id:schoolId,active:true}:{...member,active}}},
 setDoc:async(path,data)=>{writes++;assert.equal(path,'schools/'+schoolId+'/dashboard_activity/'+uid);assert.deepEqual(data,{schoolId,uid,lastSeen:Symbol.for('server')})}};
const make=()=>createModuleActivityTracker({db:{},api,auth,storage,visible:()=>visible,now:()=>timestamp});
let tracker=make();
assert.equal(await tracker.note(),false);assert.equal(reads,0);
tracker.bind(member,()=>current);
assert.equal(await tracker.note(),true);assert.equal(writes,1);assert.equal(reads,2);
tracker=make();tracker.bind(member,()=>current);
assert.equal(await tracker.note(),false,'Throttle persists across module navigation');
timestamp+=15*60*1000;visible=false;assert.equal(await tracker.note(),false);assert.equal(reads,2);
visible=true;current=false;assert.equal(await tracker.note(),false);
current=true;auth.currentUser={uid:'other'};assert.equal(await tracker.note(),false);
auth.currentUser={uid};active=false;assert.equal(await tracker.note(),false);assert.equal(writes,1);
timestamp+=15*60*1000;active=true;assert.equal(await tracker.note(),true);assert.equal(writes,2);
tracker.clear();timestamp+=15*60*1000;assert.equal(await tracker.note(),false);
assert.throws(()=>tracker.bind({...member,active:false},()=>true));
console.log('PASS module activity: verified membership, navigation throttle, no hidden/revoked/stale writes');
