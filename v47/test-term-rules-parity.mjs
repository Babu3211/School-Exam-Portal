import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EXAM_TERMS} from './term-catalog.mjs';

const rules=readFileSync(new URL('./firestore.rules',import.meta.url),'utf8');
const literal=terms=>`[${terms.map(t=>`'${t}'`).join(',')}]`;
const expected=literal(EXAM_TERMS);
// Firestore must authorize exactly the same stable term IDs as the app.
const found=[...rules.matchAll(/(?:data\.term in|id in)\s*(\[[^\]]+\])/g)].map(match=>match[1].replace(/\s+/g,''));
assert.ok(found.length>=3,'Expected term guards for marks, exams and component marks');
for(const actual of found)assert.equal(actual,expected,'Firestore and UI term catalog mismatch');
assert.equal(new Set(EXAM_TERMS).size,EXAM_TERMS.length,'Duplicate exam term');
console.log('V47 Firestore exam term parity checks passed');
