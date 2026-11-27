import {neError} from './nepali-feedback.mjs';
import {readSmssMarksExcel} from './import-class-marks-excel.mjs';
import {planClassMarksGridPaste} from './class-marks-grid-paste.mjs';
import {buildClassMarksExcelSample} from './class-marks-excel-sample.mjs';
import {buildClassReviewExcel} from './class-review-excel.mjs';
import {connectSchoolFirebase,startVerifiedSchoolActivity,enforceSchoolIdle,bindVerifiedModuleActivity} from './school-firebase-client.mjs';
import {completeClassDraftId} from './complete-class-draft-document.mjs';
import {saveVerifiedCompleteClassDraft} from './save-verified-class-draft.mjs';
import {verifyStoredCompleteClassDraft} from './restore-complete-class-draft.mjs';
import {verifySchoolSession} from './verified-school-session.mjs';
import {validateSchoolId} from './school-paths.mjs';
import {loadCompleteClassRoster} from './complete-class-roster.mjs';
import {isActiveEnrolledStudent} from './student-enrollment-status.mjs';
import {inspectClassMarkDraft} from './class-mark-draft-inspector.mjs';
import {iemisEntrySchema} from './iemis-entry.js';
import {readEntrySettingsCoverage,entrySettingsAuditWorkbook,readAllTermSettingsCoverage,allTermSettingsAuditWorkbook} from './entry-settings-coverage.mjs';
import {discoverVerifiedSubjectExamSettings} from './discover-subject-exam-settings.mjs';
import {inspectConfiguredClassMarks} from './configured-mark-preflight.mjs';
import {prepareConfiguredClassPublication} from './configured-class-publication-preview.mjs';
import {prepareNewSubjectExamSettings,createNewSubjectExamSettings} from './create-subject-exam-settings.mjs';
import {buildClassMarksReviewPackage} from './class-marks-review-package.mjs';
import {verifyClassMarksReviewPackage} from './verify-class-marks-review-package.mjs';
const requestedSchool=new URL(location.href).searchParams.get('schoolId');
const $=id=>document.getElementById(id),status=msg=>{$('message').textContent=msg};
let auth,authSdk,api,db,actor,schoolId,epoch=0,busy=false,studentsLoaded=false,subjectsLoaded=false,loadedStudentClass=null,loadedSubjectClass=null;
let classMarkRoster=[],classMarkContext=null,classMarkSettings=null,rosterRequest=0,optionRequest=0,reviewPackage=null,classDraftRevision=null;
function clearSettingsAudit(){$('exportAllTermSettingsAudit').disabled=true;$('exportEntrySettingsAudit').disabled=true;$('auditEntrySettingsRows').replaceChildren();$('auditEntrySettingsStatus').textContent='';$('auditEntrySettings').disabled=true;}
function reset(){clearSettingsAudit();$('serverReviewMarks').disabled=true;$('serverPublicationStatus').textContent='';$('saveClassDraft').disabled=true;$('classDraftStatus').textContent='';classDraftRevision=null;$('importClassExcelFile').value='';$('importClassExcelFile').disabled=true;$('importClassExcel').disabled=true;$('downloadClassTemplateExcel').disabled=true;$('reviewFile').value='';$('reviewFile').disabled=true;$('verifyClassReview').disabled=true;$('reviewVerifyResult').textContent='';reviewPackage=null;$('downloadClassReview').disabled=true;$('downloadClassReviewExcel').disabled=true;$('createExamSettings').disabled=true;$('settingsCreateResult').textContent='';$('iemisSchemaRows').replaceChildren();$('iemisSchemaStatus').textContent='';optionRequest++;rosterRequest++;classMarkRoster=[];classMarkContext=null;classMarkSettings=null;$('classMarkRows').replaceChildren();$('classMarkHeader').replaceChildren();$('classMarkCount').textContent='';$('saveClassMarks').disabled=true;$('inspectClassMarks').disabled=true;$('draftCheckResult').textContent='';$('loadClassMarks').disabled=true;epoch++;studentsLoaded=false;subjectsLoaded=false;loadedStudentClass=null;loadedSubjectClass=null;actor=null;schoolId=null;$('work').hidden=true;$('logout').disabled=true;$('save').disabled=true;$('studentId').replaceChildren();$('subjectId').replaceChildren();}
function lock(value){busy=value;const auditDisabled=value||actor?.role!=='school_admin'||!/^(?:[1-9]|10)$/.test($('schoolClass').value)||!['1st','2nd','3rd','final'].includes($('term').value);$('auditEntrySettings').disabled=auditDisabled;$('exportEntrySettingsAudit').disabled=auditDisabled;$('exportAllTermSettingsAudit').disabled=value||actor?.role!=='school_admin'||!/^(?:[1-9]|10)$/.test($('schoolClass').value);$('serverReviewMarks').disabled=value||actor?.role!=='school_admin'||!classMarkContext||!Number.isSafeInteger(classDraftRevision)||classDraftRevision<1;$('newSettingsComponents').disabled=value||actor?.role!=='school_admin';$('saveClassDraft').disabled=value||!reviewPackage||classDraftRevision===null||actor?.role!=='school_admin';$('importClassExcelFile').disabled=value||!classMarkContext;$('importClassExcel').disabled=value||!classMarkContext||!$('importClassExcelFile').files?.length;$('downloadClassTemplateExcel').disabled=value||!classMarkContext||!classMarkRoster.length;$('downloadClassReview').disabled=value||!reviewPackage;$('downloadClassReviewExcel').disabled=value||!reviewPackage;$('reviewFile').disabled=value||!classMarkContext;$('verifyClassReview').disabled=value||!classMarkContext||!$('reviewFile').files?.length;$('createExamSettings').disabled=value||!actor||actor.role!=='school_admin'||!subjectsLoaded||loadedSubjectClass!==$('schoolClass').value||!$('subjectId').value;for(const input of $('classMarkRows').querySelectorAll('input'))input.disabled=value||(input.matches('input[data-field]')&&input.closest('tr')?.querySelector('input[data-absent]')?.checked===true);$('loadClassMarks').disabled=value||!actor||actor.role!=='school_admin';$('saveClassMarks').disabled=true;$('inspectClassMarks').disabled=value||!actor||!classMarkContext;for(const id of ['login','logout','loadStudents','loadSubjects','save','schoolClass','term','subjectId','studentId','theory','practical'])$(id).disabled=value||(['loadStudents','loadSubjects','save'].includes(id)&&!actor)||(['theory','practical'].includes(id)&&actor?.role!=='school_admin');if(!value){$('login').disabled=!auth;$('logout').disabled=!actor;$('save').disabled=true;}}
$('connect').onclick=async()=>{try{({auth,authSdk,db,api}=await connectSchoolFirebase());authSdk.onAuthStateChanged(auth,user=>{if(actor&&user?.uid!==actor.uid){reset();status('प्रयोगकर्ता सत्र परिवर्तन भयो। अंक समीक्षा फेरि सुरु गर्न लगइन गर्नुहोस्।')}});$('connect').disabled=true;$('login').disabled=false;if(requestedSchool){$('schoolId').value=validateSchoolId(requestedSchool);if(auth.currentUser)queueMicrotask(()=>$('login').click())}status('V47 मा जडान भयो।')}catch(e){status('जडान असफल: '+neError(e))}};
$('login').onclick=async()=>{if(busy)return;reset();const attempt=epoch;const loginAuth=auth;lock(true);try{const id=validateSchoolId($('schoolId').value.trim());const freshSignIn=!auth.currentUser;const credential=freshSignIn?await authSdk.signInWithEmailAndPassword(auth,$('email').value,$('password').value):{user:auth.currentUser};$('password').value='';if(attempt!==epoch){if(loginAuth.currentUser?.uid===credential.user.uid)await authSdk.signOut(loginAuth);return}const uid=credential.user.uid;const session=await verifySchoolSession({schoolId:id,uid,readDocument:async path=>{const snap=await api.getDoc(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null;}});if(attempt!==epoch){if(loginAuth.currentUser?.uid===uid)await authSdk.signOut(loginAuth);return}if(loginAuth.currentUser?.uid!==uid)throw new Error('School session changed');const school=await api.getDoc(api.doc(db,'schools',id));if(attempt!==epoch){if(loginAuth.currentUser?.uid===uid)await authSdk.signOut(loginAuth);return}if(loginAuth.currentUser?.uid!==uid||!school.exists()||school.data().active!==true)throw new Error('School inactive');actor={role:session.role,active:true,schoolId:id,uid};if(freshSignIn)startVerifiedSchoolActivity();{const activityMember=actor;bindVerifiedModuleActivity(activityMember,()=>actor===activityMember&&auth?.currentUser?.uid===activityMember.uid);}schoolId=id;$('heading').textContent='Raw mark — '+String(school.data().name??id);$('work').hidden=false;
 const readOnly=session.role!=='school_admin';
 $('readOnlyNotice').hidden=!readOnly;$('readOnlyNav').hidden=!readOnly;
 $('settingsCreateArea').hidden=readOnly;$('classSaveArea').hidden=readOnly;
 $('newSettingsComponents').disabled=readOnly;
 const previewUrl=new URL('./marks-preview.html',location.href);
 previewUrl.searchParams.set('schoolId',id);
 $('rawMarksPreviewLink').href=previewUrl.href;
 status(readOnly?'सदस्यता पुष्टि भयो। Viewer/Teacher का लागि Read-only दृश्य खुल्यो; अंक Save वा Draft सम्भव छैन।':'विद्यालय प्रशासकको लगइन सफल भयो। विद्यार्थी र विषय लोड गर्नुहोस्। हाल आधिकारिक अंक Save/Publish बन्द छ।')}catch(e){if(attempt===epoch){reset();try{await authSdk.signOut(auth)}catch{}status('लगइन असफल: '+neError(e))}}finally{lock(false)}};
$('logout').onclick=async()=>{if(busy)return;lock(true);reset();try{await authSdk.signOut(auth);status('सफलतापूर्वक लगआउट भयो।')}catch(e){status('लगआउट असफल: '+neError(e))}finally{lock(false)}};
async function loadOptions(collection,element,label){if(busy||!actor)return;if(collection==='subjects')invalidateClassMarks();const request=++optionRequest,attempt=epoch,schoolClass=$('schoolClass').value,uid=actor.uid,selectedSchoolId=schoolId;if(!auth?.currentUser?.uid||auth.currentUser.uid!==uid){status('प्रमाणीकरण परिवर्तन भयो। फेरि लगइन गर्नुहोस्।');return}lock(true);try{
 let cursor=null,rows=[];do{
  const constraints=[api.where('class','==',schoolClass),api.orderBy('__name__'),api.limit(100)];
  if(cursor)constraints.push(api.startAfter(cursor));
  const snap=await api.getDocs(api.query(api.collection(db,'schools',selectedSchoolId,collection),...constraints));
  if(request!==optionRequest||attempt!==epoch||schoolClass!==$('schoolClass').value||!actor)return;
  if(auth?.currentUser?.uid!==uid||actor.uid!==uid||schoolId!==selectedSchoolId)throw new Error('Authentication changed during options load');
  const page=snap.docs.map(doc=>({...doc.data(),id:doc.id}));
  for(const row of page)if(row.schoolId!==selectedSchoolId||row.class!==schoolClass)throw new Error('Cross-school or wrong-class record in marks selection');
  rows.push(...page);
  if(rows.length>5000)throw new Error('Class has over 5000 records; use searchable roster');
  cursor=snap.docs.length===100?snap.docs.at(-1):null;
 }while(cursor);
 if(request!==optionRequest||attempt!==epoch||schoolClass!==$('schoolClass').value||auth?.currentUser?.uid!==uid||actor?.uid!==uid||schoolId!==selectedSchoolId)throw new Error('Options selection changed during load');
 const filtered=collection==='students'?rows:rows.filter(row=>row.active===true);
 element.replaceChildren();if(collection==='students'){studentsLoaded=true;loadedStudentClass=schoolClass}else{subjectsLoaded=true;loadedSubjectClass=schoolClass}
 for(const row of filtered){const option=document.createElement('option');option.value=row.id;option.textContent=String(row.name??row.id)+' ('+row.id+')';element.append(option)}
 status(filtered.length+' '+label+' loaded. Development preview only; mark saving is disabled.');
 }catch(e){if(request===optionRequest&&attempt===epoch&&actor){if(collection==='students'){studentsLoaded=false;loadedStudentClass=null;$('studentId').replaceChildren()}else{subjectsLoaded=false;loadedSubjectClass=null;$('subjectId').replaceChildren()}status('विवरण लोड भएन: '+neError(e))}}finally{if(request===optionRequest&&attempt===epoch)lock(false)}}
$('loadStudents').onclick=()=>loadOptions('students',$('studentId'),'students');$('loadSubjects').onclick=()=>loadOptions('subjects',$('subjectId'),'subjects');
$('schoolClass').onchange=()=>{optionRequest++;invalidateClassMarks();clearSettingsAudit();studentsLoaded=false;subjectsLoaded=false;loadedStudentClass=null;loadedSubjectClass=null;$('studentId').replaceChildren();$('subjectId').replaceChildren();lock(false)};
$('studentId').onchange=()=>lock(false);$('subjectId').onchange=()=>lock(false);
$('save').onclick=()=>status('व्यक्तिगत अङ्क सुरक्षित गर्ने सुविधा बन्द छ। सम्पूर्ण कक्षाको अङ्क प्रयोग गर्नुहोस्।');
$('createExamSettings').onclick=async()=>{
 if(busy||actor?.role!=='school_admin'||!subjectsLoaded||loadedSubjectClass!==$('schoolClass').value||!$('subjectId').value)return;
 const attempt=epoch,uid=actor.uid,selectedSchoolId=schoolId,classId=$('schoolClass').value,subjectId=$('subjectId').value,examId=$('term').value;
 const output=$('settingsCreateResult');output.textContent='';
 let settings;
 try{
  const lines=$('newSettingsComponents').value.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
  const components=lines.map(line=>{const parts=line.split(',').map(part=>part.trim());if(parts.length!==3||!parts[2]||!/^(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)$/.test(parts[2]))throw new Error('Use key,name,positive fullMarks on each line');return {key:parts[0],name:parts[1],fullMarks:Number(parts[2])}});
  settings=prepareNewSubjectExamSettings({schoolId:selectedSchoolId,classId,subjectId,examId,components});
  if(!window.confirm('Create immutable settings for '+classId+' / '+subjectId+' / '+examId+'? Existing settings cannot be changed.'))return;
 }catch(error){output.textContent='सेटिङ अमान्य: '+neError(error);return}
 lock(true);
 try{
  const revalidate=async()=>{if(attempt!==epoch||auth?.currentUser?.uid!==uid||actor?.uid!==uid||schoolId!==selectedSchoolId||classId!==$('schoolClass').value||subjectId!==$('subjectId').value||examId!==$('term').value)throw new Error('Session or selection changed');const session=await verifySchoolSession({schoolId:selectedSchoolId,uid,readDocument:async path=>{const snap=await api.getDoc(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null;}});if(session.role!=='school_admin')throw new Error('School Admin required')};
  await revalidate();
  const existing=await api.getDoc(api.doc(db,'schools',selectedSchoolId,'mark_settings',settings.id));
  await revalidate();
  if(existing.exists())throw new Error('Settings already exist. No changes made');
  const selectedSubject=await api.getDoc(api.doc(db,'schools',selectedSchoolId,'subjects',subjectId));
  await revalidate();
  if(!selectedSubject.exists()||selectedSubject.data().schoolId!==selectedSchoolId||selectedSubject.data().class!==classId||selectedSubject.data().active!==true)throw new Error('Selected subject is no longer active in this class');
  await createNewSubjectExamSettings({db,api,actor,settings});
  if(attempt===epoch){clearSettingsAudit();invalidateClassMarks();output.textContent='Settings created. Reload full class marks to use them.'}
 }catch(error){if(attempt===epoch)output.textContent='सेटिङ सिर्जना भएन: '+neError(error)}
 finally{if(attempt===epoch)lock(false)}
};


function invalidateClassMarks(){$('serverReviewMarks').disabled=true;$('serverPublicationStatus').textContent='';$('saveClassDraft').disabled=true;$('classDraftStatus').textContent='';classDraftRevision=null;$('importClassExcelFile').value='';$('importClassExcelFile').disabled=true;$('importClassExcel').disabled=true;$('downloadClassTemplateExcel').disabled=true;$('reviewFile').value='';$('reviewFile').disabled=true;$('verifyClassReview').disabled=true;$('reviewVerifyResult').textContent='';reviewPackage=null;$('downloadClassReview').disabled=true;$('downloadClassReviewExcel').disabled=true;rosterRequest++;classMarkRoster=[];classMarkContext=null;classMarkSettings=null;$('classMarkRows').replaceChildren();$('classMarkHeader').replaceChildren();$('classMarkCount').textContent='';$('draftCheckResult').textContent='';$('inspectClassMarks').disabled=true;$('saveClassMarks').disabled=true}
$('term').onchange=()=>{clearSettingsAudit();invalidateClassMarks();lock(false)};
$('subjectId').onchange=()=>{invalidateClassMarks();lock(false)};
$('loadClassMarks').onclick=async()=>{
 if(busy||actor?.role!=='school_admin'||!subjectsLoaded||loadedSubjectClass!==$('schoolClass').value||!$('subjectId').value){status('पहिले सक्रिय कक्षाका विषय लोड गर्नुहोस्।');return}
 if(!auth?.currentUser?.uid||auth.currentUser.uid!==actor.uid){status('प्रमाणीकरण परिवर्तन भयो। फेरि लगइन गर्नुहोस्।');return}
 const attempt=epoch,classId=$('schoolClass').value,term=$('term').value,subjectId=$('subjectId').value,uid=actor.uid,selectedSchoolId=schoolId;
 invalidateClassMarks();const request=rosterRequest;lock(true);
 try{
  const settings=await discoverVerifiedSubjectExamSettings({db,api,schoolId:selectedSchoolId,classId,subjectId,examId:term,revalidate:async()=>{if(attempt!==epoch||auth?.currentUser?.uid!==uid||actor?.uid!==uid||schoolId!==selectedSchoolId)throw new Error('School session changed');const verified=await verifySchoolSession({schoolId:selectedSchoolId,uid,readDocument:async path=>{const snap=await api.getDoc(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null;}});if(verified.role!=='school_admin')throw new Error('School Admin required');}});
  const roster=await loadCompleteClassRoster({db,api,actor,schoolId:selectedSchoolId,classId});
  if(roster.students.some(student=>!isActiveEnrolledStudent(student)))throw new Error('Class roster includes inactive student; correct enrollment before marks entry');
  const draftDocId=completeClassDraftId({classId,subjectId,examId:term});
  const draftSnap=await api.getDoc(api.doc(db,'schools',selectedSchoolId,'class_mark_drafts',draftDocId));
  const priorDraft=draftSnap.exists()?draftSnap.data():null;
  const restoredDraft=priorDraft?verifyStoredCompleteClassDraft({
   schoolId:selectedSchoolId,classId,subjectId,examId:term,settings,
   expectedStudentIds:roster.studentIds,stored:priorDraft
  }):null;
  const finalSession=await verifySchoolSession({schoolId:selectedSchoolId,uid,readDocument:async path=>{const snap=await api.getDoc(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null;}});
  if(finalSession.role!=='school_admin')throw new Error('School Admin session revoked during roster load');
  if(request!==rosterRequest||attempt!==epoch||classId!==$('schoolClass').value||term!==$('term').value||subjectId!==$('subjectId').value)return;
  if(auth?.currentUser?.uid!==uid||actor?.uid!==uid||schoolId!==selectedSchoolId||actor?.schoolId!==selectedSchoolId)throw new Error('Authentication or school changed during roster load');
  // Display alphabetically without changing the authoritative roster IDs used for completeness checks.
  classDraftRevision=restoredDraft?.revision??0;
  $('classDraftStatus').textContent=restoredDraft?'Previously saved full-class Draft Revision '+classDraftRevision+' restored. Check all marks before updating.':'No prior Draft. Inspect all marks before saving.';
  classMarkSettings=settings;
  const header=$('classMarkHeader');header.replaceChildren();for(const label of ['Student','Absent',...settings.components.map(c=>c.name+' / '+c.fullMarks)]){const th=document.createElement('th');th.textContent=label;header.append(th)}
  classMarkRoster=[...roster.students].sort((a,b)=>String(a.name??a.id).localeCompare(String(b.name??b.id),'en',{sensitivity:'base',numeric:true})||a.id.localeCompare(b.id));
  const restoredById=new Map(restoredDraft?.entries.map(entry=>[entry.studentId,entry])??[]);
  classMarkContext={classId,term,subjectId};
  const body=$('classMarkRows'),fragment=document.createDocumentFragment();
  for(const student of classMarkRoster){
   const row=document.createElement('tr');row.dataset.studentId=student.id;
   const name=document.createElement('td');name.textContent=String(student.name??student.id);row.append(name);
   const saved=restoredById.get(student.id);
   const absenceCell=document.createElement('td'),absence=document.createElement('input');absence.type='checkbox';absence.dataset.absent='true';absence.checked=saved?.isAbsent===true;absence.setAttribute('aria-label','Absent '+student.id);absenceCell.append(absence);row.append(absenceCell);
   for(const component of settings.components){
    const td=document.createElement('td'),input=document.createElement('input');
    input.type='number';input.min='0';input.max=String(component.fullMarks);input.step='any';input.dataset.field=component.key;
    if(saved){input.value=saved.isAbsent?'':String(saved.values[component.key]);input.disabled=saved.isAbsent}
    input.setAttribute('aria-label',component.name+' marks for '+student.id);td.append(input);row.append(td);
   }fragment.append(row);
  }
  body.append(fragment);
  $('downloadClassTemplateExcel').disabled=false;$('importClassExcelFile').disabled=false;
  $('classMarkCount').textContent=roster.count+' students in full roster. '+(restoredDraft?'Saved Draft restored. ':'')+'Draft Save available after inspection; official Save/Publish remains disabled.';
  status('कक्षाका विद्यार्थी लोड भए। सबैको अंक जाँच्न सकिन्छ, तर Save/Publish बन्द छ।');
 }catch(e){if(request===rosterRequest&&attempt===epoch){invalidateClassMarks();lock(false);status('सम्पूर्ण कक्षाको विद्यार्थी सूची लोड भएन: '+neError(e))}}
 finally{if(request===rosterRequest&&attempt===epoch)lock(false)}
};
// Any edit invalidates the previously displayed draft inspection.
$('classMarkRows').addEventListener('input',event=>{
 if(!event.target?.matches?.('input[data-field],input[data-absent]'))return;
 if(event.target.matches('input[data-absent]')){const row=event.target.closest('tr');for(const input of row.querySelectorAll('input[data-field]')){input.value='';input.disabled=event.target.checked}}
 reviewPackage=null;$('saveClassDraft').disabled=true;$('downloadClassReview').disabled=true;$('downloadClassReviewExcel').disabled=true;$('reviewFile').value='';$('reviewFile').disabled=true;$('verifyClassReview').disabled=true;
 $('reviewVerifyResult').textContent='';
 $('draftCheckResult').textContent='Draft changed. Inspect again before saving.';
});
// Spreadsheet-style Ctrl+V: one or more rows and columns of numeric cells.
// Never trusts imported student IDs or clipboard headers. Read-only roles
// cannot edit; validation is all-or-nothing before touching the local draft.
$('classMarkRows').addEventListener('paste',event=>{
 const start=event.target;
 if(!start?.matches?.('input[data-field]')||!classMarkContext||!classMarkSettings||
    busy||actor?.role!=='school_admin'||actor?.active!==true||
    actor?.schoolId!==schoolId||auth?.currentUser?.uid!==actor.uid)return;
 const value=event.clipboardData?.getData('text/plain');
 if(typeof value!=='string'||!(value.includes('\t')||/\r|\n/.test(value)))return;
 event.preventDefault();
 try{
  const context=classMarkContext;
  if(context.classId!==$('schoolClass').value||context.term!==$('term').value||
     context.subjectId!==$('subjectId').value)
   throw Error('Class, subject or term changed; reload');
  const rendered=[...$('classMarkRows').children];
  if(rendered.length!==classMarkRoster.length)throw Error('Class roster changed; reload');
  const rows=rendered.map((tr,i)=>{
   if(tr.dataset.studentId!==classMarkRoster[i]?.id)
    throw Error('Student row changed; reload class');
   const absent=tr.querySelectorAll('input[data-absent]'),fields=tr.querySelectorAll('input[data-field]');
   if(absent.length!==1||fields.length!==classMarkSettings.components.length)
    throw Error('Marks grid changed; reload class');
   for(let k=0;k<fields.length;k++){
    if(fields[k].dataset.field!==classMarkSettings.components[k].key||
       fields[k].disabled!==absent[0].checked)
     throw Error('Configured mark field changed; reload class');
   }
   return {id:tr.dataset.studentId,absent:absent[0].checked};
  });
  const startTr=start.closest('tr'),startRowIndex=rendered.indexOf(startTr);
  const inputNodes=[...startTr.querySelectorAll('input[data-field]')];
  const startComponentIndex=inputNodes.indexOf(start);
  const planned=planClassMarksGridPaste({text:value,studentRows:rows,
   components:classMarkSettings.components,startRowIndex,startComponentIndex});
  // All cells pass settings and bounds checks; now update local form only.
  for(const cell of planned.updates){
   const input=rendered[cell.rowIndex].querySelectorAll('input[data-field]')[cell.componentIndex];
   input.value=cell.value;
  }
  start.dispatchEvent(new Event('input',{bubbles:true}));
  $('draftCheckResult').textContent=planned.cells+' mark cells pasted for '+planned.rows+
   ' student rows. Review the entire class again before Draft Save. Nothing published.';
  status('Excel बाट '+planned.cells+' अंक Paste भयो। पूर्ण कक्षा जाँचपछि मात्र Draft Save गर्न मिल्छ।');
 }catch(error){
  $('draftCheckResult').textContent='टाँस्ने प्रक्रिया अस्वीकृत भयो। कुनै कोष परिवर्तन भएको छैन: '+neError(error);
  status('Paste असफल: '+neError(error));
 }
});

function collectClassMarkEntries(){
 if(!classMarkContext||!classMarkSettings)throw new Error('Load verified settings and full roster first');
 const rendered=[...$('classMarkRows').children],expected=new Set(classMarkRoster.map(s=>s.id)),seen=new Map();
 if(rendered.length!==expected.size)throw new Error('Class roster changed; reload');
 for(const row of rendered){const id=row.dataset.studentId;if(!expected.has(id)||seen.has(id))throw new Error('Unexpected or duplicate student');seen.set(id,row)}
 return classMarkRoster.map(student=>{
  const row=seen.get(student.id),values={};
  for(const component of classMarkSettings.components){const inputs=[...row.querySelectorAll('input[data-field]')].filter(input=>input.dataset.field===component.key);if(inputs.length!==1)throw new Error('Component fields changed; reload');values[component.key]=inputs[0].value}
  if(row.querySelectorAll('input[data-field]').length!==classMarkSettings.components.length)throw new Error('Unexpected mark component field');
  const absentInputs=row.querySelectorAll('input[data-absent]');if(absentInputs.length!==1)throw new Error('Absence field changed; reload');
  return {studentId:student.id,isAbsent:absentInputs[0].checked,values:absentInputs[0].checked?{}:values};
 });
}
$('inspectClassMarks').onclick=async()=>{
 if(busy||!classMarkContext)return;
 const attempt=epoch,request=rosterRequest,uid=actor?.uid,selectedSchoolId=schoolId;
 lock(true);
 try{
  if(!uid||auth?.currentUser?.uid!==uid)throw new Error('School session changed');
  const verified=await verifySchoolSession({schoolId:selectedSchoolId,uid,readDocument:async path=>{const snap=await api.getDoc(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null;}});
  if(verified.role!=='school_admin'||attempt!==epoch||request!==rosterRequest||actor?.uid!==uid||schoolId!==selectedSchoolId||auth?.currentUser?.uid!==uid)throw new Error('School session changed during inspection');
  const currentSettings=await discoverVerifiedSubjectExamSettings({db,api,schoolId:selectedSchoolId,classId:classMarkContext.classId,subjectId:classMarkContext.subjectId,examId:classMarkContext.term,revalidate:async()=>{if(attempt!==epoch||request!==rosterRequest||auth?.currentUser?.uid!==uid||actor?.uid!==uid||schoolId!==selectedSchoolId)throw new Error('School session changed');const session=await verifySchoolSession({schoolId:selectedSchoolId,uid,readDocument:async path=>{const snap=await api.getDoc(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null;}});if(session.role!=='school_admin')throw new Error('School Admin required');}});
  if(!classMarkSettings||currentSettings.settingsId!==classMarkSettings.settingsId||JSON.stringify(currentSettings.components)!==JSON.stringify(classMarkSettings.components))throw new Error('Subject examination settings changed; reload class marks');
  const latestRoster=await loadCompleteClassRoster({db,api,actor,schoolId:selectedSchoolId,classId:classMarkContext.classId});
  const loadedStudentIds=new Set(classMarkRoster.map(student=>student.id));
  if(latestRoster.students.some(student=>!isActiveEnrolledStudent(student))||latestRoster.count!==loadedStudentIds.size||latestRoster.studentIds.some(id=>!loadedStudentIds.has(id)))throw new Error('Class roster changed or contains inactive student; reload marks entry');
  const finalSession=await verifySchoolSession({schoolId:selectedSchoolId,uid,readDocument:async path=>{const snap=await api.getDoc(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null;}});
  if(finalSession.role!=='school_admin')throw new Error('School Admin session revoked during roster refresh');
 }catch(error){if(attempt===epoch&&request===rosterRequest){invalidateClassMarks();status('विद्यालयको अधिकार, विद्यार्थी सूची वा विषयको सेटिङ परिवर्तन भएको हुन सक्छ। कक्षा पुनः लोड गर्नुहोस्।')}return}
 finally{if(attempt===epoch)lock(false)}
 if(busy||!classMarkContext||attempt!==epoch||request!==rosterRequest||actor?.uid!==uid||schoolId!==selectedSchoolId||auth?.currentUser?.uid!==uid)return;
 const {classId,term,subjectId}=classMarkContext;
 if(!actor||auth?.currentUser?.uid!==actor.uid||actor.schoolId!==schoolId){invalidateClassMarks();status('विद्यालयको लगइन परिवर्तन भयो। पुनः लगइन गर्नुहोस्।');return}
 if(classId!==$('schoolClass').value||term!==$('term').value||subjectId!==$('subjectId').value){invalidateClassMarks();status('छनोट परिवर्तन भयो। विद्यार्थी सूची पुनः लोड गर्नुहोस्।');return}
 try{
  reviewPackage=null;$('downloadClassReview').disabled=true;$('downloadClassReviewExcel').disabled=true;
 const expectedStudentIds=classMarkRoster.map(student=>student.id),drafts=collectClassMarkEntries();
  const result=inspectConfiguredClassMarks({schoolId,classId,examId:term,subjectId,settings:classMarkSettings,expectedStudentIds,drafts});
  $('draftCheckResult').textContent=(result.complete?'All student marks valid.':'Class marks incomplete.')+(result.missing.length?' Missing: '+result.missing.slice(0,8).join(', '):'')+(result.invalid.length?' Invalid: '+result.invalid.slice(0,4).map(x=>x.studentId+': '+x.message).join('; '):'');
  if(result.complete){
   const proposal=prepareConfiguredClassPublication({actor,schoolId,classId,subjectId,examId:term,settings:classMarkSettings,expectedStudentIds,drafts});
   $('draftCheckResult').textContent+=' Read-only publication review: '+proposal.rosterCount+' students; '+proposal.reviewBatches.length+' review groups. No data saved.';
   reviewPackage=buildClassMarksReviewPackage({actor,schoolId,classId,subjectId,examId:term,settings:classMarkSettings,expectedStudentIds,drafts});
   $('downloadClassReview').disabled=false;$('downloadClassReviewExcel').disabled=false;
   $('reviewFile').disabled=false;$('verifyClassReview').disabled=false;
   $('saveClassDraft').disabled=classDraftRevision===null;
   $('classDraftStatus').textContent='Complete roster validated. You may save a revision-checked DRAFT only. No official marks or grades are published.';
  }
  status(result.complete?'Draft checked. This does not save or publish marks.':'Draft incomplete. No marks saved.');
 }catch(e){$('draftCheckResult').textContent=neError(e);status('अंक जाँच असफल भयो। कुनै अंक Save गरिएको छैन।')}
};
$('downloadClassReview').onclick=()=>{
 if(!reviewPackage||busy||!actor||actor.role!=='school_admin'||actor.active!==true||actor.schoolId!==schoolId||auth?.currentUser?.uid!==actor.uid||!classMarkContext){status('डाउनलोड गर्नुअघि कक्षाका अङ्क पुनः जाँच्नुहोस्।');return}
 const {classId,subjectId,term}=classMarkContext;
 if(classId!==$('schoolClass').value||subjectId!==$('subjectId').value||term!==$('term').value){reviewPackage=null;$('downloadClassReview').disabled=true;$('downloadClassReviewExcel').disabled=true;status('छनोट परिवर्तन भयो। अङ्क पुनः लोड गरी जाँच्नुहोस्।');return}
 const url=URL.createObjectURL(new Blob([reviewPackage.json],{type:'application/json'}));
 const link=document.createElement('a');link.href=url;link.download=reviewPackage.filename;link.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
 status('हेर्न मात्र मिल्ने JSON समीक्षा डाउनलोड भयो। कुनै अङ्क सुरक्षित वा प्रकाशित भएको छैन।');
};
$('importClassExcelFile').onchange=()=>lock(false);
$('importClassExcel').onclick=async()=>{
 if(busy||!classMarkContext||!classMarkSettings||actor?.role!=='school_admin'||auth?.currentUser?.uid!==actor.uid||!$('importClassExcelFile').files?.[0])return;
 const attempt=epoch,request=rosterRequest,uid=actor.uid,selectedSchoolId=schoolId;
 const context={...classMarkContext},file=$('importClassExcelFile').files[0];
 lock(true);
 try{
  const verified=await verifySchoolSession({schoolId:selectedSchoolId,uid,readDocument:async path=>{const snap=await api.getDoc(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null;}});
  if(verified.role!=='school_admin')throw new Error('School Admin permission changed');
  const currentSettings=await discoverVerifiedSubjectExamSettings({db,api,schoolId:selectedSchoolId,classId:context.classId,subjectId:context.subjectId,examId:context.term,revalidate:async()=>{if(attempt!==epoch||request!==rosterRequest||auth?.currentUser?.uid!==uid)throw new Error('Session changed')}});
  const roster=await loadCompleteClassRoster({db,api,actor,schoolId:selectedSchoolId,classId:context.classId});
  if(roster.students.some(s=>!isActiveEnrolledStudent(s))||roster.count!==classMarkRoster.length||
   roster.studentIds.some(id=>!classMarkRoster.some(s=>s.id===id))||
   currentSettings.settingsId!==classMarkSettings.settingsId||
   JSON.stringify(currentSettings.components)!==JSON.stringify(classMarkSettings.components))throw new Error('Roster or settings changed; reload');
  const drafts=await readSmssMarksExcel(file,{schoolId:selectedSchoolId,classId:context.classId,subjectId:context.subjectId,examId:context.term,settings:currentSettings,students:roster.students});
  const result=inspectConfiguredClassMarks({schoolId:selectedSchoolId,classId:context.classId,subjectId:context.subjectId,examId:context.term,settings:currentSettings,expectedStudentIds:roster.studentIds,drafts});
  if(!result.complete)throw new Error('Excel marks incomplete or invalid: '+result.invalid.slice(0,3).map(x=>x.studentId+': '+x.message).join('; '));
  if(attempt!==epoch||request!==rosterRequest||auth?.currentUser?.uid!==uid||actor?.uid!==uid||schoolId!==selectedSchoolId||
   context.classId!==$('schoolClass').value||context.subjectId!==$('subjectId').value||context.term!==$('term').value)throw new Error('Session or selection changed');
  const byId=new Map(drafts.map(d=>[d.studentId,d]));
  for(const row of $('classMarkRows').children){
   const draft=byId.get(row.dataset.studentId),absent=row.querySelector('input[data-absent]');
   absent.checked=draft.isAbsent;
   for(const input of row.querySelectorAll('input[data-field]')){input.value=draft.isAbsent?'':String(draft.values[input.dataset.field]);input.disabled=draft.isAbsent}
  }
  reviewPackage=null;$('downloadClassReview').disabled=true;$('downloadClassReviewExcel').disabled=true;
  $('reviewFile').value='';$('reviewVerifyResult').textContent='';
  $('draftCheckResult').textContent='Excel imported into local draft for '+drafts.length+' students. Inspect again. Nothing saved.';
  status('Excel बाट '+drafts.length+' विद्यार्थीको अंक Draft मा भरियो। Save गरिएको छैन।');
 }catch(e){if(attempt===epoch&&request===rosterRequest)status('Excel Import असफल: '+neError(e))}
 finally{if(attempt===epoch){lock(false)}}
};
$('downloadClassTemplateExcel').onclick=()=>{
 if(busy||actor?.role!=='school_admin'||actor.active!==true||actor.schoolId!==schoolId||auth?.currentUser?.uid!==actor.uid||!classMarkContext||!classMarkSettings||!classMarkRoster.length){status('कक्षाको विद्यार्थी र Examination Settings पुनः लोड गर्नुहोस्।');return}
 const {classId,subjectId,term}=classMarkContext;
 if(classId!==$('schoolClass').value||subjectId!==$('subjectId').value||term!==$('term').value){invalidateClassMarks();status('छनोट परिवर्तन भयो। कक्षा पुनः लोड गर्नुहोस्।');return}
 try{
  const workbook=buildClassMarksExcelSample({schoolId,classId,subjectId,examId:term,settings:classMarkSettings,students:classMarkRoster});
  const url=URL.createObjectURL(workbook),link=document.createElement('a');
  link.href=url;link.download=['smss-v47-marks-sample',schoolId,classId,subjectId,term].join('-')+'.xlsx';
  link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  status('कक्षाको Excel Sample डाउनलोड भयो। कुनै अंक Save गरिएको छैन।');
 }catch(e){status('Excel Sample बनाउन सकिएन: '+neError(e))}
};
$('downloadClassReviewExcel').onclick=()=>{
 if(!reviewPackage||busy||actor?.role!=='school_admin'||actor.active!==true||actor.schoolId!==schoolId||auth?.currentUser?.uid!==actor.uid||!classMarkContext){status('Excel निर्यात गर्नुअघि कक्षाका अङ्क पुनः जाँच्नुहोस्।');return}
 const {classId,subjectId,term}=classMarkContext;
 if(classId!==$('schoolClass').value||subjectId!==$('subjectId').value||term!==$('term').value){invalidateClassMarks();status('छनोट परिवर्तन भयो। कक्षाको अङ्क समीक्षा पुनः लोड गर्नुहोस्।');return}
 try{
  const studentNames=Object.fromEntries(classMarkRoster.map(s=>[s.id,String(s.name??s.id)]));
  const workbook=buildClassReviewExcel({json:reviewPackage.json,studentNames});
  const url=URL.createObjectURL(workbook);
  const link=document.createElement('a');link.href=url;link.download=reviewPackage.filename.replace(/\.json$/,'.xlsx');link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  status('हेर्न मात्र मिल्ने कक्षाको Excel निर्यात भयो। कुनै अङ्क सुरक्षित वा प्रकाशित भएको छैन।');
 }catch(e){status('Excel निर्यात असफल: '+neError(e))}
};
$('verifyClassReview').onclick=async()=>{
 if(busy||!classMarkContext||!classMarkSettings||!$('reviewFile').files?.[0]){status('कक्षाका अङ्क जाँच गरेपछि JSON समीक्षा फाइल छान्नुहोस्।');return}
 const file=$('reviewFile').files[0],attempt=epoch,request=rosterRequest,uid=actor?.uid,selectedSchoolId=schoolId;
 if(file.size>900000){$('reviewVerifyResult').textContent='Review file exceeds 900 KB';return}
 const context={...classMarkContext};
 lock(true);$('verifyClassReview').disabled=true;
 try{
  if(!uid||auth?.currentUser?.uid!==uid||actor?.role!=='school_admin')throw new Error('School Admin session required');
  const json=await file.text();
  if(attempt!==epoch||request!==rosterRequest||auth?.currentUser?.uid!==uid||actor?.uid!==uid||schoolId!==selectedSchoolId)throw new Error('Session changed while reading review file');
  const verified=await verifySchoolSession({schoolId:selectedSchoolId,uid,readDocument:async path=>{const snap=await api.getDoc(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null;}});
  if(verified.role!=='school_admin')throw new Error('School Admin permission revoked');
  const settings=await discoverVerifiedSubjectExamSettings({db,api,schoolId:selectedSchoolId,classId:context.classId,subjectId:context.subjectId,examId:context.term,revalidate:async()=>{const session=await verifySchoolSession({schoolId:selectedSchoolId,uid,readDocument:async path=>{const snap=await api.getDoc(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null;}});if(session.role!=='school_admin')throw new Error('School Admin required')}});
  const roster=await loadCompleteClassRoster({db,api,actor,schoolId:selectedSchoolId,classId:context.classId});
  const finalSession=await verifySchoolSession({schoolId:selectedSchoolId,uid,readDocument:async path=>{const snap=await api.getDoc(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null;}});
  if(finalSession.role!=='school_admin'||attempt!==epoch||request!==rosterRequest||auth?.currentUser?.uid!==uid||actor?.uid!==uid||schoolId!==selectedSchoolId||context.classId!==$('schoolClass').value||context.term!==$('term').value||context.subjectId!==$('subjectId').value)throw new Error('School session or selection changed');
  if(!classMarkSettings||JSON.stringify(settings.components)!==JSON.stringify(classMarkSettings.components)||settings.settingsId!==classMarkSettings.settingsId)throw new Error('Settings changed since marks entry was loaded');
  const loadedIds=new Set(classMarkRoster.map(student=>student.id));
  if(roster.students.some(student=>!isActiveEnrolledStudent(student))||loadedIds.size!==roster.count||roster.studentIds.some(id=>!loadedIds.has(id)))throw new Error('Roster changed or contains inactive student since marks entry was loaded');
  const result=verifyClassMarksReviewPackage({json,actor,schoolId:selectedSchoolId,classId:context.classId,subjectId:context.subjectId,examId:context.term,settings,expectedStudentIds:roster.studentIds});
  if(attempt!==epoch||request!==rosterRequest||auth?.currentUser?.uid!==uid||actor?.uid!==uid||schoolId!==selectedSchoolId)throw new Error('School session changed after review validation');
  $('reviewVerifyResult').textContent='Verified '+result.rosterCount+' students against current school records. Review only; nothing saved or published.';
 }catch(error){if(attempt===epoch&&request===rosterRequest)$('reviewVerifyResult').textContent='प्रमाणीकरण असफल: '+neError(error)}
 finally{if(attempt===epoch){lock(false);$('verifyClassReview').disabled=!classMarkContext||!$('reviewFile').files?.length}}
};
$('saveClassDraft').onclick=async()=>{
 if(busy||!reviewPackage||classDraftRevision===null||actor?.role!=='school_admin'||
    actor.active!==true||auth?.currentUser?.uid!==actor.uid||!classMarkContext)return;
 const attempt=epoch,request=rosterRequest,selectedActor=actor,selectedSchoolId=schoolId,
       selectedClass=classMarkContext.classId,selectedSubject=classMarkContext.subjectId,
       selectedTerm=classMarkContext.term,expectedRevision=classDraftRevision;
 if($('schoolClass').value!==selectedClass||$('subjectId').value!==selectedSubject||
    $('term').value!==selectedTerm)return;
 if(!window.confirm('यो कक्षाका सबै विद्यार्थीको अंक DRAFT मा मात्र सुरक्षित गर्ने हो। आधिकारिक नतिजा प्रकाशन हुँदैन। अगाडि बढ्ने?'))return;
 let entries;
 try{entries=collectClassMarkEntries()}catch(e){$('classDraftStatus').textContent='Draft Save रोकियो: '+neError(e);return}
 lock(true);$('classDraftStatus').textContent='पूरा कक्षाको Draft सुरक्षित गर्न पुनः जाँच भइरहेको छ…';
 try{
  if(!await enforceSchoolIdle(auth,authSdk))throw Error('Login निष्क्रियताका कारण समाप्त भयो');
  if(attempt!==epoch||request!==rosterRequest||actor!==selectedActor||schoolId!==selectedSchoolId||
     auth?.currentUser?.uid!==selectedActor.uid)throw Error('School session or selection changed');
  const saved=await saveVerifiedCompleteClassDraft({
   db,api,auth,actor:selectedActor,schoolId:selectedSchoolId,classId:selectedClass,
   subjectId:selectedSubject,examId:selectedTerm,drafts:entries,expectedRevision
  });
  if(attempt!==epoch||request!==rosterRequest||actor!==selectedActor||schoolId!==selectedSchoolId||
     auth?.currentUser?.uid!==selectedActor.uid)return;
  if(saved.rosterReverified!==true)throw Error('Saved Draft requires final verification');
  classDraftRevision=saved.revision;reviewPackage=null;
  $('downloadClassReview').disabled=true;$('downloadClassReviewExcel').disabled=true;
  $('saveClassDraft').disabled=true;
  $('classDraftStatus').textContent=saved.rosterCount+' विद्यार्थीको पूरा-कक्षा Draft Revision '+saved.revision+
    ' सुरक्षित भयो। आधिकारिक Marks/Grade मा केही Save वा Publish गरिएको छैन।';
  status('Draft Save सफल। यो आधिकारिक नतिजा होइन; फेरि सम्पादन गर्न सबै अंक पुनः जाँच्नुहोस्।');
 }catch(error){
  if(attempt===epoch&&request===rosterRequest&&actor===selectedActor){
   reviewPackage=null;$('saveClassDraft').disabled=true;
   classDraftRevision=null;
   $('classDraftStatus').textContent=error.name==='ClassDraftPostSaveReviewError'
     ? 'Draft Revision '+error.revision+' को Commit पुष्टि भएको छ, तर अन्तिम विद्यार्थी सूची/Revision जाँच असफल भयो। फेरि Save नगरी पहिले कक्षा Reload गरेर सुरक्षित Draft र Revision जाँच्नुहोस्। कारण: '+(error.cause?.message??error.message)
     : 'Draft Save को स्थिति पुष्टि भएन: '+neError(error)+'। Network समस्या भए Save भइसकेको हुन सक्छ। फेरि Save गर्नु अघि कक्षा Reload गरी Revision जाँच्नुहोस्।';
   status('आधिकारिक Marks/Grade मा परिवर्तन भएको छैन। Draft Save को अवस्था जाँच्नुपर्छ; तुरुन्त दोहोर्‍याएर Save नगर्नुहोस्।');
  }
 }finally{if(attempt===epoch)lock(false)}
};
$('serverReviewMarks').onclick=async()=>{
 if(busy||actor?.role!=='school_admin'||!classMarkContext||classDraftRevision===null||classDraftRevision<1)return status('पहिले सम्पूर्ण कक्षाको मस्यौदा लोड गरी सुरक्षित गर्नुहोस्।');
 const selectedActor=actor,selectedSchool=schoolId,attempt=epoch,request=rosterRequest;
 const scope={schoolId:selectedSchool,classId:classMarkContext.classId,subjectId:classMarkContext.subjectId,examId:classMarkContext.term};
 const check=()=>{if(attempt!==epoch||request!==rosterRequest||actor!==selectedActor||auth?.currentUser?.uid!==selectedActor.uid||
  schoolId!==selectedSchool||$('schoolClass').value!==scope.classId||$('subjectId').value!==scope.subjectId||$('term').value!==scope.examId)
  throw Error('School or class selection changed')};
 const show=s=>{$('serverPublicationStatus').textContent=s};
 lock(true);$('serverReviewMarks').disabled=true;
 let committing=false;
 try{
  if(!await enforceSchoolIdle(auth,authSdk))throw Error('Login expired');
  check();
  const {runSavedClassPublication}=await import('./saved-class-publication-client.mjs');
  const result=await runSavedClassPublication({scope,getIdToken:()=>auth.currentUser.getIdToken(),fetchImpl:(...args)=>fetch(...args),assertCurrent:check,
   confirmStage:review=>window.confirm('Review completed for saved Draft: '+review.rosterCount+' students. Stage this saved revision? Unsaved screen changes are not included.'),
   confirmCommit:({review,publicationId,previousPublicationId})=>window.confirm('Commit '+review.rosterCount+' saved student marks? '+(previousPublicationId?'Replace the previously committed subject result.':'First publication.')+' This does not approve CDC Grade Sheets.'),
   onStage:stage=>show('Staged '+stage.rosterCount+' students. Not published.'),
   onCommit:()=>{committing=true}
  });
  check();
  show(result.committed?'Marks committed. CDC Grade Sheet approval is separate.':'Publication cancelled. No final marks committed by this action.');
 }catch(e){if(attempt===epoch&&request===rosterRequest)show((committing?'Final publication outcome not confirmed; reload official report before retrying. ':'Server review/stage blocked. ')+neError(e))}
 finally{if(attempt===epoch)lock(false)}
};
$('saveClassMarks').onclick=()=>status('अङ्क सुरक्षित गर्ने वा प्रकाशन गर्ने आधिकारिक सुविधा बन्द छ। कुनै अङ्क सुरक्षित भएको छैन।');

// Read-only V46 IEMIS component reference; no mark writes.
$('inspectIemisSchema').onclick=()=>{
 const tbody=$('iemisSchemaRows');tbody.replaceChildren();
 if(!actor||!auth?.currentUser||auth.currentUser.uid!==actor.uid||actor.schoolId!==schoolId){$('iemisSchemaStatus').textContent='Sign in to the verified school first.';return;}
 try{
  const classNo=Number($('schoolClass').value);
  const schema=iemisEntrySchema(classNo,$('iemisTerm').value,$('iemisSubject').value.trim());
  for(const component of schema){const tr=document.createElement('tr');for(const value of [component.label,component.readonly?'Calculated':component.max??'Based on count']){const td=document.createElement('td');td.textContent=String(value);tr.append(td)}tbody.append(tr)}
  $('iemisSchemaStatus').textContent='V46 IEMIS component reference only; Save/Publish disabled.';
 }catch(error){$('iemisSchemaStatus').textContent=neError(error)}
};


if(requestedSchool)queueMicrotask(()=>$('connect').click());

async function runEntrySettingsAudit(exportExcel=false){
 if(busy||actor?.role!=='school_admin')return;
 const member=actor,attempt=epoch,classId=$('schoolClass').value,examId=$('term').value;
 const check=()=>{if(attempt!==epoch||actor!==member||auth.currentUser?.uid!==member.uid||$('schoolClass').value!==classId||$('term').value!==examId)throw Error('Settings audit scope changed')};
 clearSettingsAudit();lock(true);$('auditEntrySettingsStatus').textContent='कक्षाका परीक्षा सेटिङ जाँच हुँदैछन्…';
 try{
  if(!await enforceSchoolIdle(auth,authSdk))throw Error('Login expired');check();
  const result=await readEntrySettingsCoverage({db,api,auth,actor:member,schoolId:member.schoolId,classId,examId,assertCurrent:check});check();
  for(const r of result.rows){const tr=document.createElement('tr');for(const v of [r.subject,r.status,r.expected,r.configured]){const td=document.createElement('td');td.textContent=v||'—';tr.append(td)}$('auditEntrySettingsRows').append(tr)}
  if(exportExcel){const file=entrySettingsAuditWorkbook(result);check();const url=URL.createObjectURL(file.blob),a=document.createElement('a');a.href=url;a.download=file.filename;try{document.body.append(a);a.click()}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}}
  $('auditEntrySettingsStatus').textContent=result.matched+' सेटिङ V46 ढाँचासँग मिले; '+result.reviewRequired+' समीक्षा आवश्यक। वास्तविक IEMIS प्रमाणीकरण होइन। कुनै परिवर्तन गरिएको छैन।';
 }catch(e){try{check();$('auditEntrySettingsStatus').textContent='सेटिङ जाँच उपलब्ध भएन: '+neError(e)}catch{}}
 finally{if(attempt===epoch&&actor===member)lock(false)}
}
$('auditEntrySettings').onclick=()=>void runEntrySettingsAudit(false);
$('exportEntrySettingsAudit').onclick=()=>void runEntrySettingsAudit(true);

$('exportAllTermSettingsAudit').onclick=async()=>{
 if(busy||actor?.role!=='school_admin')return;
 const member=actor,attempt=epoch,classId=$('schoolClass').value,examId=$('term').value;
 const check=()=>{if(attempt!==epoch||actor!==member||auth.currentUser?.uid!==member.uid||$('schoolClass').value!==classId||$('term').value!==examId)throw Error('Settings audit scope changed')};
 clearSettingsAudit();lock(true);$('auditEntrySettingsStatus').textContent='चारवटै Term का सेटिङ जाँच हुँदैछन्…';
 try{
  if(!await enforceSchoolIdle(auth,authSdk))throw Error('Login expired');check();
  const result=await readAllTermSettingsCoverage({db,api,auth,actor:member,schoolId:member.schoolId,classId,assertCurrent:check});check();
  const file=allTermSettingsAuditWorkbook(result),url=URL.createObjectURL(file.blob),a=document.createElement('a');a.href=url;a.download=file.filename;
  try{document.body.append(a);a.click()}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
  $('auditEntrySettingsStatus').textContent=result.matched+' सेटिङ मिले; '+result.reviewRequired+' समीक्षा आवश्यक। चारवटै Term को Excel तयार भयो। वास्तविक IEMIS प्रमाणीकरण होइन।';
 }catch(e){try{check();$('auditEntrySettingsStatus').textContent='सेटिङ जाँच उपलब्ध भएन: '+neError(e)}catch{}}
 finally{if(attempt===epoch&&actor===member)lock(false)}
};
