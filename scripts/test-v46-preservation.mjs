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
required(html.includes("const na=canonicalStudentClass(a)===\'ECD\'?0:"), "Marks entry must sort ECD before Class 1");
required(html.includes('if(e.target.closest("#refreshAttendance")){await loadAttendancePage();return}'), "Attendance refresh must retain loaded student rows");
required(!html.includes("Refresh भयो। विद्यार्थी सूची फेरि देखाउनुहोस्।"), "Attendance refresh must not clear newly rendered rows");
required(html.includes("n<=10?'9-10':''"), "Class 11 and 12 must not silently use Class 9-10 marks formulas");
required(html.includes("const unique=new Map();if(isAdmin()||roleHas('viewer')){chosen.forEach"), "Viewer must see marks subjects without teacher assignments");
required(html.includes("initIdleLogout"), "Keep idle-logout initialization");
required(idle.includes("minutes=60"), "Keep 60-minute inactivity timeout");
required(activity.includes("export"), "Keep activity module");
for(const name of ["test:viewer", "test:rules", "test:question-paper", "test:iemis", "test:pwa"]){
 required(typeof packageConfig.scripts?.[name] === "string", `Keep regression script ${name}`);
}
console.log("V46 structural preservation gate passed (not a substitute for browser or Firestore E2E tests).");
