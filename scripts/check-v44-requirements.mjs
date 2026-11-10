import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const html = await readFile("index.html", "utf8");
const rules = await readFile("firestore.rules", "utf8");
const manifest = await readFile("manifest.webmanifest", "utf8");
const serviceWorker = await readFile("sw.js", "utf8");
const workflow = await readFile(".github/workflows/v44-quality-check.yml", "utf8");

const must = (condition, message) => assert.ok(condition, message);

must(html.includes("function editSubjectCatalog(id)") && html.includes("function archiveSubjectCatalog(id)") && html.includes("function restoreSubjectCatalog(id)"), "Subject Bank must support edit, safe archive and restore.");
must(html.includes('data-subject-edit=') && html.includes('data-subject-archive=') && html.includes('data-subject-restore='), "Subject Bank must show edit, archive and restore actions.");
must(html.includes('updateDoc(doc(db,"subjects",id),{active:false,archivedAt:serverTimestamp()') && html.includes('updateDoc(doc(db,"subjects",id),{active:true,restoredAt:serverTimestamp()'), "Subject removal must be reversible soft-archive, not permanent deletion.");
must(html.includes('updateDoc(doc(db,"subjects",editId),{name,code,updatedAt:serverTimestamp()') && html.includes('await writeAuditLog("subjects","update",editId,name)'), "Subject Bank edits must update Firebase and write an audit log.");
must(html.includes('id="subjectCatalogCancel"') && html.includes('पुराना Marks तथा कक्षागत अभिलेख मेटिँदैनन्'), "Subject Bank editing must explain historical-data preservation and allow cancellation.");
must(html.includes("function normalizeSaveButtons") && html.includes("button.textContent='Save'") && html.includes("button.dataset.smssSaveAction='1'"), "Save/Submit actions must display only the Save label.");
must(html.includes("if(label!=='Save')button.textContent='Save'"), "Save buttons must be normalized to the plain Save label without observer loops.");
must(html.includes("const saveConfirmMessage=") && html.includes("window.confirm(saveConfirmMessage)") && html.includes("event.preventDefault();event.stopImmediatePropagation();"), "Save actions must require confirmation and stop when the user cancels.");
must(html.includes("saveLabelObserver.observe(document.body") && html.includes("normalizeSaveButtons(record.target)"), "Dynamically rendered Save buttons must also be normalized.");
must(!html.includes("यो सुविधा Demo मात्र") && !html.includes("यो Module हाल Demo अवस्थामा छ") && !html.includes("Cloud data connection in progress") && !html.includes("V44 Development"), "The live application must not display obsolete demo or development notices.");
must(!html.includes("form.demo") && !html.includes("data-action]"), "The application must not route unsupported actions to a demo-only alert.");
must(["students","classes","exams","question-papers","marks","assessment-settings","marks-ledger","results","attendance","certificates","reports","users","backup","settings"].every(page=>html.includes(`data-page="${page}"`)), "Primary navigation must include all required management sections.");
must(html.includes("if(label!=='Save')button.textContent='Save'"), "Save label observer must avoid repeated DOM mutations.");
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
must(html.includes("Student Record</summary>") && html.includes("<button data-page=\"students\">Student Information</button>") && !html.includes("Student Management / विद्यार्थी व्यवस्थापन") && !html.includes("Student Records / विद्यार्थी अभिलेख"), "Dashboard sidebar menu and submenu must be English-only.");
must(html.includes("Student registration, search and record management / विद्यार्थी दर्ता"), "Student page topic must be bilingual.");
must(/\.login-card\{[^}]*max-width:410px[^}]*\}/.test(html), "V43-style baseline login card styling is missing.");
must(html.includes('id="toggleLoginPassword"'), "Password show/hide control is missing.");
must(!html.includes('data-login-role=') && !html.includes('login-role-select'), "Login page must use one Login button without separate Admin/Teacher role buttons.");
must(html.includes('id="loginSchoolName" class="login-school-en"') && html.includes('id="loginSchoolAddress" class="login-school-address"') && html.includes('loginName.textContent=name') && html.includes('loginAddress.textContent=address'), "Login page must preserve the current V44 school identity and dynamic address.");
must(html.includes('id="loginSchoolNameNe"') && html.includes('id="loginSchoolAddressNe"') && html.includes('id="setSchoolNameNe"') && html.includes('id="setAddressNe"'), "Nepali school name and address must be editable and visible on login.");
must(html.includes('schoolNameNe:data.schoolNameNe') && html.includes('addressNe:data.addressNe') && html.includes('loginNameNe.textContent=') && html.includes('loginAddressNe.textContent='), "Bilingual school identity must persist to public branding and render on login.");
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
must(html.includes(".login-brand h2,#loginSchoolName{font-size:clamp(22px,5vw,26px)!important") && html.includes(".login-school-ne{font-size:clamp(20px,4.5vw,24px)!important"), "Login school names must be larger.");
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
must(html.includes("background-image:${iemisFormat?'none':schoolWatermarkBackground()}") && html.includes("IEMIS: ${esc(currentSchoolSettings.iemisCode||'—')}"), "Printed Marks Ledger and Grade Ledger must use School Settings watermark and IEMIS code.");
must(html.split('data-watermark="${resultEsc(schoolPrintName())}"').length-1===2, "Both primary and secondary Grade Sheets must use the School Settings watermark.");
must(html.split('OF ${resultEsc(schoolPrintName().toUpperCase())}').length-1===2, "Both Grade Sheet formats must use the saved school name and address instead of hardcoded school details.");
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
must(rules.includes("function validMarkShape(data)") && rules.includes("data.scores.size() <= 6"), "Marks writes must validate the record schema and cap assessment components.");
must(html.includes("components.length>6") && html.includes("अधिकतम ६ वटा मूल्याङ्कन भाग"), "Assessment Settings must prevent creating marks records that exceed the Firestore component limit.");
must(rules.includes("function markExamMatches(data)") && rules.includes("get(examPath).data.className == data.className"), "Marks writes must match an existing exam in the same class.");
must(rules.includes("request.resource.data.createdBy == request.auth.uid") && rules.includes("request.resource.data.updatedBy == request.auth.uid"), "Teacher marks writes must identify the authenticated creator/updater.");
must(rules.includes("request.resource.data.createdAt == request.time") && rules.includes("request.resource.data.updatedAt == request.time"), "Teacher marks writes must use server timestamps.");
must(rules.includes("function validDailyAttendance(data)") && rules.includes("data.students.size() <= 200"), "Daily attendance writes must validate the record schema and roster size.");
must(rules.includes("data.presentCount + data.absentCount + data.leaveCount == data.totalStudents"), "Daily attendance counts must reconcile with the roster.");
must(rules.includes("request.resource.data.createdBy == resource.data.createdBy") && rules.includes("request.resource.data.date == resource.data.date"), "Daily attendance updates must preserve original creator and date.");

