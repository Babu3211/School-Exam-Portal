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
  // Registry insertion order must never determine an IEMIS subject column.
  function orderSubjects(values, className) {
    const n = Number(classKey(className));
    if (!Number.isInteger(n) || n < 1 || n > 10) return [...values];
    const order = n <= 3 ? ['nepali','english','mathematics','serophero','hamrodhunibeshi'] : n <= 8 ?
      ['nepali','english','mathematics','science','socialstudies','healthphysicalcreativeart','hamrodhunibeshi'] :
      ['nepali','english','mathematics','science','socialstudies','environmentalscience','computerscience','additionalmathematics'];
    const rank = value => {const i = order.indexOf(subjectKey(value)); return i < 0 ? order.length : i;};
    return [...values].sort((a,b) => rank(a) - rank(b));
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
  scope.SmssIemisTransfer = Object.freeze({metadata, identity, clean, key, classKey, termKey, subjectKey, componentKey, orderSubjects, maximum, columnKey, normalizeContext});
})(globalThis);
