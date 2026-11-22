import {verifySchoolSession} from './verified-school-session.mjs';
import {V47_FIREBASE_CONFIG} from './v47-firebase-config.mjs';
import {createSchoolStore} from './firestore-adapter.mjs';
import {createSchoolStudent} from './student-service.mjs';
import {validateSchoolId} from './school-paths.mjs';
import {nextPageState} from './pagination.mjs';
import {excelWorkbook} from './excel-workbook.mjs';
import {STUDENT_EXCEL_HEADERS,studentExcelRow} from './v46-student-excel-schema.mjs';
const $=id=>document.getElementById(id);const status=msg=>{$('message').textContent=msg};let auth,authSdk,db,api,store,cursor=null,records=[],schoolId=null,loadEpoch=0,actor=null,loading=false,savingStudent=false,hasMore=false;
function clear(){loadEpoch++;hasMore=false;$('exportExcel').disabled=true;loading=false;actor=null;$('createArea').hidden=true;store=null;cursor=null;records=[];schoolId=null;$('students').replaceChildren();$('recordsArea').hidden=true;$('next').disabled=true;$('count').textContent='';}
$('connect').onclick=async()=>{try{const config=V47_FIREBASE_CONFIG;if(config.projectId!=='smss-exam-portal-v47')throw new Error('Only V47 Firebase project is supported');const appSdk=await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js');authSdk=await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js');api=await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js');const app=appSdk.initializeApp(config,'smss-v47-students');auth=authSdk.getAuth(app);await authSdk.setPersistence(auth,authSdk.inMemoryPersistence);db=api.getFirestore(app);$('connect').disabled=true;$('login').disabled=false;status('V47 connected');}catch(e){status(e.message)}};
$('login').onclick=async()=>{clear();try{schoolId=validateSchoolId($('schoolId').value.trim());const credential=await authSdk.signInWithEmailAndPassword(auth,$('email').value,$('password').value);$('password').value='';const uid=credential.user.uid;const selectedSchool=schoolId;const session=await verifySchoolSession({schoolId:selectedSchool,uid,readDocument:async path=>{const snap=await api.getDoc(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null;}});if(auth.currentUser?.uid!==uid||schoolId!==selectedSchool)throw new Error('Authentication changed during verification');const school=await api.getDoc(api.doc(db,'schools',selectedSchool));if(!school.exists()||school.data().active!==true||auth.currentUser?.uid!==uid)throw new Error('School inactive or unavailable');const member={uid,role:session.role,active:true,schoolId:selectedSchool};actor=member;$('createArea').hidden=member.role!=='school_admin';store=createSchoolStore({db,api,member,schoolId,assertSession:()=>{if(auth?.currentUser?.uid!==uid||actor!==member||schoolId!==selectedSchool)throw new Error('School session changed; sign in again');}});$('heading').textContent='Students — '+String(school.data().name??schoolId);$('recordsArea').hidden=false;$('logout').disabled=false;await load(true);}catch(e){clear();try{if(auth?.currentUser)await authSdk.signOut(auth)}catch{}status(e.message)}};
$('logout').onclick=async()=>{if(savingStudent){status('Wait for student save to finish before signing out');return}clear();try{await authSdk.signOut(auth);$('logout').disabled=true;status('Signed out')}catch(e){status(e.message)}};
async function load(reset=false){if(!store||loading)return;const epoch=loadEpoch;loading=true;$('next').disabled=true;$('exportExcel').disabled=true;try{const result=await store.listPage('students',{pageSize:50,cursor:reset?null:cursor});if(epoch!==loadEpoch||!actor||auth?.currentUser?.uid!==actor.uid)return;const state=nextPageState(reset?[]:records,result.records,result.hasMore);records=state.records;cursor=result.cursor;hasMore=state.hasMore;$('exportExcel').disabled=hasMore||records.length===0;const tbody=$('students');tbody.replaceChildren();for(const student of records){const tr=document.createElement('tr');for(const value of [student.id,student.name??student.studentName??'',student.class??student.className??'',student.rollNo??student.roll??'']){const td=document.createElement('td');td.textContent=String(value);tr.append(td)}tbody.append(tr)}$('count').textContent=records.length+' students loaded';$('next').disabled=!state.hasMore;status('Student records loaded from '+schoolId);}catch(e){if(epoch===loadEpoch){$('next').disabled=true;$('exportExcel').disabled=true;status('Unable to load students: '+e.message)}}finally{if(epoch===loadEpoch)loading=false}}
$('refresh').onclick=()=>{loadEpoch++;loading=false;cursor=null;records=[];hasMore=false;$('exportExcel').disabled=true;load(true)};
$('next').onclick=()=>load(false);

$('createStudent').onclick=async()=>{if(savingStudent)return;try{if(actor?.role!=='school_admin'||auth?.currentUser?.uid!==actor.uid||actor.schoolId!==schoolId)throw new Error('School Admin sign-in required');const button=$('createStudent');savingStudent=true;button.disabled=true;$('logout').disabled=true;$('login').disabled=true;try{const selectedActor=actor,selectedSchool=schoolId,uid=auth.currentUser.uid;await verifySchoolSession({schoolId:selectedSchool,uid,readDocument:async path=>{const snap=await api.getDoc(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null;}});if(actor!==selectedActor||schoolId!==selectedSchool||auth.currentUser?.uid!==uid)throw new Error('School session changed before save');const result=await createSchoolStudent({db,api,actor,schoolId,input:{name:$('newName').value,class:$('newClass').value,rollNo:$('newRoll').value}});$('newName').value='';$('newRoll').value='';loadEpoch++;loading=false;cursor=null;records=[];await load(true);status('Student saved: '+result.id)}finally{savingStudent=false;button.disabled=false;$('logout').disabled=false;$('login').disabled=false}}catch(e){status('Student not saved: '+e.message)}};

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
