import './iemis-importer/transfer.js';

// Build from saved records. This function never reads an unsaved entry draft.
export function buildIemisTransferExport({context, students, subjects, records, examId, componentsFor, label, applicable, roll}) {
  const transfer = globalThis.SmssIemisTransfer;
  subjects = transfer.orderSubjects(subjects, context.className);
  if (!context.schoolCode || !context.year || !context.className || !['first', 'second', 'third', 'final'].includes(transfer.termKey(context.term))) {
    throw new Error('IEMIS export का लागि School IEMIS Code, Year, Class र समर्थित Term चाहिन्छ।');
  }
  const primary = Number(transfer.classKey(context.className)) <= 5;
  const schemas = subjects.map(subject => {
    const parts = primary ? [
      {key: 'count', label: 'No. Of Learning Achievement'},
      {key: 'full', label: 'Full Marks'},
      {key: 'obtained', label: 'Obtained Learning Achievement'}
    ] : componentsFor(subject).map(c => {
      const component = transfer.componentKey(c.name);
      // School-approved correction: Class 9–10 Computer stays 4/36/10.
      // Saved records with another scale are rejected below, never rescaled.
      const computer = Number(transfer.classKey(context.className)) >= 9 && Number(transfer.classKey(context.className)) <= 10 && transfer.subjectKey(subject) === 'computerscience';
      const max = Number(computer ? ({participation:4, practical:36, term:10}[component] ?? c.fullMarks) : c.fullMarks);
      if (!Number.isFinite(max) || max < 0) throw new Error('Assessment Settings को पूर्णाङ्क मान्य छैन।');
      const names = {participation: 'Participation', practical: 'Practical/Project', theory: 'Total of final marks', term: transfer.termKey(context.term) === 'final' ? 'Total of Term' : ({first: 'First', second: 'Second', third: 'Third'}[transfer.termKey(context.term)] + ' Term Examination')};
      return {key: component, max, label: `${names[component] || c.name}(${max})`};
    }).sort((a,b) => ['participation','practical','term','theory'].indexOf(a.key) - ['participation','practical','term','theory'].indexOf(b.key));
    if (!parts.length || new Set(parts.map(c => c.key)).size !== parts.length) throw new Error('Assessment component खाली वा दोहोरिएको छ।');
    return [{key: 'absent', label: 'IsAbsent'}, ...parts];
  });
  const columns = subjects.flatMap((s, i) => schemas[i].map(c => ({subject: label(s), label: c.label})));
  if (new Set(columns.map(c => transfer.columnKey(c.subject, c.label))).size !== columns.length) throw new Error('उस्तै विषय दुईपटक छ। Classes & Subjects जाँच्नुहोस्।');
  const selected = records.filter(r => r.examId === examId);
  const rows = students.map(student => {
    const reg = student.studentIemisNo || student.iemisStudentNo || student.iemisNumber || student.iemisNo || student.registrationNo || student.regdNo || student.regNo || student.studentIemisNumber || '';
    const symbol = student.symbolNo || student.symbolNumber || student.examSymbolNo || '';
    const result = [roll(student), student.studentNameEnglish || student.nameEnglish || student.studentName || student.name || '', reg, symbol];
    for (let i = 0; i < subjects.length; i++) {
      const subject = subjects[i], schema = schemas[i];
      if (!applicable(student, subject)) {result.push(...schema.map(() => 'N/A')); continue;}
      const matches = selected.filter(r => r.studentId === student.id && transfer.subjectKey(r.subject) === transfer.subjectKey(subject));
      if (matches.length > 1) throw new Error('एउटै विद्यार्थी/विषयका duplicate marks छन्।');
      const record = matches[0];
      if (!record) {result.push(...schema.map(() => '')); continue;}
      const scores = new Map();
      for (const score of record.scores || []) {
        const key = transfer.componentKey(score.name);
        if (scores.has(key) || !schema.some(c => c.key === key)) throw new Error('सुरक्षित अंकका component र export ढाँचा मिलेनन्।');
        scores.set(key, score);
      }
      const rawCount = scores.get('count')?.obtained ?? (record.isAbsent ? scores.get('count')?.fullMarks : null);
      for (const component of schema) {
        if (component.key === 'absent') {result.push(record.isAbsent ? 'TRUE' : 'FALSE'); continue;}
        if (component.key === 'full') {result.push(rawCount == null || rawCount === '' ? '' : String(Number(rawCount) * 4)); continue;}
        const score = scores.get(component.key);
        if (score && !primary && Number(score.fullMarks) !== component.max) throw new Error('सुरक्षित अंक र हालको Assessment Settings को पूर्णाङ्क फरक छ। Export अघि Settings जाँच्नुहोस्।');
        const value = component.key === 'count' ? rawCount : record.isAbsent ? null : score?.obtained;
        if (value != null && value !== '' && (!Number.isFinite(Number(value)) || Number(value) < 0 || (!primary && Number(value) > component.max))) throw new Error('सुरक्षित अंक पूर्णाङ्कभित्र छैन।');
        result.push(value == null ? '' : String(value));
      }
    }
    return result;
  });
  return {context, columns, rows};
}

