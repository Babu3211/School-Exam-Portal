import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {grade9EconomicsPracticeBank,grade9AccountingPracticeBank} from './grade9-economics-accounting-original-practice.mjs';
import {isQuestionReadyForLanguage} from './cdc-question-autogen.mjs';
const register=JSON.parse(readFileSync(new URL('./cdc-grade9-source-register-pinned.json',import.meta.url),'utf8'));
for(const [bank,subject,evidence,field,count] of [[grade9EconomicsPracticeBank,'Economics','economicsTextReview','areas',6],[grade9AccountingPracticeBank,'Office Operation and Accounting','accountingTextReview','units',15]]){
 const source=register.sources.find(s=>s[evidence])[evidence],p=bank({grade:9,subject});
 assert.deepEqual(p.units.map(u=>u.unitTitle.split(' / ')[0]),source[field].map(r=>r[0]));
 assert.equal(p.units.length,count);assert.equal(p.questions.length,count*(subject==='Economics'?4:3));
 assert.ok(p.questions.every(q=>['ne','en','both'].every(l=>isQuestionReadyForLanguage(q,l))));
 assert.ok(p.questions.every(q=>q.teacherReviewRequired&&!q.officialCdcQuestion));
 assert.equal(p.exactGridVerified,false);
 assert.throws(()=>bank({grade:10,subject}));
}
console.log('PASS source-pinned Economics and Accounting original 69 bilingual practice questions; no exact Grid claim');
