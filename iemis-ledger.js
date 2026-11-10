// Read-only presentation/calculation helpers. Never write or normalize stored records.
const bands = [[90,'A+',4,'Outstanding'],[80,'A',3.6,'Excellent'],[70,'B+',3.2,'Very Good'],[60,'B',2.8,'Good'],[50,'C+',2.4,'Satisfactory'],[40,'C',2,'Acceptable'],[35,'D',1.6,'Basic'],[0,'NG',null,'Not Graded']];
export function iemisGrade(percent) {
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) return null;
  const [,grade,point,remark] = bands.find(([min]) => percent >= min);
  return {grade,point,remark};
}
export function iemisFinalGrade(point) {
  if(point===null||!Number.isFinite(point)||point<0||point>4)return null;
  if(point===0)return {grade:'NG',point:null,remark:'Not Graded'};
  const band=[...bands].reverse().find(([, ,gp])=>gp!==null&&point<=gp+1e-9);
  return band?{grade:band[1],point:band[2],remark:band[3]}:null;
}
export function iemisSubjectKey(value) {
  const s=String(value??'').trim().toLowerCase().replace(/\s+/g,' ').replace(/^comp\.?\s+/,'').replace(/\s*\(\d+\)$/,'').trim();
  if (/^(math|mathematics|गणित)$/.test(s)) return 'mathematics';
  if (/^(nepali|नेपाली)$/.test(s)) return 'nepali';
  if (/^(english|अंग्रेजी)$/.test(s)) return 'english';
  if (/^(science (and|&) technology|विज्ञान तथा प्रविधि)$/.test(s)) return 'science & technology';
  if (/^(स्थानीय|स्थानीय विषय|local|local subject|हाम्रो धुनिबेँशी|hamro dhunibe[sn]hi|hamro dhunibesi|our dhunibesi)$/.test(s)) return 'hamro dhunibeshi';
  if (/^(serophero|hamro serofero|serofero)$/.test(s)) return 'serophero';
  return s;
}
export function iemisDisplaySubject(value,{codes=false}={}){
  const raw=String(value??'').trim();
  if(codes&&/^(COMP\.|OPT\.)/i.test(raw))return raw;
  const key=iemisSubjectKey(raw),labels={'nepali':'Nepali','english':'English','mathematics':'Mathematics','science & technology':'Science & Technology','social studies & human value education':'Social Studies & Human Value Education','social studies':'Social Studies','health physical & creative art':'Health Physical & Creative Art','hamro dhunibeshi':'Hamro Dhunibeshi','serophero':'Serophero','computer science':'Computer Science'};
  const course={'nepali':'COMP. NEPALI (1021)','english':'COMP. ENGLISH (1011)','mathematics':'COMP. MATHEMATICS (1031)','science & technology':'COMP. SCIENCE AND TECHNOLOGY (1041)','social studies':'COMP. SOCIAL STUDIES (1051)','social studies & human value education':'COMP. SOCIAL STUDIES (1051)'};
  if(codes&&course[key])return course[key];
  if(!codes&&key==='opt.i environment science')return 'Optional I: Environmental Science';
  return labels[key]||raw.replace(/^OPT\.?\s*II\b\s*/i,'Optional II: ').replace(/^OPT\.?\s*I\b\s*/i,'Optional I: ').replace(/\s*\(\d+\)$/,'');
}
const core=['nepali','english','mathematics','science & technology','social studies & human value education','health physical & creative art','hamro dhunibeshi'];
export function iemisLegacyTheory(classNo,records,{examId,studentId}={}) {
  return [4,5].includes(Number(classNo)) && records.some(r=>(!examId||r.examId===examId)&&(!studentId||r.studentId===studentId)&&r.assessmentType!=='learning-achievement'&&(r.scores||[]).some(s=>/^TH\b|THEORY/i.test(s.name||'')));
}
export function iemisSubjects(subjects,mode,classNo,{legacyTheory=false}={}) {
  const legacySheet=classNo===4?['nepali','computer science',...core.filter(s=>s!=='nepali')]:['computer science',...core];
  const order=legacyTheory&&mode==='sheet'?legacySheet:legacyTheory&&mode==='grade'&&classNo===4?['computer science',...[...core].reverse()]:classNo<=3?['nepali','english','mathematics','serophero','hamro dhunibeshi','computer science']:
    mode==='number'&&classNo>=6&&classNo<=8?[...core].reverse().concat('computer science'):
    mode==='sheet'&&classNo>=6&&classNo<=8?['computer science',...core]:[...core,'computer science'];
  const rank=s=>{const k=iemisSubjectKey(s);const i=order.indexOf(k);return i<0?order.length:i;};
  return [...subjects].sort((a,b)=>rank(a)-rank(b));
}
const number=v=>v===null||v===undefined||String(v).trim()===''?null:Number(v);
const valid=s=>number(s.obtained)!==null&&Number.isFinite(number(s.obtained))&&Number(s.fullMarks)>0&&number(s.obtained)>=0&&number(s.obtained)<=Number(s.fullMarks);
export function iemisComponentKey(name){const s=String(name||'').toLowerCase().trim();if(/no\.?\s*of\s*learning/.test(s))return 'count';if(/^full marks/.test(s))return 'full';if(/obtained learning/.test(s))return 'obtained';if(/^th\b|theory|total of final marks/.test(s))return 'theory';if(/participation/.test(s))return 'participation';if(/practical|project/.test(s))return 'practical';if(/term|examination/.test(s))return 'term';return null;}
export function iemisSummary(record,{annual=false,primary=false}={}) {
  if(record?.isAbsent===true)return {absent:true,complete:false,full:0,obtained:null,totalGrade:null,inGrade:null,theoryGrade:null,inObtained:null,theoryObtained:null};
  const scores=record?.scores||[];
  if(primary){
    const count=scores.find(s=>/no\.?\s*of\s*learning/i.test(s.name||''));
    const got=scores.find(s=>/obtained learning/i.test(s.name||''));
    const n=number(count?.obtained??count?.fullMarks),obtained=number(got?.obtained);
    const full=n===null?0:n*4;
    const complete=!!record&&full>0&&obtained!==null&&Number.isFinite(obtained)&&obtained>=0&&obtained<=full;
    const grade=complete?iemisGrade(obtained/full*100):null;
    return {complete,full,obtained:complete?obtained:null,totalGrade:grade,inGrade:grade,inFull:full,inObtained:complete?obtained:null,theoryFull:0,theoryObtained:null,theoryGrade:null};
  }
  const theory=scores.filter(s=>/^TH\b|THEORY/i.test(s.name||''));
  const internal=scores.filter(s=>!/^TH\b|THEORY/i.test(s.name||''));
  const part=list=>{const full=list.reduce((n,s)=>n+Number(s.fullMarks||0),0);const complete=list.length>0&&list.every(valid);const obtained=complete?list.reduce((n,s)=>n+Number(s.obtained),0):null;return {full,obtained,grade:complete&&full>0?iemisGrade(obtained/full*100):null};};
  const i=part(internal),t=part(theory);
  const complete=!!record&&i.grade!==null&&(!annual||t.grade!==null);
  const full=i.full+(annual?t.full:0),obtained=complete?i.obtained+(annual?t.obtained:0):null;
  const effectivePoint=complete&&annual&&i.grade.point!==null&&t.grade.point!==null?(i.full*i.grade.point+t.full*t.grade.point)/full:null;
  const totalGrade=complete?(annual?(effectivePoint===null?iemisGrade(0):iemisFinalGrade(effectivePoint)):i.grade):null;
  return {complete,full,obtained,totalGrade,effectivePoint,inFull:i.full,inObtained:i.obtained,inGrade:i.grade,theoryFull:t.full,theoryObtained:t.obtained,theoryGrade:t.grade};
}
export function iemisGpa(subjects,{annual=false,primary=false}={}) {
  let weighted=0,credits=0;
  for(const {summary:s,creditHour} of subjects){
    const credit=Number(creditHour);
    if(!s?.complete||!Number.isFinite(credit)||credit<=0)return null;
    if(primary){if(s.totalGrade?.point==null)return null;weighted+=credit*s.totalGrade.point;}
    else{
      if(!annual||s.inGrade?.point==null||s.theoryGrade?.point==null||s.full<=0)return null;
      // IEMIS weights the IN and TH grade points separately, not the final letter grade.
      weighted+=credit*(s.inFull*s.inGrade.point+s.theoryFull*s.theoryGrade.point)/s.full;
    }
    credits+=credit;
  }
  return credits>0?weighted/credits:null;
}
export const iemisEscape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>v===null||v===undefined?'—':String(Number(Number(v).toFixed(2)));
export function iemisLedger({mode='number',classNo,annual=false,subjects,students,records,examId,schoolName,schoolCode,creditFor=()=>null,label=s=>s,componentsFor=()=>[],applicable=()=>true}) {
  const e=iemisEscape,primary=classNo<=5;
  const legacyTheory=iemisLegacyTheory(classNo,records,{examId});
  subjects=iemisSubjects(subjects,mode,classNo,{legacyTheory});
  const grade=mode==='grade',entry=mode==='entry';
  const identity=entry?['S.N','Student Name','Regd. No.','Symbol No.']:grade?['S.No.','School Name','School Code','Student Name','Dob','Father Name','Mother Name','Symbol Number']:['S.No.','School Name','School Code','Student Name','Symbol Number'];
  const cols=subjects.map(s=>entry?['IsAbsent',...componentsFor(s).map(c=>c.label||c.name)]:primary?[]:grade?(annual?['IN','TH','Total']:['IN','Total']):(annual?['IN','TH']:['IN']));
  const two=cols.some(c=>c.length);
  const head='<tr>'+identity.map(t=>`<th${two?' rowspan="2"':''}>${e(t)}</th>`).join('')+subjects.map((s,i)=>`<th${cols[i].length?` colspan="${cols[i].length}"`:two?' rowspan="2"':''}>${e(label(s))}</th>`).join('')+(grade?`<th${two?' rowspan="2"':''}>Final GPA</th>`:'')+'</tr>'+(two?'<tr>'+cols.flatMap(cs=>cs.map(c=>'<th>'+e(c)+'</th>')).join('')+'</tr>':'');
  const body=students.map((st,index)=>{
    const name=st.studentNameEnglish||st.nameEnglish||st.nameEn||st.displayName||st.studentName||st.name||'—';
    const symbol=st.symbolNo||st.symbolNumber||st.examSymbolNo||'';
    const reg=st.studentIemisNo||st.iemisStudentNo||st.iemisNumber||st.iemisNo||st.registrationNo||st.regdNo||st.regNo||'';
    const ids=entry?[index+1,name,reg,symbol]:grade?[index+1,schoolName,schoolCode,name,st.dob||st.dateOfBirth||'',st.fatherName||'',st.motherName||'',symbol]:[index+1,schoolName,schoolCode,name,symbol];
    const summaries=[];
    const rowLegacy=iemisLegacyTheory(classNo,records,{examId,studentId:st.id});
    const cells=subjects.map((sub,i)=>{
      if(!applicable(st,sub))return `<td colspan="${cols[i].length||1}">N/A</td>`;
      const record=records.find(r=>r.studentId===st.id&&r.examId===examId&&iemisSubjectKey(r.subject)===iemisSubjectKey(sub));
      const legacyRecord=iemisLegacyTheory(classNo,record?[record]:[]);
      const summary=iemisSummary(record,{annual,primary:primary&&!legacyRecord});summaries.push({summary,creditHour:creditFor(sub)});
      if(entry)return '<td>'+(!record?'—':record.isAbsent?'Yes':'No')+'</td>'+componentsFor(sub).map(c=>{const score=record?.scores?.find(s=>String(s.name).toLowerCase()===String(c.name).toLowerCase()||(c.key&&iemisComponentKey(s.name)===c.key));const value=c.readonly?score?.fullMarks:score?.obtained;const savedLimit=!primary&&score&&Number.isFinite(c.max)&&Number(score.fullMarks)!==c.max?' / '+score.fullMarks:'';return '<td>'+e((value??'—')+savedLimit)+'</td>';}).join('');
      if(record?.isAbsent)return `<td colspan="${cols[i].length||1}">Abs</td>`;
      const vals=primary?[legacyRecord?(grade?summary.theoryGrade?.grade:summary.theoryObtained):(grade?summary.totalGrade?.grade:summary.obtained)]:grade?[summary.inGrade?.grade,...(annual?[summary.theoryGrade?.grade]:[]),summary.totalGrade?.grade]:[summary.inObtained,...(annual?[summary.theoryObtained]:[])];
      return vals.map(v=>'<td>'+e(v==null?'—':typeof v==='number'?fmt(v):v)+'</td>').join('');
    }).join('');
    const gpa=grade?iemisGpa(summaries,{annual,primary:primary&&!rowLegacy}):null;
    return '<tr>'+ids.map(v=>'<td>'+e(v)+'</td>').join('')+cells+(grade?'<td>'+(gpa===null?'—':gpa.toFixed(2))+'</td>':'')+'</tr>';
  }).join('');
  return {head,body,subjects};
}