must(rules.includes("function isAssignedStudentClass(className)") && rules.includes("allow get, list: if hasActiveRole() && isAssignedStudentClass"), "Student and exam reads must be limited to assigned classes.");
must(rules.includes("allow get, list: if isAdmin();") && rules.includes("match /staff/{documentId}"), "Staff personal records must be Admin-only.");
must(rules.includes("allow list: if isAssignedSubject(resource.data.className, resource.data.subject, resource.data.section);") && rules.includes("allow get: if resource == null ? hasRole('subject_teacher') :") && rules.includes("return isAdmin() || (signedIn() && teacherSubjectAccess(className, subjectName, sectionName));") && rules.includes("return role.get('active', false) == true && roles is list"), "Marks reads must be limited to assigned subject/class/section.");
must(rules.includes("allow get, list: if hasActiveRole() && isAssignedClassTeacher(resource.data.className);"), "Attendance reads must be limited to assigned classes.");
must(html.includes("where(\"class\",\"==\",cl)") && html.includes("where(\"className\",\"==\",x.className)") && html.includes("where(\"subject\",\"==\",x.subject)") && html.includes("where(\"section\",\"==\",String(x.section).trim())"), "Teacher dashboard and Marks Entry must query assigned classes, subjects and sections.");

must(html.includes("subjectAssignmentSectionKeys") && rules.includes("subjectAssignmentSectionKeys"), "Subject teacher section assignments must be stored and enforced.");

