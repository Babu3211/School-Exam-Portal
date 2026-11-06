import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const html = await readFile("index.html", "utf8");
const rules = await readFile("firestore.rules", "utf8");
const manifest = await readFile("manifest.webmanifest", "utf8");
const serviceWorker = await readFile("sw.js", "utf8");

const must = (condition, message) => assert.ok(condition, message);
const requiredCollections = [
  "students", "staff", "classes", "subjects", "exams", "marks",
  "attendance", "mark_settings", "user_roles", "public_result_exams",
  "public_results", "public_result_lookup", "audit_logs"
];

must(html.includes("MAIN MENU / मुख्य मेनु"), "Dashboard main menu must be bilingual.");
must(html.includes("Student Management / विद्यार्थी व्यवस्थापन"), "Dashboard submenu must be bilingual.");
must(html.includes("Student registration, search and record management / विद्यार्थी दर्ता"), "Student page topic must be bilingual.");
must(html.includes("V44 login visual refinement"), "V44 login visual refinement is missing.");
must(html.includes('id="toggleLoginPassword"'), "Password show/hide control is missing.");
must(html.includes("sendPasswordResetEmail(auth,email)"), "Free Firebase email password reset is missing.");

must(html.includes("function subjectEnglishLabel(value){const raw="), "English subject label fallback is missing.");
must(html.includes("function englishDisplayText(value)") && html.includes("return mapped||englishDisplayText(raw)||'Subject';"), "Unknown Nepali subject names must be rendered in Latin script.");
must(html.includes("subjects.map(x=>`<th>${resultEsc(subjectEnglishLabel(x))}"), "Tabulation subjects must use English labels.");
must(html.includes("ledgerEnglishLabel(component.name)"), "Marks Ledger Excel component labels must use English.");
must(html.includes("smssTermLabelEnglish(smssExamTermKey(exam))"), "Printed/exported term labels must use English.");
must(html.includes("student.studentNameEnglish||student.nameEnglish||student.nameEn"), "Grade Sheet must prefer English student names.");
const translitStart = html.indexOf("function transliterateNepaliText");
const translitEnd = html.indexOf("\nfunction subjectEnglishLabel", translitStart);
must(translitStart >= 0 && translitEnd > translitStart, "Nepali-to-Latin display helper is missing.");
const displayHelpers = new Function(html.slice(translitStart, translitEnd) + "; return { englishDisplayText };")();
must(!/[\u0900-\u097F]/.test(displayHelpers.englishDisplayText("बाबुकृष्ण खनाल")), "Student names without English aliases must be rendered in Latin script.");


must(html.includes("async function publishOneOnlineResult(studentId)"), "Per-student publish/update is missing.");
must(html.includes("async function unpublishOneOnlineResult(studentId)"), "Per-student unpublish is missing.");
must(html.includes('id="publishSelectedOnlineResultBtn"'), "Selected-student publish action is missing.");
must(html.includes("data-result-select"), "Per-student selection checkboxes are missing.");
must(html.includes("findLegacyLookups"), "Legacy lookup cleanup is missing.");
must(html.includes("pointerSnap.data().version"), "Existing exam publication version must be preserved.");

const backupMatch = html.match(/const collectionNames=(\[[^;]+\]);/);
const restoreMatch = html.match(/const RESTORE_COLLECTIONS=(\[[^;]+\]);/);
must(backupMatch && restoreMatch, "Backup/Restore collection declarations are missing.");
const backupCollections = JSON.parse(backupMatch[1]);
const restoreCollections = JSON.parse(restoreMatch[1]);
for (const name of requiredCollections) {
  must(backupCollections.includes(name), "Backup is missing collection: " + name);
  must(restoreCollections.includes(name), "Restore is missing collection: " + name);
}
must(html.includes("legacyMissingCollections"), "Restore must remain compatible with older V44 backups.");

must(html.includes("async function seedInitialStaff20()"), "Initial 20-staff seed action is missing.");
must(html.includes("nameEn:nameEnglish"), "Staff seed must use the V44 English-name field.");
must(html.includes("data.staffId=existingRecord?.staffId||nextStaffId(data.role,freshStaff)"), "New staff records must receive sequential IDs while preserving existing IDs.");

must(rules.includes("match /public_result_lookup/{lookupId}") && rules.includes("allow get: if true;") && rules.includes("allow list: if isAdmin();"), "Public lookup rules must allow exact public get and Admin-only list.");
must(rules.includes("match /public_results/{resultId}") && rules.includes("allow list: if isAdmin();"), "Public result list must be Admin-only.");
must(rules.includes("match /public_result_exams/{examId}"), "Public exam index rules are missing.");
must(rules.includes("function studentBelongsToClass") && rules.includes("studentBelongsToClass(request.resource.data.studentId"), "Marks rules must validate that a student belongs to the assigned class.");
must(rules.includes("request.resource.data.attendanceType == 'daily'"), "Teacher attendance writes must be limited to daily attendance.");
must(manifest.includes("V44"), "PWA manifest must identify V44.");
must(serviceWorker.includes("smss-pwa-v44-school-exam-portal"), "Service worker cache must identify V44.");

const start = html.indexOf("function selectedEntrySetting(){");
const end = html.indexOf("\nfunction entryClassGroup", start);
must(start >= 0 && end > start, "Marks Entry assessment selector is missing.");
const selectorSource = html.slice(start, end);
const selectorFactory = new Function(
  "document", "marksSettings", "marksExams", "entryClassGroup",
  "canonicalSubjectKey", "isComputerSubject", "smssExamTermKey",
  selectorSource + "; return selectedEntrySetting;"
);
function selectedComponents(termKey) {
  const documentStub = {
    getElementById(id) {
      return { value: id === "entryClass" ? "9" : id === "entrySubject" ? "Mathematics" : id === "entryExam" ? termKey : "" };
    }
  };
  const settings = [{
    classGroup: "9-10", className: "9", subject: "Mathematics",
    components: [{ name: "IN", fullMarks: 25 }, { name: "TH (Theory)", fullMarks: 75 }],
    internalFullMarks: 25, totalFullMarks: 100
  }];
  const exams = [{ id: termKey, className: "9", termKey }];
  const getSetting = selectorFactory(
    documentStub, settings, exams, () => "9-10",
    value => String(value).toLowerCase(), () => false,
    exam => exam.termKey
  );
  return getSetting().components.map(component => component.name);
}
must(!selectedComponents("first").some(name => /theory/i.test(name)), "TH/ Theory column must be absent outside Final/Annual Term.");
must(selectedComponents("annual").some(name => /theory/i.test(name)), "TH/ Theory column must be present in Final/Annual Term.");

console.log("V44 requirement regression checks passed.");
