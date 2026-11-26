import {connectSchoolFirebase,enforceSchoolIdle,bindVerifiedModuleActivity} from './school-firebase-client.mjs';
import {validateSchoolId} from './school-paths.mjs';
import {verifySchoolSession} from './verified-school-session.mjs';
import {subjectsForGrade,assessmentThemeReference} from './primary-assessment-reference.mjs';
import {loadCompleteClassRoster} from './complete-class-roster.mjs';
import {readObservationPortfolio} from './primary-assessment-portfolio.mjs';
import {neError} from './nepali-feedback.mjs';
const $=id=>document.getElementById(id);
let actor=null,catalogue=null,auth,authSdk,db,api,epoch=0,portfolioEpoch=0;
const cell=(row,value)=>{const td=document.createElement('td');td.textContent=value??'—';row.append(td);return td};
function clear(){resetPortfolio();$('portfolioArea').hidden=true;epoch++;actor=null;catalogue=null;$('referenceArea').hidden=true;$('rows').replaceChildren();$('totals').replaceChildren();$('identity').textContent='Academic Year 2083 · V47'}
async function verify(){
 const selected=actor,request=epoch;
 if(!selected||!await enforceSchoolIdle(auth,authSdk))throw Error('Login required');
 const session=await verifySchoolSession({schoolId:selected.schoolId,uid:selected.uid,readDocument:async path=>{const snap=await api.getDocFromServer(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null}});
 if(request!==epoch||actor!==selected||auth.currentUser?.uid!==selected.uid||session.role!==selected.role)throw Error('School session changed');
}
async function render(){
 const request=++epoch,selected=actor;
 $('rows').replaceChildren();$('totals').replaceChildren();$('summary').textContent='स्रोत जाँच हुँदैछ…';
 try{
  await verify();if(request!==epoch||actor!==selected)return;
  const ref=assessmentThemeReference({catalogue,grade:$('grade').value,subject:$('subject').value});
  $('guideLink').href=ref.guide.url;$('officialLink').href=ref.guide.officialPage;
  $('summary').textContent=ref.themeCount?'स्रोतमा '+ref.themeCount+' थिमको गणना उपलब्ध छ। शब्दशः फाराम र आधिकारिक मूल्याङ्कन प्रमाणीकरण बाँकी छ।':'यस विषयको थिमगत गणना अझै सुरक्षित रूपमा सारिएको छैन। मूल मार्गदर्शन हेर्नुहोस्।';
  for(const item of ref.rows){
   const tr=document.createElement('tr');cell(tr,[item.theme,item.en&&item.en!==item.theme?item.en:''].filter(Boolean).join(' / '));cell(tr,item.count);cell(tr,item.indicators);cell(tr,item.scoreBlocks);cell(tr,item.fullMarks);
   const td=cell(tr,''),a=document.createElement('a');a.href=item.sourceUrl;a.target='_blank';a.rel='noopener noreferrer';a.textContent=String(item.page);td.append(a);
   cell(tr,item.status==='guideMatched'?'स्रोत गणना मिलेको':'स्रोत सूचक गणना');$('rows').append(tr);
  }
  if(ref.themeCount){const tr=document.createElement('tr');for(const x of ['Total',ref.learningAchievements,ref.indicators,ref.scoreBlocks,ref.rawFullMarks,'—','सन्दर्भ मात्र'])cell(tr,x);$('totals').append(tr)}
 }catch(e){if(request===epoch){clear();$('status').textContent='स्रोत खोल्न सकिएन: '+neError(e)}}
}
function fill(){const previous=$('subject').value;$('subject').replaceChildren(...subjectsForGrade($('grade').value).map(([key,name])=>new Option(name,key)));if([...$('subject').options].some(o=>o.value===previous))$('subject').value=previous;void render()}
$('grade').onchange=fill;$('subject').onchange=()=>void render();
function resetPortfolio(){
 portfolioEpoch++;$('portfolioRows').replaceChildren();$('portfolioStudent').replaceChildren();$('portfolioStudent').disabled=true;$('portfolioRead').disabled=true;$('portfolioStatus').textContent='';
}
$('portfolioGrade').onchange=resetPortfolio;
$('portfolioStudent').onchange=()=>{portfolioEpoch++;$('portfolioRows').replaceChildren();$('portfolioStatus').textContent='';$('portfolioRead').disabled=!$('portfolioStudent').value};
$('portfolioRoster').onclick=async()=>{
 resetPortfolio();const request=portfolioEpoch,member=actor,grade=$('portfolioGrade').value;
 const check=()=>{if(request!==portfolioEpoch||actor!==member||!member||auth.currentUser?.uid!==member.uid||$('portfolioGrade').value!==grade)throw Error('Portfolio selection changed')};
 try{
  await verify();check();
  if(!['school_admin','viewer'].includes(member.role))throw Error('Admin or Viewer required');
  $('portfolioStatus').textContent='विद्यार्थी सूची लोड हुँदैछ…';
  const roster=await loadCompleteClassRoster({db,api,actor:member,schoolId:member.schoolId,classId:grade,activeOnly:true});check();await verify();check();
  $('portfolioStudent').replaceChildren(...roster.students.map(s=>new Option(String(s.nameEnglish??s.name??s.id),s.id)));
  $('portfolioStudent').disabled=false;$('portfolioRead').disabled=!$('portfolioStudent').value;$('portfolioStatus').textContent=roster.count+' विद्यार्थी उपलब्ध छन्।';
 }catch(e){if(request===portfolioEpoch){resetPortfolio();$('portfolioStatus').textContent='विद्यार्थी सूची खोल्न सकिएन: '+neError(e)}}
};
$('portfolioRead').onclick=async()=>{
 const request=++portfolioEpoch,member=actor,grade=$('portfolioGrade').value,studentId=$('portfolioStudent').value;
 $('portfolioRows').replaceChildren();$('portfolioStatus').textContent='अभिलेख जाँच हुँदैछ…';
 const check=()=>{if(request!==portfolioEpoch||actor!==member||!member||auth.currentUser?.uid!==member.uid||$('portfolioGrade').value!==grade||$('portfolioStudent').value!==studentId)throw Error('Portfolio selection changed')};
 try{
  await verify();check();
  const result=await readObservationPortfolio({db,api,actor:member,schoolId:member.schoolId,grade,studentId,assertCurrent:check});check();
  for(const r of result.rows){const tr=document.createElement('tr');for(const val of [r.subject,[r.unit,r.unitEn].filter(Boolean).join(' / '),[r.topic,r.topicAlt].filter(Boolean).join(' / '),r.stage==='regular'?'Regular':r.stage==='support'?'Additional Support':'—',r.date,r.level,r.method,r.evidence,r.feedback])cell(tr,val||'—');$('portfolioRows').append(tr)}
  $('portfolioStatus').textContent=result.rows.length+' साधारण अभिलेख भेटिए।'+(result.historical?' हालको कक्षा/सेक्सनसँग नमिलेका '+result.historical+' ऐतिहासिक अभिलेख यस सूचीमा समावेश छैनन्।':'');
 }catch(e){if(request===portfolioEpoch){$('portfolioRows').replaceChildren();$('portfolioStatus').textContent='Portfolio खोल्न सकिएन: '+neError(e)}}
};
try{
 ({auth,authSdk,db,api}=await connectSchoolFirebase());
 const sid=validateSchoolId(new URL(location.href).searchParams.get('schoolId')||'');
 const uid=auth.currentUser?.uid;if(!uid)throw Error('Login required');
 const session=await verifySchoolSession({schoolId:sid,uid,readDocument:async path=>{const snap=await api.getDocFromServer(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null}});
 if(auth.currentUser?.uid!==uid)throw Error('Login changed');
 actor={...session,active:true};
 authSdk.onAuthStateChanged(auth,user=>{if(actor&&user?.uid!==actor.uid){clear();$('status').textContent='लगइन परिवर्तन भयो। Dashboard बाट पुनः खोल्नुहोस्।'}});
 const response=await fetch('./primary-assessment-reference-2083.json',{cache:'no-store'});if(!response.ok)throw Error('Reference file unavailable');
 catalogue=await response.json();await verify();
 $('identity').textContent='Academic Year 2083 · V47 · '+sid;$('referenceArea').hidden=false;$('portfolioArea').hidden=!['school_admin','viewer'].includes(actor.role);$('status').textContent='विद्यालयको अनुमति पुष्टि भयो।';
 const member=actor;bindVerifiedModuleActivity(member,()=>actor===member);fill();
}catch(e){clear();$('status').textContent='Dashboard बाट प्रमाणित विद्यालयमा लगइन गरी पुनः खोल्नुहोस्: '+neError(e)}
