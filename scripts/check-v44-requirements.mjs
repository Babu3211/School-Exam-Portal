import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const html = await readFile("index.html", "utf8");
const rules = await readFile("firestore.rules", "utf8");
const manifest = await readFile("manifest.webmanifest", "utf8");
const serviceWorker = await readFile("sw.js", "utf8");
const workflow = await readFile(".github/workflows/v44-quality-check.yml", "utf8");

const must = (condition, message) => assert.ok(condition, message);
const requiredCollections = [
  "students", "staff", "classes", "subjects", "exams", "marks",
  "attendance", "mark_settings", "certificates", "user_roles", "public_result_exams",
  "public_results", "public_result_lookup", "audit_logs"
];

const codeStart = html.indexOf("function studentCodeLetters");
const codeEnd = html.indexOf("\nfunction generateUniqueStudentCode", codeStart);
must(codeStart >= 0 && codeEnd > codeStart, "Student Result Code generator is missing.");
const codeHelpers = new Function(html.slice(codeStart, codeEnd) + "; return { studentCodeBase };")();
must(codeHelpers.studentCodeBase("Babukrishna Khanal", "8") === "BABKHA-8", "Student Result Code must follow BABKHA-8 format.");
must(html.includes('placeholder="जस्तै: BABKHA-8"'), "Online result example must display BABKHA-8.");
must(!html.includes("SHYBAS-6"), "Old SHYBAS-6 example must not remain in the interface.");
must(html.includes("MAIN MENU") && !html.includes("MAIN MENU / मुख्य मेनु"), "Dashboard main menu must be English-only.");
must(html.includes("<summary><span class=\"ico\">🎓</span>Student Management</summary>") && html.includes("<button data-page=\"students\">Student Records</button>"), "Dashboard sidebar submenu must be English-only.");
must(html.includes("Student registration, search and record management / विद्यार्थी दर्ता"), "Student page topic must be bilingual.");
must(/\.login-card\{[^}]*max-width:410px[^}]*\}/.test(html), "V43-style baseline login card styling is missing.");
must(html.includes('id="toggleLoginPassword"'), "Password show/hide control is missing.");
must(!html.includes('data-login-role=') && !html.includes('login-role-select'), "Login page must use one Login button without separate Admin/Teacher role buttons.");
must(html.indexOf('id="loginSchoolNameEn"') < html.indexOf('id="loginSchoolNameNe"') && html.includes('id="loginSchoolAddress"'), "Login page must show English school name first, Nepali name below, and school address.");
must(html.includes('धुनिवेशी–५, कुमाईखोला, धादिङ, नेपाल'), "Login page must provide the school's Nepali address fallback.");
must(html.includes('if(credential.user.uid===ADMIN_UID){currentUserRole={roles:["admin"],active:true};}else{const roleSnap=await getDoc(doc(db,"user_roles",credential.user.uid));'), "Login must automatically identify Admin by UID and validate teacher roles without a role selector.");
must(!html.includes("selectedLoginRole"), "Login authentication must not depend on a manually selected role.");

must(html.includes("sendPasswordResetEmail(auth,email)"), "Free Firebase email password reset is missing.");
must(!/signInWithPhoneNumber|PhoneAuthProvider|RecaptchaVerifier|phoneAuthProvider/i.test(html), "SMS OTP must remain disabled for the Firebase Spark Free Plan.");

