import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('./school-admin-console.mjs',import.meta.url),'utf8');
assert.match(source,/loggingIn=true;\$\('login'\)\.disabled=true;\$\('logout'\)\.disabled=false;/,'Allow logout during pending login');
assert.match(source,/sessionEpoch\+\+;actor=null;\$\('schoolArea'\)\.hidden=true;\$\('logout'\)\.disabled=true;/,'Logout invalidates pending login');
assert.match(source,/if\(current!==sessionEpoch&&loginAuth\.currentUser\?\.uid===uid\)await authSdk\.signOut\(loginAuth\);return/,'Stale school details must not keep auth signed in');
assert.match(source,/finally\{loggingIn=false;\$\('login'\)\.disabled=false;if\(!actor\)\$\('logout'\)\.disabled=true\}/,'Login completion restores controls');
console.log('V47 school admin pending login cancellation source checks passed');
