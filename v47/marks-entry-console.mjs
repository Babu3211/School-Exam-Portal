import {verifySchoolSession} from './verified-school-session.mjs';
import {validateSchoolId} from './school-paths.mjs';
import {loadCompleteClassRoster} from './complete-class-roster.mjs';
import {inspectClassMarkDraft} from './class-mark-draft-inspector.mjs';
import {iemisEntrySchema} from './iemis-entry.js';
import {discoverVerifiedSubjectExamSettings} from './discover-subject-exam-settings.mjs';
import {inspectConfiguredClassMarks} from './configured-mark-preflight.mjs';
import {prepareConfiguredClassPublication} from './configured-class-publication-preview.mjs';
const $=id=>document.getElementById(id),status=msg=>{$('message').textContent=msg};
let auth,authSdk,api,db,actor,schoolId,epoch=0,busy=false,studentsLoaded=false,subjectsLoaded=false,loadedStudentClass=null,loadedSubjectClass=null;
let classMarkRoster=[],classMarkContext=null,classMarkSettings=null,rosterRequest=0,optionRequest=0;
function reset(){$('iemisSchemaRows').replaceChildren();$('iemisSchemaStatus').textContent='';optionRequest++;rosterRequest++;classMarkRoster=[];classMarkContext=null;classMarkSettings=null;$('classMarkRows').replaceChildren();$('classMarkHeader').replaceChildren();$('classMarkCount').textContent='';$('saveClassMarks').disabled=true;$('inspectClassMarks').disabled=true;$('draftCheckResult').textContent='';$('loadClassMarks').disabled=true;epoch++;studentsLoaded=false;subjectsLoaded=false;loadedStudentClass=null;loadedSubjectClass=null;actor=null;schoolId=null;$('work').hidden=true;$('logout').disabled=true;$('save').disabled=true;$('studentId').replaceChildren();$('subjectId').replaceChildren();}
function lock(value){busy=value;for(const input of $('classMarkRows').querySelectorAll('input'))input.disabled=value||(input.matches('input[data-field]')&&input.closest('tr')?.querySelector('input[data-absent]')?.checked===true);$('loadClassMarks').disabled=value||!actor||actor.role!=='school_admin';$('saveClassMarks').disabled=true;$('inspectClassMarks').disabled=value||!actor||!classMarkContext;for(const id of ['login','logout','loadStudents','loadSubjects','save','schoolClass','term','subjectId','studentId','theory','practical'])$(id).disabled=value||(['loadStudents','loadSubjects','save'].includes(id)&&!actor);if(!value){$('login').disabled=!auth;$('logout').disabled=!actor;$('save').disabled=true;}}
$('connect').onclick=async()=>{try{const config=JSON.parse($('config').value);if(config.projectId!=='smss-exam-portal-v47')throw new Error('Only V47 Firebase project allowed');const appSdk=await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js');authSdk=await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js');api=await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js');const app=appSdk.initializeApp(config,'smss-v47-marks-entry');auth=authSdk.getAuth(app);await authSdk.setPersistence(auth,authSdk.inMemoryPersistence);db=api.getFirestore(app);$('connect').disabled=true;$('login').disabled=false;status('Connected to V47')}catch(e){status('Connection failed: '+e.message)}};
$('login').onclick=async()=>{if(busy)return;reset();const attempt=epoch;const loginAuth=auth;lock(true);try{const id=validateSchoolId($('schoolId').value.trim());const credential=await authSdk.signInWithEmailAndPassword(auth,$('email').value,$('password').value);$('password').value='';if(attempt!==epoch){if(loginAuth.currentUser?.uid===credential.user.uid)await authSdk.signOut(loginAuth);return}const uid=credential.user.uid;const session=await verifySchoolSession({schoolId:id,uid,readDocument:async path=>{const snap=await api.getDoc(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null;}});if(attempt!==epoch){if(loginAuth.currentUser?.uid===uid)await authSdk.signOut(loginAuth);return}if(loginAuth.currentUser?.uid!==uid||session.role!=='school_admin')throw new Error('School Admin required');const school=await api.getDoc(api.doc(db,'schools',id));if(attempt!==epoch){if(loginAuth.currentUser?.uid===uid)await authSdk.signOut(loginAuth);return}if(loginAuth.currentUser?.uid!==uid||!school.exists()||school.data().active!==true)throw new Error('School inactive');actor={role:'school_admin',active:true,schoolId:id,uid};schoolId=id;$('heading').textContent='Raw mark — '+String(school.data().name??id);$('work').hidden=false;status('विद्यालय प्रशासकको लगइन सफल भयो। विद्यार्थी र विषय लोड गर्नुहोस्। हाल अंक Save/Publish बन्द छ।')}catch(e){if(attempt===epoch){reset();try{await authSdk.signOut(auth)}catch{}status('Sign in failed: '+e.message)}}finally{lock(false)}};
$('logout').onclick=async()=>{if(busy)return;lock(true);reset();try{await authSdk.signOut(auth);status('Signed out')}catch(e){status('Sign out failed: '+e.message)}finally{lock(false)}};
async function loadOptions(collection,element,label){if(busy||!actor)return;if(collection==='subjects')invalidateClassMarks();const request=++optionRequest,attempt=epoch,schoolClass=$('schoolClass').value,uid=actor.uid,selectedSchoolId=schoolId;if(!auth?.currentUser?.uid||auth.currentUser.uid!==uid){status('Authentication changed; sign in again');return}lock(true);try{
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
 }catch(e){if(request===optionRequest&&attempt===epoch&&actor){if(collection==='students'){studentsLoaded=false;loadedStudentClass=null;$('studentId').replaceChildren()}else{subjectsLoaded=false;loadedSubjectClass=null;$('subjectId').replaceChildren()}status('Load failed: '+e.message)}}finally{if(request===optionRequest&&attempt===epoch)lock(false)}}
$('loadStudents').onclick=()=>loadOptions('students',$('studentId'),'students');$('loadSubjects').onclick=()=>loadOptions('subjects',$('subjectId'),'subjects');
$('schoolClass').onchange=()=>{optionRequest++;invalidateClassMarks();studentsLoaded=false;subjectsLoaded=false;loadedStudentClass=null;loadedSubjectClass=null;$('studentId').replaceChildren();$('subjectId').replaceChildren();lock(false)};
$('studentId').onchange=()=>lock(false);$('subjectId').onchange=()=>lock(false);
$('save').onclick=()=>status('Individual mark saving is disabled. Use complete-class marks.');

function invalidateClassMarks(){rosterRequest++;classMarkRoster=[];classMarkContext=null;classMarkSettings=null;$('classMarkRows').replaceChildren();$('classMarkHeader').replaceChildren();$('classMarkCount').textContent='';$('draftCheckResult').textContent='';$('inspectClassMarks').disabled=true;$('saveClassMarks').disabled=true}
$('term').onchange=()=>{invalidateClassMarks();lock(false)};
$('subjectId').onchange=()=>{invalidateClassMarks();lock(false)};
$('loadClassMarks').onclick=async()=>{
 if(busy||actor?.role!=='school_admin'||!subjectsLoaded||loadedSubjectClass!==$('schoolClass').value||!$('subjectId').value){status('Load active class subjects first');return}
 if(!auth?.currentUser?.uid||auth.currentUser.uid!==actor.uid){status('Authentication changed; sign in again');return}
 const attempt=epoch,classId=$('schoolClass').value,term=$('term').value,subjectId=$('subjectId').value,uid=actor.uid,selectedSchoolId=schoolId;
 invalidateClassMarks();const request=rosterRequest;lock(true);
 try{
  const settings=await discoverVerifiedSubjectExamSettings({db,api,schoolId:selectedSchoolId,classId,subjectId,examId:term,revalidate:async()=>{if(attempt!==epoch||auth?.currentUser?.uid!==uid||actor?.uid!==uid||schoolId!==selectedSchoolId)throw new Error('School session changed');const verified=await verifySchoolSession({schoolId:selectedSchoolId,uid,readDocument:async path=>{const snap=await api.getDoc(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null;}});if(verified.role!=='school_admin')throw new Error('School Admin required');}});
  const roster=await loadCompleteClassRoster({db,api,actor,schoolId:selectedSchoolId,classId});
  const finalSession=await verifySchoolSession({schoolId:selectedSchoolId,uid,readDocument:async path=>{const snap=await api.getDoc(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null;}});
  if(finalSession.role!=='school_admin')throw new Error('School Admin session revoked during roster load');
  if(request!==rosterRequest||attempt!==epoch||classId!==$('schoolClass').value||term!==$('term').value||subjectId!==$('subjectId').value)return;
  if(auth?.currentUser?.uid!==uid||actor?.uid!==uid||schoolId!==selectedSchoolId||actor?.schoolId!==selectedSchoolId)throw new Error('Authentication or school changed during roster load');
  // Display alphabetically without changing the authoritative roster IDs used for completeness checks.
  classMarkSettings=settings;
  const header=$('classMarkHeader');header.replaceChildren();for(const label of ['Student','Absent',...settings.components.map(c=>c.name+' / '+c.fullMarks)]){const th=document.createElement('th');th.textContent=label;header.append(th)}
  classMarkRoster=[...roster.students].sort((a,b)=>String(a.name??a.id).localeCompare(String(b.name??b.id),'en',{sensitivity:'base',numeric:true})||a.id.localeCompare(b.id));
  classMarkContext={classId,term,subjectId};
  const body=$('classMarkRows'),fragment=document.createDocumentFragment();
  for(const student of classMarkRoster){
   const row=document.createElement('tr');row.dataset.studentId=student.id;
   const name=document.createElement('td');name.textContent=String(student.name??student.id);row.append(name);
   const absenceCell=document.createElement('td'),absence=document.createElement('input');absence.type='checkbox';absence.dataset.absent='true';absence.setAttribute('aria-label','Absent '+student.id);absenceCell.append(absence);row.append(absenceCell);
   for(const component of settings.components){
    const td=document.createElement('td'),input=document.createElement('input');
    input.type='number';input.min='0';input.max=String(component.fullMarks);input.step='any';input.dataset.field=component.key;
    input.setAttribute('aria-label',component.name+' marks for '+student.id);td.append(input);row.append(td);
   }fragment.append(row);
  }
  body.append(fragment);
  $('classMarkCount').textContent=roster.count+' students in full roster. '+('Save/Publish disabled until audited complete-class workflow is ready.');
  status('कक्षाका विद्यार्थी लोड भए। सबैको अंक जाँच्न सकिन्छ, तर Save/Publish बन्द छ।');
 }catch(e){if(request===rosterRequest&&attempt===epoch){invalidateClassMarks();lock(false);status('Unable to load complete roster: '+e.message)}}
 finally{if(request===rosterRequest&&attempt===epoch)lock(false)}
};
// Any edit invalidates the previously displayed draft inspection.
$('classMarkRows').addEventListener('input',event=>{
 if(!event.target?.matches?.('input[data-field],input[data-absent]'))return;
 if(event.target.matches('input[data-absent]')){const row=event.target.closest('tr');for(const input of row.querySelectorAll('input[data-field]')){input.value='';input.disabled=event.target.checked}}
 $('draftCheckResult').textContent='Draft changed. Inspect again before saving.';
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
 }catch(error){if(attempt===epoch&&request===rosterRequest){invalidateClassMarks();status('विद्यालयको अधिकार पुनः पुष्टि भएन। कक्षा पुनः लोड गर्नुहोस्।')}return}
 finally{if(attempt===epoch)lock(false)}
 if(busy||!classMarkContext||attempt!==epoch||request!==rosterRequest||actor?.uid!==uid||schoolId!==selectedSchoolId||auth?.currentUser?.uid!==uid)return;
 const {classId,term,subjectId}=classMarkContext;
 if(!actor||auth?.currentUser?.uid!==actor.uid||actor.schoolId!==schoolId){invalidateClassMarks();status('विद्यालयको लगइन परिवर्तन भयो। पुनः लगइन गर्नुहोस्।');return}
 if(classId!==$('schoolClass').value||term!==$('term').value||subjectId!==$('subjectId').value){invalidateClassMarks();status('Selection changed; reload roster');return}
 try{
  const expectedStudentIds=classMarkRoster.map(student=>student.id),drafts=collectClassMarkEntries();
  const result=inspectConfiguredClassMarks({schoolId,classId,examId:term,subjectId,settings:classMarkSettings,expectedStudentIds,drafts});
  $('draftCheckResult').textContent=(result.complete?'All student marks valid.':'Class marks incomplete.')+(result.missing.length?' Missing: '+result.missing.slice(0,8).join(', '):'')+(result.invalid.length?' Invalid: '+result.invalid.slice(0,4).map(x=>x.studentId+': '+x.message).join('; '):'');
  if(result.complete){
   const proposal=prepareConfiguredClassPublication({actor,schoolId,classId,subjectId,examId:term,settings:classMarkSettings,expectedStudentIds,drafts});
   $('draftCheckResult').textContent+=' Read-only publication review: '+proposal.rosterCount+' students; '+proposal.reviewBatches.length+' review groups. No data saved.';
  }
  status(result.complete?'Draft checked. This does not save or publish marks.':'Draft incomplete. No marks saved.');
 }catch(e){$('draftCheckResult').textContent=e.message;status('अंक जाँच असफल भयो। कुनै अंक Save गरिएको छैन।')}
};
$('saveClassMarks').onclick=()=>status('Save/Publish disabled: secure complete-class workflow is not implemented. No marks saved.');

// Read-only V46 IEMIS component reference; no mark writes.
$('inspectIemisSchema').onclick=()=>{
 const tbody=$('iemisSchemaRows');tbody.replaceChildren();
 if(!actor||!auth?.currentUser||auth.currentUser.uid!==actor.uid||actor.schoolId!==schoolId){$('iemisSchemaStatus').textContent='Sign in to the verified school first.';return;}
 try{
  const classNo=Number($('schoolClass').value);
  const schema=iemisEntrySchema(classNo,$('iemisTerm').value,$('iemisSubject').value.trim());
  for(const component of schema){const tr=document.createElement('tr');for(const value of [component.label,component.readonly?'Calculated':component.max??'Based on count']){const td=document.createElement('td');td.textContent=String(value);tr.append(td)}tbody.append(tr)}
  $('iemisSchemaStatus').textContent='V46 IEMIS component reference only; Save/Publish disabled.';
 }catch(error){$('iemisSchemaStatus').textContent=error.message}
};

