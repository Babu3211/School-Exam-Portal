import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('./marks-entry-console.mjs',import.meta.url),'utf8');
assert.match(source,/if\(attempt!==epoch\)\{if\(loginAuth\.currentUser\?\.uid===credential\.user\.uid\)await authSdk\.signOut\(loginAuth\);return\}/);
assert.match(source,/finally\{lock\(false\)\}\};/,'Cancelled login must release the UI lock');
assert.match(source,/\$\('saveClassMarks'\)\.disabled=true/,'Publish must remain disabled');
assert.match(source,/\$\('save'\)\.disabled=true/,'Individual save must remain disabled');
console.log('V47 marks login cancellation and save-disabled UI source checks passed');
