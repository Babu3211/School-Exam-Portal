import {loadAssignedLegacyMarks} from './assigned-legacy-marks.mjs';
import {neError} from './nepali-feedback.mjs';
import {connectSchoolFirebase,startVerifiedSchoolActivity,enforceSchoolIdle,bindVerifiedModuleActivity} from './school-firebase-client.mjs';
import {discoverVerifiedSubjectExamSettings} from './discover-subject-exam-settings.mjs';
import {inspectConfiguredClassMarks} from './configured-mark-preflight.mjs';
import {verifyStoredTeacherClassDraft} from './teacher-class-draft.mjs';
import {saveVerifiedTeacherClassDraft} from './save-verified-teacher-class-draft.mjs';
import {isActiveEnrolledStudent} from './student-enrollment-status.mjs';
import {verifySchoolSession} from './verified-school-session.mjs';
import {verifyTeacherSubjectAssignment} from './verified-teacher-subject-assignment.mjs';
import {verifyTeacherAttendanceDuty} from './verified-teacher-attendance-duty.mjs';
import {loadCompleteClassRoster} from './complete-class-roster.mjs';
import {validateSchoolId} from './school-paths.mjs';
const requestedSchool=new URL(location.href).searchParams.get('schoolId');
const $=id=>document.getElementById(id);
let auth,authSdk,api,db,actor=null,schoolId=null,epoch=0,selectionEpoch=0,busy=false;
let draftContext=null,draftInspected=false,draftEpoch=0;
const message=text=>{$('message').textContent=text};
function clear(){clearTeacherDraft();epoch++;selectionEpoch++;actor=null;schoolId=null;$('subjectId').replaceChildren();$('work').hidden=true;$('students').replaceChildren();$('count').textContent='';$('logout').disabled=true;$('load').disabled=true;$('loadAttendance').disabled=true}
function lock(value){busy=value;lockTeacherDraft(value);for(const id of ['login','logout','load','loadAttendance','loadAssignments','classId','subjectId','schoolId','email','password'])$(id).disabled=value;if(!value){$('login').disabled=!auth;$('logout').disabled=!actor;$('load').disabled=!actor||!$('subjectId').value;$('loadAttendance').disabled=!actor;$('loadAssignments').disabled=!actor;$('schoolId').disabled=!!actor;$('email').disabled=!!actor;$('password').disabled=!!actor}}
async function verifiedSession(uid,id){
 const session=await verifySchoolSession({schoolId:id,uid,readDocument:async path=>{const snap=await api.getDoc(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null}});
 if(session.role!=='teacher')throw new Error('Active Teacher membership required');
 if(auth?.currentUser?.uid!==uid)throw new Error('Authentication changed');
 return session;
}
$('connect').onclick=async()=>{try{({auth,authSdk,db,api}=await connectSchoolFirebase());authSdk.onAuthStateChanged(auth,user=>{if(actor&&user?.uid!==actor.uid){clear();message('प्रयोगकर्ता सत्र परिवर्तन भयो। पुनः लगइन गर्नुहोस्।')}if(!busy)lock(false)});$('connect').disabled=true;$('login').disabled=false;if(requestedSchool){$('schoolId').value=validateSchoolId(requestedSchool);if(auth.currentUser)queueMicrotask(()=>$('login').click())}message('V47 मा जडान भयो।')}catch(e){message('जडान असफल: '+neError(e))}};
$('login').onclick=async()=>{
 if(busy||!auth)return;
 clear();const request=epoch;lock(true);
 try{
  const id=validateSchoolId($('schoolId').value.trim());
  const freshSignIn=!auth.currentUser;const credential=freshSignIn?await authSdk.signInWithEmailAndPassword(auth,$('email').value,$('password').value):{user:auth.currentUser};
  $('password').value='';
  if(request!==epoch)throw new Error('Login changed');
  const session=await verifiedSession(credential.user.uid,id);
  if(request!==epoch)throw new Error('Login changed');
  if(id!==$('schoolId').value.trim())throw new Error('School selection changed');
  actor={uid:session.uid,role:'teacher',active:true,schoolId:id};if(freshSignIn)startVerifiedSchoolActivity();{const activityMember=actor;bindVerifiedModuleActivity(activityMember,()=>actor===activityMember&&auth?.currentUser?.uid===activityMember.uid);}schoolId=id;$('work').hidden=false;message('शिक्षकको लगइन सफल भयो। आफ्नो कक्षा र विषय छान्नुहोस्।');
 }catch(e){if(request===epoch){clear();const failedEpoch=epoch;try{await authSdk.signOut(auth)}catch{}if(epoch===failedEpoch){lock(false);message('लगइन असफल: '+neError(e))}}}
 finally{if(request===epoch)lock(false)}
};
$('logout').onclick=async()=>{if(busy)return;lock(true);clear();try{await authSdk.signOut(auth);message('सफलतापूर्वक लगआउट भयो।')}catch(e){message('लगआउट असफल: '+neError(e))}finally{lock(false)}};
$('classId').addEventListener('change',()=>{clearTeacherDraft();$('students').replaceChildren();$('count').textContent='';$('subjectId').replaceChildren();selectionEpoch++;if(!busy)lock(false)});
$('subjectId').addEventListener('change',()=>{clearTeacherDraft();$('students').replaceChildren();$('count').textContent='';selectionEpoch++;if(!busy)lock(false)});
$('loadAssignments').onclick=async()=>{
 if(busy||!actor)return;
 const request=epoch,selection=selectionEpoch,uid=actor.uid,id=schoolId,classId=$('classId').value;
 clearTeacherDraft();$('subjectId').replaceChildren();$('students').replaceChildren();$('count').textContent='';lock(true);
 const revalidate=async()=>{if(request!==epoch||selection!==selectionEpoch||auth?.currentUser?.uid!==uid||actor?.uid!==uid||schoolId!==id)throw new Error('School session or selection changed');await verifiedSession(uid,id)};
 try{
  await revalidate();
  const seen=new Set(),subjects=[];
  let cursor=null,pages=0;
  do{
   const constraints=[api.where('uid','==',uid),api.orderBy('__name__'),api.limit(100)];
   if(cursor)constraints.push(api.startAfter(cursor));
   const snap=await api.getDocs(api.query(api.collection(db,'schools',id,'teacher_assignments'),...constraints));
   await revalidate();
   if(!Array.isArray(snap?.docs)||snap.docs.length>100)throw new Error('Invalid teacher assignment page');
   if(++pages>20)throw new Error('Teacher assignment pagination limit exceeded');
   for(const document of snap.docs){
    const data=document.data();
    if(!document.id||document.id!==id+':'+uid+':'+data.classId+':'+data.subjectId||data.uid!==uid||data.schoolId!==id)throw new Error('Cross-school or forged teacher assignment');
    if(data.active!==true||data.classId!==classId||data.subjectId==='attendance')continue;
    if(seen.has(data.subjectId))throw new Error('Duplicate active teacher subject assignment');
    seen.add(data.subjectId);subjects.push(data.subjectId);
   }
   if(subjects.length>300)throw new Error('Too many assigned subjects');
   const next=snap.docs.length===100?snap.docs.at(-1):null;
   if(next&&next.id===cursor?.id)throw new Error('Teacher assignment pagination stalled');
   cursor=next;
  }while(cursor);
  const verified=[];
  for(const subjectId of subjects){
   const subject=await verifyTeacherSubjectAssignment({db,api,actor,schoolId:id,classId,subjectId,revalidate});
   verified.push({id:subjectId,name:subject.subjectName});
  }
  await revalidate();
  if(classId!==$('classId').value)throw new Error('Class changed');
  $('subjectId').replaceChildren();
  const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Select a verified subject';$('subjectId').append(placeholder);
  for(const subject of verified.sort((a,b)=>a.name.localeCompare(b.name,'en',{sensitivity:'base'})||a.id.localeCompare(b.id))){
   const option=document.createElement('option');option.value=subject.id;option.textContent=subject.name;$('subjectId').append(option);
  }
  $('load').disabled=true;
  message(verified.length+' assigned subjects verified. Choose a subject and load the class.');
 }catch(e){if(request===epoch&&selection===selectionEpoch){$('subjectId').replaceChildren();message('तोकिएको विषय लोड भएन: '+neError(e))}}
 finally{if(request===epoch)lock(false)}
};
$('load').onclick=async()=>{
 if(busy||!actor)return;
 const request=epoch,selection=selectionEpoch,uid=actor.uid,id=schoolId,classId=$('classId').value,subjectId=$('subjectId').value.trim();
 $('students').replaceChildren();$('count').textContent='';lock(true);
 const revalidate=async()=>{if(request!==epoch||selection!==selectionEpoch||auth?.currentUser?.uid!==uid||actor?.uid!==uid||schoolId!==id)throw new Error('School session or selection changed');await verifiedSession(uid,id)};
 try{
  await verifyTeacherSubjectAssignment({db,api,actor,schoolId:id,classId,subjectId,revalidate});
  const roster=await loadCompleteClassRoster({db,api,actor,schoolId:id,classId});
  await revalidate();
  await verifyTeacherSubjectAssignment({db,api,actor,schoolId:id,classId,subjectId,revalidate});
  if(request!==epoch||selection!==selectionEpoch||classId!==$('classId').value||subjectId!==$('subjectId').value.trim())throw new Error('Selection changed');
  const fragment=document.createDocumentFragment();
  for(const student of [...roster.students].sort((a,b)=>String(a.name??a.id).localeCompare(String(b.name??b.id),'en',{sensitivity:'base',numeric:true})||a.id.localeCompare(b.id))){
   const tr=document.createElement('tr');
   for(const value of [student.name??student.id,student.class,student.id]){const td=document.createElement('td');td.textContent=String(value);tr.append(td)}
   fragment.append(tr);
  }
  $('students').append(fragment);$('count').textContent=roster.count+' assigned-class students (read-only)';message('विद्यार्थी सूची लोड भयो। यो पृष्ठबाट अंक Save गर्न मिल्दैन।');
 }catch(e){if(request===epoch&&selection===selectionEpoch){$('students').replaceChildren();$('count').textContent='';message('अनुमति छैन वा विद्यार्थी सूची उपलब्ध भएन: '+neError(e))}}
 finally{if(request===epoch)lock(false)}
};

$('loadAttendance').onclick=async()=>{
 if(busy||!actor)return;
 const request=epoch,selection=selectionEpoch,uid=actor.uid,id=schoolId,classId=$('classId').value;
 $('students').replaceChildren();$('count').textContent='';lock(true);
 const revalidate=async()=>{if(request!==epoch||selection!==selectionEpoch||auth?.currentUser?.uid!==uid||actor?.uid!==uid||schoolId!==id)throw new Error('School session or selection changed');await verifiedSession(uid,id)};
 try{
  await verifyTeacherAttendanceDuty({db,api,actor,schoolId:id,classId,revalidate});
  const roster=await loadCompleteClassRoster({db,api,actor,schoolId:id,classId});
  await revalidate();
  await verifyTeacherAttendanceDuty({db,api,actor,schoolId:id,classId,revalidate});
  if(request!==epoch||selection!==selectionEpoch||classId!==$('classId').value)throw new Error('Class changed');
  const fragment=document.createDocumentFragment();
  for(const student of [...roster.students].sort((a,b)=>String(a.name??a.id).localeCompare(String(b.name??b.id),'en',{sensitivity:'base',numeric:true})||a.id.localeCompare(b.id))){
   const tr=document.createElement('tr');
   for(const value of [student.name??student.id,student.class,student.id]){const td=document.createElement('td');td.textContent=String(value);tr.append(td)}
   fragment.append(tr);
  }
  $('students').append(fragment);$('count').textContent=roster.count+' attendance-duty students (read-only)';
  message('Attendance जिम्मेवारी प्रमाणित भयो। विद्यार्थी सूची मात्र देखाइएको छ; Save गर्न मिल्दैन।');
 }catch(e){if(request===epoch&&selection===selectionEpoch){$('students').replaceChildren();$('count').textContent='';message('हाजिरी जिम्मेवारीको अनुमति छैन वा विद्यार्थी सूची उपलब्ध भएन: '+neError(e))}}
 finally{if(request===epoch)lock(false)}
};

function clearTeacherDraft(){
 resetLegacyMarks();
 draftEpoch++;draftContext=null;draftInspected=false;
 $('teacherDraftRows').replaceChildren();$('teacherDraftHeader').replaceChildren();
 $('teacherDraftStatus').textContent='';
 $('inspectTeacherDraft').disabled=true;$('saveTeacherDraft').disabled=true;
}
function lockTeacherDraft(value){
 $('teacherDraftArea').hidden=!actor;
 $('draftTerm').disabled=value||!actor;
 $('loadLegacyMarks').disabled=value||!actor||!$('subjectId').value||!['1st','2nd','3rd','final'].includes($('draftTerm').value);
 $('loadTeacherDraft').disabled=value||!actor||!$('subjectId').value;
 $('inspectTeacherDraft').disabled=value||!draftContext;
 $('saveTeacherDraft').disabled=value||!draftContext||!draftInspected;
 for(const input of $('teacherDraftRows').querySelectorAll('input'))input.disabled=value||
  (input.matches('input[data-component]')&&input.closest('tr')?.querySelector('input[data-absent]')?.checked===true);
}
let legacyRequest=0;
function resetLegacyMarks(){legacyRequest++;$('legacyMarkRows').replaceChildren();$('legacyMarkStatus').textContent=''}
$('loadLegacyMarks').onclick=async()=>{
 if(busy||!actor)return;
 resetLegacyMarks();const req=legacyRequest,member=actor,klass=$('classId').value,sub=$('subjectId').value,term=$('draftTerm').value;
 const check=()=>{if(req!==legacyRequest||actor!==member||auth?.currentUser?.uid!==member.uid||schoolId!==member.schoolId||$('classId').value!==klass||$('subjectId').value!==sub||$('draftTerm').value!==term)throw Error('Marks selection changed')};
 lock(true);$('legacyMarkStatus').textContent='V46 बाट सारिएका मूल अङ्क जाँच हुँदैछन्…';
 try{
  if(!await enforceSchoolIdle(auth,authSdk))throw Error('Login expired');
  const result=await loadAssignedLegacyMarks({db,api,actor:member,schoolId:member.schoolId,classId:klass,subjectId:sub,term,assertCurrent:check});check();
  const fragment=document.createDocumentFragment();
  for(const row of result.rows){
   const tr=document.createElement('tr');
   for(const value of [row.studentName,row.studentId,row.examId,row.isAbsent?'Yes':'No',row.scores.map(s=>s.name+': '+(s.obtained??'—')+' / '+s.fullMarks).join(' · '),(row.totalObtained??'—')+' / '+(row.totalFullMarks??'—')]){
    const td=document.createElement('td');td.textContent=String(value);tr.append(td)
   }fragment.append(tr);
  }
  $('legacyMarkRows').append(fragment);$('legacyMarkStatus').textContent=result.rows.length+' मूल Marks अभिलेख उपलब्ध छन्। अङ्क परिवर्तन वा प्रकाशन भएको छैन।';
 }catch(e){if(req===legacyRequest)$('legacyMarkStatus').textContent='मूल अङ्क खोल्न सकिएन: '+neError(e)}
 finally{if(actor===member)lock(false)}
};
$('draftTerm').onchange=()=>{clearTeacherDraft();if(!busy)lock(false)};
$('teacherDraftRows').addEventListener('input',event=>{
 if(!event.target?.matches?.('input[data-component],input[data-absent]'))return;
 if(event.target.matches('input[data-absent]')){
  const row=event.target.closest('tr');
  for(const input of row.querySelectorAll('input[data-component]')){
   input.value='';input.disabled=event.target.checked;
  }
 }
 draftInspected=false;$('saveTeacherDraft').disabled=true;
 $('teacherDraftStatus').textContent='Draft changed. Validate all students again.';
});
function collectTeacherDraft(){
 if(!draftContext||!actor||actor.role!=='teacher'||auth?.currentUser?.uid!==actor.uid)
  throw Error('Teacher Login or Draft context missing');
 const rows=[...$('teacherDraftRows').children],seen=new Map();
 if(rows.length!==draftContext.students.length)throw Error('Student rows changed; reload');
 for(const row of rows){
  if(!row.dataset.studentId||seen.has(row.dataset.studentId))throw Error('Duplicate student row');
  seen.set(row.dataset.studentId,row);
 }
 return draftContext.students.map(student=>{
  const row=seen.get(student.id);
  if(!row)throw Error('Missing student row '+student.id);
  const absent=row.querySelectorAll('input[data-absent]');
  if(absent.length!==1)throw Error('Missing student absence value');
  const values={};
  for(const component of draftContext.settings.components){
   const input=[...row.querySelectorAll('input[data-component]')].filter(el=>el.dataset.component===component.key);
   if(input.length!==1)throw Error('Invalid subject component fields');
   values[component.key]=input[0].value;
  }
  if(row.querySelectorAll('input[data-component]').length!==draftContext.settings.components.length)
   throw Error('Unexpected subject marks fields');
  return {studentId:student.id,isAbsent:absent[0].checked,
   values:absent[0].checked?{}:values};
 });
}
$('loadTeacherDraft').onclick=async()=>{
 if(busy||!actor||actor.role!=='teacher'||!$('subjectId').value)return;
 clearTeacherDraft();
 const current=++draftEpoch,request=epoch,selection=selectionEpoch,
  uid=actor.uid,id=schoolId,classId=$('classId').value,
  subjectId=$('subjectId').value,examId=$('draftTerm').value;
 lock(true);$('teacherDraftStatus').textContent='विद्यालय, Assignment, Examination Settings र पूरा कक्षा जाँच हुँदैछ…';
 const revalidate=async()=>{
  if(current!==draftEpoch||request!==epoch||selection!==selectionEpoch||
   auth?.currentUser?.uid!==uid||actor?.uid!==uid||schoolId!==id||
   classId!==$('classId').value||subjectId!==$('subjectId').value||examId!==$('draftTerm').value)
   throw Error('Teacher Login or selected class changed');
  await verifiedSession(uid,id);
 };
 try{
  if(!await enforceSchoolIdle(auth,authSdk))throw Error('Teacher session expired');
  await verifyTeacherSubjectAssignment({db,api,actor,schoolId:id,classId,subjectId,revalidate});
  const settings=await discoverVerifiedSubjectExamSettings({
   db,api,schoolId:id,classId,subjectId,examId,revalidate});
  const roster=await loadCompleteClassRoster({db,api,actor,schoolId:id,classId});
  await revalidate();
  if(roster.students.some(s=>!isActiveEnrolledStudent(s)))throw Error('Inactive student in class roster');
  const path=api.doc(db,'schools',id,'teacher_mark_drafts',uid,
   'class_drafts',settings.settingsId);
  const snap=await api.getDoc(path);
  await revalidate();
  const restored=snap?.exists?.()?verifyStoredTeacherClassDraft({
   actor,schoolId:id,classId,subjectId,examId,settings,
   expectedStudentIds:roster.studentIds,stored:snap.data()}):null;
  await verifyTeacherSubjectAssignment({db,api,actor,schoolId:id,classId,subjectId,revalidate});
  await revalidate();
  if(current!==draftEpoch)return;
  const students=[...roster.students].sort((a,b)=>
   String(a.name??a.id).localeCompare(String(b.name??b.id),'en',{numeric:true})||a.id.localeCompare(b.id));
  draftContext={schoolId:id,classId,subjectId,examId,settings,students,revision:restored?.revision??0};
  const previous=new Map(restored?.entries.map(row=>[row.studentId,row])??[]);
  const header=$('teacherDraftHeader');header.replaceChildren();
  for(const text of ['Student','Absent',...settings.components.map(c=>c.name+' / '+c.fullMarks)]){
   const th=document.createElement('th');th.textContent=text;header.append(th);
  }
  const fragment=document.createDocumentFragment();
  for(const student of students){
   const tr=document.createElement('tr');tr.dataset.studentId=student.id;
   const label=document.createElement('td');label.textContent=student.name??student.id;tr.append(label);
   const prior=previous.get(student.id);
   const absenceCell=document.createElement('td'),absent=document.createElement('input');
   absent.type='checkbox';absent.dataset.absent='1';absent.checked=prior?.isAbsent===true;
   absent.setAttribute('aria-label','Absent '+student.id);absenceCell.append(absent);tr.append(absenceCell);
   for(const component of settings.components){
    const td=document.createElement('td'),input=document.createElement('input');
    input.type='number';input.step='any';input.min='0';input.max=String(component.fullMarks);
    input.dataset.component=component.key;input.setAttribute('aria-label',component.name+' '+student.id);
    if(prior&&!prior.isAbsent)input.value=String(prior.values[component.key]);
    input.disabled=prior?.isAbsent===true;td.append(input);tr.append(td);
   }
   fragment.append(tr);
  }
  $('teacherDraftRows').append(fragment);
  $('teacherDraftStatus').textContent=roster.count+' विद्यार्थी, '+settings.components.length+
    ' Examination Settings Components। '+(restored?'Draft Revision '+restored.revision+' सुरक्षित छ।':'नयाँ Draft।')+
    ' सबै अंक भरेपछि Validate गर्नुहोस्। यो आधिकारिक नतिजा होइन।';
 }catch(e){if(current===draftEpoch&&request===epoch){clearTeacherDraft();$('teacherDraftStatus').textContent='Teacher Draft खोल्न सकिएन: '+neError(e)}}
 finally{if(request===epoch)lock(false)}
};
$('inspectTeacherDraft').onclick=()=>{
 if(busy||!draftContext||!actor||actor.uid!==auth?.currentUser?.uid)return;
 const c=draftContext;
 if(c.schoolId!==schoolId||c.classId!==$('classId').value||
  c.subjectId!==$('subjectId').value||c.examId!==$('draftTerm').value){
  clearTeacherDraft();return;
 }
 try{
  const result=inspectConfiguredClassMarks({schoolId:c.schoolId,classId:c.classId,
   subjectId:c.subjectId,examId:c.examId,settings:c.settings,
   expectedStudentIds:c.students.map(s=>s.id),drafts:collectTeacherDraft()});
  draftInspected=result.complete;
  $('teacherDraftStatus').textContent=result.complete?
   'सबै '+result.rosterCount+' विद्यार्थीका अंक मिलेको छ। Teacher Draft मात्र Save गर्न मिल्छ।':
   'Draft अपूर्ण छ: '+result.missing.length+' छुटेका र '+result.invalid.length+' अमान्य अंक।';
 }catch(e){draftInspected=false;$('teacherDraftStatus').textContent='Draft जाँच असफल: '+neError(e)}
 lockTeacherDraft(false);
};
$('saveTeacherDraft').onclick=async()=>{
 if(busy||!draftContext||!draftInspected||actor?.role!=='teacher')return;
 const c=draftContext,request=epoch,current=draftEpoch,selectedActor=actor;
 if(!confirm('यो कक्षाका सबै विद्यार्थीको अंक Teacher DRAFT मा मात्र Save गर्ने हो। आधिकारिक नतिजा प्रकाशित हुँदैन। अगाडि बढ्ने?'))return;
 let drafts;
 try{drafts=collectTeacherDraft()}catch(e){$('teacherDraftStatus').textContent=neError(e);return}
 lock(true);
 $('teacherDraftStatus').textContent='सम्पूर्ण कक्षाको Teacher Draft सुरक्षित गर्न पुनः प्रमाणित हुँदैछ…';
 try{
  if(!await enforceSchoolIdle(auth,authSdk))throw Error('Teacher session expired');
  if(epoch!==request||draftEpoch!==current||actor!==selectedActor||
   auth?.currentUser?.uid!==selectedActor.uid)throw Error('Teacher Login changed');
  const saved=await saveVerifiedTeacherClassDraft({db,api,auth,actor:selectedActor,
   schoolId:c.schoolId,classId:c.classId,subjectId:c.subjectId,
   examId:c.examId,drafts,expectedRevision:c.revision});
  if(epoch!==request||draftEpoch!==current||actor!==selectedActor||
   auth?.currentUser?.uid!==selectedActor.uid)return;
  if(saved.rosterReverified!==true)throw Error('Teacher Draft verification incomplete');
  c.revision=saved.revision;draftInspected=false;
  $('teacherDraftStatus').textContent=saved.rosterCount+' विद्यार्थीको Teacher Draft Revision '+
   saved.revision+' सुरक्षित र पुनः जाँच भयो। आधिकारिक Marks/Grade अपरिवर्तित छन्।';
  message('Teacher Draft सुरक्षित भयो। फेरि Save गर्नुअघि अंक पुनः Validate गर्नुहोस्।');
 }catch(e){
  if(epoch===request&&draftEpoch===current){
   clearTeacherDraft();
   $('teacherDraftStatus').textContent=
    (e.name==='TeacherDraftPostSaveReviewError'
     ? 'Draft Revision '+e.revision+' Commit भएको छ, तर अन्तिम जाँच असफल भयो। '
     : 'Draft Save को स्थिति पुष्टि भएन। ')+
    'पुनः Save नगर्नुहोस्; पहिले कक्षा र सुरक्षित Revision Reload गरी जाँच्नुहोस्। कारण: '+neError(e.cause??e);
  }
 }finally{if(epoch===request)lock(false)}
};

if(requestedSchool)queueMicrotask(()=>$('connect').click());
