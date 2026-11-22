import './iemis-importer/transfer.js';

// Build from saved records. This function never reads an unsaved entry draft.
export function buildIemisTransferExport({context, students, subjects, records, examId, componentsFor, label, applicable, roll}) {
  const transfer = globalThis.SmssIemisTransfer;
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
      const max = Number(c.fullMarks);
      if (!Number.isFinite(max) || max < 0) throw new Error('Assessment Settings को पूर्णाङ्क मान्य छैन।');
      const names = {participation: 'Participation', practical: 'Practical/Project', theory: 'Total of final marks', term: transfer.termKey(context.term) === 'final' ? 'Total of Term' : ({first: 'First', second: 'Second', third: 'Third'}[transfer.termKey(context.term)] + ' Term Examination')};
      return {key: component, max, label: `${names[component] || c.name}(${max})`};
    });
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
