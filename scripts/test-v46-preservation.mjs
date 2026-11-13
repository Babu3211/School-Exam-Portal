import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(path, "utf8");
const [html, android, apkWorkflow, idle, activity, pkg] = await Promise.all([
  read("index.html"),
  read("android-app/capacitor.config.json"),
  read(".github/workflows/android-apk.yml"),
  read("idle-logout.js"),
  read("user-activity.js"),
  read("package.json")
]);
const config = JSON.parse(android);
const packageConfig = JSON.parse(pkg);
const required = (condition, message) => assert.ok(condition, message);

required(config.appId === "com.smss.examportal", "Keep installed Android APK application ID stable");
required(config.appName === "SMSS Exam Portal", "Keep installed Android app name");
required(config.server?.url === "https://exam-portal-smss-95016.web.app/", "Keep installed APK pointing to live Firebase URL");
required(apkWorkflow.includes("assembleDebug"), "Keep downloadable Android APK build workflow");
required(html.includes("window.roleHas=roleHas"), "Classic navigation must access role helper");
required(html.includes("window.isAdmin=isAdmin"), "Classic navigation must access admin helper");
required(html.includes("rolePageAllowed"), "Keep role-based navigation");
required(html.includes("roleHas(\"viewer\")"), "Keep viewer access handling");
required(html.includes('if(p==="students"&&window.loadStudents)window.loadStudents()'), "Student page must invoke data loading on navigation");
required(html.includes('if(p==="attendance"&&window.loadAttendancePage)window.loadAttendancePage()'), "Attendance page must invoke data loading on navigation");
required(html.includes('if(!isAdmin()&&!roleHas("viewer")){\n  const classSel=document.getElementById("attendanceClass");'), "Viewer attendance class selection must remain available");
required(html.includes('if(p==="marks"') && html.includes("window.loadMarksEntry"), "Keep marks entry page loading");
required(html.includes("if(!isAdmin()&&!roleHas('viewer')){\n  classSel.disabled=true;"), "Viewer must retain marks class selection while data loads");
required(html.includes('if(!isAdmin()&&!roleHas("viewer")){const classSel=document.getElementById("attendanceClass");'), "Attendance load errors must not replace viewer class options with teacher assignment errors");
required(html.includes('const classes=["ECD",...Array.from({length:12}'), "Class choices must include ECD and Classes 1–12");
required(html.includes('if(/^(ecd|early childhood development)$/i.test(raw))return \'ECD\';'), "Preserve ECD class normalization");
required(html.includes('const na=ca==="ECD"?0:'), "Attendance must sort ECD before Class 1");
required(html.includes("const na=ca==='ECD'?0:"), "Marks entry must sort ECD before Class 1");
required(html.includes('if(e.target.closest("#refreshAttendance")){await loadAttendancePage();return}'), "Attendance refresh must retain loaded student rows");
required(!html.includes("Refresh भयो। विद्यार्थी सूची फेरि देखाउनुहोस्।"), "Attendance refresh must not clear newly rendered rows");
required(html.includes("n<=10?'9-10':''"), "Class 11 and 12 must not silently use Class 9-10 marks formulas");
required(html.includes("const unique=new Map();if(isAdmin()||roleHas('viewer')){chosen.forEach"), "Viewer must see marks subjects without teacher assignments");
required(html.includes("registry=(isAdmin()||roleHas('viewer'))?cachedClasses.filter"), "Viewer must see IEMIS class subjects");
required(html.includes("s&&(roleHas('viewer')||canTeachSubject(cl,s))"), "Viewer must see IEMIS subject grid");
required(html.includes("if(!roleHas('viewer')&&!canTeachSubject(cl,subject))"), "Viewer must inspect marks rows without teacher assignments");
required(html.includes("(!isAdmin()&&!canTeachSubject(cl,subject))"), "Marks save must still require admin or assigned teacher");
required(html.includes("subjects.some(sub=>roleHas('viewer')?iemisEntryVisible(st,sub,cl,examId):iemisEntryAllowed(st,sub,cl,examId))"), "Viewer must see authorized IEMIS student rows without edit permission");
required(html.includes("canEdit:(st,sub)=>!roleHas('viewer')&&iemisEntryAllowed(st,sub,cl,examId)"), "Viewer must not edit IEMIS grid");
required(html.includes("if(saveButton)saveButton.disabled=roleHas('viewer')"), "Viewer marks save button must remain disabled");
required(html.includes("roleHas('viewer')?'readonly aria-readonly=\"true\"'"), "Viewer legacy marks inputs must be read-only");
required(html.includes("const students=marksStudents.filter(x=>canonicalStudentClass(x.class??x.className)===canonicalStudentClass(cl)"), "Marks student list must normalize Nepali and English class labels");
required(html.includes("const ca=canonicalStudentClass(a),cb=canonicalStudentClass(b);"), "Class sort must use normalized Nepali digits");
required(html.includes('${examEsc(classEnglishLabel(x))}</option>'), "Marks class dropdown must display English labels while preserving stored values");
required(html.includes('if(!attendanceDataReady)await loadAttendancePage();else await loadAttendanceStudentsForDay()'), "Attendance Show Students must await initial Firestore load");
required(html.includes('attendanceDataReady=true;populateAttendanceSubjects()'), "Attendance data readiness must only be marked after records load");
required(html.includes("if(e.target.id==='refreshEntry'){resetIemisEntryGrid();await loadMarksEntry();return}"), "Marks Entry refresh must not clear newly loaded student rows");
required(!html.includes("Refresh भयो। विद्यार्थी सूची फेरि देखाउनुहोस्।"), "Refresh must not instruct user to reload already fetched students");
required(html.includes("if(!marksEntryDataReady&&!(await loadMarksEntry()))return"), "Marks Show Students must await initial Firestore data");
required(html.includes("marksEntryDataReady=true;"), "Marks data readiness must be set after successful load");
required(html.includes("...ss.docs.map(d=>{const st=d.data();return st.active===false?'':(st.class??st.className??'');})"), "Marks class selector must include active students even if class registry is incomplete");
required(html.includes("entryClassNames.find(x=>canonicalStudentClass(x)===canonicalStudentClass(previousClass))"), "Marks Entry must preserve selected class across Nepali/English reloads");
required(html.includes("if(!selectedExam||canonicalStudentClass(selectedExam.className)!==canonicalStudentClass(cl)"), "Marks Save must validate equivalent Nepali/English exam classes");
required(!html.includes("if(!selectedExam||selectedExam.className!==cl||"), "Marks Save must not reject equivalent class labels");
required(html.includes("async function saveIemisEntryRecords(entries,context,exam,cl,uid){\n if(roleHas('viewer'))throw new Error"), "IEMIS marks save handler must reject viewer role before writes");
required(html.includes("if(e.target.id==='saveAllMarks'){if(roleHas('viewer')){entryMsg("), "Save All Marks must reject viewer before grid or legacy writes");
required(html.includes("console.error('Marks entry load failed',e);") && html.includes("resetIemisEntryGrid();\n  if(!isAdmin()&&!roleHas('viewer'))"), "Failed Marks Entry loads must clear stale grid while preserving viewer access");
required(html.includes("const key=canonicalStudentClass(x);if(seen.has(key))return false;seen.add(key);return true;"), "Marks Entry must deduplicate class names across Nepali and English variants");
required(html.includes("const save=document.getElementById('saveAllMarks');if(save)save.disabled=roleHas('viewer');"), "IEMIS grid Save button must remain disabled for viewers");
required(html.includes("function iemisEntryVisible(student,subject,cl,examId)"), "Viewer grid must use subject-enrollment visibility helper");
required(html.includes("roleHas('viewer')?iemisEntryVisible(st,sub,cl,examId):iemisEntryAllowed(st,sub,cl,examId)"), "Viewer grid must filter optional-subject students without write permissions");
required(html.includes("classNo=String(canonicalStudentClass(cl)||'').replace(/[^0-9]/g,'')"), "Marks Entry assessment subject lookup must support Nepali-digit classes");
required(html.includes("const classNo=String(canonicalStudentClass(group)||'').replace(/[^0-9]/g,'');const base=matches.find"), "Marks Entry selected assessment settings must support Nepali-digit classes");
required(html.includes("(currentUserRole?.subjectAssignments||[]).filter(x=>canonicalStudentClass(x.className)===canonicalStudentClass(cl)).map(x=>String(x.subject||'').trim())"), "Teacher subject assignments must match normalized class labels");
required(html.includes("initIdleLogout"), "Keep idle-logout initialization");
required(idle.includes("minutes=60"), "Keep 60-minute inactivity timeout");
required(activity.includes("export"), "Keep activity module");
for(const name of ["test:viewer", "test:rules", "test:question-paper", "test:iemis", "test:pwa"]){
 required(typeof packageConfig.scripts?.[name] === "string", `Keep regression script ${name}`);
}
console.log("V46 structural preservation gate passed (not a substitute for browser or Firestore E2E tests).");
