import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('./attendance-console.mjs',import.meta.url),'utf8');
const marker='authSdk.onAuthStateChanged(auth,';
const start=source.indexOf(marker),end=source.indexOf(");$('connect').disabled",start);
assert.ok(start>=0&&end>start,'Attendance must react to shared Firebase auth changes');
const callback=source.slice(start+marker.length,end);
assert.match(callback,/user\.uid!==actor\.uid/);
assert.match(source,/if\(freshSignIn&&signedUid&&auth\?\.currentUser\?\.uid===signedUid\)await authSdk\.signOut\(auth\)/,
 'A failed attendance school authorization must not log out an existing dashboard user');
assert.match(source,/store=createSchoolStore\(\{db,api,member:actor,schoolId,assertSession:/);

function fixture(){
 const buttons=Object.fromEntries(['save','bulkSave','logout'].map(id=>[id,{disabled:false}]));
 const state={cleared:0,message:''};
 const ctx={actor:{uid:'verified123'},clear:()=>{state.cleared++;ctx.actor=null},
  status:value=>{state.message=value},
  $:id=>{assert.ok(buttons[id],'Unknown UI control: '+id);return buttons[id]}
 };
 return {callback:new Function('ctx','with(ctx){return '+callback+';}')(ctx),state,buttons};
}
{
 const f=fixture();f.callback({uid:'verified123'});
 assert.equal(f.state.cleared,0);assert.equal(f.buttons.save.disabled,false);
}
for(const user of [null,{uid:'other456'}]){
 const f=fixture();f.callback(user);
 assert.equal(f.state.cleared,1,'Sign-out or account swap must clear verified attendance');
 for(const key of ['save','bulkSave','logout'])
  assert.equal(f.buttons[key].disabled,true,'Attendance action '+key+' must lock');
 assert.match(f.state.message,/Login परिवर्तन/);
}
console.log('V47 attendance shared-session invalidation: same user retained, logout and account swap safely clear read/write UI');
