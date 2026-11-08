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
assert.ok(!register.practicePacks.some(p => p.grade === 9 && p.subject === "विज्ञान तथा प्रविधि"), "No Grade 9 pack may be registered until its textbook topics are verified");

assert.equal(register.schemaVersion, 1, "CDC source register schema");
assert.ok(Array.isArray(register.sources) && register.sources.length >= 15, "CDC source register must contain grade-wise sources");
for (const [index, source] of register.sources.entries()) {
  assert.ok(Array.isArray(source.grades) && source.grades.length, `source ${index + 1}: grade list required`);
  assert.ok(source.grades.every(g => Number(g) >= 6 && Number(g) <= 10), `source ${index + 1}: grade outside 6-10`);
  assert.match(source.url, /^https:\/\/((www|lib)\.)?moecdc\.gov\.np\//i, `source ${index + 1}: non-CDC URL`);
  assert.ok(source.status, `source ${index + 1}: status required`);
}
console.log("Question paper content checks passed:", { packs: summaries, CDCSourceRecords: register.sources.length });
