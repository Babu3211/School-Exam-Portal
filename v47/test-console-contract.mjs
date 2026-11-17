import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('./admin-console.html',import.meta.url),'utf8');
const script=readFileSync(new URL('./admin-console.mjs',import.meta.url),'utf8');
const ids=[...script.matchAll(/\$\('([A-Za-z][A-Za-z0-9_-]*)'\)/g)].map(x=>x[1]);
for(const id of new Set(ids)) assert.ok(html.includes('id="'+id+'"'),'Missing console element '+id);
assert.ok(script.includes("config.projectId!=='smss-exam-portal-v47'"),'Project isolation guard missing');
assert.ok(html.includes('adminArea')&&script.includes('verifyAdmin()'),'Admin gate missing');
console.log('V47 Super Admin console HTML/script contract passed');
