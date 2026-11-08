import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const pack = JSON.parse(readFileSync(new URL("../data/cdc-grade8-science-practice-pack-v1.json", import.meta.url), "utf8"));
const register = JSON.parse(readFileSync(new URL("../data/cdc-question-paper-sources-2083.json", import.meta.url), "utf8"));

assert.equal(pack.schemaVersion, 1, "practice pack schema version");
assert.equal(pack.gradeNumber, 8, "practice pack grade");
assert.equal(pack.units.length, 11, "Grade 8 science unit count");
assert.equal(pack.questions.length, 55, "Grade 8 science question count");
assert.match(pack.sourceUrl, /^https:\/\/moecdc\.gov\.np\//, "official CDC textbook source URL");
assert.match(pack.status, /teacher_review_required/, "teacher review must be explicit");

const unitCodes = new Set(pack.units.map(unit => String(unit.unitCode)));
const unitTopics = new Map(pack.units.map(unit => [String(unit.unitCode), new Set((unit.topics || []).map(x => String(x).trim().toLocaleLowerCase()))]));
const questionTexts = new Set();
const typeCounts = { mcq: 0, short: 0, long: 0 };
for (const [index, q] of pack.questions.entries()) {
  assert.ok(unitCodes.has(String(q.unitCode)), `question ${index + 1}: unknown unit`);
  assert.ok(unitTopics.get(String(q.unitCode)).has(String(q.topicName).trim().toLocaleLowerCase()), `question ${index + 1}: topic not in unit`);
  assert.ok(String(q.questionText || "").trim(), `question ${index + 1}: missing question`);
  assert.ok(String(q.answer || "").trim(), `question ${index + 1}: missing answer guidance`);
  assert.ok(Number(q.marks) > 0, `question ${index + 1}: invalid marks`);
  assert.ok(["knowledge", "understanding", "application", "higher"].includes(q.cognitiveLevel), `question ${index + 1}: invalid cognitive level`);
  assert.ok(["mcq", "short", "long"].includes(q.questionType), `question ${index + 1}: invalid question type`);
  if (q.questionType === "mcq") {
    assert.equal(q.options?.length, 4, `question ${index + 1}: MCQ must have four options`);
    assert.ok(q.options.every(option => String(option).trim()), `question ${index + 1}: blank MCQ option`);
    assert.ok(["A", "B", "C", "D"].includes(q.correctOption), `question ${index + 1}: invalid MCQ key`);
  }
  const fingerprint = String(q.questionText).trim().toLocaleLowerCase();
  assert.ok(!questionTexts.has(fingerprint), `question ${index + 1}: duplicate question text`);
  questionTexts.add(fingerprint);
  typeCounts[q.questionType]++;
}
assert.equal(typeCounts.mcq, 22, "MCQ count");
assert.equal(typeCounts.short, 22, "short answer count");
assert.equal(typeCounts.long, 11, "long answer count");

assert.equal(register.schemaVersion, 1, "CDC source register schema");
assert.ok(Array.isArray(register.sources) && register.sources.length >= 15, "CDC source register must contain grade-wise sources");
for (const [index, source] of register.sources.entries()) {
  assert.ok(Array.isArray(source.grades) && source.grades.length, `source ${index + 1}: grade list required`);
  assert.ok(source.grades.every(g => Number(g) >= 6 && Number(g) <= 10), `source ${index + 1}: grade outside 6-10`);
  assert.match(source.url, /^https:\/\/((www|lib)\.)?moecdc\.gov\.np\//i, `source ${index + 1}: non-CDC URL`);
  assert.ok(source.status, `source ${index + 1}: status required`);
}
console.log("Question paper content checks passed:", {
  units: pack.units.length,
  questions: pack.questions.length,
  questionTypes: typeCounts,
  CDCSourceRecords: register.sources.length
});
