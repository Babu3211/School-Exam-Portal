import assert from 'node:assert/strict';
import {initIdleLogout} from '../idle-logout.js';

const original={DateNow:Date.now,document:globalThis.document,window:globalThis.window,sessionStorage:globalThis.sessionStorage,setInterval:globalThis.setInterval,clearInterval:globalThis.clearInterval};
let clock=1_000_000,intervals=new Map(),sequence=0,stored=new Map(),nodes=new Map(),logouts=0;
const events=new Map();
const documentStub={body:{appendChild(node){nodes.set(node.id,node);}},getElementById(id){return nodes.get(id)||null;},createElement(){return {id:'',style:{},setAttribute(){},remove(){nodes.delete(this.id);}};},addEventListener(type,fn){events.set(type,fn);},removeEventListener(type){events.delete(type);}};
try{
 Date.now=()=>clock;
 globalThis.document=documentStub;
 globalThis.window={addEventListener(){},removeEventListener(){}};
 globalThis.sessionStorage={getItem:k=>stored.get(k)??null,setItem:(k,v)=>stored.set(k,v),removeItem:k=>stored.delete(k)};
 globalThis.setInterval=fn=>{const id=++sequence;intervals.set(id,fn);return id;};
 globalThis.clearInterval=id=>intervals.delete(id);
 const auth={currentUser:{uid:'test-teacher'}};
 const onTimeout=async()=>{logouts++;};
 let session=initIdleLogout({auth,onTimeout,minutes:60});session.start(auth.currentUser);
 assert.equal(stored.get('smss:last-activity:test-teacher'),String(clock),'Starting session must save idle timestamp');
 clock+=54*60*1000;await session.check();assert.equal(logouts,0,'Do not log out before 60 minutes');
 clock+=60*1000;await session.check();assert.ok(nodes.has('smssIdleWarning'),'Warn at 55 minutes');
 session.stop();
 session=initIdleLogout({auth,onTimeout,minutes:60});session.start(auth.currentUser);
 // Refresh preserves the persisted timestamp; re-initialize it for an existing session.
 assert.equal(logouts,0,'Refresh must not log out prematurely');
 clock+=5*60*1000;await session.check();assert.equal(logouts,1,'Log out at 60 minutes without activity');
 assert.equal(stored.has('smss:last-activity:test-teacher'),false,'Expired session must clear stored timestamp');
 // A late first click must not renew an already-expired session.
 clock+=1000;session.start(auth.currentUser);clock+=60*60*1000+1000;
 events.get('pointerdown')?.();await session.check();assert.equal(logouts,2,'Late activity must not bypass expiry');
 console.log('V46 60-minute idle session behavioral regression passed.');
}finally{
 Date.now=original.DateNow;globalThis.document=original.document;globalThis.window=original.window;globalThis.sessionStorage=original.sessionStorage;globalThis.setInterval=original.setInterval;globalThis.clearInterval=original.clearInterval;
}