must(html.includes('if(page==="dashboard")return true;'), "Active non-admin users must be allowed to view the dashboard.");
must(html.includes('if(page==="marks")return roleHas("subject_teacher")'), "Marks Entry must be limited to users with an active Subject Teacher assignment.");
must(html.includes('if(page==="attendance")return roleHas("class_teacher")'), "Attendance must be limited to users with an active Class Teacher assignment.");
must(html.includes("return false;\n}\nfunction applyRoleNavigation()"), "Unassigned non-admin pages must remain blocked.");
must(html.includes("Quick actions and sidebar links are both filtered by rolePageAllowed"), "Quick actions must follow the same role permissions as sidebar navigation.");
must(html.includes('id="studentAddNewBtn"') && html.includes('id="studentFormPanel" hidden'), "Student Management must provide an Add New Student button and initially collapsed form.");
must(html.includes('id="staffAddNewBtn"') && html.includes('id="staffFormPanel" hidden'), "Teachers & Staff must provide an Add New Staff button and initially collapsed form.");
must(html.includes('id="setMapLatitude"') && html.includes('id="setMapLongitude"'), "School Settings must capture both map coordinates.");
must(html.includes('id="dashboardSchoolMap"') && html.includes("openstreetmap.org/export/embed.html"), "Dashboard must show the saved school location on a map without a paid map API.");
must(html.includes("hasLat!==hasLon") && html.includes("data.mapLatitude < -90") && html.includes("data.mapLongitude > 180"), "School map coordinates must be validated as a complete latitude/longitude pair.");
must(/if\s*\(\s*target\.closest\("#studentAddNewBtn"\)\)/.test(html) && /if\s*\(\s*target\.closest\("#staffAddNewBtn"\)\)/.test(html), "Add New buttons must reveal their respective data-entry forms.");

must(html.includes("map(normalizeRoleKey);if(!allowed.includes(\"class_teacher\")"), "Login must normalize and validate active task roles.");
const roleStart = html.indexOf("function rolePageAllowed(page){");
const roleEnd = html.indexOf("\nfunction applyRoleNavigation()", roleStart);
must(roleStart >= 0 && roleEnd > roleStart, "Role permission helper is missing.");
function roleMatrix(role, admin = false) {
  const hasRole = key => admin || !!role?.active && (role.roles || []).map(v => String(v).toLowerCase().replace(/[ -]+/g, "_")).includes(key);
  const classNames = () => [...(role?.classTeacherClassNames || []), ...(role?.classTeacherClasses || []).map(x => x.className)].filter(Boolean);
  return new Function("isAdmin", "currentUserRole", "roleHas", "classTeacherNames",
    html.slice(roleStart, roleEnd) + "; return rolePageAllowed;"
  )(() => admin, role, hasRole, classNames);
}
const viewerPermissions = roleMatrix({ active: true, roles: ["viewer"] });
must(viewerPermissions("dashboard") && !viewerPermissions("marks") && !viewerPermissions("attendance") && !viewerPermissions("students"), "Viewer role must see Dashboard only.");
const subjectPermissions = roleMatrix({ active: true, roles: ["subject_teacher"], subjectAssignments: [{ className: "9", subject: "Mathematics" }] });
must(subjectPermissions("dashboard") && subjectPermissions("marks") && !subjectPermissions("attendance") && !subjectPermissions("students"), "Subject Teacher must see Dashboard and Marks only.");
const classPermissions = roleMatrix({ active: true, roles: ["class_teacher"], classTeacherClassNames: ["9"] });
must(classPermissions("dashboard") && classPermissions("attendance") && !classPermissions("marks") && !classPermissions("students"), "Class Teacher must see Dashboard and Attendance only.");
const combinedPermissions = roleMatrix({ active: true, roles: ["class_teacher", "subject_teacher"], classTeacherClasses: [{ className: "9" }], subjectAssignmentKeys: ["9::Mathematics"] });
must(combinedPermissions("marks") && combinedPermissions("attendance"), "Combined teacher roles must expose both assigned task modules.");
const inactivePermissions = roleMatrix({ active: false, roles: ["class_teacher"], classTeacherClassNames: ["9"] });
must(!inactivePermissions("dashboard") && !inactivePermissions("attendance"), "Inactive users must not access Dashboard or task modules.");
const adminPermissions = roleMatrix(null, true);
must(["dashboard", "students", "marks", "attendance", "settings"].every(adminPermissions), "Admin must retain access to all modules.");

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
must(rules.includes("match /school_public_branding/{documentId}") && rules.includes("allow get: if documentId == 'main';") && rules.includes("allow create, update, delete: if isAdmin() && documentId == 'main';"), "Login branding must be public-read for the single main document and Admin-write only.");
must(html.includes("void loadPublicSchoolBranding();") && html.includes("doc(db,\"school_public_branding\",\"main\")"), "Login must load public school branding before authentication.");
must(html.includes("currentSchoolSettings.logoDataUrl||currentSchoolSettings.logoUrl"), "Login must display the logo saved in School Settings.");
must(html.includes("login-welcome h3{margin:0 0 4px;color:#1769d2"), "Login welcome must be blue.");
must(html.includes("login-user-types") && html.includes("<span>Admin</span><span>Teacher</span><span>Other</span>"), "Login must show Admin / Teacher / Other under academic year.");
must(html.includes("Academic Year</span><strong id=\"loginAcademicYear\">2083</strong>") && html.includes(".login-year{flex-direction:row") && html.includes(".login-year strong:before{content:\"–\""), "Academic year must display compactly as Academic Year – 2083.");
must(html.includes("#loginSchoolNameEn{font-size:clamp(22px,5vw,26px)!important") && html.includes(".login-school-ne{font-size:clamp(20px,4.5vw,24px)!important"), "Login school names must be larger.");
must(html.includes(".login-user-types{gap:10px") && html.includes("font-size:12px;font-weight:600"), "Login account types must use refined readable typography.");

