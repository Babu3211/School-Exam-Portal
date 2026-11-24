// Real Chromium DOM + Firebase Auth/Firestore emulators, no production network.
// Only the Firebase project configuration and emulator SDK wiring are substituted
// on the intercepted test HTTP responses. The deployed source is never changed.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {build} from 'esbuild';
import {chromium} from 'playwright';
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
 server=createServer(await createV47StaticHandler(root));server.listen(0,'127.0.0.1');await once(server,'listening');
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
   if(url===origin+'/school-firebase-client.mjs'){
    const source=await readFile(join(root,'school-firebase-client.mjs'),'utf8');
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
 async function login(page,sid,uid,success=true){
  await page.goto(origin+'/');
  await wait(page,()=>!document.getElementById('dashboardLogin').disabled);
  assert.equal(await page.locator('#verifiedSidebar').isVisible(),false);
  assert.equal(await page.locator('#verifiedDashboard').isVisible(),false);
  assert.equal(await page.locator('#dashboardConnect').isVisible(),false);
  assert.equal(await page.locator('#dashboardLoginFields').isVisible(),true);
  await page.locator('#dashboardSchool').fill(sid);
  await page.locator('#dashboardEmail').fill(email(uid));
  await page.locator('#dashboardPassword').fill(password);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,'Login must fit viewport');
  await page.locator('#dashboardLogin').click();
  if(success){
   await wait(page,s=>document.getElementById('schoolIdentity').textContent.includes(s),sid);
   await wait(page,()=>!document.getElementById('dashboardMetricCards').hidden);
   assert.equal(await page.locator('[data-metric="students"]').textContent(),'1');
   assert.equal(await page.locator('#dashboardPassword').inputValue(),'');
   assert.equal(await page.locator('#dashboardLoginFields').isVisible(),false);
   assert.equal(await page.locator('#verifiedSidebar').isVisible(),true);
   assert.equal(await page.locator('#verifiedDashboard').isVisible(),true);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,'Dashboard must fit viewport');
  }else{
   await wait(page,()=>document.getElementById('dashboardStatus').textContent.includes('Login असफल'));
   assert.equal(await page.locator('#schoolIdentity').textContent(),'No school verified');
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
  const downloadPromise=page.waitForEvent('download',{timeout:30000});
  await page.locator('#exportExcel').click();const download=await downloadPromise;
  assert.match(download.suggestedFilename(),/UNAPPROVED-.*\.xlsx$/);
  const bytes=await readFile(await download.path());assert.equal(bytes.subarray(0,2).toString(),'PK');
  await page.locator('#logout').click();await wait(page,()=>document.getElementById('reportArea').hidden);
  assert.equal(await page.locator('#gradeOutput').textContent(),'');
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
 console.log('PASS real Chromium: 2 schools, 4 accounts, wrong-school login denied, shared session, Spark Grade Ledger, watermarked Grade Sheet, XLSX, logout');
}finally{
 if(browser)await browser.close();
 if(server){server.closeAllConnections?.();await new Promise(r=>server.close(r))}
 await deleteApp(app);await rm(temp,{recursive:true,force:true});
}
