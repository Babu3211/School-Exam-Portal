import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const html = await readFile("index.html", "utf8");
const rules = await readFile("firestore.rules", "utf8");
const manifest = await readFile("manifest.webmanifest", "utf8");
const serviceWorker = await readFile("sw.js", "utf8");

const must = (condition, message) => assert.ok(condition, message);
const requiredCollections = [
  "students", "staff", "classes", "subjects", "exams", "marks",
  "attendance", "mark_settings", "certificates", "user_roles", "public_result_exams",
  "public_results", "public_result_lookup", "audit_logs"
];

must(html.includes("MAIN MENU / मुख्य मेनु"), "Dashboard main menu must be bilingual.");
must(html.includes("Student Management / विद्यार्थी व्यवस्थापन"), "Dashboard submenu must be bilingual.");
must(html.includes("Student registration, search and record management / विद्यार्थी दर्ता"), "Student page topic must be bilingual.");
must(html.includes("V44 login visual refinement"), "V44 login visual refinement is missing.");
must(html.includes('id="toggleLoginPassword"'), "Password show/hide control is missing.");
must(html.includes("sendPasswordResetEmail(auth,email)"), "Free Firebase email password reset is missing.");
must(!/signInWithPhoneNumber|PhoneAuthProvider|RecaptchaVerifier|phoneAuthProvider/i.test(html), "SMS OTP must remain disabled for the Firebase Spark Free Plan.");

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
must(html.includes('const resultId=doc(collection(db,"public_results")).id;') && html.includes("d.data()?.studentId===studentId"), "New public result document IDs must be random and unpublish must find studentId-linked records.");
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
  if (name !== "audit_logs") must(restoreCollections.includes(name), "Restore is missing collection: " + name);
}
must(!restoreCollections.includes("audit_logs"), "Append-only audit logs must be preserved in backup but not replayed during restore.");
must(html.includes("append-only सुरक्षा नियमका कारण Restore हुँदैन"), "Restore UI must explain why audit logs are not replayed.");
must(html.includes("legacyMissingCollections"), "Restore must remain compatible with older V44 backups.");

must(html.includes("async function seedInitialStaff20()"), "Initial 20-staff seed action is missing.");
must(html.includes("nameEn:nameEnglish"), "Staff seed must use the V44 English-name field.");
must(html.includes("data.staffId=existingRecord?.staffId||nextStaffId(data.role,freshStaff)"), "New staff records must receive sequential IDs while preserving existing IDs.");

must(rules.includes("match /public_result_lookup/{lookupId}") && rules.includes("allow get: if true;") && rules.includes("allow list: if isAdmin();"), "Public lookup rules must allow exact public get and Admin-only list.");
must(rules.includes("match /public_results/{resultId}") && rules.includes("allow list: if isAdmin();"), "Public result list must be Admin-only.");
must(rules.includes("match /public_result_exams/{examId}"), "Public exam index rules are missing.");
must(rules.includes("match /user_roles/{userId}") && rules.includes("allow get: if isAdmin() || (signedIn() && request.auth.uid == userId);"), "Users may read only their own role record; Admin may read role records.");
must(rules.includes("allow create, update, delete: if isAdmin();"), "Only Admin may create, change or deactivate user role assignments.");
must(rules.includes("function hasActiveRole()") && rules.includes("roleData().get('roles', [])"), "Role-based access must require an active user role.");
must(rules.includes("match /public_result_exams/{examId}") && rules.includes("allow get, list: if true;") && rules.includes("allow create, update, delete: if isAdmin();"), "Public exam index must expose read-only publication metadata.");
must(rules.includes("match /public_result_lookup/{lookupId}") && rules.includes("allow get: if true;") && rules.includes("allow list: if isAdmin();"), "Public result lookup must allow exact PIN-hash reads but block public listing.");
must(rules.includes("match /public_results/{resultId}") && rules.includes("allow get: if true;") && rules.includes("allow list: if isAdmin();"), "Public result documents must allow exact reads but block public listing.");
must(rules.includes("match /online_result_rate_limits/{documentId}") && rules.includes("allow read, write: if false;"), "Rate-limit collection must remain inaccessible to client apps.");

