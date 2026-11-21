import {verifySchoolSession} from './verified-school-session.mjs';
import {validateSchoolId} from './school-paths.mjs';
import {loadCompleteClassRoster} from './complete-class-roster.mjs';
import {inspectClassMarkDraft} from './class-mark-draft-inspector.mjs';
const $=id=>document.getElementById(id),status=msg=>{$('message').textContent=msg};
let auth,authSdk,api,db,actor,schoolId,epoch=0,busy=false,studentsLoaded=false,subjectsLoaded=false,loadedStudentClass=null,loadedSubjectClass=null;
let classMarkRoster=[],classMarkContext=null,rosterRequest=0,optionRequest=0;
function reset(){optionRequest++;rosterRequest++;classMarkRoster=[];classMarkContext=null;$('classMarkRows').replaceChildren();$('classMarkCount').textContent='';$('saveClassMarks').disabled=true;$('inspectClassMarks').disabled=true;$('draftCheckResult').textContent='';$('loadClassMarks').disabled=true;epoch++;studentsLoaded=false;subjectsLoaded=false;loadedStudentClass=null;loadedSubjectClass=null;actor=null;schoolId=null;$('work').hidden=true;$('logout').disabled=true;$('save').disabled=true;$('studentId').replaceChildren();$('subjectId').replaceChildren();}
function lock(value){busy=value;for(const input of $('classMarkRows').querySelectorAll('input'))input.disabled=value;$('loadClassMarks').disabled=value||!actor||actor.role!=='school_admin';$('saveClassMarks').disabled=true;$('inspectClassMarks').disabled=value||!actor||!classMarkContext;for(const id of ['login','logout','loadStudents','loadSubjects','save','schoolClass','term','subjectId','studentId','theory','practical'])$(id).disabled=value||(['loadStudents','loadSubjects','save'].includes(id)&&!actor);if(!value){$('login').disabled=!auth;$('logout').disabled=!actor;$('save').disabled=true;}}
$('connect').onclick=async()=>{try{const config=JSON.parse($('config').value);if(config.projectId!=='smss-exam-portal-v47')throw new Error('Only V47 Firebase project allowed');const appSdk=await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js');authSdk=await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js');api=await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js');const app=appSdk.initializeApp(config,'smss-v47-marks-entry');auth=authSdk.getAuth(app);await authSdk.setPersistence(auth,authSdk.inMemoryPersistence);db=api.getFirestore(app);$('connect').disabled=true;$('login').disabled=false;status('Connected to V47')}catch(e){status('Connection failed: '+e.message)}};
$('login').onclick=async()=>{if(busy)return;reset();const attempt=epoch;lock(true);try{const id=validateSchoolId($('schoolId').value.trim());const credential=await authSdk.signInWithEmailAndPassword(auth,$('email').value,$('password').value);$('password').value='';if(attempt!==epoch)return;const uid=credential.user.uid;const session=await verifySchoolSession({schoolId:id,uid,readDocument:async path=>{const snap=await api.getDoc(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null;}});if(attempt!==epoch||auth.currentUser?.uid!==uid||session.role!=='school_admin')throw new Error('School Admin required');const school=await api.getDoc(api.doc(db,'schools',id));if(attempt!==epoch||auth.currentUser?.uid!==uid||!school.exists()||school.data().active!==true)throw new Error('School inactive');actor={role:'school_admin',active:true,schoolId:id,uid};schoolId=id;$('heading').textContent='Raw mark — '+String(school.data().name??id);$('work').hidden=false;status('School Admin signed in. Load students and subjects before saving.')}catch(e){if(attempt===epoch){reset();try{await authSdk.signOut(auth)}catch{}status('Sign in failed: '+e.message)}}finally{lock(false)}};
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
 const filtered=collection==='students'?rows:rows.filter(row=>row.active===true&&!(('9'===schoolClass||'10'===schoolClass)&&row.name==='Computer'));
 element.replaceChildren();if(collection==='students'){studentsLoaded=true;loadedStudentClass=schoolClass}else{subjectsLoaded=true;loadedSubjectClass=schoolClass}
 for(const row of filtered){const option=document.createElement('option');option.value=row.id;option.textContent=String(row.name??row.id)+' ('+row.id+')';element.append(option)}
 status(filtered.length+' '+label+' loaded. Saving requires a valid student-subject assignment.');
 }catch(e){if(request===optionRequest&&attempt===epoch&&actor){if(collection==='students'){studentsLoaded=false;loadedStudentClass=null;$('studentId').replaceChildren()}else{subjectsLoaded=false;loadedSubjectClass=null;$('subjectId').replaceChildren()}status('Load failed: '+e.message)}}finally{if(request===optionRequest&&attempt===epoch)lock(false)}}
$('loadStudents').onclick=()=>loadOptions('students',$('studentId'),'students');$('loadSubjects').onclick=()=>loadOptions('subjects',$('subjectId'),'subjects');
$('schoolClass').onchange=()=>{optionRequest++;invalidateClassMarks();studentsLoaded=false;subjectsLoaded=false;loadedStudentClass=null;loadedSubjectClass=null;$('studentId').replaceChildren();$('subjectId').replaceChildren();lock(false)};
$('studentId').onchange=()=>lock(false);$('subjectId').onchange=()=>lock(false);
$('save').onclick=()=>status('Individual mark saving is disabled. Use complete-class marks.');

