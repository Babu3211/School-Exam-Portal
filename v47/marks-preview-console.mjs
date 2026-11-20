import {verifySchoolSession} from './verified-school-session.mjs';
import {validateSchoolId} from './school-paths.mjs';
import {loadMarksByClassTerm} from './marks-query.mjs';
import {excelWorkbook} from './excel-workbook.mjs';
import {auditLoadedMarks} from './marks-audit.mjs';
const $=id=>document.getElementById(id),status=message=>{$('message').textContent=message};
let auth,authSdk,api,db,actor,schoolId,cursor=null,records=[],epoch=0,busy=false,loadingEpoch=null,hasMore=false;
function clear(){epoch++;actor=null;schoolId=null;cursor=null;records=[];busy=false;loadingEpoch=null;hasMore=false;$('work').hidden=true;$('rows').replaceChildren();$('count').textContent='';$('audit').textContent='Raw data audit not run';$('next').disabled=true;$('export').disabled=true;$('logout').disabled=true;}
$('connect').onclick=async()=>{try{const config=JSON.parse($('config').value);if(config.projectId!=='smss-exam-portal-v47')throw new Error('Only V47 Firebase project allowed');const appSdk=await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js');authSdk=await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js');api=await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js');const app=appSdk.initializeApp(config,'smss-v47-marks-preview');auth=authSdk.getAuth(app);await authSdk.setPersistence(auth,authSdk.inMemoryPersistence);db=api.getFirestore(app);$('connect').disabled=true;$('login').disabled=false;status('Connected to V47')}catch(e){status('Connection failed: '+e.message)}};
$('login').onclick=async()=>{
 if($('login').disabled)return;
 clear();const attempt=epoch;$('login').disabled=true;
 const requestedSchool=$('schoolId').value.trim();
 try{
  const requestedId=validateSchoolId(requestedSchool);
  const credential=await authSdk.signInWithEmailAndPassword(auth,$('email').value,$('password').value);
  $('password').value='';if(attempt!==epoch)return;
  const school=await api.getDoc(api.doc(db,'schools',requestedId));if(attempt!==epoch)return;
  if(!school.exists()||school.data().active!==true)throw new Error('School inactive or unavailable');
  const uid=credential.user.uid;const session=await verifySchoolSession({schoolId:requestedId,uid,readDocument:async path=>{const snap=await api.getDoc(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null;}});if(attempt!==epoch||auth.currentUser?.uid!==uid)throw new Error('Authentication changed');
  schoolId=requestedId;actor={uid,role:session.role,active:true,schoolId};
  $('heading').textContent='Marks — '+String(school.data().name??schoolId);$('work').hidden=false;$('logout').disabled=false;reset();
 }catch(e){if(attempt===epoch){clear();try{if(auth?.currentUser)await authSdk.signOut(auth)}catch{}status('Sign in failed: '+e.message)}}
 finally{$('login').disabled=false}
};
$('logout').onclick=async()=>{clear();$('login').disabled=true;try{await authSdk.signOut(auth);status('Signed out')}catch(e){status('Sign out failed: '+e.message)}finally{$('login').disabled=false}};
function render(){const body=$('rows');body.replaceChildren();for(const record of records){const row=document.createElement('tr');for(const value of [record.studentId,record.subjectId,record.theory,record.practical,record.term]){const cell=document.createElement('td');cell.textContent=String(value??'');row.append(cell)}body.append(row)}$('count').textContent=records.length+' raw mark records loaded';const audit=auditLoadedMarks(records,{schoolClass:$('schoolClass').value,term:$('term').value});$('audit').textContent=audit.checked+' loaded records checked; '+audit.issueCount+' raw data issues. This is NOT a completeness or CDC grade check.';$('export').disabled=records.length===0||records.length>1500||busy||hasMore}
async function load(reset=false){
 if(!actor)return;
 const current=epoch;
 if(loadingEpoch===current)return;
 loadingEpoch=current;busy=true;$('next').disabled=true;$('export').disabled=true;
 const requestedClass=$('schoolClass').value,requestedTerm=$('term').value;
 try{
  const result=await loadMarksByClassTerm({db,api,actor,schoolId,schoolClass:requestedClass,term:requestedTerm,pageSize:50,cursor:reset?null:cursor});
  if(current!==epoch)return;
  records=reset?result.records:[...records,...result.records];cursor=result.cursor;hasMore=result.hasMore;
  render();$('next').disabled=!hasMore;status('Raw marks loaded — not verified CDC results');
 }catch(e){if(current===epoch)status('Marks could not be loaded: '+e.message)}
 finally{if(loadingEpoch===current){loadingEpoch=null;busy=false;if(current===epoch){$('next').disabled=!hasMore;$('export').disabled=records.length===0||records.length>1500||hasMore;}}}
}
function reset(){epoch++;cursor=null;records=[];hasMore=false;$('next').disabled=true;$('export').disabled=true;$('rows').replaceChildren();$('count').textContent='';$('audit').textContent='Waiting for raw data audit';load(true)}
$('load').onclick=reset;$('schoolClass').onchange=reset;$('term').onchange=reset;$('next').onclick=()=>load(false);
async function confirmExportSession(expectedSchoolId,expectedUid){
 if(auth?.currentUser?.uid!==expectedUid)throw new Error('Authentication changed');
 const session=await verifySchoolSession({schoolId:expectedSchoolId,uid:expectedUid,readDocument:async path=>{
  const snap=await api.getDoc(api.doc(db,...path.split('/')));
  return snap.exists()?snap.data():null;
 }});
 if(auth?.currentUser?.uid!==expectedUid||session.schoolId!==expectedSchoolId)throw new Error('School access changed');
}
$('export').onclick=async()=>{
 if(!actor||busy||records.length===0||records.length>1500||hasMore)return;
 const current=epoch,uid=actor.uid,expectedSchoolId=schoolId,selectedClass=$('schoolClass').value,selectedTerm=$('term').value;
 $('export').disabled=true;
 try{
  await confirmExportSession(expectedSchoolId,uid);
  if(current!==epoch||!actor||actor.uid!==uid||schoolId!==expectedSchoolId||$('schoolClass').value!==selectedClass||$('term').value!==selectedTerm||busy||hasMore)return;
  const columns=['studentId','subjectId','class','term','theory','practical'];
  const workbook=excelWorkbook(columns,records.map(record=>columns.map(key=>record[key])),{sheetName:'Raw Marks'});
  const blob=workbook;
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  try{
   link.href=url;link.download='smss-v47-raw-marks-'+expectedSchoolId+'-'+selectedClass+'-'+selectedTerm+'.xlsx';
   document.body.append(link);link.click();
  }finally{link.remove();URL.revokeObjectURL(url)}
  status('Exported '+records.length+' Excel raw records (not official grades)');
 }catch(e){if(current===epoch)status('Export blocked: '+e.message)}
 finally{if(current===epoch)$('export').disabled=!actor||busy||hasMore||records.length===0||records.length>1500}
};