must(html.includes('id="certificateForm"') && html.includes("async function loadCertificatesPage()"), "Firebase certificate issue workflow is missing.");
must(html.includes("function printIssuedCertificate(id)") && html.includes("window.print()"), "Printable A4 certificate workflow is missing.");
must(html.includes('id="loadResultsBtn"') && html.includes('id="resultsTablePanel"') && html.includes('id="gradeSheetView"'), "Result Management must keep Results, Tabulation Sheet and Grade Sheet together.");
must(html.includes('id="printTabulationBtn"') && html.includes('id="printGradeSheetBtn"') && html.includes("function printTabulationSheet()") && html.includes("function showGradeSheet(studentId)"), "Tabulation and Grade Sheet print/view actions are missing.");
must(html.includes('id="numberLedgerTab"') && html.includes('id="gradeLedgerTab"') && html.includes("function renderMarksLedgerPage()"), "Number Ledger and Grade Ledger views are missing.");
must(html.includes("const scoresComplete=achievement?count!==null") && html.includes("const valid=!!rec&&scoresComplete"), "Grade Ledger must not convert incomplete assessment components into zero marks.");
const ledgerHelperStart = html.indexOf("function ledgerScoresComplete(scores){");
const ledgerHelperEnd = html.indexOf("\nfunction renderMarksLedgerPage", ledgerHelperStart);
must(ledgerHelperStart >= 0 && ledgerHelperEnd > ledgerHelperStart, "Grade Ledger completeness validator is missing.");
const ledgerScoresComplete = new Function(html.slice(ledgerHelperStart, ledgerHelperEnd) + "; return ledgerScoresComplete;")();
must(ledgerScoresComplete([{ name: "Written", fullMarks: 100, obtained: 75 }]), "Complete Grade Ledger marks should be accepted.");
must(!ledgerScoresComplete([{ name: "Written", fullMarks: 100, obtained: null }]), "Blank Grade Ledger marks must remain pending, not zero.");
must(!ledgerScoresComplete([{ name: "Written", fullMarks: 100, obtained: 101 }]), "Out-of-range Grade Ledger marks must be rejected.");
must(!ledgerScoresComplete([]), "Empty Grade Ledger assessment records must remain pending.");

must(html.includes('collection(db,"certificates")') && rules.includes("match /certificates/{certificateId}") && rules.includes("allow create: if isAdmin()"), "Admin-only certificate persistence rules are missing.");
must(backupCollections.includes("certificates") && restoreCollections.includes("certificates"), "Certificate records must be included in Backup and Restore.");
must(rules.includes("function studentBelongsToClass") && rules.includes("studentBelongsToClass(request.resource.data.studentId"), "Marks rules must validate that a student belongs to the assigned class.");
must(rules.includes("function validMarkShape(data)") && rules.includes("data.scores.size() <= 12"), "Marks writes must validate the record schema and cap assessment components.");
must(rules.includes("function markExamMatches(data)") && rules.includes("get(examPath).data.className == data.className"), "Marks writes must match an existing exam in the same class.");
must(rules.includes("request.resource.data.createdBy == request.auth.uid") && rules.includes("request.resource.data.updatedBy == request.auth.uid"), "Teacher marks writes must identify the authenticated creator/updater.");
must(rules.includes("request.resource.data.createdAt == request.time") && rules.includes("request.resource.data.updatedAt == request.time"), "Teacher marks writes must use server timestamps.");
must(rules.includes("function validDailyAttendance(data)") && rules.includes("data.students.size() <= 200"), "Daily attendance writes must validate the record schema and roster size.");
must(rules.includes("data.presentCount + data.absentCount + data.leaveCount == data.totalStudents"), "Daily attendance counts must reconcile with the roster.");
must(rules.includes("request.resource.data.createdBy == resource.data.createdBy") && rules.includes("request.resource.data.date == resource.data.date"), "Daily attendance updates must preserve original creator and date.");

must(html.includes("subjectAssignmentSectionKeys") && rules.includes("subjectAssignmentSectionKeys"), "Subject teacher section assignments must be stored and enforced.");

must(rules.includes("data.attendanceType == 'daily'") && rules.includes("function validDailyAttendance(data)"), "Teacher attendance writes must be limited to validated daily attendance.");
must(rules.includes("match /audit_logs/{documentId}") && rules.includes("allow create: if hasActiveRole()"), "Only active school users may create audit logs.");
must(rules.includes("request.resource.data.actorUid == request.auth.uid") && rules.includes("request.resource.data.createdAt == request.time"), "Audit log actor and server timestamp must be verified.");
must(rules.includes("request.resource.data.detail.size() <= 240") && rules.includes("request.resource.data.actorName.size() <= 100"), "Audit log text fields must have strict size limits.");
must(rules.includes("allow update, delete: if false;"), "Audit logs must remain append-only.");
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


