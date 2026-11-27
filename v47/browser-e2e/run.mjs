// Real Chromium DOM + Firebase Auth/Firestore emulators, no production network.
// Only the Firebase project configuration and emulator SDK wiring are substituted
// on the intercepted test HTTP responses. The deployed source is never changed.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {createV47ApiServer} from '../../src/v47/node-api-server.mjs';
import {once} from 'node:events';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {excelWorkbook} from '../excel-workbook.mjs';
import {todayAssessmentDate2083} from '../assessment-date-2083.mjs';
import {v46LowerMathReference} from '../primary-assessment-v46-lower-math.mjs';
import {v46SeroferoThemeRows} from '../primary-assessment-v46-serofero-text.mjs';
import {v46LowerLanguageReference} from '../primary-assessment-v46-lower-language.mjs';
import {v46LanguageHealthThemeRows} from '../primary-assessment-v46-language-health-text.mjs';
import {v46SocialThemeRows} from '../primary-assessment-v46-social-text.mjs';
import {v46ScienceThemeRows} from '../primary-assessment-v46-science-text.mjs';
import {V46_STAFF_EXCEL_HEADERS} from '../v46-staff-excel-schema.mjs';
import {createV47StaticHandler} from '../../v47-runtime/static-handler.mjs';

const projectId='demo-smss-v47-browser';
if(process.env.GCLOUD_PROJECT!==projectId||process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8081'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099')
 throw Error('Refuse browser E2E without exact synthetic project and local emulators');