must(rules.includes("match /public_result_exams/{examId}") && rules.includes("allow get, list: if true;") && rules.includes("allow create, update, delete: if isAdmin();"), "Public exam index must expose read-only publication metadata.");
must(rules.includes("match /public_result_lookup/{lookupId}") && rules.includes("allow get: if true;") && rules.includes("allow list: if isAdmin();"), "Public result lookup must allow exact PIN-hash reads but block public listing.");
must(rules.includes("match /public_results/{resultId}") && rules.includes("allow get: if true;") && rules.includes("allow list: if isAdmin();"), "Public result documents must allow exact reads but block public listing.");
must(rules.includes("match /online_result_rate_limits/{documentId}") && rules.includes("allow read, write: if false;"), "Rate-limit collection must remain inaccessible to client apps.");

must(html.includes('id="certificateForm"') && html.includes("async function loadCertificatesPage()"), "Firebase certificate issue workflow is missing.");
must(html.includes("function printIssuedCertificate(id)") && html.includes("window.print()"), "Printable A4 certificate workflow is missing.");
must(html.includes('id="loadResultsBtn"') && html.includes('id="resultsTablePanel"') && html.includes('id="gradeSheetView"'), "Result Management must keep Results, Tabulation Sheet and Grade Sheet together.");
must(html.includes('id="printTabulationBtn"') && html.includes('id="printGradeSheetBtn"') && html.includes("function printTabulationSheet()") && html.includes("function showGradeSheet(studentId)"), "Tabulation and Grade Sheet print/view actions are missing.");
must(html.includes('id="numberLedgerTab"') && html.includes('id="gradeLedgerTab"') && html.includes("function renderMarksLedgerPage()"), "Number Ledger and Grade Ledger views are missing.");
must(html.includes("padding:4px 0 0;min-height:112px;color:#d92d46") && !html.includes("padding:4px 0 0 112px;min-height:112px;color:#d92d46"), "Grade Sheet school heading must be centered independently of the left-positioned logo.");
must(html.includes("header{position:relative;text-align:center;min-height:112px;color:#d92d46}") && !html.includes("padding-left:112px"), "Printed Grade Ledger school heading must remain centered with the logo positioned separately.");
must(html.includes("const resultSubjectSource=hasClassSubjectRegistry?activeClassSubjects:recordedSubjects;"), "Grade Sheet must use active class subjects and only use legacy marks as fallback when no class subject registry exists.");

