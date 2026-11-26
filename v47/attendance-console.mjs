import {readLegacyAttendance,exportLegacyAttendance} from './legacy-attendance-history.mjs';
import {neError} from './nepali-feedback.mjs';
import {connectSchoolFirebase,startVerifiedSchoolActivity,bindVerifiedModuleActivity} from './school-firebase-client.mjs';
import {verifySchoolSession} from './verified-school-session.mjs';
import {createSchoolStore} from './firestore-adapter.mjs';
import {saveSchoolAttendance} from './attendance-service.mjs';
import {saveAssignedTeacherAttendance} from './teacher-attendance-service.mjs';
import {saveTeacherClassAttendance} from './teacher-class-attendance.mjs';
import {verifyTeacherAttendanceDuty} from './verified-teacher-attendance-duty.mjs';
import {saveLoadedClassAttendance} from './attendance-class-save.mjs';
import {saveAuthoritativeClassAttendance} from './verified-class-attendance-save.mjs';
import {requestAtomicAttendance} from './atomic-attendance-client.mjs';
import {loadClassRoster} from './attendance-roster.mjs';
import {loadAttendanceByClassDate} from './attendance-query.mjs';
import {nepalGregorianDate} from './nepal-date.mjs';
import {isActiveEnrolledStudent} from './student-enrollment-status.mjs';
import {validateSchoolId} from './school-paths.mjs';
const requestedSchool=new URL(location.href).searchParams.get('schoolId');
const $=id=>document.getElementById(id),status=message=>{$('message').textContent=message};
let auth,authSdk,db,api,actor,schoolId,store,signingIn=false,cursor=null,records=[],epoch=0,busy=false,rosterEpoch=0,rosterCursor=null,rosterStudents=[],rosterBusy=false,rosterSelections=new Map(),savingAttendance=false,attendanceReviewRequired=false,attendanceReviewInProgress=false;
let teacherDuty=null;
function clear(){resetLegacy();$('legacyAttendance').hidden=true;teacherDuty=null;$('teacherBulkArea').hidden=true;attendanceReviewRequired=false;attendanceReviewInProgress=false;rosterEpoch++;rosterCursor=null;rosterStudents=[];rosterSelections.clear();rosterBusy=false;$('bulkArea').hidden=true;$('rosterRows').replaceChildren();$('rosterCount').textContent='';$('rosterNext').disabled=true;epoch++;busy=false;actor=null;schoolId=null;store=null;cursor=null;records=[];$('rows').replaceChildren();$('work').hidden=true;$('writeArea').hidden=true;$('next').disabled=true;$('count').textContent=''}
let legacyEpoch=0;
function resetLegacy(){legacyEpoch++;$('legacyRows').replaceChildren();$('legacyStatus').textContent='';}
$('legacyDate').onchange=resetLegacy;
async function openLegacy(exportFile=false){
 resetLegacy();const request=legacyEpoch,member=actor,date=$('legacyDate').value;
 const check=()=>{if(request!==legacyEpoch||!member||actor!==member||auth?.currentUser?.uid!==member.uid||$('legacyDate').value!==date)throw Error('History selection changed')};
 $('legacyStatus').textContent='पुरानो हाजिरी जाँच हुँदैछ…';
 try{
  check();const args={db,api,actor:member,schoolId:member.schoolId,date,assertCurrent:check};
  if(exportFile){
   const f=await exportLegacyAttendance(args);check();
   const url=URL.createObjectURL(f.blob),a=document.createElement('a');a.href=url;a.download=f.filename;
   try{document.body.append(a);a.click()}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
   $('legacyStatus').textContent=f.count+' अभिलेखको Excel तयार भयो।';
  }else{
   const model=await readLegacyAttendance(args);check();
   for(const b of model.batches)for(const s of b.students){
    const tr=document.createElement('tr');for(const value of [b.id,b.className,b.section,b.attendanceType,b.subject,s.studentName,s.studentId,s.status,s.remark]){
     const td=document.createElement('td');td.textContent=String(value??'');tr.append(td)
    }$('legacyRows').append(tr);
   }
   $('legacyStatus').textContent=model.batches.length+' पुराना कक्षागत अभिलेख भेटिए। Present, Absent र Leave मूल अभिलेखअनुसार देखाइएको छ।';
  }
 }catch(e){if(request===legacyEpoch)$('legacyStatus').textContent='पुरानो हाजिरी खोल्न सकिएन: '+neError(e)}
}
$('legacyLoad').onclick=()=>void openLegacy();$('legacyExport').onclick=()=>void openLegacy(true);
$('date').value=nepalGregorianDate();
$('connect').onclick=async()=>{try{({auth,authSdk,db,api}=await connectSchoolFirebase());authSdk.onAuthStateChanged(auth,user=>{if(actor&&(!user||user.uid!==actor.uid)){clear();$('save').disabled=true;$('bulkSave').disabled=true;$('logout').disabled=true;status('विद्यालयको Login परिवर्तन भयो। फेरि प्रमाणित गर्नुहोस्।')}});$('connect').disabled=true;$('login').disabled=false;if(requestedSchool){try{$('schoolId').value=validateSchoolId(requestedSchool);if(auth.currentUser)queueMicrotask(()=>$('login').click())}catch(e){status('विद्यालय छनोट अमान्य: '+neError(e))}}status('V47 मा जडान भयो।')}catch(e){status(neError(e))}};
$('login').onclick=async()=>{if(savingAttendance||signingIn)return;signingIn=true;$('login').disabled=true;clear();let freshSignIn=false,signedUid=null;try{schoolId=validateSchoolId($('schoolId').value.trim());freshSignIn=!auth.currentUser;const credential=freshSignIn?await authSdk.signInWithEmailAndPassword(auth,$('email').value,$('password').value):{user:auth.currentUser};$('password').value='';signedUid=credential.user.uid;const uid=signedUid,selectedSchool=schoolId;const session=await verifySchoolSession({schoolId:selectedSchool,uid,readDocument:async path=>{const snap=await api.getDoc(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null;}});if(auth.currentUser?.uid!==uid||schoolId!==selectedSchool)throw new Error('Authentication changed during verification');const school=await api.getDoc(api.doc(db,'schools',selectedSchool));if(!school.exists()||school.data().active!==true||auth.currentUser?.uid!==uid)throw new Error('School inactive or unavailable');actor={role:session.role,active:true,schoolId:selectedSchool,uid};if(freshSignIn)startVerifiedSchoolActivity();{const activityMember=actor;bindVerifiedModuleActivity(activityMember,()=>actor===activityMember&&auth?.currentUser?.uid===activityMember.uid);}$('bulkArea').hidden=actor.role!=='school_admin';$('save').disabled=!['school_admin','teacher'].includes(actor.role);const selectedActor=actor;store=createSchoolStore({db,api,member:actor,schoolId,assertSession:()=>{if(actor!==selectedActor||schoolId!==selectedSchool||auth?.currentUser?.uid!==uid)throw new Error('School session changed')}});$('heading').textContent='Attendance — '+String(school.data().name??schoolId);$('writeArea').hidden=!['school_admin','teacher'].includes(actor.role);$('work').hidden=false;$('legacyAttendance').hidden=!['school_admin','viewer'].includes(actor.role);$('legacyDate').value=$('date').value;$('logout').disabled=false;await load(true)}catch(e){clear();try{if(freshSignIn&&signedUid&&auth?.currentUser?.uid===signedUid)await authSdk.signOut(auth)}catch{}status(neError(e))}finally{signingIn=false;$('login').disabled=!auth}};
$('logout').onclick=async()=>{if(savingAttendance){status('हाजिरी सुरक्षित गर्ने प्रक्रिया पूरा भएपछि लगआउट गर्नुहोस्।');return}clear();try{await authSdk.signOut(auth);$('logout').disabled=true;status('सफलतापूर्वक लगआउट भयो।')}catch(e){status(neError(e))}};
function render(){const body=$('rows');body.replaceChildren();for(const record of records){const tr=document.createElement('tr');for(const value of [record.studentId,record.date,record.class,record.present===true?'Present':'Absent']){const td=document.createElement('td');td.textContent=String(value??'');tr.append(td)}body.append(tr)}$('count').textContent=records.length+' matching attendance records loaded'}
async function load(reset=false,review=false){if(savingAttendance||!store||(busy&&!reset))return;const current=epoch;busy=true;$('next').disabled=true;try{const result=await loadAttendanceByClassDate({db,api,actor,schoolId,schoolClass:$('schoolClass').value,date:$('date').value,pageSize:50,cursor:reset?null:cursor});if(current!==epoch||!actor||auth?.currentUser?.uid!==actor.uid)return;records=reset?result.records:[...records,...result.records];cursor=result.cursor;render();$('next').disabled=!result.hasMore;if(review){attendanceReviewInProgress=true;if(result.hasMore){status('Attendance को पहिलो 50 रेकर्ड मात्र देखिएको छ। बाँकी पृष्ठ जाँच नगरी पुनः Save खुल्दैन। Next बाट सबै पृष्ठ जाँच्नुहोस्।');}else{attendanceReviewRequired=false;attendanceReviewInProgress=false;status('Attendance समीक्षा पूरा भयो। पुनः Save गर्नुअघि रेकर्ड मिलाउनुहोस्।')}}else if(attendanceReviewRequired&&attendanceReviewInProgress&&!result.hasMore&&records.length>0){attendanceReviewRequired=false;attendanceReviewInProgress=false;status('Attendance का सबै पृष्ठ लोड भए। पुनः Save गर्नुअघि रेकर्ड मिलाउनुहोस्।')}else status('कक्षा र मितिअनुसार हाजिरी लोड भयो।');if(!attendanceReviewRequired&&!savingAttendance){$('schoolClass').disabled=false;$('date').disabled=false}}catch(e){if(current===epoch)status('हाजिरी लोड भएन: '+neError(e))}finally{if(current===epoch)busy=false}}
function reset(){attendanceReviewInProgress=false;epoch++;busy=false;cursor=null;records=[];$('rows').replaceChildren();$('count').textContent='';load(true)}
$('load').onclick=()=>{epoch++;busy=false;cursor=null;records=[];$('rows').replaceChildren();$('count').textContent='';load(true,true)};$('date').onchange=()=>{if(!savingAttendance){rosterSelections.clear();renderRoster();reset()}};$('schoolClass').onchange=()=>{if(!savingAttendance)reset()};$('next').onclick=()=>load(false);
$('save').onclick=async()=>{if(savingAttendance)return;const button=$('save');savingAttendance=true;epoch++;busy=false;$('next').disabled=true;button.disabled=true;$('schoolClass').disabled=true;$('date').disabled=true;$('studentId').disabled=true;$('present').disabled=true;$('logout').disabled=true;$('login').disabled=true;try{if(attendanceReviewRequired)throw new Error('अघिल्लो Bulk Save को स्थिति अनिश्चित छ। Attendance का सबै पृष्ठ Reload गरेर जाँच्नुहोस्।');if(!['school_admin','teacher'].includes(actor?.role))throw new Error('School Admin or assigned Teacher required');const input={date:$('date').value,studentId:$('studentId').value.trim(),class:$('schoolClass').value,present:$('present').value==='true'};if(actor.role==='teacher'&&!confirm(input.studentId+' को '+input.date+' को हाजिरी सुरक्षित/सच्याउने? तपाईंलाई तोकिएको कक्षाको Present/Absent मात्र सच्याउन मिल्छ; विद्यार्थी, मिति वा कक्षा परिवर्तन गर्न पाइँदैन।')){status('सुरक्षित गर्ने प्रक्रिया रद्द भयो।');return}if(!auth?.currentUser?.uid||auth.currentUser.uid!==actor.uid)throw new Error('प्रमाणीकरण परिवर्तन भयो। फेरि लगइन गर्नुहोस्।');const selectedSchool=schoolId,uid=actor.uid,selectedActor=actor;const session=await verifySchoolSession({schoolId:selectedSchool,uid,readDocument:async path=>{const snap=await api.getDoc(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null;}});if(session.role!==actor.role||schoolId!==selectedSchool||auth?.currentUser?.uid!==uid)throw new Error('Attendance permission changed');const result=actor.role==='teacher'?await saveAssignedTeacherAttendance({db,api,actor,schoolId,input,
 assertSession:()=>{if(auth?.currentUser?.uid!==uid||schoolId!==selectedSchool||actor!==selectedActor||actor?.role!=='teacher'||actor?.active!==true)throw Error('Teacher Login changed during attendance save')}
}):await saveSchoolAttendance({db,api,actor,schoolId,input});reset();status((result.corrected?'हाजिरी सुधार भयो: ':'हाजिरी सुरक्षित भयो: ')+result.id)}catch(e){status('हाजिरी सुरक्षित भएन: '+neError(e))}finally{savingAttendance=false;button.disabled=!['school_admin','teacher'].includes(actor?.role);$('schoolClass').disabled=attendanceReviewRequired;$('date').disabled=attendanceReviewRequired;$('studentId').disabled=false;$('present').disabled=false;$('logout').disabled=false;$('login').disabled=false}};

function canSelectRoster(){return actor?.role==='school_admin'||(actor?.role==='teacher'&&teacherDuty?.uid===actor.uid&&teacherDuty.schoolId===schoolId&&teacherDuty.classId===$('schoolClass').value)}
function renderRoster(){const body=$('rosterRows');body.replaceChildren();for(const student of rosterStudents){const tr=document.createElement('tr');for(const value of [student.nameEnglish||student.nameEn||student.name||student.studentName||student.id,student.rollNo??student.roll??'']){const td=document.createElement('td');td.textContent=String(value);tr.append(td)}const cell=document.createElement('td');if(canSelectRoster()){const select=document.createElement('select');for(const [value,label] of [['','Not marked'],['true','Present'],['false','Absent']]){const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option)}select.value=rosterSelections.get(student.id)??'';select.disabled=savingAttendance;select.onchange=()=>{if(savingAttendance)return;if(select.value==='')rosterSelections.delete(student.id);else rosterSelections.set(student.id,select.value)};cell.append(select)}else{cell.textContent='Read only'}tr.append(cell);body.append(tr)}$('rosterCount').textContent=rosterStudents.length+' students loaded'}
async function showRoster(reset=false){if(savingAttendance||!store||(rosterBusy&&!reset))return;const current=rosterEpoch;rosterBusy=true;$('rosterNext').disabled=true;try{const selected=actor,sid=schoolId,classId=$('schoolClass').value;
 const check=()=>{if(current!==rosterEpoch||actor!==selected||schoolId!==sid||auth?.currentUser?.uid!==selected?.uid||$('schoolClass').value!==classId)throw Error('School session changed')};
 if(selected?.role==='teacher'){
  teacherDuty=null;$('teacherBulkArea').hidden=true;
  const duty=await verifyTeacherAttendanceDuty({db,api,actor:selected,schoolId:sid,classId,revalidate:async()=>{check();const member=await verifySchoolSession({schoolId:sid,uid:selected.uid,readDocument:async path=>{const s=await api.getDoc(api.doc(db,...path.split('/')));return s.exists()?s.data():null}});check();if(member.role!=='teacher')throw Error('Teacher role changed')}});
  check();teacherDuty=duty;
 }
 const result=await loadClassRoster({db,api,actor,schoolId,schoolClass:$('schoolClass').value,pageSize:50,cursor:reset?null:rosterCursor});if(current!==rosterEpoch||!actor||auth?.currentUser?.uid!==actor.uid)return;const eligible=result.students.filter(isActiveEnrolledStudent);rosterStudents=reset?eligible:[...rosterStudents,...eligible];rosterCursor=result.cursor;$('teacherBulkArea').hidden=actor?.role!=='teacher'||!canSelectRoster();renderRoster();$('rosterNext').disabled=!result.hasMore;status('कक्षाका सक्रिय विद्यार्थीको सूची लोड भयो।')}catch(e){if(current===rosterEpoch){teacherDuty=null;$('teacherBulkArea').hidden=true;rosterStudents=[];rosterSelections.clear();renderRoster();status('विद्यार्थी सूची लोड भएन: '+neError(e))}}finally{if(current===rosterEpoch)rosterBusy=false}}
function resetRoster(){if(savingAttendance)return;rosterEpoch++;rosterBusy=false;teacherDuty=null;$('teacherBulkArea').hidden=true;rosterCursor=null;rosterStudents=[];rosterSelections.clear();$('rosterRows').replaceChildren();$('rosterCount').textContent='';showRoster(true)}
$('rosterLoad').onclick=()=>{if(!savingAttendance)resetRoster()};$('rosterNext').onclick=()=>showRoster(false);
$('schoolClass').addEventListener('change',()=>{if(savingAttendance)return;teacherDuty=null;$('teacherBulkArea').hidden=true;rosterEpoch++;rosterBusy=false;rosterCursor=null;rosterStudents=[];rosterSelections.clear();$('rosterRows').replaceChildren();$('rosterNext').disabled=true;$('rosterCount').textContent='';$('studentId').value=''});

function markAll(value){if(savingAttendance||!canSelectRoster())return;for(const student of rosterStudents)rosterSelections.set(student.id,value);renderRoster()}
$('allPresent').onclick=()=>markAll('true');$('allAbsent').onclick=()=>markAll('false');
$('bulkSave').onclick=async()=>{if(savingAttendance)return;savingAttendance=true;epoch++;busy=false;$('next').disabled=true;rosterEpoch++;rosterBusy=false;const button=$('bulkSave');button.disabled=true;$('logout').disabled=true;$('login').disabled=true;$('save').disabled=true;$('schoolClass').disabled=true;$('date').disabled=true;$('rosterLoad').disabled=true;$('rosterNext').disabled=true;$('allPresent').disabled=true;$('allAbsent').disabled=true;try{if(actor?.role!=='school_admin')throw new Error('School Admin required');if(!auth?.currentUser?.uid||auth.currentUser.uid!==actor.uid)throw new Error('प्रमाणीकरण परिवर्तन भयो। फेरि लगइन गर्नुहोस्।');const selected=rosterStudents.filter(s=>rosterSelections.has(s.id));if(!selected.length)throw new Error('Select students before saving');if(attendanceReviewRequired){status('अघिल्लो Save को स्थिति अनिश्चित छ। पहिले Attendance सूची Reload गरी पुष्टि गर्नुहोस्।');return;}const date=$('date').value,schoolClass=$('schoolClass').value;if(!confirm('Overwrite attendance for '+selected.length+' selected students on '+date+'? Saves run in groups of 10; a later failure may leave earlier groups saved.')){status('सुरक्षित गर्ने प्रक्रिया रद्द भयो।');return}const uid=actor.uid,selectedSchool=schoolId;const session=await verifySchoolSession({schoolId:selectedSchool,uid,readDocument:async path=>{const snap=await api.getDoc(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null;}});if(session.role!=='school_admin'||schoolId!==selectedSchool||auth?.currentUser?.uid!==uid)throw new Error('School Admin permission changed');const entries=selected.map(student=>({date,class:schoolClass,studentId:student.id,present:rosterSelections.get(student.id)==='true'}));savingAttendance=true;$('logout').disabled=true;$('login').disabled=true;$('save').disabled=true;renderRoster();const result=await saveLoadedClassAttendance({db,api,actor,schoolId,entries,onProgress:({saved,total,savedIds})=>{for(const id of savedIds)rosterSelections.delete(id);status('Saved '+saved+' of '+total+' attendance records')},assertSession:()=>{if(auth?.currentUser?.uid!==uid||schoolId!==selectedSchool||actor?.uid!==uid||actor?.role!=='school_admin')throw new Error('School login changed before attendance batch')}});attendanceReviewRequired=false;renderRoster();reset();status('Saved '+result.saved+' of '+result.total+' attendance records')}catch(e){if(e?.name==='PartialAttendanceSaveError'){attendanceReviewRequired=true;attendanceReviewInProgress=false;}renderRoster();status(e?.name==='PartialAttendanceSaveError' ? 'Attendance Save असफल: '+e.saved+' / '+e.total+' विद्यार्थीको Save पुष्टि भयो। '+e.remainingStudentIds.length+' विद्यार्थीको Save पुष्टि हुन बाँकी छ। बाँकी चयन सुरक्षित छ। नेटवर्क त्रुटि हुँदा Save भइसकेको पनि हुन सक्छ; पुनः प्रयास गर्नुअघि Attendance सूची Reload गरी जाँच्नुहोस्। कारण: '+(e.cause?.message??e.message) : 'Attendance save incomplete: '+neError(e)+' Review remaining selections and retry.')}finally{savingAttendance=false;renderRoster();$('logout').disabled=!actor;$('login').disabled=!auth;$('save').disabled=!['school_admin','teacher'].includes(actor?.role);button.disabled=actor?.role!=='school_admin';$('schoolClass').disabled=attendanceReviewRequired;$('date').disabled=attendanceReviewRequired;$('rosterLoad').disabled=false;$('rosterNext').disabled=false;$('allPresent').disabled=false;$('allAbsent').disabled=false}};


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
  if(!auth?.currentUser?.uid||auth.currentUser.uid!==actor.uid)throw new Error('प्रमाणीकरण परिवर्तन भयो। फेरि लगइन गर्नुहोस्।');
  if(wasLoadingRoster||moreRosterPages||rosterStudents.length===0)throw new Error('पूरा कक्षाको Attendance Save गर्न सबै विद्यार्थीका पृष्ठ Load गर्नुहोस्।');
  if(!rosterStudents.every(student=>rosterSelections.has(student.id))||rosterSelections.size!==rosterStudents.length)
   throw new Error('पूरा कक्षाको Attendance Save गर्न प्रत्येक विद्यार्थी Present वा Absent छान्नुहोस्।');
  const date=$('date').value,classId=$('schoolClass').value,selectedSchool=schoolId,selectedActor=actor,uid=actor.uid;
  const count=rosterStudents.length;
  if(!confirm('पूरा कक्षाका '+count+' विद्यार्थीको '+date+' को Attendance सच्याएर Save गर्ने? १० जनाभन्दा बढी भए Save आंशिक हुन सक्छ।')){status('सुरक्षित गर्ने प्रक्रिया रद्द भयो।');return}
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
   : 'पूर्ण कक्षा Save हुन सकेन: '+neError(e));
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

// Explicit opt-in API path. Never substitute legacy partial batches on failure.
$('atomicSave').onclick=async()=>{
 if(savingAttendance||signingIn)return;
 const wasLoading=rosterBusy,morePages=!$('rosterNext').disabled;
 const selectedActor=actor,sid=schoolId,uid=actor?.uid,classId=$('schoolClass').value,date=$('date').value;
 let sentCommit=false,succeeded=false;
 savingAttendance=true;epoch++;busy=false;rosterEpoch++;rosterBusy=false;
 const buttons=['atomicSave','verifiedSave','bulkSave','save','logout','login','schoolClass','date','rosterLoad','rosterNext','allPresent','allAbsent','next'];
 for(const id of buttons)$(id).disabled=true;
 renderRoster();
 const check=()=>{if(!uid||actor!==selectedActor||schoolId!==sid||auth?.currentUser?.uid!==uid||
   actor?.role!=='school_admin'||$('schoolClass').value!==classId||$('date').value!==date)throw Error('School session changed')};
 try{
  check();
  if(attendanceReviewRequired)throw Error('Reload and review existing attendance before saving');
  if(wasLoading||morePages||!rosterStudents.length||rosterStudents.length>500||
     rosterSelections.size!==rosterStudents.length||!rosterStudents.every(s=>rosterSelections.has(s.id)))
   throw Error('Load and mark every active student; atomic server limit is 500 per class');
  const entries=rosterStudents.map(s=>({studentId:s.id,class:classId,date,present:rosterSelections.get(s.id)==='true'}));
  const opts={schoolId:sid,classId,date,entries,getIdToken:()=>auth.currentUser.getIdToken(),
   fetchImpl:(...args)=>fetch(...args),assertCurrent:check};
  const review=await requestAtomicAttendance({...opts,reviewDigest:null});
  if(!confirm('Save all '+review.count+' students in ONE transaction? '+review.changed+' records will change.')){status('सम्पूर्ण कक्षाको एकमुष्ट बचत रद्द भयो।');return}
  check();sentCommit=true;
  const result=await requestAtomicAttendance({...opts,reviewDigest:review.reviewDigest});
  check();
  rosterSelections.clear();attendanceReviewRequired=false;succeeded=true;
  status('कक्षाको हाजिरी एकमुष्ट सुरक्षित भयो: '+result.count+' students; '+result.changed+' changed.');
 }catch(e){
  if(sentCommit){attendanceReviewRequired=true;attendanceReviewInProgress=false;}
  status(sentCommit?'एकमुष्ट बचतको पुष्टि भएन। पुनः प्रयास गर्नुअघि हाजिरीका सबै पृष्ठ लोड गर्नुहोस्। '+neError(e):'एकमुष्ट बचतको समीक्षा रोकियो: '+neError(e));
 }finally{
  savingAttendance=false;renderRoster();
  $('atomicSave').disabled=actor?.role!=='school_admin';
  $('verifiedSave').disabled=actor?.role!=='school_admin';$('bulkSave').disabled=actor?.role!=='school_admin';
  $('save').disabled=!['school_admin','teacher'].includes(actor?.role);
  $('logout').disabled=!actor;$('login').disabled=!auth;
  $('schoolClass').disabled=attendanceReviewRequired;$('date').disabled=attendanceReviewRequired;
  $('rosterLoad').disabled=!actor;$('rosterNext').disabled=!actor||!morePages;
  $('allPresent').disabled=!actor;$('allAbsent').disabled=!actor;
  if(succeeded){const message=$('message').textContent;reset();status(message)}
 }
};

$('teacherAllPresent').onclick=()=>markAll('true');
$('teacherAllAbsent').onclick=()=>markAll('false');
$('teacherBulkSave').onclick=async()=>{
 if(savingAttendance||rosterBusy||actor?.role!=='teacher'||!canSelectRoster())return;
 if(attendanceReviewRequired){status('पुनः प्रयास गर्नुअघि हाजिरीका सबै अभिलेख लोड गर्नुहोस्।');return}
 const selected=actor,sid=schoolId,classId=$('schoolClass').value,date=$('date').value,uid=selected.uid;
 const entries=rosterStudents.filter(s=>rosterSelections.has(s.id)).map(s=>({studentId:s.id,class:classId,date,present:rosterSelections.get(s.id)==='true'}));
 if(!entries.length)return status('पहिले Present वा Absent छान्नुहोस्।');
 if(!confirm('Save '+entries.length+' selected students for '+date+'? Saves use groups of 5; earlier groups may remain saved on failure.'))return;
 const morePages=!$('rosterNext').disabled;
 savingAttendance=true;epoch++;busy=false;rosterEpoch++;rosterBusy=false;
 const locks=['teacherBulkSave','teacherAllPresent','teacherAllAbsent','save','logout','login','schoolClass','date','rosterLoad','rosterNext','next','load'];
 for(const id of locks)$(id).disabled=true;
 const check=()=>{if(actor!==selected||schoolId!==sid||auth?.currentUser?.uid!==uid||$('schoolClass').value!==classId||$('date').value!==date)throw Error('School session changed')};
 renderRoster();
 let success=false;
 try{
  check();
  const result=await saveTeacherClassAttendance({db,api,actor:selected,schoolId:sid,entries,assertSession:check,onProgress:({saved,total,savedIds})=>{
   if(actor!==selected)return;for(const id of savedIds)rosterSelections.delete(id);status('Verified '+saved+' / '+total+' attendance records');
  }});
  check();success=true;attendanceReviewRequired=false;
  status('Saved/verified '+result.saved+' students; '+result.changed+' changed, '+result.unchanged+' unchanged.');
 }catch(e){
  if(e.name==='PartialAttendanceSaveError'){attendanceReviewRequired=true;attendanceReviewInProgress=false;status('Confirmed '+e.saved+' / '+e.total+'. Reload every attendance page before retrying; earlier commits are not rolled back. '+e.cause?.message)}
  else{attendanceReviewRequired=true;status('सुरक्षित भएको अवस्था जाँच आवश्यक छ: '+neError(e))}
 }finally{
  savingAttendance=false;renderRoster();
  for(const id of locks)$(id).disabled=false;
  $('logout').disabled=!actor;$('login').disabled=!auth;$('save').disabled=!['teacher','school_admin'].includes(actor?.role);
  $('teacherBulkArea').hidden=actor?.role!=='teacher'||!canSelectRoster();
  $('schoolClass').disabled=attendanceReviewRequired;$('date').disabled=attendanceReviewRequired;
  $('rosterNext').disabled=!actor||!morePages;$('next').disabled=true;
  if(success){const msg=$('message').textContent;reset();status(msg)}
 }
};

// Automatically resume a dashboard-selected school; authorization is rechecked on this page.
if(requestedSchool)queueMicrotask(()=>$('connect').click());