export function renderIemisTransferLedger(grid) {
  const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const groups = [];
  grid.columns.forEach((column, index) => {
    const group = groups.at(-1);
    if (group?.subject === column.subject) group.columns.push(index);
    else groups.push({subject:column.subject,columns:[index]});
  });
  const head = '<tr>' + globalThis.SmssIemisTransfer.identity.map(label=>'<th rowspan="2">'+escape(label)+'</th>').join('') +
    groups.map(group=>`<th colspan="${group.columns.length}">${escape(group.subject)}</th>`).join('') + '</tr><tr>' +
    grid.columns.map(column=>'<th>'+escape(column.label)+'</th>').join('') + '</tr>';
  const body = grid.rows.map(row=>'<tr>'+row.slice(0,4).map(value=>'<td>'+escape(value)+'</td>').join('')+
    groups.map(group=>{
      if (group.columns.every(index=>row[index+4]==='N/A')) return `<td colspan="${group.columns.length}">N/A</td>`;
      return group.columns.map(index=>'<td>'+(globalThis.SmssIemisTransfer.componentKey(grid.columns[index].label)==='absent'?
        `<input type="checkbox" disabled aria-label="IsAbsent" ${row[index+4]==='TRUE'?'checked':''}>`:escape(row[index+4]))+'</td>').join('');
    }).join('')+'</tr>').join('');
  return {head,body};
}

// Validate an exported workbook for a new-record-only import into SMSS.
// No database access; existing marks are skipped by the host before writing.
export function planIemisPortalImport(file, grid, students, examId) {
  const t = globalThis.SmssIemisTransfer;
  const target = {...grid, rows:grid.rows.map(row=>row.map((v,i)=>i<4||v==='N/A'?v:'')),
    cells:grid.rows.map(row=>row.map((v,i)=>({value:'', unavailable:v==='N/A', readonly:i>=4&&t.componentKey(grid.columns[i-4].label)==='full', max:i>=4?t.maximum(grid.columns[i-4].label):null})))};
  t.makePlan(file,target);
  return file.rows.flatMap(row=>{
    const index=grid.rows.findIndex(r=>row[2]?t.clean(r[2])===t.clean(row[2]):t.clean(r[3])===t.clean(row[3]));
    const identity=grid.rows[index];
    const matches=students.filter(s=>identity[2]?t.clean(s.studentIemisNo||s.iemisStudentNo||s.iemisNumber||s.iemisNo||s.registrationNo||s.regdNo||s.regNo||s.studentIemisNumber||'')===t.clean(identity[2]):t.clean(s.symbolNo||s.symbolNumber||s.examSymbolNo||'')===t.clean(identity[3]));
    if(matches.length!==1)throw new Error('Import विद्यार्थी पहिचान मिलेन वा दोहोरियो।');
    const student=matches[0];
    const groups=new Map();
    file.columns.forEach((c,i)=>{const subject=t.subjectKey(c.subject);if(!groups.has(subject))groups.set(subject,[]);groups.get(subject).push({column:c,value:t.clean(row[i+4])});});
    return [...groups.values()].flatMap(parts=>{
      if(parts.every(p=>p.value===''||p.value==='N/A'))return [];
      const absentPart=parts.find(p=>t.componentKey(p.column.label)==='absent');
      const isAbsent=/^(true|1|yes)$/i.test(absentPart?.value||'');
      const marks=parts.filter(p=>!['absent','full'].includes(t.componentKey(p.column.label)));
      if(!isAbsent&&marks.every(p=>p.value===''))return [];
      const primary=marks.some(p=>t.componentKey(p.column.label)==='count');
      const count=Number(marks.find(p=>t.componentKey(p.column.label)==='count')?.value||0);
      const names={count:'No. of Learning Achievement',full:'Full Marks',obtained:'Obtained Learning Achievement',participation:'Participation',practical:'Practical/Project',term:t.termKey(grid.context.term)==='final'?'Total of Term':({first:'First',second:'Second',third:'Third'}[t.termKey(grid.context.term)]+' Term Examination'),theory:'TH (Theory)'};
      const scores=parts.filter(p=>t.componentKey(p.column.label)!=='absent').map(p=>{const key=t.componentKey(p.column.label);return {name:names[key]||p.column.label,fullMarks:primary?(key==='count'?count:count*4):t.maximum(p.column.label),obtained:key==='full'||isAbsent||p.value===''?null:Number(p.value)};});
      return [{studentId:student.id,examId,subject:parts[0].column.subject,isAbsent,scores,totalFullMarks:primary?count*4:scores.reduce((n,s)=>n+s.fullMarks,0),totalObtained:isAbsent?0:primary?(scores.find(s=>t.componentKey(s.name)==='obtained')?.obtained??0):scores.reduce((n,s)=>n+(s.obtained??0),0),assessmentType:primary?'learning-achievement':'marks'}];
    });
  });
}