must(rules.includes("data.attendanceType == 'daily'") && rules.includes("function validDailyAttendance(data)"), "Teacher attendance writes must be limited to validated daily attendance.");
must(rules.includes("match /audit_logs/{documentId}") && rules.includes("allow create: if hasActiveRole()"), "Only active school users may create audit logs.");
must(rules.includes("request.resource.data.actorUid == request.auth.uid") && rules.includes("request.resource.data.createdAt == request.time"), "Audit log actor and server timestamp must be verified.");
must(rules.includes("request.resource.data.detail.size() <= 240") && rules.includes("request.resource.data.actorName.size() <= 100"), "Audit log text fields must have strict size limits.");
must(rules.includes("allow update, delete: if false;"), "Audit logs must remain append-only.");
must(manifest.includes('"name": "SMSS Exam Portal"') && manifest.includes('"display": "standalone"'), "PWA manifest must preserve the V44 installable app identity.");
must(/smss-pwa-v(?:44|45|46|47|48|49|50|51)/.test(serviceWorker) && serviceWorker.includes("./cdc-question-paper.js"), "Service worker must preserve PWA caching and include the new V45 module.");
must(workflow.includes("deploy-live:") && workflow.includes("needs: quality-and-rules"), "Live deployment must depend on successful V44 quality and Firestore Rules tests.");
must(workflow.includes("Deploy tested Firestore Security Rules") && workflow.includes("firebase-tools@14 deploy --only firestore:rules"), "Production deployment must apply the tested Firestore Security Rules before Hosting.");
must(workflow.includes("github.event_name == 'push'") && workflow.includes("github.ref == 'refs/heads/main'") && workflow.includes("github.event.head_commit.message == 'release: deploy approved V45 to production [deploy-v45-live]'"), "Automatic live deployment must be push-only, main-only and gated by the explicit approved V45 release commit.");


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

const ledgerComponentStart = html.indexOf("function ledgerComponentsForSubject(");
const ledgerComponentEnd = html.indexOf("\nasync function ensureExcelJS", ledgerComponentStart);
must(ledgerComponentStart >= 0 && ledgerComponentEnd > ledgerComponentStart, "Term-aware Ledger component helper is missing.");
const ledgerComponentFactory = new Function(
  "ledgerSubjectSetting", "defaultMarkParts", "isComputerSubject", "smssExamTermKey",
  html.slice(ledgerComponentStart, ledgerComponentEnd) + "; return ledgerComponentsForSubject;"
);
const ledgerComponents = ledgerComponentFactory(
  () => ({ components: [{ name: "IN", fullMarks: 25 }, { name: "TH (Theory)", fullMarks: 75 }] }),
  () => [],
  () => false,
  exam => exam.termKey
);
const firstTermLedger = ledgerComponents("9-10", "अनिवार्य नेपाली", "9", { termKey: "first" });
const annualLedger = ledgerComponents("9-10", "अनिवार्य नेपाली", "9", { termKey: "annual" });
must(firstTermLedger.length === 1 && firstTermLedger[0].name === "IN", "Non-annual Marks Ledger must not show the annual Theory column.");
must(annualLedger.some(component => component.name === "TH (Theory)" && component.fullMarks === 75), "Annual Grade/Marks Ledger must include the configured Theory component.");
must(html.includes("const expectedFullMarks=components.reduce((sum,component)=>sum+Number(component.fullMarks||0),0);"), "Marks Ledger Excel import must validate against term-specific Full Marks, not always 100.");



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


