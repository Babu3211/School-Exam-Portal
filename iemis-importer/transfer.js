/* Shared by the SMSS export and the IEMIS content script. No network or storage access. */
(function (scope) {
  'use strict';
  const metadata = ['School IEMIS Code', 'Year', 'Class', 'Term', 'Section'];
  const identity = ['S.N', 'Student Name', 'Regd. No.', 'Symbol No.'];
  const digits = value => String(value ?? '').replace(/[०-९]/g, d => String('०१२३४५६७८९'.indexOf(d)));
  const clean = value => digits(value).trim().replace(/\s+/g, ' ');
  const key = value => clean(value).toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  const subjects = [
    ['nepali', 'compnepali', 'compulsorynepali', 'नेपाली', 'अनिवार्यनेपाली', '1021'],
    ['english', 'compenglish', 'compulsoryenglish', 'अंग्रेजी', 'अङ्ग्रेजी', 'अनिवार्यअंग्रेजी', '1011'],
    ['mathematics', 'compmathematics', 'compulsorymathematics', 'maths', 'गणित', 'अनिवार्यगणित', '1031'],
    ['science', 'scienceandtechnology', 'sciencetechnology', 'compscienceandtechnology', 'compulsoryscienceandtechnology', 'विज्ञानतथाप्रविधि', 'विज्ञान', '1041'],
    ['socialstudies', 'compsocialstudies', 'compulsorysocialstudies', 'socialstudieshumanvalueeducation', 'socialstudiesandhumanvalueeducation', 'सामाजिकअध्ययन', 'सामाजिकअध्ययनतथामानवमूल्यशिक्षा', '1051'],
    ['serophero', 'serophero', 'hamroserofero', 'serofero', 'हाम्रोसेरोफेरो', 'सेरोफेरो'],
    ['hamrodhunibeshi', 'hamrodhunibesi', 'हाम्रोधुनिबेँशी', 'हाम्रोधुनिबेशी'],
    ['environmentalscience', 'environmentscience', 'optienvironmentscience', 'optionalienvironmentalscience', 'optionalienvironmentscience', 'ऐच्छिकप्रथमवातावरणविज्ञान', 'वातावरणविज्ञान', '2041'],
    ['additionalmathematics', 'optiadditionalmathematics', 'optionaliadditionalmathematics', 'ऐच्छिकप्रथमअतिरिक्तगणित', 'अतिरिक्तगणित', '2021'],
    ['computerscience', 'optiicomputerscience', 'optionaliicomputerscience', 'ऐच्छिकद्वितीयकम्प्युटरविज्ञान', 'कम्प्युटरविज्ञान', 'computer', '3031'],
    ['healthphysicalcreativeart', 'healthphysicalandcreativeart', 'healthphysicaleducationandcreativearts', 'स्वास्थ्यशारीरिकतथासिर्जनात्मककला']
  ].map(list => list.map(key));
  function subjectKey(value) {
    const code = clean(value).match(/\((\d{4})\)/)?.[1];
    const normalized = key(clean(value).replace(/\(\d{4}\)/g, ''));
    const group = subjects.find(list => list.includes(normalized) || (code && list.includes(code)));
    return group?.[0] || normalized;
  }
  function componentKey(value) {
    const text = clean(value).replace(/\(\s*\d+(?:\.\d+)?\s*\)/g, '');
    if (/^is\s*absent$/i.test(text)) return 'absent';
    if (/^no\.?\s*of\s*learning/i.test(text)) return 'count';
    if (/^full\s*marks$/i.test(text)) return 'full';
    if (/obtained.*learning/i.test(text)) return 'obtained';
    if (/participation|सहभागिता/i.test(text)) return 'participation';
    if (/practical|project|प्रयोगात्मक|परियोजना/i.test(text)) return 'practical';
    if (/total of final|^th\b|theory/i.test(text)) return 'theory';
    if (/term.*examination|total of term/i.test(text)) return 'term';
    return key(text);
  }
  function classKey(value) {
    const text = clean(value);
    return text.match(/\d+/)?.[0].replace(/^0+(?=\d)/, '') || key(text);
  }
  function termKey(value) {
    const text = key(value);
    if (['annual', 'final', 'finalterm', 'वार्षिक'].includes(text)) return 'final';
    if (['first', 'firstterm', 'firstterminal', '1stterm'].includes(text)) return 'first';
    if (['second', 'secondterm', 'secondterminal', '2ndterm'].includes(text)) return 'second';
    if (['third', 'thirdterm', 'thirdterminal', '3rdterm'].includes(text)) return 'third';
    return text;
  }
  function maximum(label) {
    const match = clean(label).match(/\(\s*(\d+(?:\.\d+)?)\s*\)\s*$/);
    return match ? Number(match[1]) : null;
  }
  function columnKey(subject, component) { return subjectKey(subject) + '::' + componentKey(component); }
  function normalizeContext(context) {
    return [clean(context.schoolCode), clean(context.year), classKey(context.className), termKey(context.term), key(context.section || 'All')];
  }
  function error(message) { throw new Error(message); }
  function cellText(cell) {
    const value = cell.value;
    if (value == null) return '';
    if (typeof value === 'object') {
      if (Array.isArray(value.richText)) return value.richText.map(x => x.text).join('');
      error('Excel मा Formula, Link वा विशेष cell भेटियो। Values मात्र राख्नुहोस्।');
    }
    return String(value);
  }
  async function workbookData(ExcelJS, source) {
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(source);
    const info = book.getWorksheet('Context');
    const sheet = book.getWorksheet('Marks');
    if (!info || !sheet || book.worksheets.length !== 2) error('SMSS/IEMIS Sample बाट बनेको Context र Marks sheet चाहिन्छ।');
    if (info.rowCount > 20 || sheet.rowCount > 5003 || sheet.columnCount > 300) error('यो workbook को आकार समर्थित सीमाभन्दा ठूलो छ।');
    if (cellText(info.getCell('B1')) !== 'SMSS-IEMIS-1') error('Excel format version मिलेन। नयाँ Sample डाउनलोड गर्नुहोस्।');
    const context = Object.fromEntries(metadata.map((label, index) => {
      if (cellText(info.getCell(index + 2, 1)) !== label) error('Context sheet को heading परिवर्तन भएको छ।');
      return [label, cellText(info.getCell(index + 2, 2))];
    }));
    const columns = [];
    for (let col = 1; col <= sheet.columnCount; col++) {
      const subject = cellText(sheet.getCell(1, col));
      const label = cellText(sheet.getCell(2, col));
      if (col <= 4) {
        if (subject !== identity[col - 1]) error('Marks sheet का विद्यार्थी heading परिवर्तन भएका छन्।');
      } else {
        if (!subject || !label) error('विषय वा component heading खाली छ।');
        columns.push({subject, label, index: col - 1});
      }
    }
    const rows = [];
    for (let index = 3; index <= sheet.rowCount; index++) {
      const row = Array.from({length: sheet.columnCount}, (_, col) => cellText(sheet.getCell(index, col + 1)));
      if (row.some(value => value.trim() !== '')) rows.push(row);
    }
    return {context: {schoolCode: context[metadata[0]], year: context.Year, className: context.Class, term: context.Term, section: context.Section}, columns, rows};
  }
  async function makeWorkbook(ExcelJS, grid, blank = false) {
    const book = new ExcelJS.Workbook();
    book.creator = 'Babukrishna Khanal';
    const info = book.addWorksheet('Context');
    info.addRow(['Format', 'SMSS-IEMIS-1']);
    const context = grid.context;
    metadata.forEach((label, i) => info.addRow([label, [context.schoolCode, context.year, context.className, context.term, context.section || 'All'][i]]));
    info.addRow(['निर्देशन', 'Context र heading नबदल्नुहोस्। खाली अंक खाली नै रहन्छ। Regd. No. वा Symbol No. बाट विद्यार्थी मिलाइन्छ।']);
    info.columns = [{width: 26}, {width: 90}];
    const sheet = book.addWorksheet('Marks', {views: [{state: 'frozen', xSplit: 4, ySplit: 2}]});
    sheet.addRow([...identity, ...grid.columns.map(c => c.subject)]);
    sheet.addRow(['', '', '', '', ...grid.columns.map(c => c.label)]);
    for (let col = 1; col <= 4; col++) sheet.mergeCells(1, col, 2, col);
    let start = 5;
    while (start <= grid.columns.length + 4) {
      let end = start;
      while (end + 1 <= grid.columns.length + 4 && grid.columns[end - 4].subject === grid.columns[start - 5].subject) end++;
      if (end > start) sheet.mergeCells(1, start, 1, end);
      start = end + 1;
    }
    grid.rows.forEach(row => sheet.addRow(row.map((value, i) => blank && i >= 4 ? '' : String(value ?? ''))));
    sheet.columns.forEach((col, i) => { col.width = i === 1 ? 30 : i < 4 ? 23 : 23; col.numFmt = '@'; });
    sheet.eachRow((row, rowNo) => row.eachCell({includeEmpty: true}, cell => {
      cell.alignment = {vertical: 'middle', wrapText: true};
      cell.border = {bottom: {style: 'thin', color: {argb: 'FFE0E7EF'}}};
      if (rowNo <= 2) {
        cell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: rowNo === 1 ? 'FF174EA6' : 'FFC62846'}};
        cell.font = {bold: true, color: {argb: 'FFFFFFFF'}};
      }
    }));
    sheet.getRow(1).height = 34; sheet.getRow(2).height = 48;
    sheet.pageSetup = {orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '1:2'};
    return book.xlsx.writeBuffer();
  }
  function parsePaste(text, grid) {
    const lines = String(text).replace(/\r\n?/g, '\n').replace(/\n+$/, '').split('\n');
    const rows = lines.map(line => line.split('\t'));
    if (rows.length > 5000 || rows.some(row => row.length !== grid.columns.length + 4)) error('Marks sheet का heading बाहेक सबै ४ विद्यार्थी column र अंक column सँगै Copy/Paste गर्नुहोस्।');
    return {context: {...grid.context}, columns: grid.columns.map((c, i) => ({...c, index: i + 4})), rows};
  }
  function makePlan(file, grid, overwrite = false) {
    const sourceContext = normalizeContext(file.context), targetContext = normalizeContext(grid.context);
    if (sourceContext.some((v, i) => v !== targetContext[i])) error('School, Year, Class, Term वा Section मिलेन। खुलेको IEMIS form को Sample प्रयोग गर्नुहोस्।');
    if (!file.rows.length) error('Import गर्ने विद्यार्थी पङ्क्ति छैन।');
    const targetColumns = new Map();
    grid.columns.forEach((c, i) => {
      const id = columnKey(c.subject, c.label);
      if (targetColumns.has(id)) error('IEMIS मा उस्तै विषय/component दोहोरिएको छ।');
      targetColumns.set(id, {...c, index: i + 4});
    });
    const seenColumns = new Set();
    const mapping = file.columns.map(c => {
      const id = columnKey(c.subject, c.label), target = targetColumns.get(id);
      if (seenColumns.has(id)) error('Excel मा विषय/component दोहोरिएको छ।');
      seenColumns.add(id);
      if (!target) error('IEMIS मा यो विषय/component भेटिएन: ' + c.subject + ' / ' + c.label);
      if (maximum(c.label) !== maximum(target.label)) error('विषयको पूर्णाङ्क मिलेन: ' + c.subject + ' / ' + c.label);
      return {source: c, target, kind: componentKey(c.label)};
    });
    const lookup = index => {
      const map = new Map();
      grid.rows.forEach((r, i) => {const id = clean(r[index]); if (id) map.set(id, map.has(id) ? -1 : i);});
      return map;
    };
    const registrations = lookup(2), symbols = lookup(3), seenStudents = new Set(), changes = [];
    for (const row of file.rows) {
      if (file.columns.every(column => !clean(row[column.index]) || clean(row[column.index]) === 'N/A')) continue;
      const reg = clean(row[2]), symbol = clean(row[3]);
      if (!reg && !symbol) error('Regd. No. वा Symbol No. चाहिन्छ।');
      const index = reg ? registrations.get(reg) : symbols.get(symbol);
      if (index == null || index < 0) error('विद्यार्थी पहिचान भेटिएन वा दोहोरिएको छ: ' + (reg || symbol));
      if (seenStudents.has(index)) error('Excel मा एउटै विद्यार्थी दोहोरिएको छ।');
      seenStudents.add(index);
      if (reg && symbol && clean(grid.rows[index][3]) && clean(grid.rows[index][3]) !== symbol) error('Regd. No. र Symbol No. एउटै विद्यार्थीका छैनन्।');
      if (key(row[1]) !== key(grid.rows[index][1])) error('विद्यार्थीको नाम र पहिचान मिलेन: ' + clean(row[1]));
      const cells = grid.cells[index], values = new Map();
      for (const item of mapping) {
        const value = clean(row[item.source.index]);
        if (!value || value === 'N/A') continue;
        const {target, kind} = item, cell = cells[target.index];
        if (!cell || cell.unavailable) error('विद्यार्थीलाई यो विषय लागू हुँदैन: ' + target.subject);
        const subject = subjectKey(target.subject);
        if (!values.has(subject)) values.set(subject, new Map());
        let parsed;
        if (kind === 'absent') {
          if (!/^(true|false|yes|no|1|0)$/i.test(value)) error('IsAbsent मा TRUE वा FALSE राख्नुहोस्।');
          parsed = /^(true|yes|1)$/i.test(value);
        } else {
          if (!/^\d+(?:\.\d+)?$/.test(value)) error('प्राप्ताङ्कमा शून्य वा सकारात्मक संख्या मात्र राख्नुहोस्।');
          parsed = Number(value);
          if (!Number.isFinite(parsed)) error('प्राप्ताङ्क मान्य संख्या होइन।');
          const max = maximum(target.label) ?? cell.max;
          if (max != null && parsed > max) error('पूर्णाङ्कभन्दा बढी अंक छ: ' + target.subject + ' / ' + target.label);
          if (kind === 'count' && (!Number.isInteger(parsed) || parsed > 5000)) error('Learning Achievement संख्या ०–५००० को पूर्णाङ्क हुनुपर्छ।');
        }
        values.get(subject).set(kind, parsed);
        if (kind === 'full') continue;
        if (cell.readonly) error('यो IEMIS को गणना गरिएको वा परिवर्तन गर्न नमिल्ने field हो: ' + target.label);
        const current = cell.value;
        const equal = kind === 'absent' ? current === parsed : String(current).trim() !== '' && Number(current) === parsed;
        if (!equal && !overwrite && (kind === 'absent' ? current === true : String(current).trim() !== '')) error('पहिल्यै अंक छ। समीक्षा गरेर Replace Existing Values छान्नुहोस्।');
        if (!equal) changes.push({row: index, column: target.index, value: parsed, before: current, kind, subject: target.subject});
      }
      for (const [subject, scores] of values) {
        const field = kind => mapping.find(m => subjectKey(m.target.subject) === subject && m.kind === kind);
        const current = kind => {const m = field(kind);return m ? cells[m.target.index]?.value : '';};
        const count = scores.get('count') ?? (clean(current('count')) === '' ? null : Number(current('count')));
        const obtained = scores.get('obtained') ?? (clean(current('obtained')) === '' ? null : Number(current('obtained')));
        if ((scores.has('obtained') || scores.has('count')) && obtained != null && (count == null || obtained > count * 4)) error('Learning Achievement को प्राप्ताङ्क संख्या × ४ भित्र हुनुपर्छ।');
        if (scores.has('full') && (count == null || scores.get('full') !== count * 4)) error('Full Marks र Learning Achievement संख्या × ४ मिलेन।');
        const absent = scores.get('absent') ?? current('absent');
        if (absent === true && [...scores.keys()].some(k => !['absent', 'count', 'full'].includes(k))) error('अनुपस्थित विद्यार्थीको प्राप्ताङ्क खाली राख्नुहोस्।');
      }
    }
    if (!changes.length) error('परिवर्तन गर्नुपर्ने नयाँ अंक भेटिएन।');
    return {changes, students: seenStudents.size};
  }
  scope.SmssIemisTransfer = Object.freeze({metadata, identity, clean, key, classKey, termKey, subjectKey, componentKey, maximum, columnKey, normalizeContext, workbookData, makeWorkbook, parsePaste, makePlan});
})(globalThis);
