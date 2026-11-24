/** Grade 9 English skill-based planner based on official CDC Grades 9–10
 * chart, printed pp. 1–2, visually checked 2026-11-24.
 * The PDF's model is Grade 10. A third-party Grade 9 2079 model uses a
 * different grammar split; the official chart takes precedence.
 * This is a read-only reference planner, not a school release approval.
 */
import {cdcSubjectKey} from './cdc-grid-source-index.mjs';
import {auditEnglishChart} from './cdc-grade9-english-practice.mjs';
export const ENGLISH_CHART_MIRROR='https://moecdc.gov.np/storage/gallery/1686038677.pdf';
export const GRADE9_2079_MODEL_REFERENCE='https://www.devprasadpandit.com.np/2022/07/model-question-grade-9-2079-cdc.html';
const str=x=>String(x??'').trim();
const norm=x=>str(x).normalize('NFC').toLowerCase().replace(/\s+/g,' ');
const readingTypes=['true_false','gap_fill','mcq','matching','ordering','short_answer'];
const domains=['literal','reorganization','inference','evaluation','vocabulary'];
const targetCounts={literal:16,reorganization:8,inference:8,evaluation:3,vocabulary:5};
const transform=['tense','question_tag','reported_speech','voice','wh_question','negation'];
const grammar=['articles','prepositions','tense','question_tag','voice','reported_speech','connectives','conditional','agreement','causatives','modals','adjectives_adverbs','relative_pronouns'];
const readingGenres3=['story','notice','advertisement','product_guide','letter','news_story','brochure','instructions','manual','diary','interview','recipe'];
const readingGenres4=['biography','autobiography','essay','newspaper_article','magazine_article','science_article','book_review','film_review','travelogue','editorial','report','blog'];
const writingGenres=[
 ['paragraph','chart','table','diagram','instructions','recipe','advertisement','notice','rules'],
 ['news_story','story','condolence','congratulations','invitation','thank_you_letter','biography'],
 ['paragraph','leave_application','job_application','dialogue'],
 ['letter','official_letter','letter_to_editor','email','essay','diary','newspaper_article','book_review','film_review']
];
const slotNames=['reading1','reading2','reading3','reading4','writing1','writing2','writing3','writing4','transformation','contextual_mcq'];
const cleanEnglish=x=>!!str(x)&&/[A-Za-z]/.test(x)&&!/\p{Script=Devanagari}/u.test(x);
const sourceOK=q=>q.sourceKind==='textbook'&&str(q.sourceTitle)&&str(q.sourceEdition)&&Number.isSafeInteger(q.sourcePage)&&q.sourcePage>0&&/^https:\/\/(?:www\.|lib\.)?moecdc\.gov\.np\/|^https:\/\/giwmscdn(?:one|two)\.gov\.np\//i.test(str(q.sourceUrl));
const fourOptions=q=>Array.isArray(q.options)&&q.options.length===4&&q.options.every(cleanEnglish)&&new Set(q.options.map(norm)).size===4&&['A','B','C','D'].includes(q.correctOption)&&norm(q.answer)===norm(q.options['ABCD'.indexOf(q.correctOption)]);
// The chart says "about" a word count, not a precise tolerance. ±25% is an
// explicit SMSS editorial filter, not an additional claimed CDC rule.
const nearWords=(s,n)=>{const count=str(s).split(/\s+/).filter(Boolean).length;return count>=Math.ceil(n*.75)&&count<=Math.floor(n*1.25);};
function slotOK(q,i,subject,topics,chart,allowDraft=false){
 const reviewed=q?.reviewStatus==='teacher_reviewed'&&str(q.reviewedBy);
 const draft=allowDraft&&i>=2&&q?.bundled===true&&q?.reviewStatus==='draft'&&q?.teacherReviewRequired===true&&q?.sourceStatus==='SMSS_original_reference_draft'&&q?.officialCdcQuestion===false;
 if(!q||q.gradeNumber!==9||str(q.subject)!==str(subject)||q.slot!==slotNames[i]||!str(q.id)||!topics.has(q.topicId)||q.status==='archived'||(!reviewed&&!draft)||!cleanEnglish(q.text))return false;
 if(i<4){
  const r=chart.reading[i],items=q.items;
  if(q.marks!==r.marks||!cleanEnglish(q.passage)||!nearWords(q.passage,r.words)||!str(q.genre)||!Array.isArray(items)||items.length!==r.marks||
   (r.seen?!sourceOK(q):q.sourceKind!=='original_unseen')||
   (i===2&&!readingGenres3.includes(q.genre))||(i===3&&!readingGenres4.includes(q.genre)))return false;
  const types=new Set(items.map(x=>x?.type));
  if(types.size!==r.types||[...types].some(t=>!readingTypes.includes(t)))return false;
  if(!items.every(x=>x&&x.marks===1&&cleanEnglish(x.text)&&str(x.answer)&&domains.includes(x.domain)&&
   (x.domain!=='vocabulary'||i===3)&&
   (x.type!=='mcq'||fourOptions(x))))return false;
  if(i===3&&items.filter(x=>x.domain==='vocabulary').length!==5)return false;
  return true;
 }
 if(i<8){const w=chart.writing[i-4];return q.marks===w.marks&&q.targetWords===w.words&&writingGenres[i-4].includes(q.genre)&&cleanEnglish(q.answer);}
 if(i===8)return q.marks===6&&Array.isArray(q.items)&&q.items.length===6&&
  transform.every(t=>q.items.filter(x=>x.grammar===t).length===1)&&q.items.every(x=>x.marks===1&&cleanEnglish(x.text)&&cleanEnglish(x.answer));
 return q.marks===5&&cleanEnglish(q.passage)&&Array.isArray(q.items)&&q.items.length===10&&
  q.items.every(x=>x.marks===.5&&grammar.includes(x.grammar)&&str(x.text)&&fourOptions(x))&&
  q.items.every((_,j)=>q.passage.includes('{'+(j+1)+'}'));
}
function paperCompatible(groups){
 const reading=groups.slice(0,4);
 const types=q=>new Set(q.items.map(x=>x.type).filter(t=>t!=='short_answer'));
 for(const [a,b] of [[0,1],[2,3]])if([...types(reading[a])].some(t=>types(reading[b]).has(t)))return false;
 if(new Set(reading.map(q=>norm(q.passage))).size!==4)return false;
 const counts=Object.fromEntries(domains.map(d=>[d,0]));
 for(const q of reading)for(const x of q.items)counts[x.domain]++;
 if(domains.some(d=>counts[d]!==targetCounts[d]))return false;
 if(groups.slice(4,8).some(w=>reading.some(r=>r.genre===w.genre)))return false;
 return true;
}
const signature=groups=>groups.map(q=>str(q.id)).sort().join('|');
function shuffled(pool,rng){const a=[...pool];for(let i=a.length-1;i>0;i--){const v=rng();if(!Number.isFinite(v)||v<0||v>=1)throw Error('Invalid random source');const j=Math.floor(v*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function planGrade9EnglishReferencePaper({grade,subject,fullMarks=75,durationMinutes=180,questions=[],selectedTopicIds=[],previousSignature='',avoidSignatures=[],rng=Math.random,maxVisits=100000,allowOriginalReferenceDraft=false}={}){
 const chart=auditEnglishChart({grade,subject});
 if(!chart||cdcSubjectKey(subject)!=='english'||fullMarks!==75||durationMinutes!==180)throw Error('Grade 9 English 75-mark 180-minute chart required');
 if(!Array.isArray(questions)||questions.length>5000||!Array.isArray(selectedTopicIds)||!Array.isArray(avoidSignatures)||avoidSignatures.length>30||avoidSignatures.some(x=>typeof x!=='string')||!Number.isSafeInteger(maxVisits)||maxVisits<1||maxVisits>200000)throw Error('Invalid reference bank or history');
 const topics=new Set(selectedTopicIds.filter(x=>typeof x==='string'&&x.trim()));
 const slots=slotNames.map((slot,i)=>({slot,i,pool:questions.filter(q=>slotOK(q,i,subject,topics,chart,allowOriginalReferenceDraft))}));
 const shortages=slots.filter(s=>!s.pool.length).map(s=>s.slot);
 const no=(reason)=>({ready:false,reason,shortages,currentCdcExactApproved:false,readyForLive:false});
 if(shortages.length||!topics.size)return no('Missing reviewed English groups; no partial paper generated');
 if(topics.size>10)return no('Selected topics exceed the ten grouped slots');
 const ordered=shuffled(slots,rng).sort((a,b)=>a.pool.length-b.pool.length);
 const groups=new Array(10),used=new Set(),texts=new Set(),banned=new Set([previousSignature,...avoidSignatures].filter(Boolean));
 let visits=0;
 const search=step=>{
  if(++visits>maxVisits)throw Error('English reference search exceeded safe limit');
  if(step===ordered.length)return [...topics].every(t=>groups.some(q=>q.topicId===t))&&!banned.has(signature(groups))&&paperCompatible(groups);
  const {i,pool}=ordered[step];
  for(const q of shuffled(pool,rng)){const id=str(q.id),text=norm(q.text);if(used.has(id)||texts.has(text))continue;used.add(id);texts.add(text);groups[i]=q;if(search(step+1))return true;groups[i]=undefined;used.delete(id);texts.delete(text);}
  return false;
 };
 if(!search(0))return no('No complete distinct paper satisfies the comprehension distribution, formats, genres and selected topics');
 return {ready:true,paper:{gradeNumber:9,subject,fullMarks,durationMinutes,language:'en',referenceOnly:true,groups:structuredClone(groups)},signature:signature(groups),referenceStructureMatched:true,currentCdcExactApproved:false,teacherReviewRequired:true,readyForLive:false,sourceUrl:chart.sourceUrl,referenceOnly:true};
}
