import {verifySchoolSession} from './verified-school-session.mjs';
import {validateSchoolId} from './school-paths.mjs';
import {createSchoolMarkOnly} from './mark-create-service.mjs';
import {preflightRawMarkSave} from './mark-save-preflight.mjs';
import {loadCompleteClassRoster} from './complete-class-roster.mjs';
import {saveVerifiedSmallClassMarks} from './verified-small-class-mark-save.mjs';
const $=id=>document.getElementById(id),status=msg=>{$('message').textContent=msg};
let auth,authSdk,api,db,actor,schoolId,epoch=0,busy=false,studentsLoaded=false,subjectsLoaded=false,loadedStudentClass=null,loadedSubjectClass=null;
let classMarkRoster=[],classMarkContext=null;
function reset(){classMarkRoster=[];classMarkContext=null;$('classMarkRows').replaceChildren();$('classMarkCount').textContent='';$('saveClassMarks').disabled=true;$('loadClassMarks').disabled=true;epoch++;studentsLoaded=false;subjectsLoaded=false;loadedStudentClass=null;loadedSubjectClass=null;actor=null;schoolId=null;$('work').hidden=true;$('logout').disabled=true;$('save').disabled=true;$('studentId').replaceChildren();$('subjectId').replaceChildren();}
function lock(value){busy=value;$('loadClassMarks').disabled=value||!actor||actor.role!=='school_admin';$('saveClassMarks').disabled=value||!actor||!classMarkContext||classMarkRoster.length>3;for(const id of ['login','logout','loadStudents','loadSubjects','save','schoolClass','term'])$(id).disabled=value||(['loadStudents','loadSubjects','save'].includes(id)&&!actor);if(!value){$('login').disabled=!auth;$('logout').disabled=!actor;$('save').disabled=true;}}
$('connect').onclick=async()=>{try{const config=JSON.parse($('config').value);if(config.projectId!=='smss-exam-portal-v47')throw new Error('Only V47 Firebase project allowed');const appSdk=await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js');authSdk=await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js');api=await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js');const app=appSdk.initializeApp(config,'smss-v47-marks-entry');auth=authSdk.getAuth(app);await authSdk.setPersistence(auth,authSdk.inMemoryPersistence);db=api.getFirestore(app);$('connect').disabled=true;$('login').disabled=false;status('Connected to V47')}catch(e){status('Connection failed: '+e.message)}};
$('login').onclick=async()=>{if(busy)return;reset();const attempt=epoch;lock(true);try{const id=validateSchoolId($('schoolId').value.trim());const credential=await authSdk.signInWithEmailAndPassword(auth,$('email').value,$('password').value);$('password').value='';if(attempt!==epoch)return;const uid=credential.user.uid;const session=await verifySchoolSession({schoolId:id,uid,readDocument:async path=>{const snap=await api.getDoc(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null;}});if(attempt!==epoch||auth.currentUser?.uid!==uid||session.role!=='school_admin')throw new Error('School Admin required');const school=await api.getDoc(api.doc(db,'schools',id));if(attempt!==epoch||auth.currentUser?.uid!==uid||!school.exists()||school.data().active!==true)throw new Error('School inactive');actor={role:'school_admin',active:true,schoolId:id,uid};schoolId=id;$('heading').textContent='Raw mark — '+String(school.data().name??id);$('work').hidden=false;status('School Admin signed in. Load students and subjects before saving.')}catch(e){if(attempt===epoch){reset();try{await authSdk.signOut(auth)}catch{}status('Sign in failed: '+e.message)}}finally{lock(false)}};
$('logout').onclick=async()=>{if(busy)return;lock(true);reset();try{await authSdk.signOut(auth);status('Signed out')}catch(e){status('Sign out failed: '+e.message)}finally{lock(false)}};
async function loadOptions(collection,element,label){if(busy||!actor)return;if(collection==='subjects')invalidateClassMarks();const attempt=epoch,schoolClass=$('schoolClass').value;lock(true);try{
 let cursor=null,rows=[];do{
  const constraints=[api.where('class','==',schoolClass),api.orderBy('__name__'),api.limit(100)];
  if(cursor)constraints.push(api.startAfter(cursor));
  const snap=await api.getDocs(api.query(api.collection(db,'schools',schoolId,collection),...constraints));
  if(attempt!==epoch||schoolClass!==$('schoolClass').value||!actor)return;
  rows.push(...snap.docs.map(doc=>({id:doc.id,...doc.data()})));
  if(rows.length>5000)throw new Error('Class has over 5000 records; use searchable roster');
  cursor=snap.docs.length===100?snap.docs.at(-1):null;
 }while(cursor);
 const filtered=collection==='students'?rows:rows.filter(row=>row.active===true&&!(('9'===schoolClass||'10'===schoolClass)&&row.name==='Computer'));
 element.replaceChildren();if(collection==='students'){studentsLoaded=true;loadedStudentClass=schoolClass}else{subjectsLoaded=true;loadedSubjectClass=schoolClass}
 for(const row of filtered){const option=document.createElement('option');option.value=row.id;option.textContent=String(row.name??row.id)+' ('+row.id+')';element.append(option)}
 status(filtered.length+' '+label+' loaded. Saving requires a valid student-subject assignment.');
 }catch(e){if(attempt===epoch&&actor){if(collection==='students'){studentsLoaded=false;loadedStudentClass=null;$('studentId').replaceChildren()}else{subjectsLoaded=false;loadedSubjectClass=null;$('subjectId').replaceChildren()}status('Load failed: '+e.message)}}finally{if(attempt===epoch)lock(false)}}
$('loadStudents').onclick=()=>loadOptions('students',$('studentId'),'students');$('loadSubjects').onclick=()=>loadOptions('subjects',$('subjectId'),'subjects');
$('schoolClass').onchange=()=>{classMarkRoster=[];classMarkContext=null;$('classMarkRows').replaceChildren();$('classMarkCount').textContent='';$('saveClassMarks').disabled=true;studentsLoaded=false;subjectsLoaded=false;loadedStudentClass=null;loadedSubjectClass=null;$('studentId').replaceChildren();$('subjectId').replaceChildren();lock(false)};
$('studentId').onchange=()=>lock(false);$('subjectId').onchange=()=>lock(false);
$('save').onclick=async()=>{status('Individual mark saving is disabled. Use the complete-class mark section.');return;if(busy||actor?.role!=='school_admin'||!studentsLoaded||!subjectsLoaded||(loadedStudentClass!==$('schoolClass').value||loadedSubjectClass!==$('schoolClass').value)||!$('studentId').value||!$('subjectId').value)return;const attempt=epoch;lock(true);try{const input={studentId:$('studentId').value,subjectId:$('subjectId').value,class:$('schoolClass').value,term:$('term').value,theory:$('theory').value,practical:$('practical').value};const checked=await preflightRawMarkSave({db,api,actor,schoolId,input});
  if(attempt!==epoch)return;
  if(checked.existing){status('Existing raw mark found. To prevent accidental overwriting, editing is disabled on this development page.');return}
  const saved=await createSchoolMarkOnly({db,api,actor,schoolId,input});if(attempt===epoch){$('theory').value='';$('practical').value='';status('Raw mark saved in V47: '+saved.id+' — NOT a CDC/IEMIS result')}}catch(e){if(attempt===epoch)status('Save failed: '+e.message)}finally{lock(false)}};

function invalidateClassMarks(){classMarkRoster=[];classMarkContext=null;$('classMarkRows').replaceChildren();$('classMarkCount').textContent='';$('saveClassMarks').disabled=true}
$('term').onchange=invalidateClassMarks;
$('subjectId').onchange=()=>{invalidateClassMarks();lock(false)};
$('loadClassMarks').onclick=async()=>{
 if(busy||actor?.role!=='school_admin'||!subjectsLoaded||loadedSubjectClass!==$('schoolClass').value||!$('subjectId').value){status('Load active class subjects first');return}
 const attempt=epoch,classId=$('schoolClass').value,term=$('term').value,subjectId=$('subjectId').value;
 invalidateClassMarks();lock(true);
 try{
  const roster=await loadCompleteClassRoster({db,api,actor,schoolId,classId});
  if(attempt!==epoch||classId!==$('schoolClass').value||term!==$('term').value||subjectId!==$('subjectId').value)return;
  classMarkRoster=roster.students;classMarkContext={classId,term,subjectId};
  const body=$('classMarkRows');
  for(const student of roster.students){
   const row=document.createElement('tr');row.dataset.studentId=student.id;
   const name=document.createElement('td');name.textContent=String(student.name??student.id);row.append(name);
   for(const field of ['theory','practical']){
    const td=document.createElement('td'),input=document.createElement('input');
    input.type='number';input.min='0';input.max='100';input.step='any';input.dataset.field=field;
    input.setAttribute('aria-label',field+' marks for '+student.id);td.append(input);row.append(td);
   }body.append(row);
  }
  $('classMarkCount').textContent=roster.count+' students in full roster. '+(roster.count>3?'Save blocked: maximum 3 until emulator validation.':'All students must have both marks.');
  status('Full class roster loaded. Check every student before saving.');
 }catch(e){invalidateClassMarks();status('Unable to load complete roster: '+e.message)}
 finally{if(attempt===epoch)lock(false)}
};
$('saveClassMarks').onclick=async()=>{
 if(busy||!classMarkContext||actor?.role!=='school_admin')return;
 const context=classMarkContext,attempt=epoch;
 if(context.classId!==$('schoolClass').value||context.term!==$('term').value||context.subjectId!==$('subjectId').value){invalidateClassMarks();status('Class, term or subject changed; reload roster');return}
 if(classMarkRoster.length>3){status('Save blocked: full class has more than 3 students. No marks saved.');return}
 const entries=classMarkRoster.map(student=>{
  const row=[...$('classMarkRows').children].find(r=>r.dataset.studentId===student.id);
  return {studentId:student.id,class:context.classId,term:context.term,subjectId:context.subjectId,
   theory:row?.querySelector('[data-field="theory"]')?.value??'',practical:row?.querySelector('[data-field="practical"]')?.value??''};
 });
 if(!confirm('Save marks for ALL '+entries.length+' students? Existing marks cannot be overwritten.'))return;
 lock(true);
 try{
  if(!auth?.currentUser?.uid||auth.currentUser.uid!==actor.uid)throw new Error('Authentication changed');
  const result=await saveVerifiedSmallClassMarks({db,api,actor,schoolId,...context,entries});
  if(attempt===epoch){invalidateClassMarks();status('Atomic class marks saved: '+result.saved+' records (development only)')}
 }catch(e){if(attempt===epoch)status('Class marks NOT saved: '+e.message)}
 finally{if(attempt===epoch)lock(false)}
};