const reportStart = html.indexOf("function reportMarkSummary(record){");
const reportEnd = html.indexOf("\nfunction buildReport(){", reportStart);
must(reportStart >= 0 && reportEnd > reportStart, "Marks report completeness helper is missing.");
const reportHelperSource = html.slice(reportStart, reportEnd);
const reportHelper = new Function("ledgerScoresComplete", reportHelperSource + "; return reportMarkSummary;")(
  scores => Array.isArray(scores) && scores.length > 0 && scores.every(v => v && v.obtained !== null && v.obtained !== undefined && v.obtained !== "" && Number.isFinite(Number(v.obtained)) && Number.isFinite(Number(v.fullMarks)) && Number(v.fullMarks) >= 0 && Number(v.obtained) >= 0 && Number(v.obtained) <= Number(v.fullMarks))
);
const completeReport = reportHelper({ scores: [{ obtained: 8, fullMarks: 10 }, { obtained: 15, fullMarks: 20 }] });
must(completeReport[0] === 23 && completeReport[1] === 30 && completeReport[2] === "76.67%", "Marks report must calculate complete component totals.");
const incompleteReport = reportHelper({ scores: [{ obtained: 8, fullMarks: 10 }, { obtained: null, fullMarks: 20 }], totalObtained: 8, totalFullMarks: 30 });
must(incompleteReport[0] === "अपूर्ण" && incompleteReport[1] === "—", "Marks report must not treat missing components as zero.");
const legacyReport = reportHelper({ totalObtained: 18, totalFullMarks: 20 });
must(legacyReport[0] === 18 && legacyReport[1] === 20, "Legacy aggregate marks records must remain readable.");


const staffIdStart = html.indexOf("function nextStaffId(role, records)");
const staffIdClose = html.indexOf("\n}\n", staffIdStart);
const staffIdEnd = staffIdClose < 0 ? -1 : staffIdClose + 2;
must(staffIdStart >= 0 && staffIdEnd > staffIdStart, "Automatic staff ID generator is missing.");
const nextStaffId = new Function(html.slice(staffIdStart, staffIdEnd) + "; return nextStaffId;")();
const staffRoleStart = html.indexOf("function staffRoleFromLevel(levelCategory)");
const staffRoleEnd = html.indexOf("\\nfunction nextStaffId", staffRoleStart);
must(staffRoleStart >= 0 && staffRoleEnd > staffRoleStart, "Teacher/staff role classifier is missing.");
const staffRoleFromLevel = new Function(html.slice(staffRoleStart, staffRoleEnd) + "; return staffRoleFromLevel;")();
must(staffRoleFromLevel("मा.वि./तृतीय") === "शिक्षक", "Secondary teacher level must receive a teacher ID.");
must(staffRoleFromLevel("नि.मा.वि.") === "शिक्षक", "Lower-secondary teacher level must receive a teacher ID.");
must(staffRoleFromLevel("प्रा.वि./तृतीय") === "शिक्षक", "Primary teacher level must receive a teacher ID.");
must(staffRoleFromLevel("प्रधानाध्यापक") === "शिक्षक", "Headmaster must receive a teacher ID.");
must(staffRoleFromLevel("कार्यालय सहयोगी") === "कर्मचारी", "Non-teaching staff must receive a staff ID.");
must(nextStaffId("शिक्षक", []) === "TCH-0001", "New teacher ID must start at TCH-0001.");
must(nextStaffId("कर्मचारी", []) === "STF-0001", "New staff ID must start at STF-0001.");
must(nextStaffId("शिक्षक", [{ staffId: "TCH-0001" }, { staffId: "TCH-0008" }, { staffId: "STF-0009" }]) === "TCH-0009", "Teacher ID must increment from the highest existing teacher ID only.");
must(nextStaffId("कर्मचारी", [{ staffId: "STF-0002" }, { staffId: "STF-0010" }, { staffId: "TCH-0015" }]) === "STF-0011", "Staff ID must increment from the highest existing staff ID only.");

console.log("V44 requirement regression checks passed.");