const optionalSlotStart = html.indexOf("function optionalSlotForSubject(subject)");
const optionalSlotEnd = html.indexOf("\nfunction studentOptionalSubject", optionalSlotStart);
must(optionalSlotStart >= 0 && optionalSlotEnd > optionalSlotStart, "Optional I/II subject-slot resolver is missing.");
const optionalHelpers = new Function("activeSubjectsForClass", "classNoFromName", "canonicalSubjectKey", html.slice(optionalSlotStart, optionalSlotEnd) + "; return { optionalSlotForSubject, optionalSubjectsForClass };")(
  (classNo) => classNo === "9" || classNo === "10" ? ["ऐच्छिक प्रथम: वातावरण विज्ञान", "ऐच्छिक प्रथम: अतिरिक्त गणित", "ऐच्छिक द्वितीय: कम्प्युटर विज्ञान"] : [],
  value => String(value).match(/[0-9]+/)?.[0] || "",
  value => String(value || "").trim().toLowerCase()
);
must(optionalHelpers.optionalSlotForSubject("ऐच्छिक प्रथम: वातावरण विज्ञान") === "optionalSubject1", "Nepali Optional I subject labels must resolve to Optional I.");
must(optionalHelpers.optionalSlotForSubject("ऐच्छिक द्वितीय: कम्प्युटर विज्ञान") === "optionalSubject2", "Nepali Optional II subject labels must resolve to Optional II.");
must(optionalHelpers.optionalSlotForSubject("अनिवार्य नेपाली") === "", "Compulsory subjects must not be treated as optional.");
must(optionalHelpers.optionalSubjectsForClass("9", "optionalSubject1").length === 2, "Class 9 Optional I selector must list the configured optional I subjects.");
must(optionalHelpers.optionalSubjectsForClass("8", "optionalSubject1").length === 0, "Optional subject selectors must remain hidden outside Classes 9–10.");
must(html.includes('id="studentOptional1"') && html.includes('id="studentOptional2"'), "Student profile must provide separate Optional I and Optional II selectors.");
must(html.includes("if(e.target.id==='studentClass')renderStudentOptionalSubjects(e.target.value,false)"), "Changing a student's class must refresh and clear the optional-subject choices.");
must(html.includes('renderStudentOptionalSubjects(document.getElementById("studentClass")?.value||classes[0],false)'), "Resetting a student form must hide stale optional-subject selectors.");
must(html.includes("choices.length&&(!chosen||!choices.some"), "A configured optional subject slot must be selected before saving the student.");
must(html.includes("canonicalSubjectKey(data.optionalSubject1)===canonicalSubjectKey(data.optionalSubject2)"), "The same subject cannot be selected for both optional slots.");

must(html.includes("optionalSubject1:document.getElementById") && html.includes("optionalSubject2:document.getElementById"), "Student Optional I/II selections must be saved to the student record.");
must(html.includes("studentOptionalSubject(x,optionalSlot)") && html.includes("existingMarks.some(m=>m.studentId===x.id"), "Optional-subject Mark Entry must filter to enrolled students but preserve existing marks for correction.");
must(html.includes('colspan="6">N/A') && html.includes("componentsBySubject[si].forEach(()=>row.push('N/A'))"), "Number/Grade Ledgers and Excel export must show N/A for non-enrolled optional subjects.");
must(html.includes("notApplicable:true") && html.includes("studentOptionalSelectionComplete(st,cl)") && html.includes("applicableSubjects=perSubject.filter"), "Results must exclude non-enrolled optional subjects from completion and GPA while requiring configured selections.");
must(html.includes("const applicableSubjects=r.perSubject.filter(x=>!x.notApplicable)") && html.includes("classSubjects=applicableSubjects.map"), "Grade Sheet and GPA must use only subjects applicable to each student.");


