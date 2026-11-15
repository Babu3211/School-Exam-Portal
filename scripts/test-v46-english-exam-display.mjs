import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
for (const fn of ['refreshEntryExamOptions','refreshLedgerExamOptions']) {
 const start=html.indexOf('function '+fn+'(){');
 assert.ok(start>=0,fn+' must exist');
 const end=html.indexOf('\n}',start);
 assert.ok(end>start,fn+' function boundary must exist');
 const body=html.slice(start,end+2);
 assert.ok(body.includes('value="${examEsc(x.id)}"'),'Stored exam ID must remain option value in '+fn);
 assert.ok(body.includes('examEsc(englishDisplayText(x.examName))'),'Exam label must display English in '+fn);
 for(const mutation of ['updateDoc(', 'setDoc(', 'addDoc(', 'deleteDoc(']){
  assert.ok(!body.includes(mutation),'Rendering exam labels must not mutate Firestore: '+fn);
 }
}
assert.ok(html.includes('function subjectEnglishLabel(value)'),'Subject English display helper retained');
assert.ok(html.includes('function classEnglishLabel(value)'),'Class English display helper retained');
console.log('V46 English exam display structural regression passed (no Firestore writes).');
