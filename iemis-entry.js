import {iemisEscape as esc,iemisSubjectKey,iemisComponentKey} from './iemis-ledger.js?v=20261109-legacy2';

export function iemisEntrySchema(classNo,term,subject='') {
  const n=Number(String(classNo).replace(/[^0-9]/g,''));
  if(n<1||n>10)throw new Error('IEMIS entry format is verified for Classes 1–10 only. Use the original entry view for this class.');
  if(n<=5)return [
    {key:'count',name:'No. of Learning Achievement',label:'No. Of Learning Achievement',max:5000},
    {key:'full',name:'Full Marks',label:'Full Marks',readonly:true},
    {key:'obtained',name:'Obtained Learning Achievement',label:'Obtained Learning Achievement'}
  ];
  const computer=n>=9&&/computer|कम्प्युटर/i.test(subject);
  const names={first:'First',second:'Second',third:'Third','half-yearly':'Half-Yearly',internal:'Internal',other:'Other'};
  const annual=term==='annual';
  return [
    {key:'participation',name:'Participation',label:`Participation(${n<=8||computer?4:3})`,max:n<=8||computer?4:3},
    {key:'practical',name:'Practical/Project',label:`Practical/Project(${n<=8||computer?36:16})`,max:n<=8||computer?36:16},
    {key:'term',name:annual?'Total of Term':`${names[term]||'Term'} Term Examination`,label:`${annual?'Total of Term':(names[term]||'Term')+' Term Examination'}(${n<=8||computer?10:6})`,max:n<=8||computer?10:6},
    ...(annual?[{key:'theory',name:'TH (Theory)',label:`Total of final marks(${n<=8||computer?50:75})`,max:n<=8||computer?50:75}]:[])
  ];
}
export const iemisScoreKey=iemisComponentKey;
export function normalizeIemisEntryScores(classNo,term,subject,scores){
  let schema;try{schema=iemisEntrySchema(classNo,term,subject);}catch{return scores;}
  if(schema[0].key==='count'||schema.length!==scores.length)return scores;
  const matched=schema.map(c=>scores.filter(s=>iemisScoreKey(s.name)===c.key));
  if(matched.some((list,i)=>list.length!==1||Number(list[0].fullMarks)!==schema[i].max))return scores;
  return schema.map((c,i)=>({...matched[i][0],name:c.name}));
}
export function iemisEntryDraft(record,schema) {
  const values=Object.fromEntries(schema.filter(c=>!c.readonly).map(c=>[c.key,'']));
  let incompatible=false;
  for(const score of record?.scores||[]){const key=iemisScoreKey(score.name),component=schema.find(c=>c.key===key);if(!key||!component){incompatible=true;continue;}if(schema[0].key!=='count'&&Number(score.fullMarks)!==component.max)incompatible=true;if(key!=='full')values[key]=key==='count'&&record?.isAbsent?String(score.fullMarks):score.obtained===null||score.obtained===undefined?'':String(score.obtained);}
  return {values,isAbsent:record?.isAbsent===true,dirty:false,incompatible};
}
const rawNumber=value=>value===null||value===undefined||String(value).trim()===''?null:Number(value);
export function iemisEntryValues(schema,draft) {
  if(draft.incompatible)throw new Error('This record has custom assessment components. Use the original single-subject view; existing scores were not replaced.');
  const primary=schema[0].key==='count';
  if(primary){
    const count=rawNumber(draft.values.count),got=rawNumber(draft.values.obtained);
    if(!draft.isAbsent&&count===null&&got===null)return null;
    if(count!==null&&(!Number.isInteger(count)||count<0||count>5000))throw new Error('No. of Learning Achievement must be a whole number from 0 to 5000.');
    if(!draft.isAbsent&&(count===null||got===null))throw new Error('Enter both the learning-achievement count and obtained marks.');
    const n=count??0,full=n*4;
    if(!draft.isAbsent&&(!Number.isInteger(got)||got<0||got>full))throw new Error(`Obtained Learning Achievement must be from 0 to ${full}.`);
    return {assessmentType:'learning-achievement',isAbsent:draft.isAbsent,scores:[
      {name:schema[0].name,fullMarks:n,obtained:draft.isAbsent?null:n},
      {name:schema[1].name,fullMarks:full,obtained:null},
      {name:schema[2].name,fullMarks:full,obtained:draft.isAbsent?null:got}
    ],totalFullMarks:full,totalObtained:draft.isAbsent?0:got};
  }
  const scores=schema.map(c=>{const v=rawNumber(draft.values[c.key]);if(!draft.isAbsent&&v!==null&&(!Number.isFinite(v)||v<0||v>c.max))throw new Error(`${c.label}: enter a mark from 0 to ${c.max}.`);return {name:c.name,fullMarks:c.max,obtained:draft.isAbsent?null:v};});
  if(!draft.isAbsent&&scores.every(s=>s.obtained===null))return null;
  return {assessmentType:'marks',isAbsent:draft.isAbsent,scores,totalFullMarks:scores.reduce((a,s)=>a+s.fullMarks,0),totalObtained:scores.reduce((a,s)=>a+(s.obtained??0),0)};
}