const photoCompressorStart = html.indexOf("async function compressSchoolPhoto(file)");
const photoCompressorEnd = html.indexOf("\nfunction applySchoolBranding", photoCompressorStart);
must(photoCompressorStart >= 0 && photoCompressorEnd > photoCompressorStart, "School photo compressor is missing.");
const photoCompressor = html.slice(photoCompressorStart, photoCompressorEnd);
must(photoCompressor.includes("2400/img.width,1600/img.height") && photoCompressor.includes("150*1024") && photoCompressor.includes("180*1024"), "School photo compression must target 150 KB and enforce the 180 KB maximum.");
must(html.includes("अधिकतम १८० KB") && !html.includes("करिब ५५ KB"), "School photo upload instructions must show the 180 KB maximum, not the old 55 KB limit.");
const schoolSettingsSaveStart = html.indexOf("async function saveSchoolSettings(event)");
const schoolSettingsSaveEnd = html.indexOf("\nfunction userAdminMessage", schoolSettingsSaveStart);
must(schoolSettingsSaveStart >= 0 && schoolSettingsSaveEnd > schoolSettingsSaveStart, "School Settings save function is missing.");
const schoolSettingsSave = html.slice(schoolSettingsSaveStart, schoolSettingsSaveEnd);
must(schoolSettingsSave.includes("String(x).length*0.75>180*1024") && schoolSettingsSave.includes("photos.length>20"), "School photo save validation must enforce 180 KB per photo and 20 photos total.");
must(schoolSettingsSave.includes("for(let i=0;i<photos.length;i+=4)") && schoolSettingsSave.includes("await galleryBatch.commit()"), "School gallery must be saved in chunks of four using one atomic Firestore batch.");
must(schoolSettingsSave.includes('galleryBatch.set(doc(db,"school_settings","main")') && schoolSettingsSave.includes('galleryBatch.set(doc(db,"school_public_branding","main")'), "School settings and public branding must commit atomically with the gallery.");
must(rules.includes('match /school_gallery/{documentId}') && rules.includes('request.resource.data.photos.size() <= 4') && (rules.split("size() <= 245760").length - 1) === 4, "Firestore Rules must allow at most four gallery photos per document, each up to 180 KB.");
must(rules.includes('allow get, list: if true;') && rules.includes('allow create, update: if isAdmin()'), "School gallery must remain publicly readable for login and writable only by Admin.");
must(!html.includes('id="appNotification"') && !html.includes("function showAppNotification"), "Global success/error toast popup must remain removed.");

must(html.includes('if(page==="question-papers")return roleHas("subject_teacher")'), "Assigned subject teachers must be able to access Question Paper Builder.");
must(html.includes('data-page="question-papers"') && html.includes('window.loadQuestionPaperModule()') && html.includes('src="./cdc-question-paper.js"'), "V45 Question Paper Builder must be navigable and load its module.");
must(html.includes('schoolNameNe:document.getElementById("setSchoolNameNe").value.trim()') && html.includes('addressNe:document.getElementById("setAddressNe").value.trim()'), "School Settings must save both Nepali identity fields.");


// V44 + V45 parity guard: the login identity and install flow must not disappear.
must(html.includes('id="loginSchoolName"') && html.includes('id="loginSchoolNameNe"') && html.includes('id="loginSchoolAddressNe"'), "English/Nepali login branding must remain visible.");
must(html.includes('id="setSchoolNameNe"') && html.includes('id="setAddressNe"'), "School Settings must retain editable Nepali identity.");
must(html.includes('id="smssInstallBanner"') && html.includes('beforeinstallprompt') && html.includes('appinstalled'), "Uninstalled browsers must receive PWA installation guidance.");
must(html.includes('Add to Home Screen') && html.includes("display-mode: standalone"), "iOS install instructions and installed-mode suppression must remain.");
must(html.includes('data-page="question-papers"') && html.includes('src="./cdc-question-paper.js"'), "V45 question-paper feature must remain alongside V44.");

// Logout or a failed sign-in must not leave the previous account's password visible.
const secretStart=html.indexOf("function clearLoginSecret(){");
const secretEnd=html.indexOf('loginForm.addEventListener("submit"',secretStart);
must(secretStart>=0 && secretEnd>secretStart,"Login secret reset helper is missing.");
const fakePassword={value:"test-only-secret",type:"text"};
const fakeToggle={attributes:{},setAttribute(key,value){this.attributes[key]=value;}};
const resetSecret=new Function("document",html.slice(secretStart,secretEnd)+";return clearLoginSecret;")({getElementById(id){return id==="loginPassword"?fakePassword:id==="toggleLoginPassword"?fakeToggle:null;}});
resetSecret();
assert.equal(fakePassword.value,"");
assert.equal(fakePassword.type,"password");
assert.equal(fakeToggle.attributes["aria-pressed"],"false");
resetSecret();
assert.equal(fakePassword.value,"");
must(html.includes('finally{clearLoginSecret();loginButton.disabled=false') && html.includes('if(!user){clearLoginSecret();'),"Password reset must run after login attempts and sign-out.");

console.log("V44 requirement regression checks passed.");
