import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readJson = path => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const register = readJson("../data/cdc-question-paper-sources-2083.json");

function validatePack(file, grade, expectedUnits, expectedQuestions) {
  const pack = readJson(file);
  assert.equal(pack.schemaVersion, 1, `Grade ${grade}: schema version`);
  assert.equal(pack.gradeNumber, grade, `Grade ${grade}: grade number`);
  assert.equal(pack.units.length, expectedUnits, `Grade ${grade}: unit count`);
  assert.equal(pack.questions.length, expectedQuestions, `Grade ${grade}: question count`);
  assert.match(pack.sourceUrl, /^https:\/\/((www|lib)\.)?moecdc\.gov\.np\//i, `Grade ${grade}: CDC source URL`);
  assert.match(pack.status, /teacher_review_required/, `Grade ${grade}: teacher review flag`);

  const unitCodes = new Set(pack.units.map(unit => String(unit.unitCode)));
  const unitTopics = new Map(pack.units.map(unit => [String(unit.unitCode), new Set((unit.topics || []).map(x => String(x).trim().toLocaleLowerCase()))]));
  const questionTexts = new Set();
  const counts = { mcq: 0, short: 0, long: 0 };
  for (const [index, q] of pack.questions.entries()) {
    assert.ok(unitCodes.has(String(q.unitCode)), `Grade ${grade}, question ${index + 1}: unknown unit`);
    assert.ok(unitTopics.get(String(q.unitCode)).has(String(q.topicName).trim().toLocaleLowerCase()), `Grade ${grade}, question ${index + 1}: topic mismatch`);
    assert.ok(String(q.questionText || "").trim(), `Grade ${grade}, question ${index + 1}: missing question`);
    assert.ok(String(q.answer || "").trim(), `Grade ${grade}, question ${index + 1}: missing answer`);
    assert.ok(Number(q.marks) > 0, `Grade ${grade}, question ${index + 1}: invalid marks`);
    assert.ok(["knowledge", "understanding", "application", "higher"].includes(q.cognitiveLevel), `Grade ${grade}, question ${index + 1}: invalid cognitive level`);
    assert.ok(["mcq", "short", "long"].includes(q.questionType), `Grade ${grade}, question ${index + 1}: invalid question type`);
    if (q.questionType === "mcq") {
      assert.equal(q.options?.length, 4, `Grade ${grade}, question ${index + 1}: MCQ must have four options`);
      assert.ok(q.options.every(option => String(option).trim()), `Grade ${grade}, question ${index + 1}: blank MCQ option`);
      assert.ok(["A", "B", "C", "D"].includes(q.correctOption), `Grade ${grade}, question ${index + 1}: invalid MCQ key`);
    }
    const fingerprint = String(q.questionText).trim().toLocaleLowerCase();
    assert.ok(!questionTexts.has(fingerprint), `Grade ${grade}, question ${index + 1}: duplicate question text`);
    questionTexts.add(fingerprint);
    counts[q.questionType]++;
  }
  return { grade, units: pack.units.length, questions: pack.questions.length, counts };
}

const summaries = [
  validatePack("../data/cdc-grade8-science-practice-pack-v1.json", 8, 11, 55),
  validatePack("../data/cdc-grade10-science-practice-pack-v1.json", 10, 19, 57)
];
const grade10Pack = readJson("../data/cdc-grade10-science-practice-pack-v1.json");
assert.equal(grade10Pack.sourceUrl, "https://moecdc.gov.np/storage/gallery/1692097269.pdf", "Grade 10 textbook must point to the official Grade 10 PDF");
assert.match(grade10Pack.sourceTitle, /Grade 10/, "Grade 10 source title must identify Grade 10");
assert.ok(Array.isArray(register.practicePacks) && register.practicePacks.some(p => p.grade === 10 && p.subject === "विज्ञान तथा प्रविधि"), "Grade 10 science pack must be listed in source register");
assert.ok(!register.practicePacks.some(p => p.grade === 9 && p.subject === "विज्ञान तथा प्रविधि"), "Grade 9 pack must stay blocked until its source/topic mismatch is resolved");
assert.match(String(register.completion.grade9SciencePracticePack || ""), /blocked-not-importable/, "Grade 9 pack block must be documented");
assert.ok(!register.sources.some(s=>s.grades.includes(9) &&
 s.url==="https://moecdc.gov.np/storage/gallery/1692097269.pdf"),
 "Grade 10 textbook PDF must never be listed as Grade 9 CDC textbook");
const grade9Economics=register.sources.find(s=>
 s.grades.length===1&&s.grades[0]===9&&
 s.subject==="ऐच्छिक अर्थशास्त्र"&&
 s.url==="https://moecdc.gov.np/content/452/septemo-schedule-and-sample-questions-2082--class/");
assert.ok(grade9Economics,"CDC Grade 9 Economics grid source must be tracked");
assert.match(grade9Economics.status,/grid_content_not_yet_extracted/,
 "Official source existence is NOT sufficient to mark the Grid as transcribed");
for (const [grade, url] of [
  [9, "https://moecdc.gov.np/content/278/specialization-schedule-class-class-9-science-and/"],
  [10, "https://moecdc.gov.np/content/273/specialization-schedule-class-10-science-and-technology/"]
]) {
  const source = register.sources.find(s => s.url === url && s.grades.length === 1 && s.grades[0] === grade);
  assert.ok(source, `Grade ${grade} official CDC science grid source must be registered`);
  assert.match(source.status, /grid_content_not_yet_extracted/,
    `Grade ${grade} must remain unverified until full official Grid transcription`);
  assert.ok(!source.unitGrid, `Grade ${grade} must not ship speculative question/mark rows`);
}


const archivedGrade8=register.sources.find(s=>s.grades.length===1&&s.grades[0]===8&&
 s.version.includes('२०७८')&&s.url.includes('id=13717'));
assert.ok(archivedGrade8,'Historic CDC Grade8 Science Model and marking key must be tracked');
assert.match(archivedGrade8.status,/requires_visual_and_current_2082_grid_reconciliation/,
 'Historical source must not be silently used as 2083 CDC Exact');
assert.ok(!archivedGrade8.unitGrid,'Historic grid/model discrepancy may not create fabricated rows');
const questionBuilder = readFileSync(new URL("../cdc-question-paper.js", import.meta.url), "utf8");
const appShell = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
const fs = await import("node:fs");
assert.ok(!fs.existsSync(new URL("../data/cdc-grade9-science-practice-pack-v1.json", import.meta.url)), "Unverified Grade 9 science practice pack must not be shipped");
assert.doesNotMatch(questionBuilder, /loadGrade9SciencePack|qpGrade9SciencePackBtn|cdc-grade9-science-practice-pack/i, "Unverified Grade 9 science import must remain unavailable");
assert.doesNotMatch(appShell, /cdc-grade9-science-practice-pack/i, "Service worker must not cache an unverified Grade 9 science pack");
for (const grade of [8, 10]) {
  assert.ok(questionBuilder.includes("cdc-grade" + grade + "-science-practice-pack-v1.json"), "Grade " + grade + " pack must remain wired into the question builder");
  assert.ok(appShell.includes("./data/cdc-grade" + grade + "-science-practice-pack-v1.json"), "Grade " + grade + " pack must be cached for offline use");
}


assert.equal(register.schemaVersion, 1, "CDC source register schema");
for(const grade of [9,10]){
 const rows=register.sources.filter(s=>s.grades.length===1&&s.grades[0]===grade&&
 s.subject==='ऐच्छिक कम्प्युटर विज्ञान'&&
 s.status.includes('unitwise_transcribed'));
 assert.equal(rows.length,1,'Exactly one CDC government PDF Grid source per Computer Science grade');
 assert.match(rows[0].url,/^https:\/\/giwmscdnone\.gov\.np\/media\/pdf_upload\//);
}
const latestMath=o=>o.sources.find(s=>s.grades.length===1&&s.grades[0]===10&&
 s.subject==='ऐच्छिक गणित'&&s.version==='2083');
assert.ok(latestMath(register),'Official CDC 2083 Optional Math model reference required');
assert.equal(latestMath(register).url,'https://moecdc.gov.np/content/659/class-10th-optional-mathematics-specification-table--model/');
assert.match(latestMath(register).status,/original_attachment_pending/,
 'Secondary PDF replica must not be misrepresented as an independently authenticated original');
assert.match(questionBuilder, /id="qpQuestionExcelTemplateBtn"/);
assert.match(questionBuilder, /id="qpQuestionExcelFile"/);
assert.match(questionBuilder, /ExcelJS/);
assert.match(appShell, /cdc-question-excel\.mjs/);
assert.match(appShell, /cdc-grid-source-index\.mjs/);
assert.match(appShell, /cdc-grade8-science-model-audit\.mjs/);
assert.match(appShell, /cdc-optional-math-composite\.mjs/);
assert.match(appShell, /cdc-optional-math-original-practice\.mjs/);
assert.match(appShell, /cdc-optional-math-render\.mjs/);
assert.match(appShell, /data\/cdc-question-paper-sources-2083\.json/);
assert.ok(Array.isArray(register.sources) && register.sources.length >= 15, "CDC source register must contain grade-wise sources");
for (const [index, source] of register.sources.entries()) {
  assert.ok(Array.isArray(source.grades) && source.grades.length, `source ${index + 1}: grade list required`);
  assert.ok(source.grades.every(g => Number(g) >= 6 && Number(g) <= 10), `source ${index + 1}: grade outside 6-10`);
  assert.match(source.url, /^https:\/\/(?:(?:www|lib)\.moecdc\.gov\.np|moecdc\.gov\.np|giwmscdnone\.gov\.np)\//i, `source ${index + 1}: non-CDC URL`);
  assert.ok(source.status, `source ${index + 1}: status required`);
}
console.log("Question paper content checks passed:", { packs: summaries, CDCSourceRecords: register.sources.length });
