import {connectSchoolFirebase,startVerifiedSchoolActivity} from './school-firebase-client.mjs';
import {verifySchoolSession} from './verified-school-session.mjs';
import {createSchoolStore} from './firestore-adapter.mjs';
import {saveSchoolAttendance} from './attendance-service.mjs';
import {saveAssignedTeacherAttendance} from './teacher-attendance-service.mjs';
import {saveLoadedClassAttendance} from './attendance-class-save.mjs';
import {saveAuthoritativeClassAttendance} from './verified-class-attendance-save.mjs';
import {loadClassRoster} from './attendance-roster.mjs';
import {loadAttendanceByClassDate} from './attendance-query.mjs';
import {nepalGregorianDate} from './nepal-date.mjs';
import {isActiveEnrolledStudent} from './student-enrollment-status.mjs';
import {validateSchoolId} from './school-paths.mjs';
const requestedSchool=new URL(location.href).searchParams.get('schoolId');
const $=id=>document.getElementById(id),status=message=>{$('message').textContent=message};
let auth,authSdk,db,api,actor,schoolId,store,signingIn=false,cursor=null,records=[],epoch=0,busy=false,rosterEpoch=0,rosterCursor=null,rosterStudents=[],rosterBusy=false,rosterSelections=new Map(),savingAttendance=false,attendanceReviewRequired=false,attendanceReviewInProgress=false;
function clear(){attendanceReviewRequired=false;attendanceReviewInProgress=false;rosterEpoch++;rosterCursor=null;rosterStudents=[];rosterSelections.clear();rosterBusy=false;$('bulkArea').hidden=true;$('rosterRows').replaceChildren();$('rosterCount').textContent='';$('rosterNext').disabled=true;epoch++;busy=false;actor=null;schoolId=null;store=null;cursor=null;records=[];$('rows').replaceChildren();$('work').hidden=true;$('writeArea').hidden=true;$('next').disabled=true;$('count').textContent=''}
$('date').value=nepalGregorianDate();
$('connect').onclick=async()=>{try{({auth,authSdk,db,api}=await connectSchoolFirebase());authSdk.onAuthStateChanged(auth,user=>{if(actor&&(!user||user.uid!==actor.uid)){clear();$('save').disabled=true;$('bulkSave').disabled=true;$('logout').disabled=true;status('विद्यालयको Login परिवर्तन भयो। फेरि प्रमाणित गर्नुहोस्।')}});$('connect').disabled=true;$('login').disabled=false;if(requestedSchool){try{$('schoolId').value=validateSchoolId(requestedSchool);if(auth.currentUser)queueMicrotask(()=>$('login').click())}catch(e){status('Invalid school selection: '+e.message)}}status('V47 connected')}catch(e){status(e.message)}};
$('login').onclick=async()=>{if(savingAttendance||signingIn)return;signingIn=true;$('login').disabled=true;clear();let freshSignIn=false,signedUid=null;try{schoolId=validateSchoolId($('schoolId').value.trim());freshSignIn=!auth.currentUser;const credential=freshSignIn?await authSdk.signInWithEmailAndPassword(auth,$('email').value,$('password').value):{user:auth.currentUser};$('password').value='';signedUid=credential.user.uid;const uid=signedUid,selectedSchool=schoolId;const session=await verifySchoolSession({schoolId:selectedSchool,uid,readDocument:async path=>{const snap=await api.getDoc(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null;}});if(auth.currentUser?.uid!==uid||schoolId!==selectedSchool)throw new Error('Authentication changed during verification');const school=await api.getDoc(api.doc(db,'schools',selectedSchool));if(!school.exists()||school.data().active!==true||auth.currentUser?.uid!==uid)throw new Error('School inactive or unavailable');actor={role:session.role,active:true,schoolId:selectedSchool,uid};if(freshSignIn)startVerifiedSchoolActivity();$('bulkArea').hidden=actor.role!=='school_admin';$('save').disabled=!['school_admin','teacher'].includes(actor.role);const selectedActor=actor;store=createSchoolStore({db,api,member:actor,schoolId,assertSession:()=>{if(actor!==selectedActor||schoolId!==selectedSchool||auth?.currentUser?.uid!==uid)throw new Error('School session changed')}});$('heading').textContent='Attendance — '+String(school.data().name??schoolId);$('writeArea').hidden=!['school_admin','teacher'].includes(actor.role);$('work').hidden=false;$('logout').disabled=false;await load(true)}catch(e){clear();try{if(freshSignIn&&signedUid&&auth?.currentUser?.uid===signedUid)await authSdk.signOut(auth)}catch{}status(e.message)}finally{signingIn=false;$('login').disabled=!auth}};
$('logout').onclick=async()=>{if(savingAttendance){status('Wait for attendance save to finish before signing out');return}clear();try{await authSdk.signOut(auth);$('logout').disabled=true;status('Signed out')}catch(e){status(e.message)}};
function render(){const body=$('rows');body.replaceChildren();for(const record of records){const tr=document.createElement('tr');for(const value of [record.studentId,record.date,record.class,record.present===true?'Present':'Absent']){const td=document.createElement('td');td.textContent=String(value??'');tr.append(td)}body.append(tr)}$('count').textContent=records.length+' matching attendance records loaded'}
async function load(reset=false,review=false){if(savingAttendance||!store||(busy&&!reset))return;const current=epoch;busy=true;$('next').disabled=true;try{const result=await loadAttendanceByClassDate({db,api,actor,schoolId,schoolClass:$('schoolClass').value,date:$('date').value,pageSize:50,cursor:reset?null:cursor});if(current!==epoch||!actor||auth?.currentUser?.uid!==actor.uid)return;records=reset?result.records:[...records,...result.records];cursor=result.cursor;render();$('next').disabled=!result.hasMore;if(review){attendanceReviewInProgress=true;if(result.hasMore){status('Attendance को पहिलो 50 रेकर्ड मात्र देखिएको छ। बाँकी पृष्ठ जाँच नगरी पुनः Save खुल्दैन। Next बाट सबै पृष्ठ जाँच्नुहोस्।');}else{attendanceReviewRequired=false;attendanceReviewInProgress=false;status('Attendance समीक्षा पूरा भयो। पुनः Save गर्नुअघि रेकर्ड मिलाउनुहोस्।')}}else if(attendanceReviewRequired&&attendanceReviewInProgress&&!result.hasMore&&records.length>0){attendanceReviewRequired=false;attendanceReviewInProgress=false;status('Attendance का सबै पृष्ठ लोड भए। पुनः Save गर्नुअघि रेकर्ड मिलाउनुहोस्।')}else status('Class and date attendance loaded');if(!attendanceReviewRequired&&!savingAttendance){$('schoolClass').disabled=false;$('date').disabled=false}}catch(e){if(current===epoch)status('Unable to load attendance: '+e.message)}finally{if(current===epoch)busy=false}}
function reset(){attendanceReviewInProgress=false;epoch++;busy=false;cursor=null;records=[];$('rows').replaceChildren();$('count').textContent='';load(true)}
$('load').onclick=()=>{epoch++;busy=false;cursor=null;records=[];$('rows').replaceChildren();$('count').textContent='';load(true,true)};$('date').onchange=()=>{if(!savingAttendance){rosterSelections.clear();renderRoster();reset()}};$('schoolClass').onchange=()=>{if(!savingAttendance)reset()};$('next').onclick=()=>load(false);
$('save').onclick=async()=>{if(savingAttendance)return;const button=$('save');savingAttendance=true;epoch++;busy=false;$('next').disabled=true;button.disabled=true;$('schoolClass').disabled=true;$('date').disabled=true;$('studentId').disabled=true;$('present').disabled=true;$('logout').disabled=true;$('login').disabled=true;try{if(attendanceReviewRequired)throw new Error('अघिल्लो Bulk Save को स्थिति अनिश्चित छ। Attendance का सबै पृष्ठ Reload गरेर जाँच्नुहोस्।');if(!['school_admin','teacher'].includes(actor?.role))throw new Error('School Admin or assigned Teacher required');const input={date:$('date').value,studentId:$('studentId').value.trim(),class:$('schoolClass').value,present:$('present').value==='true'};if(actor.role==='teacher'&&!confirm(input.studentId+' को '+input.date+' को हाजिरी सुरक्षित/सच्याउने? तपाईंलाई तोकिएको कक्षाको Present/Absent मात्र सच्याउन मिल्छ; विद्यार्थी, मिति वा कक्षा परिवर्तन गर्न पाइँदैन।')){status('Save cancelled');return}if(!auth?.currentUser?.uid||auth.currentUser.uid!==actor.uid)throw new Error('Authentication changed; sign in again');const selectedSchool=schoolId,uid=actor.uid,selectedActor=actor;const session=await verifySchoolSession({schoolId:selectedSchool,uid,readDocument:async path=>{const snap=await api.getDoc(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null;}});if(session.role!==actor.role||schoolId!==selectedSchool||auth?.currentUser?.uid!==uid)throw new Error('Attendance permission changed');const result=actor.role==='teacher'?await saveAssignedTeacherAttendance({db,api,actor,schoolId,input,
 assertSession:()=>{if(auth?.currentUser?.uid!==uid||schoolId!==selectedSchool||actor!==selectedActor||actor?.role!=='teacher'||actor?.active!==true)throw Error('Teacher Login changed during attendance save')}
}):await saveSchoolAttendance({db,api,actor,schoolId,input});reset();status((result.corrected?'Attendance corrected: ':'Attendance saved: ')+result.id)}catch(e){status('Attendance not saved: '+e.message)}finally{savingAttendance=false;button.disabled=!['school_admin','teacher'].includes(actor?.role);$('schoolClass').disabled=attendanceReviewRequired;$('date').disabled=attendanceReviewRequired;$('studentId').disabled=false;$('present').disabled=false;$('logout').disabled=false;$('login').disabled=false}};

function renderRoster(){const body=$('rosterRows');body.replaceChildren();for(const student of rosterStudents){const tr=document.createElement('tr');for(const value of [student.name??'',student.rollNo??'']){const td=document.createElement('td');td.textContent=String(value);tr.append(td)}const cell=document.createElement('td');if(actor?.role==='school_admin'){const select=document.createElement('select');for(const [value,label] of [['','Not marked'],['true','Present'],['false','Absent']]){const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option)}select.value=rosterSelections.get(student.id)??'';select.disabled=savingAttendance;select.onchange=()=>{if(savingAttendance)return;if(select.value==='')rosterSelections.delete(student.id);else rosterSelections.set(student.id,select.value)};cell.append(select)}else{cell.textContent='Read only'}tr.append(cell);body.append(tr)}$('rosterCount').textContent=rosterStudents.length+' students loaded'}
async function showRoster(reset=false){if(savingAttendance||!store||(rosterBusy&&!reset))return;const current=rosterEpoch;rosterBusy=true;$('rosterNext').disabled=true;try{const result=await loadClassRoster({db,api,actor,schoolId,schoolClass:$('schoolClass').value,pageSize:50,cursor:reset?null:rosterCursor});if(current!==rosterEpoch||!actor||auth?.currentUser?.uid!==actor.uid)return;const eligible=result.students.filter(isActiveEnrolledStudent);rosterStudents=reset?eligible:[...rosterStudents,...eligible];rosterCursor=result.cursor;renderRoster();$('rosterNext').disabled=!result.hasMore;status('Class roster loaded (active students only)')}catch(e){if(current===rosterEpoch)status('Unable to load roster: '+e.message)}finally{if(current===rosterEpoch)rosterBusy=false}}
function resetRoster(){if(savingAttendance)return;rosterEpoch++;rosterBusy=false;rosterCursor=null;rosterStudents=[];rosterSelections.clear();$('rosterRows').replaceChildren();$('rosterCount').textContent='';showRoster(true)}
$('rosterLoad').onclick=()=>{if(!savingAttendance)resetRoster()};$('rosterNext').onclick=()=>showRoster(false);
$('schoolClass').addEventListener('change',()=>{if(savingAttendance)return;rosterEpoch++;rosterBusy=false;rosterCursor=null;rosterStudents=[];rosterSelections.clear();$('rosterRows').replaceChildren();$('rosterNext').disabled=true;$('rosterCount').textContent='';$('studentId').value=''});

function markAll(value){if(savingAttendance||actor?.role!=='school_admin')return;for(const student of rosterStudents)rosterSelections.set(student.id,value);renderRoster()}
$('allPresent').onclick=()=>markAll('true');$('allAbsent').onclick=()=>markAll('false');
$('bulkSave').onclick=async()=>{if(savingAttendance)return;savingAttendance=true;epoch++;busy=false;$('next').disabled=true;rosterEpoch++;rosterBusy=false;const button=$('bulkSave');button.disabled=true;$('logout').disabled=true;$('login').disabled=true;$('save').disabled=true;$('schoolClass').disabled=true;$('date').disabled=true;$('rosterLoad').disabled=true;$('rosterNext').disabled=true;$('allPresent').disabled=true;$('allAbsent').disabled=true;try{if(actor?.role!=='school_admin')throw new Error('School Admin required');if(!auth?.currentUser?.uid||auth.currentUser.uid!==actor.uid)throw new Error('Authentication changed; sign in again');const selected=rosterStudents.filter(s=>rosterSelections.has(s.id));if(!selected.length)throw new Error('Select students before saving');if(attendanceReviewRequired){status('अघिल्लो Save को स्थिति अनिश्चित छ। पहिले Attendance सूची Reload गरी पुष्टि गर्नुहोस्।');return;}const date=$('date').value,schoolClass=$('schoolClass').value;if(!confirm('Overwrite attendance for '+selected.length+' selected students on '+date+'? Saves run in groups of 10; a later failure may leave earlier groups saved.')){status('Save cancelled');return}const uid=actor.uid,selectedSchool=schoolId;const session=await verifySchoolSession({schoolId:selectedSchool,uid,readDocument:async path=>{const snap=await api.getDoc(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null;}});if(session.role!=='school_admin'||schoolId!==selectedSchool||auth?.currentUser?.uid!==uid)throw new Error('School Admin permission changed');const entries=selected.map(student=>({date,class:schoolClass,studentId:student.id,present:rosterSelections.get(student.id)==='true'}));savingAttendance=true;$('logout').disabled=true;$('login').disabled=true;$('save').disabled=true;renderRoster();const result=await saveLoadedClassAttendance({db,api,actor,schoolId,entries,onProgress:({saved,total,savedIds})=>{for(const id of savedIds)rosterSelections.delete(id);status('Saved '+saved+' of '+total+' attendance records')},assertSession:()=>{if(auth?.currentUser?.uid!==uid||schoolId!==selectedSchool||actor?.uid!==uid||actor?.role!=='school_admin')throw new Error('School login changed before attendance batch')}});attendanceReviewRequired=false;renderRoster();reset();status('Saved '+result.saved+' of '+result.total+' attendance records')}catch(e){if(e?.name==='PartialAttendanceSaveError'){attendanceReviewRequired=true;attendanceReviewInProgress=false;}renderRoster();status(e?.name==='PartialAttendanceSaveError' ? 'Attendance Save असफल: '+e.saved+' / '+e.total+' विद्यार्थीको Save पुष्टि भयो। '+e.remainingStudentIds.length+' विद्यार्थीको Save पुष्टि हुन बाँकी छ। बाँकी चयन सुरक्षित छ। नेटवर्क त्रुटि हुँदा Save भइसकेको पनि हुन सक्छ; पुनः प्रयास गर्नुअघि Attendance सूची Reload गरी जाँच्नुहोस्। कारण: '+(e.cause?.message??e.message) : 'Attendance save incomplete: '+e.message+' Review remaining selections and retry.')}finally{savingAttendance=false;renderRoster();$('logout').disabled=!actor;$('login').disabled=!auth;$('save').disabled=!['school_admin','teacher'].includes(actor?.role);button.disabled=actor?.role!=='school_admin';$('schoolClass').disabled=attendanceReviewRequired;$('date').disabled=attendanceReviewRequired;$('rosterLoad').disabled=false;$('rosterNext').disabled=false;$('allPresent').disabled=false;$('allAbsent').disabled=false}};


/** Save an explicitly completed class only after a second authoritative Firestore roster check.
 * Large classes still save in batches of 10, NOT as one atomic transaction.
 */
$('verifiedSave').onclick=async()=>{
 if(savingAttendance)return;
 const wasLoadingRoster=rosterBusy,moreRosterPages=!$('rosterNext').disabled;
 savingAttendance=true;epoch++;busy=false;$('next').disabled=true;rosterEpoch++;rosterBusy=false;
 const button=$('verifiedSave');
 for(const id of ['verifiedSave','bulkSave','save','logout','login','schoolClass','date','rosterLoad','rosterNext','allPresent','allAbsent'])$(id).disabled=true;
 renderRoster();
 let succeeded=false;
 try{
  if(actor?.role!=='school_admin')throw new Error('School Admin required');
  if(attendanceReviewRequired)throw new Error('अघिल्लो Save को स्थिति अनिश्चित छ। पहिले Attendance का सबै पृष्ठ Reload गरी पुष्टि गर्नुहोस्।');
  if(!auth?.currentUser?.uid||auth.currentUser.uid!==actor.uid)throw new Error('Authentication changed; sign in again');
  if(wasLoadingRoster||moreRosterPages||rosterStudents.length===0)throw new Error('पूरा कक्षाको Attendance Save गर्न सबै विद्यार्थीका पृष्ठ Load गर्नुहोस्।');
  if(!rosterStudents.every(student=>rosterSelections.has(student.id))||rosterSelections.size!==rosterStudents.length)
   throw new Error('पूरा कक्षाको Attendance Save गर्न प्रत्येक विद्यार्थी Present वा Absent छान्नुहोस्।');
  const date=$('date').value,classId=$('schoolClass').value,selectedSchool=schoolId,selectedActor=actor,uid=actor.uid;
  const count=rosterStudents.length;
  if(!confirm('पूरा कक्षाका '+count+' विद्यार्थीको '+date+' को Attendance सच्याएर Save गर्ने? १० जनाभन्दा बढी भए Save आंशिक हुन सक्छ।')){status('Save cancelled');return}
  const session=await verifySchoolSession({schoolId:selectedSchool,uid,readDocument:async path=>{
   const snap=await api.getDoc(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null;
  }});
  if(session.role!=='school_admin'||schoolId!==selectedSchool||actor!==selectedActor||auth?.currentUser?.uid!==uid)
   throw new Error('School Admin permission changed');
  const entries=rosterStudents.map(student=>({date,class:classId,studentId:student.id,present:rosterSelections.get(student.id)==='true'}));
  const result=await saveAuthoritativeClassAttendance({db,api,actor,schoolId:selectedSchool,classId,date,entries,
   assertSession:()=>{
    if(auth?.currentUser?.uid!==uid||schoolId!==selectedSchool||actor!==selectedActor||actor?.role!=='school_admin'||actor?.active!==true)
     throw new Error('School session changed during complete-class attendance save');
   },
   onProgress:({saved,total,savedIds})=>{
    for(const id of savedIds)rosterSelections.delete(id);
    status('पूरा कक्षा Save: '+saved+' / '+total+' विद्यार्थी');
   }
  });
  if(result.rosterReverified!==true)throw new Error('Complete-class roster was not reverified');
  attendanceReviewRequired=false;succeeded=true;
  status('पूरा कक्षाको Attendance सुरक्षित र विद्यार्थी सूची पुनः प्रमाणित: '+result.saved+' / '+result.total);
 }catch(e){
  if(e?.name==='PartialAttendanceSaveError'||e?.name==='AttendancePostSaveReviewError'){attendanceReviewRequired=true;attendanceReviewInProgress=false;}
  status(e?.name==='AttendancePostSaveReviewError'
   ? 'सबै '+e.saved+' / '+e.total+' हाजिरी Save Batch पुष्टि भए पनि कक्षाको विद्यार्थी सूची अन्तिम पटक प्रमाणित हुन सकेन। कक्षा/मिति अनुसार Attendance सूची पुनः Reload गरी जाँच नगरी पूरा भएको नमान्नुहोस्। कारण: '+(e.cause?.message??e.message)
   : e?.name==='PartialAttendanceSaveError'
   ? 'Attendance Save असफल: '+e.saved+' / '+e.total+' को Save पुष्टि भयो; '+e.remainingStudentIds.length+' विद्यार्थी बाँकी छन्। नेटवर्क त्रुटि हुँदा Save भइसकेको पनि हुन सक्छ। पुनः प्रयास गर्नुअघि Attendance सूची Reload गरी जाँच्नुहोस्। कारण: '+(e.cause?.message??e.message)
   : 'पूर्ण कक्षा Save हुन सकेन: '+e.message);
 }finally{
  savingAttendance=false;renderRoster();
  $('logout').disabled=!actor;$('login').disabled=!auth;
  $('save').disabled=!['school_admin','teacher'].includes(actor?.role);
  $('bulkSave').disabled=actor?.role!=='school_admin';button.disabled=actor?.role!=='school_admin';
  $('schoolClass').disabled=attendanceReviewRequired;$('date').disabled=attendanceReviewRequired;
  $('rosterLoad').disabled=false;$('rosterNext').disabled=false;
  // Only a verified, completed roster has no additional pages.
  $('rosterNext').disabled=moreRosterPages?false:true;
  $('allPresent').disabled=false;$('allAbsent').disabled=false;
  if(succeeded)reset();
 }
};

// Automatically resume a dashboard-selected school; authorization is rechecked on this page.
if(requestedSchool)queueMicrotask(()=>$('connect').click());
