import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const html = await readFile("index.html", "utf8");
const rules = await readFile("firestore.rules", "utf8");
const manifest = await readFile("manifest.webmanifest", "utf8");
const serviceWorker = await readFile("sw.js", "utf8");
const questionModule = await readFile("cdc-question-paper.js", "utf8");
const workflow = await readFile(".github/workflows/v44-quality-check.yml", "utf8");

const must = (condition, message) => assert.ok(condition, message);
const requiredCollections = [
  "students", "staff", "classes", "subjects", "exams", "marks",
  "attendance", "mark_settings", "certificates", "user_roles", "public_result_exams",
  "public_results", "public_result_lookup", "audit_logs", "cdc_curriculum", "cdc_blueprints", "question_bank", "question_papers"
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
must(subjectPermissions("dashboard") && subjectPermissions("marks") && subjectPermissions("question-papers") && !subjectPermissions("attendance") && !subjectPermissions("students"), "Subject Teacher must see Dashboard, Marks and assigned Question Paper Builder.");
const classPermissions = roleMatrix({ active: true, roles: ["class_teacher"], classTeacherClassNames: ["9"] });
must(classPermissions("dashboard") && classPermissions("attendance") && !classPermissions("marks") && !classPermissions("question-papers") && !classPermissions("students"), "Class Teacher must see Dashboard and Attendance only.");
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

const unpublishStart = html.indexOf("async function unpublishOneOnlineResult(studentId)");
const unpublishEnd = html.indexOf("async function publishOnlineResult(", unpublishStart);
must(unpublishStart >= 0 && unpublishEnd > unpublishStart, "Per-student unpublish function boundaries are missing.");
const unpublishCode = html.slice(unpublishStart, unpublishEnd);
must(!unpublishCode.includes("d.id!==resultId"), "Per-student unpublish must not reference the publish-only resultId variable.");
must(unpublishCode.includes("legacyPublicationIsAmbiguous(d,student)"), "Per-student unpublish must retain ambiguous legacy result protection.");

const publishStart = html.indexOf("async function publishOneOnlineResult(studentId)");
const publishCode = html.slice(publishStart, unpublishStart);
must(publishCode.includes("const direct=legacyDocs.filter(") && publishCode.includes("const obsolete=[...direct,...legacyMatches]"), "Republish must clean up all matching student publications, not just the first.");

must(publishCode.includes("const existingLookup=await getDoc(doc(db,'public_result_lookup',lookupHash))"), "Publishing must check existing result-code lookups before writing.");
must(publishCode.includes("linkedResult.data()?.studentId!==studentId"), "Publishing must block a Result Code already assigned to a different student.");

const bulkPublishStart = html.indexOf("async function publishOnlineResult(selectedOnly=false)");
const bulkPublishEnd = html.indexOf("document.addEventListener('click',e=>{", bulkPublishStart);
const bulkPublishCode = html.slice(bulkPublishStart, bulkPublishEnd);
must(bulkPublishCode.includes("const resultCodes=new Map()") && bulkPublishCode.includes("resultCodes.has(code)") && bulkPublishCode.includes("resultCodes.set(code,row.student.id)"), "Bulk result publication must reject duplicate student Result Codes before writing.");
must(bulkPublishCode.includes("if(!code){resultMsg("), "Bulk result publication must reject missing student Result Codes before writing.");


must(unpublishCode.includes("const direct=docs.filter(") && unpublishCode.includes("const targets=[...direct,...legacy]"), "Unpublish must remove all matching student publications, not just the first.");

must(publishCode.includes("filter(hash=>hash!==lookupHash).length+obsolete.length+3>500"), "Republish must guard Firestore's maximum batch operation count.");
must(publishCode.includes("if(hash!==lookupHash)batch.delete"), "Republish must not delete and set the same lookup document in one batch.");
must(unpublishCode.includes("hashes.size+targets.length+1>500"), "Unpublish must guard Firestore's maximum batch operation count.");



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

const restorePreviewStart = html.indexOf("async function previewFirebaseRestore()");
const restorePreviewEnd = html.indexOf("async function runFirebaseRestore()", restorePreviewStart);
must(restorePreviewStart >= 0 && restorePreviewEnd > restorePreviewStart, "Restore preview flow is missing.");
const restorePreviewCode = html.slice(restorePreviewStart, restorePreviewEnd);
must(restorePreviewCode.includes('n!=="audit_logs"&&!RESTORE_COLLECTIONS.includes(n)'), "A real SMSS backup containing append-only audit_logs must be accepted by Restore Preview.");
must(restorePreviewCode.includes("if(unknown.length)throw new Error"), "Restore Preview must still reject unknown collections.");

must(restorePreviewCode.includes("parsed.collections.audit_logs!==undefined&&!Array.isArray(parsed.collections.audit_logs)"), "Restore Preview must reject malformed audit log backup collections.");
must(restorePreviewCode.includes("legacyMissingCollections.join"), "Restore Preview must warn when older backups omit newer collections.");

must(html.includes("validatedRestoreFile=file"), "Restore Preview must remember the exact file that was validated.");
must(html.includes('files?.[0]!==validatedRestoreFile'), "Restore must reject a backup file changed after Preview.");

must(restorePreviewCode.includes("const previewSequence=++restorePreviewSequence"), "Restore Preview must invalidate earlier asynchronous previews.");
must(html.includes("if(!achievement&&rawCells.some(v=>v===''))"), "Marks ledger import must reject partially filled subject components.");
must(html.includes("(!reg||norm(ledgerStudentReg(x))===norm(reg))&&(!symbol||norm(ledgerSymbol(x))===norm(symbol))&&(!name||"), "Marks Excel import must match every provided student identifier, not only the first available identifier.");
must(html.includes("expectedHeader.some((label,i)=>"), "Marks Excel import must validate the workbook identity headers.");
must(html.includes("if(errors.length)throw Error(") && html.includes("कुनै Marks सुरक्षित गरिएको छैन"), "Excel Marks import must reject the entire file when any validation error is found.");
must(html.includes("if(file.size>15*1024*1024)"), "Marks Excel import must limit oversized workbooks.");
must(html.includes("if(rows.length>5002)"), "Marks Excel import must limit oversized row counts.");
must(html.includes("const latestMarksSnapshot=await getDocs(query(collection(db,'marks'),where('examId','==',examId)))") && html.includes("freshPlans=plans.filter"), "Marks import must refresh duplicate keys after preview confirmation.");
must(html.includes("if(plannedKeys.has(key)){errors.push(") && html.includes("Duplicate Row हटाउनुहोस्"), "Marks Excel import must reject duplicate populated student-subject rows within the workbook.");
must(html.includes("try{await batch.commit();saved+=Math.min(8,freshPlans.length-offset);}") && html.includes("पुनः Import गर्नुअघि Marks Ledger जाँच्नुहोस्"), "Marks Excel import must report partial batch failures instead of implying an atomic rollback.");
must(html.includes("header[headerCol]??'').trim()!==subjectEnglishLabel(sub)"), "Marks Excel import must validate subject column order.");
must(html.includes("rows[2]?.[headerCol+ci]") && html.includes("expectedComponent=ledgerEnglishLabel(components[ci].name)+' / '+components[ci].fullMarks"), "Marks Excel import must validate assessment component and full marks headers.");
must(html.includes("row.slice(4,headerCol).some(v=>clean(v)!=='')") && html.includes("Marks छन् तर विद्यार्थीको नाम"), "Marks Excel import must reject score rows without student identity.");
must(html.includes("slice(headerCol).some(v=>String(v??'').trim()!=='')"), "Marks Excel import must reject unexpected populated columns.");
must(restorePreviewCode.includes("if(previewSequence!==restorePreviewSequence||"), "Restore Preview must discard stale file reads.");
must(restorePreviewCode.includes('catch(err){if(previewSequence!==restorePreviewSequence||'), "Stale restore preview failures must not overwrite newer preview messages.");


must(restorePreviewCode.includes('Array.isArray(parsed.documents)'), "Restore Preview must reject malformed documents containers.");
must(restorePreviewCode.includes('!parsed||typeof parsed!=="object"||Array.isArray(parsed)'), "Restore Preview must reject null and array-shaped backup JSON roots.");
must(restorePreviewCode.includes('Object.keys(parsed.documents).some(n=>n!=="school_settings")'), "Restore Preview must reject unknown document groups.");
must(restorePreviewCode.includes('Object.keys(parsed.documents.school_settings).some(n=>n!=="main")'), "Restore Preview must reject unknown School Settings documents.");



must(restorePreviewCode.includes('Array.isArray(parsed.collections)'), "Restore Preview must reject array-shaped collection containers.");
must(restorePreviewCode.includes('item.id==="."||item.id===".."||/^__.*__$/.test(item.id)'), "Restore Preview must reject Firestore-reserved document IDs before writing.");



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
must(html.includes("const scoresComplete=achievement?count!==null") && html.includes("const valid=!!rec&&scoresComplete"), "Grade Ledger must not convert incomplete assessment components into zero marks.");
const aggregateStart=html.indexOf("function ledgerAggregateSummary(rows){");
const aggregateEnd=html.indexOf("\nfunction renderMarksLedgerPage",aggregateStart);
must(aggregateStart>=0&&aggregateEnd>aggregateStart,"Grade Ledger overall summary helper is missing.");
const aggregate=new Function("gradeForPercent",html.slice(aggregateStart,aggregateEnd)+";return ledgerAggregateSummary;")((p)=>({grade:p>=80?"A":"NG",remark:p>=35?"Pass":"Not Graded"}));
const overall=aggregate([{fullMarks:100,obtained:80,gradePoint:3.6},{fullMarks:50,obtained:40,gradePoint:3.2}]);
must(overall.complete&&overall.fullMarks===150&&overall.obtained===120&&overall.percentage===80&&Math.abs(overall.gpa-3.4)<0.000001,"Grade Ledger overall totals and GPA must calculate correctly.");
must(!aggregate([{fullMarks:100,obtained:80,gradePoint:3.6},null]).complete,"Incomplete subject marks must keep the overall result Pending.");
must(!aggregate([{fullMarks:100,obtained:110,gradePoint:4}]).complete,"Overall result must reject out-of-range marks.");
must(html.includes("Overall Result")&&html.includes("Final Grade")&&html.includes("Pending"),"Grade Ledger must show overall result columns and pending state.");
const exportStart=html.indexOf("async function exportMarksLedgerExcel(){");
const exportEnd=html.indexOf("\ndocument.addEventListener('click',e=>{if(e.target?.id==='exportLedgerExcel')",exportStart);
must(exportStart>=0&&exportEnd>exportStart,"Ledger Excel export function is missing.");
const exportCode=html.slice(exportStart,exportEnd);
must(exportCode.includes("const gradeMode=useLedgerPage&&activeLedgerMode==='grade'")&&exportCode.includes("ledgerAggregateSummary(gradeRows)")&&exportCode.includes("'OVERALL RESULT'")&&exportCode.includes("'Final Grade'"),"Grade Ledger Excel export must include per-subject and overall grade result columns.");
must(exportCode.includes("Pending")&&exportCode.includes("gradeRows.push"),"Excel export must preserve Pending when any subject mark is incomplete.");
const printStart=html.indexOf("function printCurrentMarksLedger(){");
const printEnd=html.indexOf("\n\n\n// Excel tools",printStart);
must(printStart>=0&&printEnd>printStart,"Ledger print function is missing.");
const printCode=html.slice(printStart,printEnd);
must(printCode.includes("body.innerHTML")&&printCode.includes("gradeMode?'Grade':'Number'")&&printCode.includes("GRADE LEDGER"),"Print/PDF must use the currently rendered Grade Ledger with its overall result.");
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
must(rules.includes("allow get, list: if hasActiveRole() && isAssignedSubject(resource.data.className, resource.data.subject, resource.data.section);"), "Marks reads must be limited to assigned subject/class/section.");
must(rules.includes("allow get, list: if hasActiveRole() && isAssignedClassTeacher(resource.data.className);"), "Attendance reads must be limited to assigned classes.");
must(html.includes("where(\"class\",\"==\",cl)") && html.includes("where(\"className\",\"==\",x.className)") && html.includes("where(\"subject\",\"==\",x.subject)"), "Teacher dashboard must query only assigned classes and subjects.");

must(html.includes("subjectAssignmentSectionKeys") && rules.includes("subjectAssignmentSectionKeys"), "Subject teacher section assignments must be stored and enforced.");

must(rules.includes("data.attendanceType == 'daily'") && rules.includes("function validDailyAttendance(data)"), "Teacher attendance writes must be limited to validated daily attendance.");
must(rules.includes("match /audit_logs/{documentId}") && rules.includes("allow create: if hasActiveRole()"), "Only active school users may create audit logs.");
must(rules.includes("request.resource.data.actorUid == request.auth.uid") && rules.includes("request.resource.data.createdAt == request.time"), "Audit log actor and server timestamp must be verified.");
must(rules.includes("request.resource.data.detail.size() <= 240") && rules.includes("request.resource.data.actorName.size() <= 100"), "Audit log text fields must have strict size limits.");
must(rules.includes("allow update, delete: if false;"), "Audit logs must remain append-only.");
must(html.includes('id="smssInstallBanner"') && html.includes('id="smssInstallButton"'), "Persistent SMSS PWA install banner and action are missing.");
must(html.includes("beforeinstallprompt") && html.includes("appinstalled") && html.includes("display-mode: standalone"), "Native PWA install prompt and installed-state detection are missing.");
must(html.includes("Add to Home Screen") && html.includes("Install app"), "iPhone and Android installation instructions are missing.");
must(manifest.includes("SMSS Exam Portal"), "PWA manifest must use the approved SMSS Exam Portal app name.");
must(/const CACHE_NAME = [\'"]smss-pwa-v[0-9]+-[a-z0-9-]+[\'"];/.test(serviceWorker) && serviceWorker.includes("\'./cdc-question-paper.js\'") && serviceWorker.includes("cache.addAll(APP_SHELL)"), "Service worker must use a versioned SMSS cache and precache the CDC question paper module.");
must(html.includes('data-page="question-papers"') && html.includes('if(p==="question-papers")'), "CDC Question Paper Builder navigation and page must be present.");
must(html.includes('if(page==="question-papers")return roleHas("subject_teacher")'), "Question Paper Builder must be restricted to assigned subject teachers and Admin.");
must(questionModule.includes('collection(db,"cdc_curriculum")') && questionModule.includes('collection(db,"cdc_blueprints")') && questionModule.includes('collection(db,"question_bank")') && questionModule.includes('collection(db,"question_papers")'), "CDC curriculum, blueprint, question bank and saved paper collections must be connected.");
must(questionModule.includes("cognitiveDistribution") && questionModule.includes("function allocateQuestions()"), "Auto paper generation must balance questions against the saved cognitive-level blueprint.");
must(rules.includes("match /cdc_curriculum/{documentId}") && rules.includes("match /cdc_blueprints/{documentId}") && rules.includes("match /question_bank/{questionId}") && rules.includes("match /question_papers/{paperId}"), "CDC question paper Firestore security rules are missing.");
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


const templateStart=html.indexOf("function ledgerTemplateSubjectSpecs(group,cl){");
const gradeResultStart=html.indexOf("\nfunction ledgerGradeSubjectResult",templateStart);
must(templateStart>=0&&gradeResultStart>templateStart,"Uploaded Grade Ledger template subject mapping is missing.");
const subjectFactory=new Function("ledgerSubjectsForClass","canonicalSubjectKey",html.slice(templateStart,gradeResultStart)+";return ledgerTemplateSubjectSpecs;");
const subjectSpecs=subjectFactory((cl,group)=>({
 "4-5":["नेपाली","अंग्रेजी","गणित","सेरोफेरो","हाम्रो धुनिबेँशी","कम्प्युटर"],
 "6-8":["कम्प्युटर","हाम्रो धुनिबेँशी","स्वास्थ्य शारीरिक तथा सिर्जनात्मक कला","सामाजिक अध्ययन तथा मानव मूल्य शिक्षा","विज्ञान तथा प्रविधि","गणित","अंग्रेजी","नेपाली"],
 "9-10":["ऐच्छिक द्वितीय: कम्प्युटर विज्ञान","ऐच्छिक प्रथम: वातावरण विज्ञान","अनिवार्य सामाजिक अध्ययन","अनिवार्य विज्ञान तथा प्रविधि","अनिवार्य गणित","अनिवार्य अंग्रेजी","अनिवार्य नेपाली"]
})[group]||[],value=>String(value).toLowerCase());
must(subjectSpecs("4-5","4").map(x=>x.label).join("|")==="Nepali|English|Mathematics|Serophero|Hamro Dhunibeshi|Computer Science","Classes 1–5 must follow the uploaded six-subject Grade Ledger template.");
must(subjectSpecs("6-8","6").map(x=>x.label).join("|")==="Computer Science|Hamro Dhunibeshi|Health Physical & Creative Art|Social Studies & Human Value Education|Science & Technology|Mathematics|English|Nepali","Classes 6–8 must follow the uploaded subject order.");
must(subjectSpecs("9-10","9").map(x=>x.label).join("|")==="Optional II: Computer Science|Optional I: Environmental Science|Social Studies|Science & Technology|Mathematics|English|Nepali","Classes 9–10 must follow the uploaded subject order.");
const dynamicSubjectSpecs=subjectFactory((cl,group)=>group==="4-5"?["नेपाली","अंग्रेजी","गणित","सेरोफेरो","हाम्रो धुनिबेँशी","कम्प्युटर","चित्रकला"]:group==="9-10"?["ऐच्छिक द्वितीय: कम्प्युटर विज्ञान","ऐच्छिक प्रथम: वातावरण विज्ञान","अनिवार्य सामाजिक अध्ययन","अनिवार्य विज्ञान तथा प्रविधि","अनिवार्य गणित","अनिवार्य अंग्रेजी","अनिवार्य नेपाली","ऐच्छिक प्रथम: अतिरिक्त गणित"]:[],value=>String(value).toLowerCase());
const extraSubjects=dynamicSubjectSpecs("4-5","4");
const extraSubject=extraSubjects.find(x=>x.source==="चित्रकला");
must(extraSubject&&extraSubject.label==="चित्रकला","Grade Ledger must append every subject configured in Subject Settings, even when it is not in the standard template.");
const optionalSubjects=dynamicSubjectSpecs("9-10","9");
must(optionalSubjects.some(x=>x.source==="ऐच्छिक प्रथम: अतिरिक्त गणित"&&x.label==="Optional I: Additional Mathematics"),"Class 9–10 must retain Optional I Additional Mathematics from Subject Settings.");
const ledgerSubjectsStart=html.indexOf("function ledgerSubjectsForClass(cl,group){");
const ledgerSubjectsEnd=html.indexOf("\nlet activeLedgerMode",ledgerSubjectsStart);
must(ledgerSubjectsStart>=0&&ledgerSubjectsEnd>ledgerSubjectsStart,"Grade Ledger Subject Settings resolver is missing.");
const ledgerSubjectsFactory=new Function("classSubjectNames","ledgerSubjectOrder","canonicalSubjectKey","classNoFromName",html.slice(ledgerSubjectsStart,ledgerSubjectsEnd)+";return ledgerSubjectsForClass;");
const configuredSubjects=ledgerSubjectsFactory((cl,group)=>["नेपाली","चित्रकला"],{"4-5":["Nepali","English"]},value=>String(value).toLowerCase(),value=>String(value).replace(/[^0-9]/g,""));
must(configuredSubjects("4","4-5").join("|")==="नेपाली|चित्रकला","Grade Ledger must prefer configured class/subject settings over hard-coded fallback subjects.");
const ledgerLoadStart=html.indexOf("async function loadMarksLedgerPage(){");
const ledgerLoadEnd=html.indexOf("\nwindow.loadMarksLedgerPage",ledgerLoadStart);
must(ledgerLoadStart>=0&&ledgerLoadEnd>ledgerLoadStart,"Grade Ledger loader is missing.");
const ledgerLoadCode=html.slice(ledgerLoadStart,ledgerLoadEnd);
must(ledgerLoadCode.includes("collection(db,'mark_settings')")&&ledgerLoadCode.includes("markSettingsCache=marksSettings"),"Opening Grade Ledger must refresh Subject Settings before building subject columns.");
const gradeResultEnd=html.indexOf("\nfunction ledgerSchoolHeaderMarkup",gradeResultStart);
must(gradeResultStart>=0&&gradeResultEnd>gradeResultStart,"Grade Ledger subject grade calculator is missing.");
const gradeResultFactory=new Function("existingMarks","canonicalSubjectKey","gradeForPercent",html.slice(gradeResultStart,gradeResultEnd)+";return ledgerGradeSubjectResult;");
const gradeForTest=pct=>pct>=90?{grade:"A+",point:4}:pct>=80?{grade:"A",point:3.6}:pct>=70?{grade:"B+",point:3.2}:{grade:"B",point:2.8};
const gradeCalc=gradeResultFactory([
 {studentId:"s1",examId:"e1",subject:"नेपाली",scores:[{name:"No. of Learning Achievement",fullMarks:10,obtained:10},{name:"Full Marks",fullMarks:40,obtained:null},{name:"Obtained Learning Achievement",fullMarks:40,obtained:36}]},
 {studentId:"s2",examId:"e1",subject:"Mathematics",scores:[{name:"Participation",fullMarks:4,obtained:4},{name:"Practical/Project",fullMarks:36,obtained:34},{name:"First Term Examination",fullMarks:10,obtained:9},{name:"TH (Theory)",fullMarks:50,obtained:40}]}
],value=>String(value).toLowerCase(),gradeForTest);
const primaryGrade=gradeCalc({id:"s1"},"e1",{source:"नेपाली"},"1-3");
must(primaryGrade.complete&&primaryGrade.grades[0]==="A+"&&primaryGrade.points[0]==="4.00","Primary grade must calculate from achievement marks.");
const secondaryGrade=gradeCalc({id:"s2"},"e1",{source:"Mathematics"},"6-8");
must(secondaryGrade.complete&&secondaryGrade.grades.join("|")==="A+|A|A"&&secondaryGrade.points.join("|")==="4.00|3.60|3.60","Classes 6–10 must calculate IN, TH and Total grade/grade-point columns.");
const incompleteCalc=gradeResultFactory([{studentId:"s3",examId:"e1",subject:"Mathematics",scores:[{name:"Participation",fullMarks:4,obtained:4},{name:"Practical/Project",fullMarks:36,obtained:34},{name:"First Term Examination",fullMarks:10,obtained:9},{name:"TH (Theory)",fullMarks:50,obtained:null}]}],value=>String(value).toLowerCase(),gradeForTest);
must(!incompleteCalc({id:"s3"},"e1",{source:"Mathematics"},"6-8").complete,"A missing theory mark must keep the Grade Ledger subject Pending.");
must(html.includes('id="ledgerSchoolHeader"')&&html.includes("ledgerSchoolHeaderMarkup")&&html.includes("School Code:"),"School details and school code must appear above the Grade Ledger table.");
must(html.includes("createTemplateGradeLedgerWorkbook")&&html.includes("gradeWb.xlsx.writeBuffer()"),"Grade Ledger Excel export must use the school template layout.");
must(html.includes("gradeMode?(document.getElementById('ledgerSchoolHeader')?.innerHTML||'')"),"Grade Ledger print/PDF must print the school details above the table.");
must(html.includes("['S/N','Student Name','DOB','Father Name','Mother Name','Symbol Number']"),"Grade Ledger must retain student identity columns but remove School Name and School Code columns.");
must(html.includes("['IN','TH','Total']")&&html.includes("Final GPA"),"Classes 6–10 Grade Ledger must include IN, TH, Total and Final GPA.");


const optionalSlotStart=html.indexOf("function optionalSubjectSlot(subject){");
const optionalSlotEnd=html.indexOf("\nasync function loadStudentOptionalSubjectOptions",optionalSlotStart);
must(optionalSlotStart>=0&&optionalSlotEnd>optionalSlotStart,"Student optional-subject selector is missing.");
const optionalSlotFactory=new Function(html.slice(optionalSlotStart,optionalSlotEnd)+";return optionalSubjectSlot;")();
must(optionalSlotFactory("ऐच्छिक प्रथम: वातावरण विज्ञान")==="1","Nepali Optional I subject must be recognized.");
must(optionalSlotFactory("ऐच्छिक द्वितीय: कम्प्युटर विज्ञान")==="2","Nepali Optional II subject must be recognized.");
must(optionalSlotFactory("Optional I: Additional Mathematics")==="1","English Optional I subject must be recognized.");
must(optionalSlotFactory("अनिवार्य गणित")==="","Mandatory subjects must not be treated as optional.");
must(html.includes('id="studentOptionalSubject1"')&&html.includes('id="studentOptionalSubject2"')&&html.includes("data.optionalSubjects=[data.optionalSubject1,data.optionalSubject2].filter(Boolean)"),"Student profiles must store Optional I and Optional II enrollment.");
must(html.includes("studentTakesOptionalSubject(x,subject)")&&html.includes("studentTakesOptionalSubject(st,subject)"),"Marks Entry and Save must include only students enrolled in the selected optional subject.");
must(html.includes("ledgerStudentTakesSubject(st,spec.source,group)")&&html.includes("notApplicable:true")&&html.includes("studentOptionalEnrollmentComplete(st,group,specs)"),"Grade Ledger must exclude non-enrolled optional subjects from student GPA and keep GPA Pending until required optional slots are assigned.");
const enrollmentStart=html.indexOf("function studentOptionalEnrollmentComplete(student,group,specs){");
const enrollmentEnd=html.indexOf("\nfunction ledgerStudentTakesSubject",enrollmentStart);
must(enrollmentStart>=0&&enrollmentEnd>enrollmentStart,"Optional enrollment completeness validator is missing.");
const enrollmentValidator=new Function("studentOptionalSubjects","optionalSubjectSlot","canonicalSubjectKey",html.slice(enrollmentStart,enrollmentEnd)+";return studentOptionalEnrollmentComplete;") (student=>[student.optionalSubject1,student.optionalSubject2].filter(Boolean),optionalSlotFactory,value=>String(value).toLowerCase());
const validEnrollment={optionalSubject1:"Optional I: Environment",optionalSubject2:"Optional II: Computer"};
must(enrollmentValidator(validEnrollment,"9-10",[{source:"English"},{source:"Optional I: Environment"},{source:"Optional I: Additional Math"},{source:"Optional II: Computer"}]),"A valid selected Optional I and Optional II pair must satisfy enrollment completeness.");
must(!enrollmentValidator({optionalSubject1:"Optional I: Retired Subject",optionalSubject2:"Optional II: Computer"},"9-10",[{source:"English"},{source:"Optional I: Environment"},{source:"Optional II: Computer"}]),"A retired optional selection must not be accepted as a current class enrollment.");

const applicabilityStart=html.indexOf("function resultSubjectApplicability(student,subjects,group){");
const applicabilityEnd=html.indexOf("\nfunction renderEntryStudents",applicabilityStart);
must(applicabilityStart>=0&&applicabilityEnd>applicabilityStart,"Grade Sheet optional-subject applicability helper is missing.");
const applicabilityFactory=new Function("studentOptionalEnrollmentComplete","isOptionalSubjectName","studentTakesOptionalSubject",html.slice(applicabilityStart,applicabilityEnd)+";return resultSubjectApplicability;");
const optionalChoice={optionalSubject1:"Optional I: Environment",optionalSubject2:"Optional II: Computer"};
const optionalCheck=applicabilityFactory((student,group,specs)=>[...new Set(specs.map(x=>optionalSlotFactory(x.source)).filter(Boolean))].every(slot=>[student.optionalSubject1,student.optionalSubject2].filter(Boolean).some(value=>optionalSlotFactory(value)===slot)&&specs.some(spec=>optionalSlotFactory(spec.source)===slot&&spec.source===[student.optionalSubject1,student.optionalSubject2].find(value=>optionalSlotFactory(value)===slot))),subject=>!!optionalSlotFactory(subject),(student,subject)=>[student.optionalSubject1,student.optionalSubject2].includes(subject));
const selectedOptional=optionalCheck(optionalChoice,["English","Optional I: Environment","Optional I: Additional Math","Optional II: Computer"],"9-10");
must(selectedOptional.applicable.join("|")==="English|Optional I: Environment|Optional II: Computer"&&selectedOptional.slotsComplete,"Grade Sheet must include only the student's selected Optional I/II subjects and compulsory subjects.");
const missingOptional=optionalCheck({optionalSubject2:"Optional II: Computer"},["English","Optional I: Environment","Optional II: Computer"],"9-10");
must(!missingOptional.slotsComplete,"Grade Sheet must remain Pending when a required optional slot is not assigned.");
must(html.includes("const applicablePerSubject=perSubject.filter(x=>!x.notApplicable)")&&html.includes("const gradeSheetSubjects=r.applicablePerSubject"),"Tabulation totals and Grade Sheet must use only subjects the student actually studies.");
must(html.includes("const resultSubjectSource=hasClassSubjectRegistry?activeClassSubjects:recordedSubjects;"),"Grade Sheet must not restore inactive class subjects from old Marks.");

must(rules.includes("function studentCanTakeSubject")&&rules.includes("studentCanTakeSubject(request.resource.data.studentId"),"Firestore teacher mark writes must enforce optional-subject enrollment.");


// V45 must remain isolated from production Hosting and Firestore deployments.
const trialWorkflow = await readFile(".github/workflows/firebase-hosting-v45-trial.yml", "utf8");
must(trialWorkflow.includes("smss-v45-work") && trialWorkflow.includes("channelId: v45-trial"), "V45 trial must deploy only from its development branch to the isolated preview channel.");
must(!/channelId:\s*live\b/.test(trialWorkflow) && !/firebase(?:-tools)?(?:@\d+)?\s+deploy\b/.test(trialWorkflow), "V45 trial workflow must never deploy live Hosting or production Firestore Rules.");
must(!/firestore:rules/.test(trialWorkflow), "V45 trial must test Firestore Rules locally, not publish them to production.");

const liveWorkflow = await readFile(".github/workflows/firebase-hosting-live.yml", "utf8");
must(!/^\s*workflow_dispatch\s*:/m.test(liveWorkflow), "V45 branch must not offer a manual production Hosting deployment.");
must(liveWorkflow.includes("github.event.workflow_run.head_branch == 'smss-v44-work'"), "Legacy production Hosting workflow must be restricted to the V44 branch.");
must(liveWorkflow.includes("github.event.workflow_run.conclusion == 'success'"), "Legacy production Hosting workflow must require successful V44 CI.");


console.log("V44 requirement regression checks passed.");
