import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PUBLIC_DOMAIN_SEEN_PROSE as data} from '../cdc-grade9-english-seen-prose-data.mjs';
import {grade9EnglishReferenceBank} from '../cdc-grade9-english-reference-bank.mjs';
import {planGrade9EnglishReferencePaper as plan} from '../cdc-grade9-english-grouped-planner.mjs';
import {assertGrade9ExamPaperMatches} from '../cdc-grade9-paper-grid-guard.mjs';
assert.equal(data.length,2,'Both original excerpts must be retrieved before this dedicated test passes');
for(const row of data){
 assert.equal(row.wordCount,row.passage.trim().split(/\s+/).length);
 assert.ok(row.wordCount>=150&&row.wordCount<=250);
 assert.equal(createHash('sha256').update(row.passage).digest('hex'),row.sha256);
 assert.ok(["https://giwmscdntwo.gov.np/media/pdf_upload/5.%20Reduced-class%209%20English%20final_5hjggyv.pdf","https://learning.cehrd.gov.np/moodle/pluginfile.php/188/mod_resource/content/2/English%20grade%209.pdf","https://moecdc.gov.np/storage/gallery/1688289325.pdf"].includes(row.sourceUrl));
 assert.ok([108,109].includes(row.sourcePage));
}
const grade=9,subject='English',pack=grade9EnglishReferenceBank({grade,subject});
const args={grade,subject,questions:pack.questions,selectedTopicIds:[...new Set(pack.questions.map(q=>q.topicId))],allowOriginalReferenceDraft:true,rng:()=>.37};
const a=plan(args);
assert.equal(a.ready,true,a.reason);assert.equal(a.paper.groups.length,10);
assert.equal(a.paper.groups.reduce((s,q)=>s+q.marks,0),75);
assert.equal(a.paper.groups.slice(0,4).reduce((s,q)=>s+q.items.length,0),40);
assert.equal(a.paper.referenceOnly,true);assert.equal(a.readyForLive,false);
const b=plan({...args,previousSignature:a.signature,rng:()=>.63});
assert.equal(b.ready,true,b.reason);assert.notEqual(b.signature,a.signature);
assert.equal(plan({...args,allowOriginalReferenceDraft:false}).ready,false);
assert.throws(()=>assertGrade9ExamPaperMatches(a.paper),/verified subject/);
console.log('PASS two complete 75-mark English reference papers with original seen text, 40 reading items, distinct signatures; official exam remains blocked');
