import {createV46ReadOnlyBridge} from './v46-readonly-bridge.mjs';
import {assertIemisSchoolId} from './iemis-school-identity.mjs';
import {auditV46ReportReferences} from './report-reference-audit.mjs';
import {previewV46MarkSummaries} from './mark-summary-preview.mjs';
const $=id=>document.getElementById(id);
let auth,authSdk,db,firestoreApi,epoch=0,busy=false,connecting=false,loginTask=null,loggingOut=false,reportRows=null;
const status=message=>{$('message').textContent=message};
function clear(){reportRows=null;$('summaryRows').replaceChildren();for(const id of ['summaryExam','summaryClass','summaryAnnual','summaryRun'])$(id).disabled=true;$('summaryResult').textContent='Choose an exam and class after loading records.';epoch++;$('report').hidden=true;$('counts').replaceChildren();$('school').textContent='';$('password').value=''}
function currentSession(requestEpoch,uid){return requestEpoch===epoch&&auth?.currentUser?.uid===uid}
$('connect').onclick=async()=>{
 if(connecting||auth)return;
 connecting=true;$('connect').disabled=true;
 try{
  const config=JSON.parse($('config').value);
  if(config.projectId!=='smss-exam-portal-v47')throw new Error('V47 Firebase project required');
  const [appSdk,aSdk,fSdk]=await Promise.all([
   import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js'),
   import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js'),
   import('https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js')
  ]);
  const app=appSdk.initializeApp(config,'smss-v47-report-preview');
  authSdk=aSdk;firestoreApi=fSdk;auth=aSdk.getAuth(app);
  await aSdk.setPersistence(auth,aSdk.inMemoryPersistence);
  db=fSdk.getFirestore(app);
  $('connect').disabled=true;$('login').disabled=false;
  status('V47 connected. Sign in to inspect your school.');
 }catch(error){status(error.message);$('connect').disabled=false}
 finally{connecting=false}
};
$('login').onclick=()=>{
 if(busy||loggingOut)return;
 loginTask=(async()=>{
 busy=true;clear();const current=epoch;
 $('login').disabled=true;$('logout').disabled=false;
 try{
  const schoolId=assertIemisSchoolId($('schoolId').value.trim());
  const credential=await authSdk.signInWithEmailAndPassword(auth,$('email').value,$('password').value);
  $('password').value='';
  if(!currentSession(current,credential.user.uid))return;
  const bridge=await createV46ReadOnlyBridge({schoolId,auth,db,firestoreApi});
  if(!currentSession(current,credential.user.uid))return;
  const rows=await bridge.loadExamReportRows();
  if(!currentSession(current,credential.user.uid))return;
  if(rows.publicationAllowed!==false||rows.complete!==false)throw new Error('Preview-only report protection missing');
  $('school').textContent='IEMIS School ID: '+rows.schoolId;
  for(const [label,key] of [['Students','students'],['Subjects','subjects'],['Exams','exams'],['Marks','marks'],['Mark Settings','markSettings']]){
   const tr=document.createElement('tr'),name=document.createElement('td'),count=document.createElement('td');
   name.textContent=label;count.textContent=String(rows[key].length);tr.append(name,count);$('counts').append(tr);
  }
  const audit=auditV46ReportReferences(rows);
  $('audit').textContent=audit.valid?'Mark references: no missing, unchecked or duplicate entries ('+audit.checkedMarks+' marks inspected).':'Mark references: '+audit.missing.length+' unresolved, '+audit.unchecked.length+' unchecked fields, '+audit.duplicates.length+' duplicate entries across '+audit.checkedMarks+' marks. Review V46 data before enabling results.';
  reportRows=rows;
  const examSelect=$('summaryExam');examSelect.replaceChildren(new Option('Select exam',''));
  for(const exam of rows.exams)examSelect.add(new Option(String(exam.examName||exam.termName||exam.name||exam.id),exam.id));
  const classSelect=$('summaryClass');classSelect.replaceChildren(new Option('Select class',''));
  for(let n=1;n<=10;n++)classSelect.add(new Option('Class '+n,String(n)));
  for(const id of ['summaryExam','summaryClass','summaryAnnual','summaryRun'])$(id).disabled=false;
  $('report').hidden=false;status('Read-only report inputs loaded. No results were published.');
 }catch(error){if(current===epoch){clear();try{if(auth?.currentUser)await authSdk.signOut(auth)}catch{}status('Report unavailable: '+error.message)}}
 finally{busy=false;$('login').disabled=!auth||loggingOut;if(!auth?.currentUser)$('logout').disabled=true}
 })();
};
$('logout').onclick=async()=>{
 if(loggingOut)return;
 loggingOut=true;
 clear();$('logout').disabled=true;$('login').disabled=true;
 try{
  // A pending sign-in may finish after signOut; wait and sign out again.
  if(loginTask){try{await loginTask}catch{ /* still sign out after a failed login */ }}
  if(auth)await authSdk.signOut(auth);
  status('Signed out');
 }catch(error){status('Unable to sign out: '+error.message)}
 finally{loggingOut=false;$('login').disabled=!auth;loginTask=null}
};

$('summaryRun').onclick=()=>{
 if(!reportRows||!auth?.currentUser||loggingOut)return;
 try{
  $('summaryRows').replaceChildren();
  const classNo=Number($('summaryClass').value),examId=$('summaryExam').value;
  const preview=previewV46MarkSummaries(reportRows,{classNo,examId,annual:$('summaryAnnual').checked});
  const body=$('summaryRows');body.replaceChildren();
  for(const item of preview.records){
   const tr=document.createElement('tr');
   for(const value of [item.studentId,item.subject,item.obtained,item.full,item.grade,item.complete?'Complete':'Incomplete']){
    const td=document.createElement('td');td.textContent=value==null?'—':String(value);tr.append(td);
   }
   body.append(tr);
  }
  $('summaryResult').textContent='Diagnostic only: '+preview.completeCount+'/'+preview.records.length+' mark records have complete grade inputs. Official GPA and publication disabled.';
 }catch(error){$('summaryRows').replaceChildren();$('summaryResult').textContent='Unable to inspect: '+error.message}
};
