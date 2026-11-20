import assert from 'node:assert/strict';
import {installIdleLogout} from './idle-logout.mjs';
let clock=0,callback=null,cleared=0,expired=0;const listeners=new Map();
const target={addEventListener:(n,fn)=>listeners.set(n,fn),removeEventListener:n=>listeners.delete(n)};
const stop=installIdleLogout({target,timeoutMs:3600000,now:()=>clock,setTimer:fn=>{callback=fn;return 1},clearTimer:()=>{cleared++},onTimeout:()=>{expired++}});
assert.equal(listeners.size,3);clock=3599000;listeners.get('keydown')();clock=7198000;callback();assert.equal(expired,0);clock=7199000;callback();await Promise.resolve();assert.equal(expired,1);assert.equal(listeners.size,0);stop();assert.ok(cleared>0);
assert.throws(()=>installIdleLogout({target,timeoutMs:0,onTimeout:()=>{}}));
console.log('V47 inactivity logout checks passed');
