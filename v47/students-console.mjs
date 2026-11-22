import {verifySchoolSession} from './verified-school-session.mjs';
import {connectSchoolFirebase,startVerifiedSchoolActivity} from './school-firebase-client.mjs';
import {createSchoolStore} from './firestore-adapter.mjs';
import {createSchoolStudent} from './student-service.mjs';
import {STUDENT_OPTIONAL_FIELDS} from './student-validation.mjs';
import {validateSchoolId} from './school-paths.mjs';
import {nextPageState} from './pagination.mjs';
import {excelWorkbook} from './excel-workbook.mjs';
import {STUDENT_EXCEL_HEADERS,studentExcelRow} from './v46-student-excel-schema.mjs';
import {mapV46StudentExcelRows} from './v46-student-import-mapping.mjs';
import {parsePastedStudentTable} from './pasted-student-table.mjs';
import {checkExistingStudentIemisIds} from './student-import-duplicate-preflight.mjs';
import {readV47StudentXlsx} from './read-v47-student-xlsx.mjs';
const requestedSchool=new URL(location.href).searchParams.get('schoolId');
const optionalFields=Object.keys(STUDENT_OPTIONAL_FIELDS).filter(key=>key!=='rollNo');
for(const key of optionalFields){const label=document.createElement('label');label.textContent=key.replace(/([A-Z])/g,' $1').replace(/^./,x=>x.toUpperCase());const input=document.createElement('input');input.dataset.studentField=key;input.maxLength=STUDENT_OPTIONAL_FIELDS[key];label.append(input);document.getElementById('additionalStudentFields').append(label)}
const $=id=>document.getElementById(id);const status=msg=>{$('message').textContent=msg};let auth,authSdk,db,api,store,cursor=null,records=[],schoolId=null,loadEpoch=0,actor=null,loading=false,savingStudent=false,hasMore=false,previewRequest=0;
function clear(){previewRequest++;$('previewImport').disabled=false;loadEpoch++;hasMore=false;$('exportExcel').disabled=true;loading=false;actor=null;$('createArea').hidden=true;$('importArea').hidden=true;$('importResults').replaceChildren();$('importSummary').textContent='';store=null;cursor=null;records=[];schoolId=null;$('students').replaceChildren();$('recordsArea').hidden=true;$('next').disabled=true;$('count').textContent='';}
$('connect').onclick=async()=>{try{({auth,authSdk,db,api}=await connectSchoolFirebase());authSdk.onAuthStateChanged(auth,user=>{if(actor&&user?.uid!==actor.uid){clear();$('logout').disabled=true;status('प्रयोगकर्ता सत्र परिवर्तन भयो। विद्यार्थी विवरण हटाइएको छ। पुनः लगइन गर्नुहोस्।')}});$('connect').disabled=true;$('login').disabled=false;if(requestedSchool){try{$('schoolId').value=validateSchoolId(requestedSchool);if(auth.currentUser)queueMicrotask(()=>$('login').click())}catch(e){status('Invalid school selection: '+e.message)}}status('V47 connected');}catch(e){status(e.message)}};
$('login').onclick=async()=>{clear();const attempt=loadEpoch;try{schoolId=validateSchoolId($('schoolId').value.trim());const freshSignIn=!auth.currentUser;const credential=freshSignIn?await authSdk.signInWithEmailAndPassword(auth,$('email').value,$('password').value):{user:auth.currentUser};$('password').value='';const uid=credential.user.uid;const selectedSchool=schoolId;const session=await verifySchoolSession({schoolId:selectedSchool,uid,readDocument:async path=>{const snap=await api.getDoc(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null;}});if(attempt!==loadEpoch||auth.currentUser?.uid!==uid||schoolId!==selectedSchool)throw new Error('Authentication changed during verification');const school=await api.getDoc(api.doc(db,'schools',selectedSchool));if(attempt!==loadEpoch||!school.exists()||school.data().active!==true||auth.currentUser?.uid!==uid)throw new Error('School inactive or unavailable');const member={uid,role:session.role,active:true,schoolId:selectedSchool};actor=member;if(freshSignIn)startVerifiedSchoolActivity();$('createArea').hidden=member.role!=='school_admin';$('importArea').hidden=member.role!=='school_admin';store=createSchoolStore({db,api,member,schoolId,assertSession:()=>{if(auth?.currentUser?.uid!==uid||actor!==member||schoolId!==selectedSchool)throw new Error('School session changed; sign in again');}});$('heading').textContent='Students — '+String(school.data().name??schoolId);$('recordsArea').hidden=false;$('logout').disabled=false;await load(true);}catch(e){if(attempt===loadEpoch){clear();try{if(auth?.currentUser)await authSdk.signOut(auth)}catch{}status(e.message)}}};
$('logout').onclick=async()=>{if(savingStudent){status('Wait for student save to finish before signing out');return}clear();try{await authSdk.signOut(auth);$('logout').disabled=true;status('Signed out')}catch(e){status(e.message)}};
async function load(reset=false){if(!store||loading)return;const epoch=loadEpoch;loading=true;$('next').disabled=true;$('exportExcel').disabled=true;try{const result=await store.listPage('students',{pageSize:50,cursor:reset?null:cursor});if(epoch!==loadEpoch||!actor||auth?.currentUser?.uid!==actor.uid)return;const state=nextPageState(reset?[]:records,result.records,result.hasMore);records=state.records;cursor=result.cursor;hasMore=state.hasMore;$('exportExcel').disabled=hasMore||records.length===0;const tbody=$('students');tbody.replaceChildren();for(const student of records){const tr=document.createElement('tr');for(const value of [student.id,student.name??student.studentName??'',student.class??student.className??'',student.rollNo??student.roll??'']){const td=document.createElement('td');td.textContent=String(value);tr.append(td)}tbody.append(tr)}$('count').textContent=records.length+' students loaded';$('next').disabled=!state.hasMore;status('Student records loaded from '+schoolId);}catch(e){if(epoch===loadEpoch){$('next').disabled=true;$('exportExcel').disabled=true;status('Unable to load students: '+e.message)}}finally{if(epoch===loadEpoch)loading=false}}
$('refresh').onclick=()=>{loadEpoch++;loading=false;cursor=null;records=[];hasMore=false;$('exportExcel').disabled=true;load(true)};
$('next').onclick=()=>load(false);

$('createStudent').onclick=async()=>{if(savingStudent)return;try{if(actor?.role!=='school_admin'||auth?.currentUser?.uid!==actor.uid||actor.schoolId!==schoolId)throw new Error('School Admin sign-in required');const button=$('createStudent');savingStudent=true;button.disabled=true;$('logout').disabled=true;$('login').disabled=true;try{const selectedActor=actor,selectedSchool=schoolId,uid=auth.currentUser.uid;const freshSession=await verifySchoolSession({schoolId:selectedSchool,uid,readDocument:async path=>{const snap=await api.getDoc(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null;}});if(freshSession.role!=='school_admin'||actor!==selectedActor||schoolId!==selectedSchool||auth.currentUser?.uid!==uid)throw new Error('School Admin permission changed before save');const result=await createSchoolStudent({db,api,actor,schoolId,input:{name:$('newName').value,class:$('newClass').value,rollNo:$('newRoll').value,...Object.fromEntries([...document.querySelectorAll('[data-student-field]')].map(input=>[input.dataset.studentField,input.value]))}});$('newName').value='';$('newRoll').value='';for(const input of document.querySelectorAll('[data-student-field]'))input.value='';loadEpoch++;loading=false;cursor=null;records=[];await load(true);status('Student saved: '+result.id)}finally{savingStudent=false;button.disabled=false;$('logout').disabled=false;$('login').disabled=false}}catch(e){status('Student not saved: '+e.message)}};


$('previewImport').onclick=async()=>{
 const request=++previewRequest;
 $('importResults').replaceChildren();$('importSummary').textContent='';
 try{
  if(actor?.role!=='school_admin'||auth?.currentUser?.uid!==actor.uid||actor.schoolId!==schoolId)throw new Error('School Admin sign-in required');
  const file=$('importXlsx').files?.[0];
  const cells=file?await readV47StudentXlsx(file):parsePastedStudentTable($('importPaste').value);
  const report=mapV46StudentExcelRows({headers:cells[0],rows:cells.slice(1),schoolId});
  const epoch=loadEpoch,selectedActor=actor,selectedSchool=schoolId,uid=auth.currentUser.uid;
  $('previewImport').disabled=true;
  let existing={duplicates:[],scanned:0};
  try{
   const freshSession=await verifySchoolSession({schoolId:selectedSchool,uid,readDocument:async path=>{
    const snap=await api.getDoc(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null;
   }});
   if(freshSession.role!=='school_admin')throw new Error('School Admin permission changed');
   existing=await checkExistingStudentIemisIds({store,accepted:report.accepted,assertSession:()=>{
    if(epoch!==loadEpoch||actor!==selectedActor||schoolId!==selectedSchool||auth?.currentUser?.uid!==uid)throw new Error('School session changed during preview');
   }});
  }finally{if(request===previewRequest)$('previewImport').disabled=false}
  if(request!==previewRequest||epoch!==loadEpoch||actor!==selectedActor||schoolId!==selectedSchool||auth?.currentUser?.uid!==uid)return;
  for(const duplicate of existing.duplicates){report.errors.push({row:duplicate.row,error:duplicate.kind+' already exists in this school'});}
  report.ready=report.errors.length===0;
  $('importSummary').textContent=report.accepted.length+' valid spreadsheet rows; '+report.errors.length+' errors; '+existing.scanned+' existing students checked. Preview only — no students saved.';
  for(const item of report.errors.slice(0,100)){
   const tr=document.createElement('tr'),row=document.createElement('td'),detail=document.createElement('td');
   row.textContent=String(item.row);detail.textContent=item.error;tr.append(row,detail);$('importResults').append(tr);
  }
  if(report.errors.length>100)status('Only the first 100 validation errors are shown');
  else status(report.ready?'Preview valid. Import save remains disabled.':'Correct the spreadsheet errors before import.');
 }catch(e){if(request===previewRequest){$('importSummary').textContent='Preview rejected: '+e.message;status('Preview failed: '+e.message)}}
};

function downloadExcel(blob,name){
 const url=URL.createObjectURL(blob),link=document.createElement('a');
 try{link.href=url;link.download=name;document.body.append(link);link.click()}finally{link.remove();URL.revokeObjectURL(url)}
}
$('sampleExcel').onclick=()=>{
 try{downloadExcel(excelWorkbook(STUDENT_EXCEL_HEADERS,[STUDENT_EXCEL_HEADERS.map(()=> '')],{sheetName:'Students_Template'}),'smss-v47-students-sample.xlsx');status('Excel sample downloaded. Import is not yet enabled in V47.')}
 catch(e){status('Excel sample failed: '+e.message)}
};
$('exportExcel').onclick=async()=>{
 if(!actor||!store||loading||savingStudent||hasMore||!records.length)return;
 const epoch=loadEpoch,selectedSchool=schoolId,uid=auth?.currentUser?.uid;
 $('exportExcel').disabled=true;
 try{
  if(!uid)throw new Error('Sign-in required');
  await verifySchoolSession({schoolId:selectedSchool,uid,readDocument:async path=>{
   const snap=await api.getDoc(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null;
  }});
  if(epoch!==loadEpoch||auth?.currentUser?.uid!==uid||schoolId!==selectedSchool||!actor||hasMore||loading||savingStudent)throw new Error('School access or loaded records changed');
  const rows=records.map(studentExcelRow);
  downloadExcel(excelWorkbook(STUDENT_EXCEL_HEADERS,rows,{sheetName:'Students'}),'smss-v47-students-'+selectedSchool+'.xlsx');
  status('Exported '+rows.length+' loaded student records to Excel. Not a complete school backup.');
 }catch(e){status('Excel export blocked: '+e.message)}
 finally{$('exportExcel').disabled=!actor||hasMore||loading||savingStudent||!records.length}
};

// Automatically resume a dashboard-selected school; authorization is rechecked on this page.
if(requestedSchool)queueMicrotask(()=>$('connect').click());