must(html.includes("const scoresComplete=achievement?count!==null") && html.includes("const valid=!!rec&&scoresComplete"), "Grade Ledger must not convert incomplete assessment components into zero marks.");
must(html.includes("const cl=document.getElementById('ledgerViewClass')?.value||document.getElementById('entryClass')?.value;"), "Grade Ledger assessment settings must follow the selected Ledger class first.");
must(html.includes("subjects.reduce((a,sub,i)=>a+spans[i],achievement?4:2)"), "Learning-achievement Grade Ledger empty-state colspan must match its four identity columns.");
must(html.split("currentSchoolSettings.schoolNameEnglish||currentSchoolSettings.schoolName").length-1>=2, "Printed Grade Sheets must use the saved school name from School Settings.");
must(html.includes("currentSchoolSettings.municipality") && html.includes("currentSchoolSettings.address"), "Printed Grade Sheets and Grade Ledger must use the saved school address.");
must(html.includes("function schoolPrintName()") && html.includes("function schoolPrintAddress()"), "All result print layouts must share School Settings name and address helpers.");
must(html.includes("background-image:${schoolWatermarkBackground()}") && html.includes("IEMIS: ${esc(currentSchoolSettings.iemisCode||'—')}"), "Printed Marks Ledger and Grade Ledger must use School Settings watermark and IEMIS code.");
must((html.match(/data-watermark="\\$\\{resultEsc\\(schoolPrintName\\(\\)\\)\\}"/g)||[]).length===2, "Both primary and secondary Grade Sheets must use the School Settings watermark.");
must((html.match(/OF \\$\\{resultEsc\\(schoolPrintName\\(\\)\\.toUpperCase\\(\\)\\)\\}/g)||[]).length===2, "Both Grade Sheet formats must use the saved school name and address instead of hardcoded school details.");
must(html.includes("const iemis=student.iemisCode||currentSchoolSettings.iemisCode||'—';"), "Grade Sheet must use the IEMIS code saved in School Settings when student IEMIS is blank.");
must(html.includes("applyRoleNavigation();await loadSchoolSettings();"), "School Settings must finish loading before ledger and result pages are initialized.");

// Active class-subject registry is authoritative; retired subjects must not reappear from old settings/marks.
const subjectStart = html.indexOf("function classSubjectNames(classNo,group){");
const subjectEnd = html.indexOf("\nfunction activeSubjectsForClass", subjectStart);
must(subjectStart >= 0 && subjectEnd > subjectStart, "Class subject registry helper is missing.");
const subjectHelperSource = html.slice(subjectStart, subjectEnd);
const subjectHelper = new Function("cachedClasses", "markSettingsCache", "marksSettings", "classNoFromName", "canonicalSubjectKey", subjectHelperSource + "; return classSubjectNames;");
const canonicalForTest = value => String(value ?? "").trim().toLowerCase().replace(/\\s+/g, " ");
const currentSubjects = subjectHelper(
  [{ className: "9", subject: "Compulsory English", active: true }, { className: "9", subject: "Optional I: Computer", active: false }],
  [{ classGroup: "9-10", className: "9", subject: "Optional I: Computer" }, { classGroup: "9-10", className: "9", subject: "Optional II: Economics" }],
  [],
  value => String(value),
  canonicalForTest
)("9", "9-10");
must(currentSubjects.length === 1 && currentSubjects[0] === "Compulsory English", "Inactive class subjects must not be restored by assessment settings.");
const legacySubjects = subjectHelper([], [{ classGroup: "9-10", className: "9", subject: "Legacy Optional I" }], [], value => String(value), canonicalForTest)("9", "9-10");
must(legacySubjects.includes("Legacy Optional I"), "Legacy classes without a subject registry must retain assessment-setting fallback.");

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

must(rules.includes("function isAssignedStudentClass(className)") && rules.includes("allow get, list: if hasActiveRole() && isAssignedStudentClass"), "Student and exam reads must be limited to assigned classes.");
must(rules.includes("allow get, list: if isAdmin();") && rules.includes("match /staff/{documentId}"), "Staff personal records must be Admin-only.");
must(rules.includes("allow get, list: if hasActiveRole() && isAssignedSubjectPair(resource.data.className, resource.data.subject);"), "Marks reads must be limited to assigned subject/class/section.");
must(rules.includes("allow get, list: if hasActiveRole() && isAssignedClassTeacher(resource.data.className);"), "Attendance reads must be limited to assigned classes.");
must(html.includes("where(\"class\",\"==\",cl)") && html.includes("where(\"className\",\"==\",x.className)") && html.includes("where(\"subject\",\"==\",x.subject)"), "Teacher dashboard must query only assigned classes and subjects.");

