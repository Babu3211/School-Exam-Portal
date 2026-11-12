import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
for(const fn of ['refreshEntryExamOptions','refreshLedgerExamOptions']){
 const start=html.indexOf('function '+fn+'(){');
 assert.ok(start>=0,fn+' must exist');
 const body=html.slice(start,html.indexOf('\n}',start)+2);
 assert.match(body,/value=\\"\\$\\{examEsc\\(x\\.id\\)\\}/,'Stored exam ID must remain option value in '+fn);
 assert.match(body,/examEsc\\(englishDisplayText\\(x\\.examName\\)\\)/,'Exam label must display English in '+fn);
 assert.doesNotMatch(body,/updateDoc\\(|setDoc\\(|addDoc\\(/,'Rendering exam labels must never write Firestore');
}
assert.match(html,/function subjectEnglishLabel\\(value\\)/,'Subject English display helper retained');
assert.match(html,/function classEnglishLabel\\(value\\)/,'Class English display helper retained');
console.log('V46 English exam display structural regression passed (no Firestore writes).');
