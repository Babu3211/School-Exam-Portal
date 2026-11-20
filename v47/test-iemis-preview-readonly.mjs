import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
for(const name of ['iemis-component-key-preview.mjs','iemis-entry-draft-preview.mjs','iemis-entry-values-preview.mjs','iemis-entry-result-preview.mjs','iemis-draft-inspector.mjs','iemis-class-draft-preview.mjs','iemis-class-ledger-preview.mjs','iemis-grade-ledger-preview.mjs']){
 const code=readFileSync(new URL('./'+name,import.meta.url),'utf8').replace(/^\s*\/\/.*$/gm,'');
 assert.doesNotMatch(code,/\b(?:setDoc|updateDoc|deleteDoc|addDoc|writeBatch|runTransaction|fetch|XMLHttpRequest)\s*\(/,'Read-only preview must not write or request data: '+name);
 assert.doesNotMatch(code,/\b(?:firebase|firestore|indexedDB|localStorage)\b/i,'Preview must not use storage: '+name);
}
console.log('V47 IEMIS preview modules have no database write or storage calls');