const requireAdmin=createRequire(new URL('../../v47-runtime/package.json',import.meta.url));
const {initializeApp,deleteApp}=requireAdmin('firebase-admin/app');
const {getAuth}=requireAdmin('firebase-admin/auth');
const {getFirestore}=requireAdmin('firebase-admin/firestore');
const app=initializeApp({projectId},'browser-emulator-only');
const admin=getAuth(app),db=getFirestore(app);
const password='Synthetic-Test-Only-47!';
const schools=[{sid:'11111001',name:'Alpha Synthetic School',student:'Alpha Student',accounts:[['alpha-admin','school_admin'],['alpha-viewer','viewer'],['alpha-teacher','teacher']]},{sid:'22222002',name:'Beta Synthetic School',student:'Beta Student',accounts:[['beta-admin','school_admin']]}];
const sha=s=>createHash('sha256').update(s).digest('hex');
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const email=uid=>uid+'@example.invalid';
const root=resolve('v47/dist');
const temp=await mkdtemp(resolve('.v47-browser-sdk-'));
let browser,server;
try{
 // All Auth accounts and documents are synthetic, isolated emulator data.
 for(const school of schools){
  const {sid,name,student,accounts}=school,base='schools/'+sid;
  await db.doc(base).set({id:sid,iemisCode:sid,name,active:true});
  for(const [uid,role] of accounts){
   await admin.createUser({uid,email:email(uid),password});
   await db.doc(base+'/members/'+uid).set({uid,schoolId:sid,role,active:true});
  }
  await db.doc(base+'/students/s1').set({schoolId:sid,class:'1',active:true,nameEnglish:student});
  await db.doc(base+'/subjects/math').set({schoolId:sid,class:'1',name:'Mathematics',creditHour:4,active:true});
  const scope={schoolId:sid,classId:'1',subjectId:'math',examId:'final'},components=[
   {key:'count',name:'No. of Learning Achievement',fullMarks:5},
   {key:'got',name:'Obtained Learning Achievement',fullMarks:20}];
  await db.doc(base+'/mark_settings/1_math_final').set({...scope,id:'1_math_final',active:true,components});
  const entries=[{studentId:'s1',isAbsent:false,values:{count:5,got:18},totalObtained:23}];
  const contentDigest=sha(JSON.stringify(canonical([{index:0,count:1,firstStudentId:'s1',lastStudentId:'s1',entries}])));
  const settingsDigest=sha(JSON.stringify(canonical({...scope,components})));
  const common={...scope,publicationId:'pub_browser_'+sid,digest:sha(sid),contentDigest,settingsDigest,rosterCount:1};
  const key=sha(JSON.stringify(['1','math','final']));
  const batch=db.batch();
  batch.set(db.doc(base+'/official_marks_pointers/'+key),common);
  batch.set(db.doc(base+'/official_read_views/'+key),{...common,format:'smss-v47-official-read-view-v1',entries});
  await batch.commit();
 }
 await admin.createUser({uid:'platform-admin',email:email('platform-admin'),password});
 await db.doc('v47_super_admins/platform-admin').set({active:true});
 // Real pinned Firebase SDK, bundled as three entry modules with shared chunks.
 // No CDN network is needed. Emulator connections happen before SDK operations.
 const sources={
  'firebase-app.js':"export * from 'firebase/app';",
  'firebase-auth.js':"export * from 'firebase/auth'; import {getAuth as actual,connectAuthEmulator} from 'firebase/auth'; const seen=new WeakSet(); export function getAuth(app){const auth=actual(app);if(!seen.has(auth)){connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});seen.add(auth)}return auth}",
  'firebase-firestore.js':"export * from 'firebase/firestore'; import {getFirestore as actual,connectFirestoreEmulator} from 'firebase/firestore'; const seen=new WeakSet(); export function getFirestore(app){const db=actual(app);if(!seen.has(db)){connectFirestoreEmulator(db,'127.0.0.1',8081);seen.add(db)}return db}"
 };
 for(const [name,source] of Object.entries(sources))await writeFile(join(temp,name),source);
 const out=join(temp,'out');
 await build({entryPoints:Object.keys(sources).map(name=>join(temp,name)),outdir:out,bundle:true,splitting:true,format:'esm',platform:'browser',target:'es2022',logLevel:'warning'});
 // Privileged routes are enabled ONLY in this exact loopback synthetic test,
 // never in the production runtime or static Hosting configuration.
 server=createV47ApiServer({auth:admin,firestore:db,publicationEnabled:true,staticHandler:await createV47StaticHandler(root)});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true});
 const cdn='https://www.gstatic.com/firebasejs/11.10.0/';
 const fixtureConfig="export const V47_FIREBASE_CONFIG=Object.freeze("+JSON.stringify({apiKey:'fake-api-key',authDomain:'demo-smss-v47-browser.firebaseapp.com',projectId,appId:'1:123:web:synthetic'})+");";
 async function newSession(){
  const context=await browser.newContext({serviceWorkers:'block',acceptDownloads:true,viewport:{width:1280,height:800}});
  // Explicit allowlist: no production Firebase, CDN, maps, or other network.
  await context.route('**/*',async route=>{
   const url=route.request().url();
   if(url.startsWith(cdn)){
    const name=url.slice(cdn.length);
    if(!/^[A-Za-z0-9_-]+\.js$/.test(name))return route.abort();
    return route.fulfill({status:200,contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:await readFile(join(out,name))});
   }
   if(url===origin+'/v47-firebase-config.mjs')return route.fulfill({contentType:'application/javascript',body:fixtureConfig});
   if([origin+'/school-firebase-client.mjs',origin+'/admin-console.mjs',origin+'/first-admin-account.mjs'].includes(url)){
    const source=await readFile(join(root,new URL(url).pathname.slice(1)),'utf8');
    return route.fulfill({contentType:'application/javascript',body:source.replaceAll('smss-exam-portal-v47',projectId)});
   }
   if(url.startsWith(origin+'/')||url.startsWith('http://127.0.0.1:8081/')||url.startsWith('http://127.0.0.1:9099/'))return route.continue();
   return route.abort();
  });
  const page=await context.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  return {context,page,errors};
 }
 const wait=async(page,fn,arg)=>page.waitForFunction(fn,arg,{timeout:30000});
 async function login(page,sid,uid,success=true,studentCount='1',loginEmail=email(uid)){
  await page.goto(origin+'/');
  await wait(page,()=>!document.getElementById('dashboardLogin').disabled);
  assert.equal(await page.locator('#verifiedSidebar').isVisible(),false);
  assert.equal(await page.locator('#verifiedDashboard').isVisible(),false);
  assert.equal(await page.locator('#dashboardConnect').isVisible(),false);
  assert.equal(await page.locator('#dashboardLoginFields').isVisible(),true);
  await page.locator('#dashboardSchool').fill(sid);
  await page.locator('#dashboardEmail').fill(loginEmail);
  await page.locator('#dashboardPassword').fill(password);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,'Login must fit viewport');
  await page.locator('#dashboardLogin').click();
  if(success){
   await wait(page,s=>document.getElementById('schoolIdentity').textContent.includes(s),sid);
   await wait(page,()=>!document.getElementById('dashboardMetricCards').hidden);
   assert.equal(await page.locator('[data-metric="students"]').textContent(),studentCount);
   assert.equal(await page.locator('#dashboardPassword').inputValue(),'');
   assert.equal(await page.locator('#dashboardLoginFields').isVisible(),false);
   assert.equal(await page.locator('#verifiedSidebar').isVisible(),true);
   assert.equal(await page.locator('#verifiedDashboard').isVisible(),true);
   assert.equal(await page.locator('[data-post-release]:visible').count(),0);
   assert.equal(await page.locator('[data-post-release][aria-disabled="true"][tabindex="-1"]').count(),3);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,'Dashboard must fit viewport');
  }else{
   await wait(page,()=>document.getElementById('dashboardStatus').textContent.includes('Login असफल'));
   assert.equal(await page.locator('#schoolIdentity').textContent(),'विद्यालय प्रमाणित भएको छैन।');
   assert.equal(await page.locator('[data-school-module][aria-disabled="false"]').count(),0);
  }
 }
 async function report(page,school,role){
  await page.goto(origin+'/grade-ledger.html?schoolId='+school.sid);
  await wait(page,()=>!document.getElementById('login').disabled);
  // Same verified session; no password is entered again.
  await page.locator('#login').click();
  await wait(page,()=>!document.getElementById('reportArea').hidden);
  assert.match(await page.locator('#verifiedLabel').textContent(),new RegExp(role));
  // Playwright's generic isDisabled() does not classify native OPTION as a
  // supported disabled control. Assert the actual HTMLOptionElement state.
  assert.equal(await page.locator('#reportSource option[value="draft"]').evaluate(option=>option.disabled),role!=='school_admin','Private Draft option must be disabled for '+role);
  if(role!=='school_admin'){
   const denied=await page.locator('#reportSource').evaluate(select=>{
    const draft=select.querySelector('option[value="draft"]');
    return draft.disabled&&draft.matches(':disabled');
   });
   assert.equal(denied,true,'Native disabled Draft option for '+role);
  }
  await page.locator('#term').selectOption('final');
  await page.locator('#reportSource').selectOption('sparkCommitted');
  await page.locator('#load').click();
  await wait(page,()=>!document.getElementById('ledgerArea').hidden);
  const text=await page.locator('#gradeOutput').textContent();
  assert.ok(text.includes(school.student));assert.ok(!text.includes(school.sid===schools[0].sid?schools[1].student:schools[0].student));
  await wait(page,()=>!document.getElementById('printSheet').disabled);
  assert.match(await page.frameLocator('#sheetFrame').locator('body').textContent(),/NOT VALID FOR OFFICIAL USE/);
  assert.equal(await page.locator('#gradeOutput tbody tr td').last().textContent(),'4.00');
  const sheetBody=page.frameLocator('#sheetFrame').locator('body');
  assert.match(await sheetBody.textContent(),/GPA: 4\.00/);
  const watermark=await page.frameLocator('#sheetFrame').locator('.sheet').evaluate(el=>({repeat:getComputedStyle(el,':before').backgroundRepeat,adjust:getComputedStyle(el,':before').printColorAdjust}));
  assert.equal(watermark.repeat,'repeat');assert.equal(watermark.adjust,'exact');
  const downloadPromise=page.waitForEvent('download',{timeout:30000});
  await page.locator('#exportExcel').click();const download=await downloadPromise;
  assert.match(download.suggestedFilename(),/UNAPPROVED-.*\.xlsx$/);
  const bytes=await readFile(await download.path());assert.equal(bytes.subarray(0,2).toString(),'PK');
  await page.locator('#logout').click();await wait(page,()=>document.getElementById('reportArea').hidden);
  assert.equal(await page.locator('#gradeOutput').textContent(),'');
 }
 // Real first teacher draft, original marks prefill, save, reload and Admin transfer.
 {
  const school=schools[0],sid=school.sid,root='schools/'+sid,teacherUid='alpha-teacher';
  const duty=root+'/teacher_assignments/'+sid+':'+teacherUid+':1:math';
  const legacy=root+'/marks/legacy_math_s1';
  const teacherDraft=root+'/teacher_mark_drafts/'+teacherUid+'/class_drafts/1_math_final';
  const adminDraft=root+'/class_mark_drafts/1_math_final';
  await db.doc(duty).set({uid:teacherUid,schoolId:sid,classId:'1',subjectId:'math',active:true});
  const original={schoolId:sid,class:'1',term:'final',termKey:'annual',examId:'final',academicYear:'2083',subjectId:'math',subject:'Mathematics',studentId:'s1',isAbsent:false,scores:[{name:'No. of Learning Achievement',fullMarks:5,obtained:5},{name:'Full Marks',fullMarks:20,obtained:null},{name:'Obtained Learning Achievement',fullMarks:20,obtained:18}],totalFullMarks:20,totalObtained:18};
  await db.doc(legacy).set(original);
  const teacherSession=await newSession();
  try{
   const {page,errors}=teacherSession;
   page.on('console',msg=>{if(msg.type()==='error'||msg.type()==='warning')console.log('Synthetic teacher browser:',msg.text().slice(0,1500))});
   await page.goto(origin+'/teacher-assigned-class.html?schoolId='+sid);
   await wait(page,()=>!document.getElementById('login').disabled);
   await page.locator('#email').fill(email(teacherUid));await page.locator('#password').fill(password);
   await page.locator('#login').click();await wait(page,()=>!document.getElementById('work').hidden);
   await page.locator('#classId').selectOption('1');await page.locator('#loadAssignments').click();
   await wait(page,()=>Array.from(document.getElementById('subjectId').options).some(o=>o.value==='math'));
   await page.locator('#subjectId').selectOption('math');await page.locator('#draftTerm').selectOption('final');
   await page.locator('#loadTeacherDraft').click();
   await wait(page,()=>document.querySelectorAll('#teacherDraftRows tr').length===1||document.getElementById('teacherDraftStatus').textContent.includes('खोल्न सकिएन'));
   assert.equal(await page.locator('#teacherDraftRows tr').count(),1,'Teacher draft load: '+await page.locator('#teacherDraftStatus').textContent()+'; browser errors: '+errors.join('; '));
   assert.equal(await page.locator('#teacherDraftRows input[data-component="count"]').inputValue(),'5');
   assert.equal(await page.locator('#teacherDraftRows input[data-component="got"]').inputValue(),'18');
   await page.locator('#inspectTeacherDraft').click();
   page.once('dialog',d=>d.accept());await page.locator('#saveTeacherDraft').click();
   await wait(page,()=>document.getElementById('teacherDraftStatus').textContent.includes('Revision 1 सुरक्षित'));
   assert.equal((await db.doc(teacherDraft).get()).data().revision,1);
   await page.locator('#loadTeacherDraft').click();
   await wait(page,()=>document.getElementById('teacherDraftStatus').textContent.includes('Draft Revision 1 सुरक्षित'));
   assert.equal(await page.locator('#teacherDraftRows input[data-component="got"]').inputValue(),'18');
   assert.deepEqual(errors,[]);
   // Real assessment UI served from the actual V47 Hosting output.
   await page.goto(origin+'/primary-assessment.html?schoolId='+sid);
   await wait(page,()=>!document.getElementById('teacherWorksheet').hidden||document.getElementById('status').textContent.includes('पुनः खोल्नुहोस्'));
   assert.equal(await page.locator('#teacherWorksheet').isVisible(),true,await page.locator('#status').textContent());
   await page.locator('#teacherGrade').selectOption('1');
   await page.locator('#teacherLoadSubjects').click();
   await wait(page,()=>Array.from(document.getElementById('teacherSubject').options).some(o=>o.value==='math'));
   await page.locator('#teacherSubject').selectOption('math');
   await page.locator('#teacherOpenWorksheet').click();
   await wait(page,()=>!document.getElementById('teacherSaveDraft').disabled);
   assert.equal(await page.locator('#teacherDate').inputValue(),todayAssessmentDate2083(),'Default must use Nepal-local academic year date');
   const theme=v46LowerMathReference('1')[0];
   const ratings=page.locator('#teacherDraftRows select');
   assert.equal(await ratings.count(),theme.count);
   await ratings.first().selectOption('3');
   // Invalid date must allow immediate correction, not discard the draft.
   await page.locator('#teacherDate').fill('2083-08-30');
   await page.locator('#teacherSaveDraft').click();
   assert.equal(await page.locator('#teacherSaveDraft').isEnabled(),true);
   assert.match(await page.locator('#teacherDraftSaveStatus').textContent(),/YYYY-MM-DD/);
   await page.locator('#teacherDate').fill('2083-08-10');
   await page.locator('#teacherSaveDraft').click();
   await wait(page,()=>document.getElementById('teacherDraftSaveStatus').textContent.includes('Revision 1 सुरक्षित भयो'));
   const themeId=sha(JSON.stringify(['ad2e3b96a22601fed9d956397a98c564b3ffb768','1',theme.theme,theme.sourceRows]));
   const draftPath=root+'/teacher_assessment_drafts/'+teacherUid+'/classes/1/subjects/math/students/s1/themes/'+themeId;
   const saved=(await db.doc(draftPath).get()).data();
   assert.equal(saved.ratings,'3'+'_'.repeat(theme.count-1));
   assert.equal(saved.date,'2083-08-10');
   assert.equal(saved.revision,1);
   await page.reload();
   await wait(page,()=>!document.getElementById('teacherWorksheet').hidden);
   await page.locator('#teacherGrade').selectOption('1');
   await page.locator('#teacherLoadSubjects').click();
   await wait(page,()=>Array.from(document.getElementById('teacherSubject').options).some(o=>o.value==='math'));
   await page.locator('#teacherSubject').selectOption('math');
   await page.locator('#teacherOpenWorksheet').click();
   await wait(page,()=>document.getElementById('teacherDraftSaveStatus').textContent.includes('Revision 1 पुनः लोड भयो'));
   assert.equal(await ratings.first().inputValue(),'3');
   assert.equal(await page.locator('#teacherDate').inputValue(),'2083-08-10');
   assert.deepEqual((await db.doc(legacy).get()).data(),original);
   assert.equal((await db.doc(draftPath.replace(sid,schools[1].sid)).get()).exists,false);
   assert.deepEqual(errors,[]);
   await db.doc(draftPath).delete();
   console.log('PASS browser assessment reference asset, assigned Mathematics date/score save, invalid-date correction, reload and isolation');
   // Independent Grade 4 and 5 Science draft tests, synthetic fixtures only.
   for(const [grade,count,kind] of [['4',5,'science'],['5',6,'science'],['4',4,'social'],['5',4,'social'],['4',6,'nepali'],['5',6,'nepali'],['4',7,'english'],['5',7,'english'],['4',5,'health'],['5',5,'health']]){
    const subjectId=kind+grade,studentId=kind+'_student_'+grade;
    const subjectPath=root+'/subjects/'+subjectId,studentPath=root+'/students/'+studentId;
    const assignmentPath=root+'/teacher_assignments/'+[sid,teacherUid,grade,subjectId].join(':');
    const subjectKey=kind==='health'?'healthphysicalcreativeart':kind;
    const themeName=kind==='science'?'वैज्ञानिक सिकाइ':kind==='social'?'हामी र हाम्रो समुदाय':({"4":{"nepali":"क्षेत्र १ — कविता (नीतिपरक)","english":"Unit 1: Greetings, introductions and goodbyes","healthphysicalcreativeart":"व्यक्तिगत स्वच्छता"},"5":{"nepali":"क्षेत्र १ — कविता (गीत/देशप्रेम)","english":"Unit 1: Introductions and goodbyes","healthphysicalcreativeart":"व्यक्तिगत स्वच्छता"}})[grade][subjectKey];
    const sourceRows=kind==='science'?v46ScienceThemeRows(grade,themeName,count):kind==='social'?v46SocialThemeRows(grade,themeName,count):v46LanguageHealthThemeRows(grade,subjectKey,themeName,count);
    assert.equal(sourceRows.length,count);
    const scienceThemeId=sha(JSON.stringify(['ad2e3b96a22601fed9d956397a98c564b3ffb768',grade,themeName,sourceRows]));
    const sciencePath=root+'/teacher_assessment_drafts/'+teacherUid+'/classes/'+grade+'/subjects/'+subjectId+'/students/'+studentId+'/themes/'+scienceThemeId;
    try{
     await db.doc(subjectPath).set({schoolId:sid,class:grade,name:({science:'Science and Technology',social:'सामाजिक अध्ययन',nepali:'नेपाली',english:'English',health:'Health Physical Education and Creative Arts'})[kind],active:true});
     await db.doc(studentPath).set({schoolId:sid,class:grade,nameEnglish:'Synthetic '+kind+' '+grade,active:true});
     await db.doc(assignmentPath).set({schoolId:sid,uid:teacherUid,classId:grade,subjectId,active:true});
     const openScience=async()=>{
      await page.locator('#teacherGrade').selectOption(grade);
      await page.locator('#teacherLoadSubjects').click();
      await wait(page,id=>Array.from(document.getElementById('teacherSubject').options).some(o=>o.value===id),subjectId);
      await page.locator('#teacherSubject').selectOption(subjectId);
      await page.locator('#teacherOpenWorksheet').click();
      await wait(page,()=>!document.getElementById('teacherSaveDraft').disabled);
     };
     await openScience();
     assert.equal(await page.locator('#teacherStudent').inputValue(),studentId);
     assert.equal(await ratings.count(),count);
     assert.ok((await page.locator('#teacherDraftRows tr').first().textContent()).includes(sourceRows[0].titleEn??sourceRows[0].title));
     assert.equal(await page.locator('#teacherDate').inputValue(),todayAssessmentDate2083());
     await ratings.first().selectOption('4');
     await page.locator('#teacherDate').fill('2083-08-11');
     await page.locator('#teacherSaveDraft').click();
     await wait(page,()=>document.getElementById('teacherDraftSaveStatus').textContent.includes('Revision 1 सुरक्षित भयो'));
     const scienceSaved=(await db.doc(sciencePath).get()).data();
     assert.equal(scienceSaved.format,'smss-v47-primary-'+kind+'-draft-v1');
     assert.equal(scienceSaved.ratings,'4'+'_'.repeat(count-1));
     assert.equal(scienceSaved.date,'2083-08-11');
     assert.equal(scienceSaved.revision,1);
     await page.reload();
     await wait(page,()=>!document.getElementById('teacherWorksheet').hidden);
     await openScience();
     assert.match(await page.locator('#teacherDraftSaveStatus').textContent(),/Revision 1 पुनः लोड भयो/);
     assert.equal(await ratings.first().inputValue(),'4');
     assert.equal(await page.locator('#teacherDate').inputValue(),'2083-08-11');
     await ratings.last().selectOption('2');
     await page.locator('#teacherSaveDraft').click();
     await wait(page,()=>document.getElementById('teacherDraftSaveStatus').textContent.includes('Revision 2 सुरक्षित भयो'));
     const updated=(await db.doc(sciencePath).get()).data();
     assert.equal(updated.revision,2);
     assert.equal(updated.ratings,'4'+'_'.repeat(count-2)+'2');
     assert.equal((await db.doc(sciencePath.replace(sid,schools[1].sid)).get()).exists,false);
     assert.deepEqual((await db.doc(legacy).get()).data(),original);
     assert.deepEqual(errors,[]);
     console.log('PASS browser '+kind+' assessment draft Grade '+grade+': source rows, date, save, reload, update and isolation');
    }finally{
     await Promise.all([sciencePath,assignmentPath,studentPath,subjectPath].map(p=>db.doc(p).delete()));
    }
   }
   // Lower-language stages must be independent and never overwrite migrated evidence.
   for(const grade of ['1','2','3'])for(const kind of ['nepali','english','serophero']){
    const subjectId='lower_'+kind+grade,studentId='lower_'+kind+'_student_'+grade;
    const subjectPath=root+'/subjects/'+subjectId,studentPath=root+'/students/'+studentId;
    const assignmentPath=root+'/teacher_assignments/'+[sid,teacherUid,grade,subjectId].join(':');
    const binary=kind==='serophero',blocks=({1:5,2:6,3:6})[grade];
    const themes=binary?[{theme:'म र मेरो परिवार',count:blocks*4,sourceRows:v46SeroferoThemeRows(grade,'म र मेरो परिवार',blocks)}]:v46LowerLanguageReference(grade,kind),themeIndex=themes.findIndex(t=>t.sourceRows?.length===(binary?t.count/4:t.count));
    assert.ok(themeIndex>=0,'Mapped lower-language theme required');
    const theme=themes[themeIndex],count=theme.count;
    const rowDateInputs=page.locator('#teacherDraftRows .assessment-row-date');
    const draftPaths=Object.fromEntries(['regular','support'].map(stage=>[stage,root+'/teacher_assessment_drafts/'+teacherUid+'/classes/'+grade+'/subjects/'+subjectId+'/students/'+studentId+'/themes/'+sha(JSON.stringify(['ad2e3b96a22601fed9d956397a98c564b3ffb768',grade,theme.theme,theme.sourceRows,stage]))]));
    try{
     await db.doc(subjectPath).set({schoolId:sid,class:grade,name:kind==='nepali'?'नेपाली':kind==='serophero'?'हाम्रो सेरोफेरो':'English',active:true});
     await db.doc(studentPath).set({schoolId:sid,class:grade,nameEnglish:'Synthetic lower '+kind+' '+grade,active:true});
     await db.doc(assignmentPath).set({schoolId:sid,uid:teacherUid,classId:grade,subjectId,active:true});
     const openLower=async()=>{
      await page.locator('#teacherGrade').selectOption(grade);
      await page.locator('#teacherLoadSubjects').click();
      await wait(page,id=>Array.from(document.getElementById('teacherSubject').options).some(o=>o.value===id),subjectId);
      await page.locator('#teacherSubject').selectOption(subjectId);
      await page.locator('#teacherOpenWorksheet').click();
      await wait(page,id=>Array.from(document.getElementById('teacherStudent').options).some(o=>o.value===id),studentId);
      await page.locator('#teacherStudent').selectOption(studentId);
      await page.locator('#teacherTheme').selectOption(String(themeIndex));
      await wait(page,()=>!document.getElementById('teacherSaveDraft').disabled);
     };
     await openLower();
     assert.equal(await page.locator('#teacherStage').isVisible(),true);
     assert.equal(await ratings.count(),count);
     assert.equal(await rowDateInputs.count(),binary?count/4:count);
     const headings=await page.locator('#teacherDraftHead').textContent();
     assert.ok(headings.includes(binary?'उपलब्धि सूचक':kind==='nepali'?'परीक्षण गर्ने पक्ष':'Areas / Skills'));
     assert.equal(await page.locator('#teacherDraftHead [data-assessment-stage]').count(),2);
     assert.equal(await page.locator('#teacherDraftHead [data-assessment-stage=regular]').getAttribute('class'),'assessment-active-stage');
     if(binary){assert.equal(await page.locator('#teacherDraftRows .assessment-block-score').count(),count/4);assert.equal(await page.locator('#teacherDraftRows .assessment-block-score').first().textContent(),'—');
      for(let i=0;i<4;i++)await ratings.nth(i).selectOption('0');
      assert.equal(await page.locator('#teacherDraftRows .assessment-block-score').first().textContent(),'० / ४');
      for(let i=0;i<4;i++)await ratings.nth(i).selectOption('1');
      assert.equal(await page.locator('#teacherDraftRows .assessment-block-score').first().textContent(),'४ / ४');
      for(let i=0;i<4;i++)await ratings.nth(i).selectOption('');
     }
     assert.equal(await page.locator('#teacherDate').inputValue(),todayAssessmentDate2083());
     assert.ok((await page.locator('#teacherDraftRows tr').first().textContent()).includes(theme.sourceRows[0].title));
     for(const [stage,score,date] of [['regular',binary?'0':'2','2083-08-11'],['support',binary?'1':'4','2083-08-12']]){
      await page.locator('#teacherStage').selectOption(stage);
      await wait(page,()=>!document.getElementById('teacherSaveDraft').disabled);
      assert.equal(await ratings.first().inputValue(),'');
      await ratings.first().selectOption(score);
      await page.locator('#teacherDate').fill(date);
      await rowDateInputs.first().fill(stage==='regular'?'2083-08-09':'2083-08-10');
      await page.locator('#teacherSaveDraft').click();
      await wait(page,()=>document.getElementById('teacherDraftSaveStatus').textContent.includes('Revision 1 सुरक्षित भयो'));
      const d=(await db.doc(draftPaths[stage]).get()).data();
      assert.equal(d.format,'smss-v47-primary-lower-'+kind+'-'+stage+'-draft-v1');
      assert.equal(d.ratings,score+'_'.repeat(count-1));assert.equal(d.date,date);assert.equal(d.revision,1);
      assert.equal(d.rowDates,(stage==='regular'?'2083-08-09':'2083-08-10')+date.repeat((binary?count/4:count)-1));
      assert.equal((await db.doc(draftPaths[stage].replace(sid,schools[1].sid)).get()).exists,false);
     }
     await page.reload();
     await wait(page,()=>!document.getElementById('teacherWorksheet').hidden);
     await openLower();
     assert.equal(await ratings.first().inputValue(),binary?'0':'2');
     assert.equal(await rowDateInputs.first().inputValue(),'2083-08-09');
     assert.equal(await page.locator('#teacherDate').inputValue(),'2083-08-11');
     const peerText=await page.locator('#teacherDraftRows .assessment-peer-value').allTextContents();
     assert.ok(peerText.includes('2083-08-10'));assert.ok(peerText.includes(binary?'सकेको':kind==='nepali'?'४':'4'));
     await page.locator('#teacherStage').selectOption('support');
     await wait(page,()=>!document.getElementById('teacherSaveDraft').disabled);
     assert.equal(await ratings.first().inputValue(),binary?'1':'4');
     assert.equal(await rowDateInputs.first().inputValue(),'2083-08-10');
     assert.equal(await page.locator('#teacherDate').inputValue(),'2083-08-12');
     const regularText=await page.locator('#teacherDraftRows .assessment-peer-value').allTextContents();
     assert.ok(regularText.includes('2083-08-09'));assert.ok(regularText.includes(binary?'नसकेको':kind==='nepali'?'२':'2'));
     assert.equal(await page.locator('#teacherDraftHead [data-assessment-stage=support]').getAttribute('class'),'assessment-active-stage');
     if(grade==='1'){
      for(const [button,ext] of [['teacherDraftWord','docx'],['teacherDraftExcel','xlsx']]){
       const dl=page.waitForEvent('download',{timeout:30000});await page.locator('#'+button).click();const file=await dl;assert.ok(file.suggestedFilename().endsWith('.'+ext));
       const bytes=await readFile(await file.path());assert.equal(bytes.subarray(0,2).toString(),'PK');assert.ok(bytes.toString().includes('2083-08-09'));assert.ok(bytes.toString().includes('2083-08-10'));
      }
     }
     assert.deepEqual((await db.doc(legacy).get()).data(),original);
     assert.deepEqual(errors,[]);
     console.log('PASS lower-language staged draft '+grade+' '+kind+': separate date, scores, reload and school isolation');
    }finally{await Promise.all([...Object.values(draftPaths),assignmentPath,studentPath,subjectPath].map(p=>db.doc(p).delete()));}
   }
  }finally{await teacherSession.context.close()}
  const adminSession=await newSession();
  try{
   const {page,errors}=adminSession;
   await page.goto(origin+'/teacher-draft-review.html?schoolId='+sid);
   await wait(page,()=>!document.getElementById('login').disabled);
   await page.locator('#email').fill(email('alpha-admin'));await page.locator('#password').fill(password);
   await page.locator('#login').click();await wait(page,()=>!document.getElementById('reviewArea').hidden);
   await page.locator('#teacherUid').fill(teacherUid);await page.locator('#classId').selectOption('1');
   await page.locator('#subjectId').fill('math');await page.locator('#examId').selectOption('final');
   await page.locator('#review').click();await wait(page,()=>!document.getElementById('copyDraft').disabled);
   page.once('dialog',d=>d.accept());await page.locator('#copyDraft').click();
   await wait(page,()=>document.getElementById('reviewStatus').textContent.includes('नयाँ Admin Draft सुरक्षित भयो'));
   assert.equal((await db.doc(adminDraft).get()).data().revision,1);
   assert.equal((await db.doc(teacherDraft).get()).data().revision,1);
   assert.deepEqual((await db.doc(legacy).get()).data(),original);
   assert.equal((await db.doc('schools/'+schools[1].sid+'/class_mark_drafts/1_math_final').get()).exists,false);
   assert.deepEqual(errors,[]);
   // Real School Admin session and saved Draft flow through the same-origin
   // authenticated review, staging, and atomic publication API. No mock HTTP.
   const pointerId=sha(JSON.stringify(['1','math','final']));
   const pointerPath=root+'/official_marks_pointers/'+pointerId;
   const previous=(await db.doc(pointerPath).get()).data();
   const otherPointer='schools/'+schools[1].sid+'/official_marks_pointers/'+pointerId;
   const otherBefore=(await db.doc(otherPointer).get()).data();
   await page.goto(origin+'/marks-entry.html?schoolId='+sid);
   await wait(page,()=>!document.getElementById('work').hidden);
   await page.locator('#schoolClass').selectOption('1');
   await page.locator('#term').selectOption('final');
   await page.locator('#loadSubjects').click();
   await wait(page,()=>Array.from(document.getElementById('subjectId').options).some(o=>o.value==='math'));
   await page.locator('#subjectId').selectOption('math');
   await page.locator('#loadClassMarks').click();
   await wait(page,()=>!document.getElementById('serverReviewMarks').disabled);
   assert.match(await page.locator('#classDraftStatus').textContent(),/Revision 1 restored/);
   // Unsaved UI edits must not become published marks.
   await page.locator('#classMarkRows input[data-field="got"]').fill('1');
   const dialogs=[];
   const approve=async d=>{dialogs.push(d.message());await d.accept()};
   page.on('dialog',approve);
   try{
    await page.locator('#serverReviewMarks').click();
    await wait(page,()=>{const s=document.getElementById('serverPublicationStatus').textContent;return /Marks committed|blocked|not confirmed/.test(s)});
   }finally{page.off('dialog',approve)}
   assert.match(await page.locator('#serverPublicationStatus').textContent(),/Marks committed/);
   assert.equal(dialogs.length,2,'Separate stage and final confirmation required');
   const pointer=(await db.doc(pointerPath).get()).data();
   assert.notEqual(pointer.publicationId,previous.publicationId);
   assert.equal(pointer.rosterCount,1);
   const [header,audit,view]=await Promise.all([
    db.doc(root+'/official_marks_publications/'+pointer.publicationId).get(),
    db.doc(root+'/official_marks_audit/'+pointer.publicationId).get(),
    db.doc(root+'/official_read_views/'+pointerId).get()
   ]);
   assert.equal(header.data().state,'committed');
   assert.equal(header.data().previousPublicationId,previous.publicationId);
   assert.equal(audit.data().approvedBy,'alpha-admin');
   assert.equal(view.data().publicationId,pointer.publicationId);
   assert.equal(view.data().entries[0].values.got,18,'Only persisted revision is published');
   assert.deepEqual((await db.doc(otherPointer).get()).data(),otherBefore);
   assert.deepEqual((await db.doc(legacy).get()).data(),original);
   assert.equal((await db.doc(teacherDraft).get()).data().revision,1);
   assert.equal((await db.doc(adminDraft).get()).data().revision,1);
   assert.deepEqual(errors,[]);
   console.log('PASS real browser Admin Draft to authenticated API stage and commit; atomic pointer, audit, saved revision, original data and second school verified');
  }finally{await adminSession.context.close()}
  // Leave other existing emulator tests' fixtures unchanged.
  await Promise.all([duty,legacy,teacherDraft,adminDraft,root+'/dashboard_activity/'+teacherUid].map(path=>db.doc(path).delete()));
  console.log('PASS real browser migrated marks prefill, first teacher draft Save, reload and Admin transfer; original marks unchanged');
 }
 // A direct Attendance login must register verified activity without visiting Dashboard.
 {
  const {context,page,errors}=await newSession();
  try{
   const school=schools[0],uid='alpha-teacher',activityPath='schools/'+school.sid+'/dashboard_activity/'+uid;
   assert.equal((await db.doc(activityPath).get()).exists,false);
   await page.goto(origin+'/attendance.html?schoolId='+school.sid);
   await wait(page,()=>!document.getElementById('login').disabled);
   await page.locator('#schoolId').fill(school.sid);
   await page.locator('#email').fill(email(uid));
   await page.locator('#password').fill(password);
   await page.locator('#login').click();
   await wait(page,()=>!document.getElementById('work').hidden);
   let activity;
   for(let attempt=0;attempt<100;attempt++){activity=await db.doc(activityPath).get();if(activity.exists)break;await new Promise(r=>setTimeout(r,100))}
   assert.equal(activity.exists,true,'Direct module login must record activity');
   assert.equal(activity.data().schoolId,school.sid);assert.equal(activity.data().uid,uid);
   assert.equal((await db.doc('schools/'+schools[1].sid+'/dashboard_activity/'+uid).get()).exists,false);
   const first=activity.data().lastSeen.toMillis();
   await page.locator('#date').click();
   assert.equal((await db.doc(activityPath).get()).data().lastSeen.toMillis(),first);
   assert.deepEqual(errors,[]);
  }finally{await context.close()}
  console.log('PASS direct Attendance activity with verified tenant and throttled heartbeat');
 }
 for(const [school,uid,role] of [[schools[0],'alpha-admin','school_admin'],[schools[0],'alpha-viewer','viewer'],[schools[0],'alpha-teacher','teacher'],[schools[1],'beta-admin','school_admin']]){
  const {context,page,errors}=await newSession();
  try{
   if(role==='viewer')await page.setViewportSize({width:375,height:812});
   await login(page,school.sid,uid);
   if(role!=='school_admin')assert.equal(await page.locator('[data-required-role="school_admin"][aria-disabled="false"]').count(),0);
   await report(page,school,role);assert.deepEqual(errors,[]);
   // After report logout, returning to the dashboard must not restore any menu.
   await page.goto(origin+'/');
   await wait(page,()=>!document.getElementById('dashboardLogin').disabled);
   assert.equal(await page.locator('#verifiedDashboard').isVisible(),false);
   assert.equal(await page.locator('#verifiedSidebar').isVisible(),false);
   console.log('PASS browser school/report/logout for '+uid+' ('+role+')');
  }finally{await context.close()}
 }
 for(const [sid,uid] of [[schools[1].sid,'alpha-viewer'],[schools[0].sid,'beta-admin']]){
  const {context,page,errors}=await newSession();try{await login(page,sid,uid,false);assert.deepEqual(errors,[])}finally{await context.close()}
 }
 // Verify actual Attendance page, default Nepal date, roster name and Viewer read-only controls.
 for(const [school,uid,role] of [[schools[0],'alpha-admin','school_admin'],[schools[0],'alpha-viewer','viewer'],[schools[1],'beta-admin','school_admin']]){
  const {context,page,errors}=await newSession();
  try{
   await login(page,school.sid,uid);
   await page.goto(origin+'/attendance.html?schoolId='+school.sid);
   await wait(page,()=>!document.getElementById('work').hidden);
   const expectedDate=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kathmandu',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
   assert.equal(await page.locator('#date').inputValue(),expectedDate);
   await page.locator('#schoolClass').selectOption('1');
   await page.locator('#rosterLoad').click();
   await wait(page,()=>document.querySelectorAll('#rosterRows tr').length===1);
   const roster=await page.locator('#rosterRows').textContent();
   assert.ok(roster.includes(school.student));assert.ok(!roster.includes(school.sid===schools[0].sid?schools[1].student:schools[0].student));
   assert.equal(await page.locator('#writeArea').isVisible(),role==='school_admin');
   assert.equal(await page.locator('#bulkArea').isVisible(),role==='school_admin');
   assert.equal(await page.locator('#teacherBulkArea').isVisible(),false);
   assert.equal(await page.locator('#rosterRows select').count(),role==='school_admin'?1:0);
   if(role==='viewer')assert.match(roster,/Read only/);
   assert.deepEqual(errors,[]);
  }finally{await context.close()}
 }
 console.log('PASS Attendance school-scoped roster, English student name, Nepal date and Viewer read-only browser controls');
 // School Admin provisions an isolated Auth account, then grants membership
 // via the existing inactive transaction. No platform role or foreign school.
 {
  const {context,page,errors}=await newSession();
  try{
   await login(page,schools[0].sid,'alpha-admin');
   await page.goto(origin+'/school-admin.html?schoolId='+schools[0].sid);
   await wait(page,()=>!document.getElementById('schoolArea').hidden);
   await page.locator('#newMemberAccount summary').click();
   const newEmail=email('alpha-new-viewer');
   await page.locator('#role').selectOption('viewer');
   await page.locator('#newMemberEmail').fill(newEmail);
   await page.locator('#newMemberPassword').fill(password);
   page.once('dialog',dialog=>dialog.accept());await page.locator('#createMemberAccount').click();
   await wait(page,()=>document.getElementById('memberUid').value.length>=6&&!document.getElementById('add').disabled);
   const newUid=await page.locator('#memberUid').inputValue();
   assert.equal((await admin.getUserByEmail(newEmail)).uid,newUid);
   assert.equal(await page.locator('#newMemberPassword').inputValue(),'');
   const membership=db.doc('schools/'+schools[0].sid+'/members/'+newUid);
   assert.equal((await membership.get()).exists,false);
   page.once('dialog',dialog=>dialog.accept());await page.locator('#add').click();
   const row=page.locator('#members tr').filter({hasText:newUid});await row.waitFor({state:'visible'});
   assert.deepEqual((await membership.get()).data(),{uid:newUid,schoolId:schools[0].sid,role:'viewer',active:false});
   const before=await newSession();try{await login(before.page,schools[0].sid,newUid,false,'1',newEmail)}finally{await before.context.close()}
   page.once('dialog',dialog=>dialog.accept());await row.getByRole('button',{name:'Activate',exact:true}).click();
   await wait(page,uid=>Array.from(document.querySelectorAll('#members tr')).some(r=>r.textContent.includes(uid)&&r.textContent.includes('Deactivate')),newUid);
   const after=await newSession();try{await login(after.page,schools[0].sid,newUid,true,'1',newEmail)}finally{await after.context.close()}
   const foreign=await newSession();try{await login(foreign.page,schools[1].sid,newUid,false,'1',newEmail)}finally{await foreign.context.close()}
   assert.equal((await db.doc('v47_super_admins/'+newUid).get()).exists,false);
   assert.equal((await db.doc('schools/'+schools[1].sid+'/members/'+newUid).get()).exists,false);
   assert.deepEqual(errors,[]);
   console.log('PASS School Admin isolated Viewer account, inactive membership, activation, tenant denial');
  }finally{await context.close()}
 }
 // Real question-paper generator and actual DOCX download, no Firestore saves.
 {
  const {context,page,errors}=await newSession();
  try{
   await login(page,schools[0].sid,'alpha-admin');
   await page.goto(origin+'/question-paper.html?schoolId='+schools[0].sid);
   await wait(page,()=>!document.getElementById('login').disabled);
   await page.locator('#login').click();
   await wait(page,()=>document.querySelectorAll('#grade9GridLibrary details').length===11);
   await page.locator('#generateComputer').click();
   await wait(page,()=>!document.getElementById('downloadPracticeDocx').disabled);
   const frame=page.frameLocator('#paperFrame');
   assert.match(await frame.locator('body').textContent(),/NOT AN OFFICIAL CDC QUESTION PAPER/);
   assert.equal(await frame.locator('main.sheet > ol > li').count(),25);
   const d1=page.waitForEvent('download',{timeout:30000});await page.locator('#downloadPracticeDocx').click();const file1=await d1;
   assert.match(file1.suggestedFilename(),/^UNREVIEWED-Class-9-Practice\.docx$/);
   const bytes1=await readFile(await file1.path());assert.equal(bytes1.subarray(0,2).toString(),'PK');
   assert.ok(bytes1.includes(Buffer.from('NOT AN OFFICIAL CDC QUESTION PAPER')));
   assert.ok(bytes1.includes(Buffer.from('w:orient="landscape"')));
   assert.ok(bytes1.includes(Buffer.from('w:num="2"')));
   await page.locator('#generateMathPractice').click();
   await wait(page,()=>!document.getElementById('downloadPracticeDocx').disabled);
   assert.match(await frame.locator('body').textContent(),/NOT AN OFFICIAL CDC QUESTION PAPER/);
   assert.match(await frame.locator('body').textContent(),/75/);
   const d2=page.waitForEvent('download',{timeout:30000});await page.locator('#downloadPracticeDocx').click();const file2=await d2;
   const bytes2=await readFile(await file2.path());assert.equal(bytes2.subarray(0,2).toString(),'PK');
   assert.ok(bytes2.includes(Buffer.from('NOT AN OFFICIAL CDC QUESTION PAPER')));
   assert.ok(bytes2.includes(Buffer.from('w:num="2"')));
   // Actual per-subject language controls and original curriculum generation.
   for(const [key,lang,subject] of [['science','both','Science and Technology'],['social','ne','Social Studies'],['math','both','Compulsory Mathematics'],['environment','both','Environmental Science'],['nepali','ne','Nepali'],['english','en','English'],['economics','both','Economics'],['accounting','both','Office Operation and Accounting'],['health','both','Health and Physical Education']]){
    await page.locator('#grade9CurriculumSubject').selectOption(key);
    await page.locator('#grade9CurriculumLanguage').selectOption(lang);
    const topics=page.locator('#grade9CurriculumTopics input:not([disabled])');
    assert.ok(await topics.count()>0);
    await topics.first().check();
    await page.locator('#grade9CurriculumMarks').fill('1');
    assert.equal(await page.locator('#generateGrade9Curriculum').isDisabled(),false,'Attainable one-mark selection: '+key+' '+await page.locator('#grade9CurriculumCapacity').textContent());
    await page.locator('#grade9CurriculumMarks').fill('75');
    assert.equal(await page.locator('#generateGrade9Curriculum').isDisabled(),true,'Impossible marks must remain blocked: '+key);
    await page.locator('#grade9CurriculumMarks').fill('1');
    await page.locator('#generateGrade9Curriculum').click();
    await wait(page,()=>!document.getElementById('downloadPracticeDocx').disabled);
    assert.equal(await frame.locator('main.sheet > ol > li').count(),1);
    const displaySubject=lang==='ne'?({social:'सामाजिक अध्ययन',nepali:'नेपाली'}[key]||subject):subject;
    assert.ok((await frame.locator('h2').textContent()).includes(displaySubject));
    assert.match(await frame.locator('body').textContent(),/NOT AN OFFICIAL CDC QUESTION PAPER/);
    if(['social','nepali','english'].includes(key))assert.equal(await page.locator('#grade9CurriculumLanguage option:not([disabled])').count(),1);
   }
   await page.locator('#grade9CurriculumSubject').selectOption('science');
   await page.locator('#grade9CurriculumLanguage').selectOption('both');
   await page.locator('#grade9CurriculumCoverage').selectOption('unit');
   await page.locator('#grade9SelectAll').click();
   assert.equal(await page.locator('#grade9CurriculumTopics input:checked').count(),19);
   await page.locator('#grade9CurriculumMarks').fill('75');
   assert.equal(await page.locator('#generateGrade9Curriculum').isDisabled(),false);
   await page.locator('#generateGrade9Curriculum').click();
   await wait(page,()=>!document.getElementById('downloadPracticeDocx').disabled);
   assert.match(await frame.locator('body').textContent(),/Total marks: 75/);
   await page.locator('#grade9ClearAll').click();
   assert.equal(await page.locator('#grade9CurriculumTopics input:checked').count(),0);
   assert.equal(await page.locator('#generateGrade9Curriculum').isDisabled(),true);
   console.log('PASS real browser unit selection, select all 19 science units, 75 marks and clear selection');
   console.log('PASS nine Grade 9 original curriculum subject generators and language policy');
   assert.deepEqual(errors,[]);
  }finally{await context.close()}
  const viewer=await newSession();try{
   await login(viewer.page,schools[0].sid,'alpha-viewer');
   await viewer.page.goto(origin+'/question-paper.html?schoolId='+schools[0].sid);
   await wait(viewer.page,()=>!document.getElementById('login').disabled);
   await viewer.page.locator('#login').click();
   await wait(viewer.page,()=>document.querySelectorAll('#grade9GridLibrary details').length===11);
   assert.equal(await viewer.page.locator('#mathPracticeArea').isVisible(),false);
   assert.equal(await viewer.page.locator('#computerGenerateArea').isVisible(),false);
   assert.equal(await viewer.page.locator('#downloadPracticeDocx').isDisabled(),true);
   assert.deepEqual(viewer.errors,[]);
  }finally{await viewer.context.close()}
  console.log('PASS real Question Paper browser: 11-subject library, Computer and Math generation, actual unreviewed landscape DOCX, Viewer generation denied');
 }
 // Real Staff XLSX import: same Employee ID in different schools is allowed,
 // but same-school duplicates and revoked accounts must not write anything.
 {
  const school=schools[0],foreign=schools[1],base='schools/'+school.sid,foreignBase='schools/'+foreign.sid;
  const original={schoolId:school.sid,staffId:'EXISTING-01',nameEnglish:'Existing Staff',name:'Existing Staff',position:'Teacher'};
  const foreignRecord={...original,schoolId:foreign.sid,staffId:'000071',name:'Foreign Staff',nameEnglish:'Foreign Staff'};
  await db.doc(base+'/staff/existing').set(original);
  await db.doc(foreignBase+'/staff/existing').set(foreignRecord);
  const staffRow=['000071','शिक्षक','Imported Staff','Kathmandu','Secondary','2081-01-01','Permanent','MA','Science','00123456','कार्यरत'];
  const second=['EMP-072','','Second Staff','','Primary','','','','','','कार्यरत'];
  const {context,page,errors}=await newSession();
  const upload=async rows=>{
   const blob=excelWorkbook(V46_STAFF_EXCEL_HEADERS,rows,{sheetName:'Staff'});
   await page.locator('#staffImportFile').setInputFiles({name:'staff.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(await blob.arrayBuffer())});
   await page.locator('#previewStaffImport').click();
   await wait(page,()=>!document.getElementById('previewStaffImport').disabled);
  };
  try{
   await login(page,school.sid,'alpha-admin');
   await page.goto(origin+'/staff.html?schoolId='+school.sid);
   await wait(page,()=>!document.getElementById('staffImportArea').hidden&&!document.getElementById('refresh').disabled);
   await upload([staffRow,second]);
   assert.equal(await page.locator('#saveStaffImport').isDisabled(),false,await page.locator('#staffImportSummary').textContent());
   assert.equal((await db.collection(base+'/staff').get()).size,1);
   // A cancelled confirmation never writes or invalidates the review.
   page.once('dialog',d=>d.dismiss());await page.locator('#saveStaffImport').click();
   assert.equal((await db.collection(base+'/staff').get()).size,1);
   page.once('dialog',d=>d.accept());await page.locator('#saveStaffImport').click();
   await wait(page,()=>document.getElementById('staffImportSummary').textContent.includes('2 नयाँ कर्मचारी विवरण सुरक्षित भए'));
   const records=(await db.collection(base+'/staff').get()).docs;
   assert.equal(records.length,3);
   const imported=records.find(d=>d.data().staffId==='000071').data();
   assert.deepEqual(imported,{schoolId:school.sid,staffId:'000071',name:'Imported Staff',nameEnglish:'Imported Staff',nameNepali:'शिक्षक',position:'Secondary',levelCategory:'Secondary',permanentAddress:'Kathmandu',appointmentDateBs:'2081-01-01',appointmentType:'Permanent',qualification:'MA',subject:'Science',phone:'00123456',status:'कार्यरत'});
   assert.deepEqual((await db.doc(base+'/staff/existing').get()).data(),original);
   assert.deepEqual((await db.doc(foreignBase+'/staff/existing').get()).data(),foreignRecord);
   await wait(page,()=>!document.getElementById('previewStaffImport').disabled);
   await wait(page,()=>document.getElementById('staffRows').textContent.includes('Imported Staff'));
   await page.locator('#staffRows tr').filter({hasText:'Imported Staff'}).getByRole('button',{name:'Edit',exact:true}).click();
   await wait(page,()=>!document.getElementById('staffEditArea').hidden);
   assert.equal(await page.locator('#editStaffId').inputValue(),'000071');
   await page.locator('#editStaff-email').fill('staff-profile@example.invalid');
   await page.locator('#editStaff-phone').fill('00009876');
   page.once('dialog',d=>d.accept());await page.locator('#saveStaffEdit').click();
   await wait(page,()=>document.getElementById('message').textContent.includes('कर्मचारी विवरण सुरक्षित भयो'));
   const edit=(await db.collection(base+'/staff').get()).docs.find(d=>d.data().staffId==='000071').data();
   assert.equal(edit.email,'staff-profile@example.invalid');assert.equal(edit.phone,'00009876');assert.equal(edit.authUid,undefined);
   assert.deepEqual((await db.doc(foreignBase+'/staff/existing').get()).data(),foreignRecord);
   await upload([['emp-072',...second.slice(1)]]);
   assert.equal(await page.locator('#saveStaffImport').isDisabled(),true);
   await upload([['EMP-073',...second.slice(1)]]);
   assert.equal(await page.locator('#saveStaffImport').isDisabled(),false);
   await db.doc(base+'/members/alpha-admin').update({active:false});
   page.once('dialog',d=>d.accept());await page.locator('#saveStaffImport').click();
   await wait(page,()=>document.getElementById('staffImportSummary').textContent.includes('Import पुष्टि भएन'));
   assert.equal((await db.collection(base+'/staff').get()).size,3);
   await db.doc(base+'/members/alpha-admin').update({active:true});
   assert.deepEqual(errors,[]);
  }finally{await db.doc(base+'/members/alpha-admin').update({active:true});await context.close()}
  const viewer=await newSession();
  try{
   await login(viewer.page,school.sid,'alpha-viewer');
   await viewer.page.goto(origin+'/staff.html?schoolId='+school.sid);
   await wait(viewer.page,()=>!document.getElementById('records').hidden);
   assert.equal(await viewer.page.locator('#staffImportArea').isVisible(),false);
   assert.equal(await viewer.page.locator('#saveStaffImport').isDisabled(),true);
   await wait(viewer.page,()=>document.getElementById('staffRows').textContent.includes('Imported Staff'));
   assert.ok(!(await viewer.page.locator('#staffRows').textContent()).includes('Foreign Staff'));
   assert.deepEqual(viewer.errors,[]);
  }finally{await viewer.context.close()}
  console.log('PASS Staff XLSX import: all 11 fields, leading zeros, no overwrite, same-school duplicate, cross-school isolation, cancelled confirmation, revoked admin and Viewer read-only');
 }
 // Real XLSX upload, isolated Auth, atomic Staff link and teacher assignment.
 {
  const school=schools[0],foreign=schools[1],base='schools/'+school.sid;
  const staffRef=db.doc(base+'/staff/batch-teacher'),foreignStaff=db.doc('schools/'+foreign.sid+'/staff/batch-teacher');
  const staff={schoolId:school.sid,name:'Batch Teacher',position:'Teacher',staffId:'EMP-BATCH'};
  await staffRef.set(staff);await foreignStaff.set({...staff,schoolId:foreign.sid});
  const batchEmail=email('alpha-batch-teacher'),unmatchedEmail=email('alpha-batch-unmatched');
  const {context,page,errors}=await newSession();
  const upload=async rows=>{
   const blob=excelWorkbook(['Name','Email','Password'],rows,{sheetName:'Teacher_Accounts'});
   await page.locator('#teacherBatchFile').setInputFiles({name:'teacher-accounts.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(await blob.arrayBuffer())});
   await page.locator('#teacherBatchPreview').click();
   await wait(page,()=>!document.getElementById('teacherBatchPreview').disabled);
  };
  try{
   await login(page,school.sid,'alpha-admin');
   await page.goto(origin+'/school-admin.html?schoolId='+school.sid);
   await wait(page,()=>!document.getElementById('schoolArea').hidden);
   await page.locator('#teacherBatch summary').click();
   await upload([['Batch Teacher',batchEmail,password],['Batch Teacher',batchEmail.toUpperCase(),password]]);
   assert.equal(await page.locator('#teacherBatchCreate').isDisabled(),true);
   assert.match(await page.locator('#teacherBatchStatus').textContent(),/दोहोरिएको/);
   await assert.rejects(admin.getUserByEmail(batchEmail),e=>e.code==='auth/user-not-found');
   await upload([['Batch Teacher',batchEmail,password],['Unmatched Teacher',unmatchedEmail,password]]);
   assert.equal(await page.locator('#teacherBatchCreate').isDisabled(),false,await page.locator('#teacherBatchStatus').textContent());
   assert.match(await page.locator('#teacherBatchRows').textContent(),/Staff matched/);
   assert.match(await page.locator('#teacherBatchRows').textContent(),/No Staff match/);
   assert.ok(!(await page.locator('#teacherBatchRows').textContent()).includes(password));
   assert.equal((await staffRef.get()).data().authUid,undefined);
   await assert.rejects(admin.getUserByEmail(batchEmail),e=>e.code==='auth/user-not-found');
   page.once('dialog',dialog=>dialog.accept());await page.locator('#teacherBatchCreate').click();
   await wait(page,()=>document.getElementById('teacherBatchStatus').textContent.includes('2 निष्क्रिय सदस्यता बन्यो'));
   const linkedUid=(await admin.getUserByEmail(batchEmail)).uid,unmatchedUid=(await admin.getUserByEmail(unmatchedEmail)).uid;
   for(const uid of [linkedUid,unmatchedUid]){
    assert.deepEqual((await db.doc(base+'/members/'+uid).get()).data(),{uid,schoolId:school.sid,role:'teacher',active:false});
    assert.equal((await db.doc('schools/'+foreign.sid+'/members/'+uid).get()).exists,false);
    assert.equal((await db.doc('v47_super_admins/'+uid).get()).exists,false);
   }
   assert.deepEqual((await staffRef.get()).data(),{...staff,email:batchEmail,authUid:linkedUid});
   assert.deepEqual((await foreignStaff.get()).data(),{...staff,schoolId:foreign.sid});
   const before=await newSession();try{await login(before.page,school.sid,linkedUid,false,'1',batchEmail)}finally{await before.context.close()}
   const row=page.locator('#members tr').filter({hasText:linkedUid});await row.waitFor({state:'visible'});
   page.once('dialog',dialog=>dialog.accept());await row.getByRole('button',{name:'Activate',exact:true}).click();
   await wait(page,uid=>Array.from(document.querySelectorAll('#members tr')).some(r=>r.textContent.includes(uid)&&r.textContent.includes('Deactivate')),linkedUid);
   const after=await newSession();try{await login(after.page,school.sid,linkedUid,true,'1',batchEmail)}finally{await after.context.close()}
   const wrong=await newSession();try{await login(wrong.page,foreign.sid,linkedUid,false,'1',batchEmail)}finally{await wrong.context.close()}
   await page.locator('#assignmentUid').fill(linkedUid);await page.locator('#assignmentClass').selectOption('1');await page.locator('#assignmentSubject').fill('math');
   page.once('dialog',dialog=>dialog.accept());await page.locator('#assignTeacher').click();
   await wait(page,()=>!document.getElementById('assignTeacher').disabled);
   const assignment=db.doc(base+'/teacher_assignments/'+[school.sid,linkedUid,'1','math'].join(':'));
   assert.deepEqual((await assignment.get()).data(),{schoolId:school.sid,uid:linkedUid,classId:'1',subjectId:'math',active:false});
   page.once('dialog',dialog=>dialog.accept());await page.locator('#activateAssignment').click();
   await wait(page,()=>!document.getElementById('activateAssignment').disabled);
   assert.equal((await assignment.get()).data().active,true);
   assert.deepEqual(errors,[]);
   console.log('PASS real XLSX Teacher accounts, duplicate rejection, Staff transaction, inactive login, activation, tenant isolation and class/subject assignment');
  }finally{await context.close()}
 }
 // Register a third synthetic school using the actual Super Admin UI.
 const newSchoolId='33333003',newEmail=email('new-school-admin');
 {
  const {context,page,errors}=await newSession();
  try{
   await page.setViewportSize({width:375,height:812});
   await page.goto(origin+'/admin.html');
   await wait(page,()=>!document.getElementById('login').disabled);
   assert.equal(await page.locator('#adminArea').isVisible(),false);
   assert.equal(await page.locator('#connect').isVisible(),false);
   await page.locator('#email').fill(email('platform-admin'));await page.locator('#password').fill(password);
   await page.locator('#login').click();await wait(page,()=>!document.getElementById('adminArea').hidden);
   await page.locator('#newAdminAccount summary').click();await page.locator('#newAdminEmail').fill(newEmail);await page.locator('#newAdminPassword').fill(password);
   page.once('dialog',dialog=>dialog.accept());await page.locator('#createAdminAccount').click();
   try{await wait(page,()=>document.getElementById('adminUid').value.length>=6&&!document.getElementById('register').disabled)}catch(error){throw Error('Synthetic account creation failed: '+await page.locator('#accountStatus').textContent(),{cause:error})}
   assert.equal(await page.locator('#superLoginFields').isVisible(),false);
   const newUid=await page.locator('#adminUid').inputValue();
   assert.equal((await admin.getUserByEmail(newEmail)).uid,newUid);
   assert.equal(await page.locator('#newAdminPassword').inputValue(),'');
   assert.match(await page.locator('#identity').textContent(),/platform-admin/);
   assert.equal((await db.doc('schools/'+newSchoolId).get()).exists,false);
   await page.locator('#schoolId').fill(newSchoolId);assert.equal(await page.locator('#iemis').inputValue(),newSchoolId);assert.equal(await page.locator('#iemis').isVisible(),false);await page.locator('#schoolName').fill('Gamma Synthetic School');
   page.once('dialog',dialog=>dialog.accept());await page.locator('#register').click();
   const row=page.locator('#schools tr').filter({hasText:newSchoolId});
   await wait(page,id=>Array.from(document.querySelectorAll('#schools tr')).some(tr=>tr.textContent.includes(id)&&tr.textContent.includes('Inactive')),newSchoolId);
   assert.equal((await db.doc('schools/'+newSchoolId).get()).data().active,false);
   assert.equal((await db.doc('schools/'+newSchoolId+'/members/'+newUid).get()).data().role,'school_admin');
   const candidate=await newSession();try{await login(candidate.page,newSchoolId,newUid,false,'0',newEmail)}finally{await candidate.context.close()}
   page.once('dialog',dialog=>dialog.accept());await row.getByRole('button',{name:'Activate',exact:true}).click();
   await wait(page,id=>Array.from(document.querySelectorAll('#schools tr')).some(tr=>tr.textContent.includes(id)&&tr.textContent.includes('Deactivate')),newSchoolId);
   const candidate2=await newSession();try{await login(candidate2.page,newSchoolId,newUid,true,'0',newEmail)}finally{await candidate2.context.close()}
   assert.deepEqual(errors,[]);
   await db.doc('schools/legacy-browser-fixture').set({name:'Legacy synthetic school',active:true});
   await page.locator('#refresh').click();
   const legacy=page.locator('#schools tr').filter({hasText:'legacy-browser-fixture'});
   await legacy.waitFor({state:'visible'});
   assert.match(await legacy.textContent(),/Needs review/);
   assert.equal(await legacy.getByRole('button').count(),0);
   assert.equal(await page.locator('#capacityPanel').evaluate(el=>el.open),false);
   assert.equal(await legacy.locator('td').first().getAttribute('data-label'),'School ID');
   assert.equal(await legacy.evaluate(el=>getComputedStyle(el).display),'block');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,'Super Admin page must fit 375px viewport');
   assert.equal(await page.locator('.school-table-wrap').evaluate(el=>el.scrollWidth<=el.clientWidth),true,'School cards must fit mobile viewport');
   assert.equal(await page.locator('#schools tr').filter({hasText:newSchoolId}).getByRole('button',{name:'Deactivate'}).count(),1);
   assert.equal((await db.doc('schools/legacy-browser-fixture').get()).data().active,true);
   // Simulate returning after a suspended one-hour browser tab.
   await page.evaluate(()=>{const original=Date.now.bind(Date);Date.now=()=>original()+3600001;document.dispatchEvent(new Event('visibilitychange'));});
   await wait(page,()=>document.getElementById('adminArea').hidden);
   assert.equal(await page.locator('#schools tr').count(),0);
   assert.equal(await page.locator('#superLoginFields').isVisible(),true);
   await wait(page,()=>!document.getElementById('login').disabled);
   assert.match(await page.locator('#message').textContent(),/१ घण्टा निष्क्रिय/);
   console.log('PASS Super Admin account creation, inactive registration, blocked inactive login, activation and new-school login; malformed legacy registry shown read-only; idle session locked');
  }finally{await context.close()}
 }
 console.log('PASS real Chromium: 2 schools, 4 accounts, wrong-school login denied, shared session, Spark Grade Ledger, watermarked Grade Sheet, XLSX, logout; third school onboarding');
}finally{
 if(browser)await browser.close();
 if(server){server.closeAllConnections?.();await new Promise(r=>server.close(r))}
 await deleteApp(app);await rm(temp,{recursive:true,force:true});
}