// No Firebase dependency. The host supplies an authorization-checked save callback.
export class IemisEntryGrid {
  constructor(root,options){
    this.root=root;this.options=options;this.selectedSubjects=new Set();this.selectedStudents=new Set(options.students.map(s=>s.id));this.drafts=new Map();this.search='';this.busy=false;
    if(new Set(options.students.map(s=>s.id)).size!==options.students.length)throw new Error('Duplicate student IDs. Refresh before entering marks.');
    this.render();this.root.addEventListener('input',this.onInput=e=>this.change(e));this.root.addEventListener('change',this.onChange=e=>this.change(e));
  }
  destroy(){this.root.removeEventListener('input',this.onInput);this.root.removeEventListener('change',this.onChange);this.root.innerHTML='';}
  key(si,sj){return si+':'+sj;}
  record(si,sj){const st=this.options.students[si],sub=this.options.subjects[sj];const matches=this.options.records.filter(r=>r.studentId===st.id&&r.examId===this.options.examId&&iemisSubjectKey(r.subject)===iemisSubjectKey(sub));if(matches.length>1)throw new Error('Duplicate marks records. Refresh and resolve the duplicate before editing.');return matches[0]||null;}
  draft(si,sj){const key=this.key(si,sj);if(!this.drafts.has(key))this.drafts.set(key,iemisEntryDraft(this.record(si,sj),this.schema(sj)));return this.drafts.get(key);}
  schema(sj){return iemisEntrySchema(this.options.classNo,this.options.term,this.options.subjects[sj]);}
  allowed(si,sj){return this.options.canEdit(this.options.students[si],this.options.subjects[sj]);}
  message(text,bad=false){this.options.message?.(text,bad);}
  render(){
    const {subjects,students}=this.options,label=s=>this.options.subjectLabel?this.options.subjectLabel(s):s,selected=[...this.selectedSubjects].sort((a,b)=>a-b);
    const picker='<label><input type="checkbox" data-grid-all-subjects '+(selected.length===subjects.length&&subjects.length?'checked':'')+'> All</label> '+subjects.map((s,i)=>`<label style="display:inline-flex;gap:4px;margin:6px"><input type="checkbox" data-grid-subject="${i}" ${this.selectedSubjects.has(i)?'checked':''}> ${esc(label(s))}</label>`).join('');
    const identity=['S.N','Student Name','Regd. No.','Symbol No.'];
    const head='<tr><th rowspan="2"><input aria-label="Select all students" type="checkbox" data-grid-all-students '+(this.selectedStudents.size===students.length?'checked':'')+'></th>'+identity.map(s=>'<th rowspan="2">'+s+'</th>').join('')+selected.map(j=>`<th colspan="${this.schema(j).length+1}">${esc(label(subjects[j]))}</th>`).join('')+'</tr><tr>'+selected.map(j=>'<th>IsAbsent</th>'+this.schema(j).map(c=>'<th>'+esc(c.label)+'</th>').join('')).join('')+'</tr>';
    const body=students.map((st,i)=>{
      const identity=[i+1,st.studentNameEnglish||st.nameEnglish||st.studentName||st.name||'',st.studentIemisNo||st.iemisStudentNo||st.registrationNo||st.iemisNumber||'',st.symbolNo||st.symbolNumber||st.examSymbolNo||''];
      return `<tr data-grid-row="${i}"><td><input aria-label="Select ${esc(identity[1])}" type="checkbox" data-grid-student="${i}" ${this.selectedStudents.has(st.id)?'checked':''}></td>`+identity.map(v=>'<td>'+esc(v)+'</td>').join('')+selected.map(j=>{
        const schema=this.schema(j);if(!this.allowed(i,j))return `<td colspan="${schema.length+1}">N/A</td>`;
        const d=this.draft(i,j);if(d.incompatible)return `<td colspan="${schema.length+1}">Custom assessment — use single-subject view</td>`;
        const data=`data-grid-si="${i}" data-grid-sj="${j}"`;
        return `<td><input aria-label="${esc(identity[1])} ${esc(label(subjects[j]))} IsAbsent" type="checkbox" data-grid-absent ${data} ${d.isAbsent?'checked':''}></td>`+schema.map(c=>{
          if(c.readonly)return `<td><span data-grid-full ${data}>${Math.max(0,Number(d.values.count)||0)*4}</span></td>`;
          const max=c.key==='obtained'?Math.max(0,Number(d.values.count)||0)*4:c.max;
          return `<td><input aria-label="${esc(identity[1])} ${esc(label(subjects[j]))} ${esc(c.label)}" type="number" min="0" ${max!==undefined?`max="${max}"`:''} step="${schema[0].key==='count'?'1':'any'}" placeholder="0" data-grid-key="${c.key}" ${data} value="${esc(d.values[c.key])}" ${d.isAbsent?'disabled':''} style="width:90px;min-width:75px"></td>`;
        }).join('');
      }).join('')+'</tr>';
    }).join('');
    this.root.innerHTML=`<div class="iemis-subject-picker">${picker}</div><div class="tablewrap"><table><thead>${head}</thead><tbody>${body||'<tr><td>No eligible students.</td></tr>'}</tbody></table></div>`;
    this.filter(this.search);
  }
  change(event){
    const el=event.target;if(this.busy)return;
    if(el.matches('[data-grid-all-subjects]')){this.selectedSubjects=el.checked?new Set(this.options.subjects.map((_,i)=>i)):new Set();this.render();return;}
    if(el.matches('[data-grid-subject]')){const j=Number(el.dataset.gridSubject);el.checked?this.selectedSubjects.add(j):this.selectedSubjects.delete(j);this.render();return;}
    if(el.matches('[data-grid-all-students]')){this.selectedStudents=el.checked?new Set(this.options.students.map(s=>s.id)):new Set();this.render();return;}
    if(el.matches('[data-grid-student]')){const id=this.options.students[Number(el.dataset.gridStudent)].id;el.checked?this.selectedStudents.add(id):this.selectedStudents.delete(id);return;}
    if(!el.hasAttribute('data-grid-si'))return;
    const i=Number(el.dataset.gridSi),j=Number(el.dataset.gridSj),d=this.draft(i,j);if(!this.allowed(i,j))return;
    if(el.hasAttribute('data-grid-absent')){d.isAbsent=el.checked;d.dirty=true;this.render();return;}
    if(el.dataset.gridKey){d.values[el.dataset.gridKey]=el.value;d.dirty=true;const selector=`[data-grid-si="${i}"][data-grid-sj="${j}"]`;if(el.dataset.gridKey==='count'){const full=Math.max(0,Number(el.value)||0)*4;this.root.querySelector(`[data-grid-full]${selector}`).textContent=String(full);this.root.querySelector(`[data-grid-key="obtained"]${selector}`).max=String(full);}
      try{iemisEntryValues(this.schema(j),d);this.root.querySelectorAll(`[data-grid-key]${selector}`).forEach(input=>input.removeAttribute('aria-invalid'));}catch(error){el.setAttribute('aria-invalid','true');this.message(error.message,true);}
    }
  }
  filter(text){this.search=String(text||'');const q=this.search.trim().toLowerCase();this.root.querySelectorAll('[data-grid-row]').forEach(row=>{const st=this.options.students[Number(row.dataset.gridRow)];row.hidden=!!q&&!`${st.studentName||st.name||''} ${st.rollNo||st.rollNumber||''}`.toLowerCase().includes(q);});}
  pending(){
    const entries=[];
    for(const [key,draft] of this.drafts){const [i,j]=key.split(':').map(Number);if(!draft.dirty||!this.selectedSubjects.has(j)||!this.selectedStudents.has(this.options.students[i].id))continue;if(!this.allowed(i,j))throw new Error('Assignment changed. Refresh before saving.');const data=iemisEntryValues(this.schema(j),draft);if(data)entries.push({key,student:this.options.students[i],subject:this.options.subjects[j],old:this.record(i,j),data});}
    return entries;
  }
  async save(){
    if(this.busy)return;const entries=this.pending();if(!entries.length){this.message('No changed marks to save. Untouched and blank records remain unchanged.');return;}
    this.busy=true;this.root.inert=true;
    try{const result=await this.options.onSave(entries);if(result!==false){const keys=result?.savedKeys||entries.map(e=>e.key);for(const key of keys){const d=this.drafts.get(key);if(d)d.dirty=false;}this.message(`${keys.length} student/subject records saved.`);}}
    catch(error){for(const key of error.savedKeys||[]){const d=this.drafts.get(key);if(d)d.dirty=false;}this.message(error.message,true);}
    finally{this.busy=false;this.root.inert=false;}
  }
}

export function iemisEntryBatches(entries,maxStudents=10) {
  const groups=new Map();for(const entry of entries){const id=entry.student.id;if(!groups.has(id))groups.set(id,[]);groups.get(id).push(entry);}
  const batches=[];let current=[],students=0;
  for(const group of groups.values()){if(group.length>200)throw new Error('Too many subjects for one student.');if(students>=maxStudents||current.length+group.length>200){batches.push(current);current=[];students=0;}current.push(...group);students++;}
  if(current.length)batches.push(current);return batches;
}
