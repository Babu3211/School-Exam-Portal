import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EXAM_TERMS} from './term-catalog.mjs';

const rules=readFileSync(new URL('./firestore.rules',import.meta.url),'utf8');
const expected=[...EXAM_TERMS];
const parseTerms=source=>[...source.matchAll(/'([^']+)'/g)].map(match=>match[1]);
function verifyTermGuards(source){
 // Explicitly require each independently enforced Firestore entry point.
 const guards=[
  {name:'raw marks',pattern:/function\s+validRawMark\([^)]*\)\s*\{[\s\S]*?data\.term\s+in\s*(\[[^\]]+\])/},
  {name:'exam definitions',pattern:/function\s+validExamTerm\([^)]*\)\s*\{[\s\S]*?\bid\s+in\s*(\[[^\]]+\])/},
  {name:'component marks',pattern:/function\s+validComputerComponent\([^)]*\)\s*\{[\s\S]*?data\.term\s+in\s*(\[[^\]]+\])/},
 ];
 for(const {name,pattern} of guards){
  const match=source.match(pattern);
  assert.ok(match,'Missing Firestore term guard: '+name);
  assert.deepEqual(parseTerms(match[1]),expected,'Term mismatch in '+name);
 }
}
assert.equal(new Set(EXAM_TERMS).size,EXAM_TERMS.length,'Duplicate exam term');
verifyTermGuards(rules);
// Mutation checks prove this test rejects omissions and mismatched term sets.
assert.throws(()=>verifyTermGuards(rules.replace("id in ['weekly', 'monthly', '1st', '2nd', '3rd', 'final']","id in ['1st', '2nd', 'final']")),/Term mismatch/);
assert.throws(()=>verifyTermGuards(rules.replace("function validExamTerm()","function removedExamTerm()")),/Missing Firestore term guard/);
console.log('V47 Firestore exam term parity and mutation checks passed');