must(html.includes("subjectAssignmentSectionKeys") && rules.includes("subjectAssignmentSectionKeys"), "Subject teacher section assignments must be stored and enforced.");

must(rules.includes("data.attendanceType == 'daily'") && rules.includes("function validDailyAttendance(data)"), "Teacher attendance writes must be limited to validated daily attendance.");
must(rules.includes("match /audit_logs/{documentId}") && rules.includes("allow create: if hasActiveRole()"), "Only active school users may create audit logs.");
must(rules.includes("request.resource.data.actorUid == request.auth.uid") && rules.includes("request.resource.data.createdAt == request.time"), "Audit log actor and server timestamp must be verified.");
must(rules.includes("request.resource.data.detail.size() <= 240") && rules.includes("request.resource.data.actorName.size() <= 100"), "Audit log text fields must have strict size limits.");
must(rules.includes("allow update, delete: if false;"), "Audit logs must remain append-only.");
must(manifest.includes("V44"), "PWA manifest must identify V44.");
must(serviceWorker.includes("smss-pwa-v44-school-exam-portal"), "Service worker cache must identify V44.");
must(workflow.includes("deploy-live:") && workflow.includes("needs: quality-and-rules"), "Live deployment must depend on successful V44 quality and Firestore Rules tests.");
must(workflow.includes("github.event_name == 'push'") && workflow.includes("ENABLE_FIREBASE_HOSTING_DEPLOY == 'true'"), "Automatic live deployment must be push-only and explicitly enabled.");


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
const staffRoleEnd = html.indexOf("\nfunction nextStaffId", staffRoleStart);
must(staffRoleStart >= 0 && staffRoleEnd > staffRoleStart, "Teacher/staff role classifier is missing.");
const staffRoleFromLevel = new Function(html.slice(staffRoleStart, staffRoleEnd) + "; return staffRoleFromLevel;")();
must(staffRoleFromLevel("मा.वि./तृतीय") === "शिक्षक", "Secondary teacher level must receive a teacher ID.");
must(staffRoleFromLevel("नि.मा.वि.") === "शिक्षक", "Lower-secondary teacher level must receive a teacher ID.");
must(staffRoleFromLevel("प्रा.वि./तृतीय") === "शिक्षक", "Primary teacher level must receive a teacher ID.");
must(staffRoleFromLevel("प्रधानाध्यापक") === "शिक्षक", "Headmaster must receive a teacher ID.");
must(staffRoleFromLevel("कार्यालय सहयोगी") === "कर्मचारी", "Non-teaching staff must receive a staff ID.");
must(staffRoleFromLevel("बालविकास स.का.") === "कर्मचारी", "Early childhood support staff must receive a staff ID.");
must(staffRoleFromLevel("बालविकास शिक्षक") === "शिक्षक", "Explicit early childhood teachers must receive a teacher ID.");
must(nextStaffId("शिक्षक", []) === "TCH-0001", "New teacher ID must start at TCH-0001.");
must(nextStaffId("कर्मचारी", []) === "STF-0001", "New staff ID must start at STF-0001.");
must(nextStaffId("शिक्षक", [{ staffId: "TCH-0001" }, { staffId: "TCH-0008" }, { staffId: "STF-0009" }]) === "TCH-0009", "Teacher ID must increment from the highest existing teacher ID only.");
must(nextStaffId("कर्मचारी", [{ staffId: "STF-0002" }, { staffId: "STF-0010" }, { staffId: "TCH-0015" }]) === "STF-0011", "Staff ID must increment from the highest existing staff ID only.");

console.log("V44 requirement regression checks passed.");