function invalidateClassMarks(){rosterRequest++;classMarkRoster=[];classMarkContext=null;$('classMarkRows').replaceChildren();$('classMarkCount').textContent='';$('draftCheckResult').textContent='';$('inspectClassMarks').disabled=true;$('saveClassMarks').disabled=true}
$('term').onchange=()=>{invalidateClassMarks();lock(false)};
$('subjectId').onchange=()=>{invalidateClassMarks();lock(false)};
$('loadClassMarks').onclick=async()=>{
 if(busy||actor?.role!=='school_admin'||!subjectsLoaded||loadedSubjectClass!==$('schoolClass').value||!$('subjectId').value){status('Load active class subjects first');return}
 if(!auth?.currentUser?.uid||auth.currentUser.uid!==actor.uid){status('Authentication changed; sign in again');return}
 const attempt=epoch,classId=$('schoolClass').value,term=$('term').value,subjectId=$('subjectId').value,uid=actor.uid,selectedSchoolId=schoolId;
 invalidateClassMarks();const request=rosterRequest;lock(true);
 try{
  const roster=await loadCompleteClassRoster({db,api,actor,schoolId,classId});
  if(request!==rosterRequest||attempt!==epoch||classId!==$('schoolClass').value||term!==$('term').value||subjectId!==$('subjectId').value)return;
  if(auth?.currentUser?.uid!==uid||actor?.uid!==uid||schoolId!==selectedSchoolId||actor?.schoolId!==selectedSchoolId)throw new Error('Authentication or school changed during roster load');
  // Display alphabetically without changing the authoritative roster IDs used for completeness checks.
  classMarkRoster=[...roster.students].sort((a,b)=>String(a.name??a.id).localeCompare(String(b.name??b.id),'en',{sensitivity:'base',numeric:true})||a.id.localeCompare(b.id));
  classMarkContext={classId,term,subjectId};
  const body=$('classMarkRows'),fragment=document.createDocumentFragment();
  for(const student of classMarkRoster){
   const row=document.createElement('tr');row.dataset.studentId=student.id;
   const name=document.createElement('td');name.textContent=String(student.name??student.id);row.append(name);
   for(const field of ['theory','practical']){
    const td=document.createElement('td'),input=document.createElement('input');
    input.type='number';input.min='0';input.max='100';input.step='any';input.dataset.field=field;
    input.setAttribute('aria-label',field+' marks for '+student.id);td.append(input);row.append(td);
   }fragment.append(row);
  }
  body.append(fragment);
  $('classMarkCount').textContent=roster.count+' students in full roster. '+('Save/Publish disabled until audited complete-class workflow is ready.');
  status('Full class roster loaded. Check every student before saving.');
 }catch(e){if(request===rosterRequest&&attempt===epoch){invalidateClassMarks();lock(false);status('Unable to load complete roster: '+e.message)}}
 finally{if(request===rosterRequest&&attempt===epoch)lock(false)}
};
// Any edit invalidates the previously displayed draft inspection.
$('classMarkRows').addEventListener('input',event=>{
 if(!event.target?.matches?.('input[data-field]'))return;
 $('draftCheckResult').textContent='Draft changed. Inspect again before saving.';
});
function collectClassMarkEntries(){
 if(!classMarkContext)throw new Error('Load full roster first');
 const rendered=[...$('classMarkRows').children];
 const expected=new Set(classMarkRoster.map(student=>student.id));
 if(rendered.length!==expected.size)throw new Error('Class mark rows changed; reload the authoritative roster');
 const rows=new Map();
 for(const row of rendered){
  const id=row.dataset.studentId;
  if(!expected.has(id)||rows.has(id))throw new Error('Unexpected or duplicate student row; reload the class');
  if(row.querySelectorAll('[data-field="theory"]').length!==1||row.querySelectorAll('[data-field="practical"]').length!==1)throw new Error('Invalid mark input row; reload the class');
  rows.set(id,row);
 }
 return classMarkRoster.map(student=>{
  const row=rows.get(student.id);
  return {studentId:student.id,class:classMarkContext.classId,term:classMarkContext.term,subjectId:classMarkContext.subjectId,
   theory:row?.querySelector('[data-field="theory"]')?.value??'',practical:row?.querySelector('[data-field="practical"]')?.value??''};
 });
}
$('inspectClassMarks').onclick=()=>{
 if(busy||!classMarkContext)return;
 const {classId,term,subjectId}=classMarkContext;
 if(classId!==$('schoolClass').value||term!==$('term').value||subjectId!==$('subjectId').value){invalidateClassMarks();status('Selection changed; reload roster');return}
 try{
  const result=inspectClassMarkDraft({schoolId,classId,term,subjectId,expectedStudentIds:classMarkRoster.map(s=>s.id),entries:collectClassMarkEntries()});
  $('draftCheckResult').textContent=result.summary+(result.missing.length?' Missing: '+result.missing.slice(0,8).join(', '):'')+(result.invalid.length?' Invalid: '+result.invalid.slice(0,4).join('; '):'');
  status(result.ready?'Draft checked. This does not save or publish marks.':'Draft incomplete. No marks saved.');
 }catch(e){$('draftCheckResult').textContent=e.message;status('Draft validation failed. No marks saved.')}
};
$('saveClassMarks').onclick=()=>status('Save/Publish disabled: secure complete-class workflow is not implemented. No marks saved.');
