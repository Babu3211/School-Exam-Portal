import { readFile } from "node:fs/promises";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails
} from "@firebase/rules-unit-testing";
import {
  doc, getDoc, getDocs, collection, setDoc, updateDoc, deleteDoc,
  serverTimestamp, query, where
} from "firebase/firestore";

const projectId = "smss-v44-rules-test";
const rules = await readFile("firestore.rules", "utf8");
const testEnv = await initializeTestEnvironment({
  projectId,
  firestore: { rules, host: "127.0.0.1", port: 8080 }
});

const ADMIN = "K6uSLmqg0vWCtCuzwtxKzFpQMu62";
const teacherUid = "teacher-001";
const inactiveUid = "inactive-001";
const otherUid = "other-001";
const viewerUid = "viewer-001";
const mixedViewerUid = "viewer-mixed-001";

async function seed() {
  await testEnv.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, "user_roles", teacherUid), {
      active: true,
      roles: ["subject_teacher", "class_teacher"],
      subjectAssignmentKeys: ["9::Mathematics", "9::ऐच्छिक प्रथम: वातावरण विज्ञान"],
      subjectAssignmentClassNames: ["9"],
      subjectAssignmentSectionKeys: ["9::Mathematics::A", "9::ऐच्छिक प्रथम: वातावरण विज्ञान::A"],
      classTeacherClassNames: ["9"]
    });
    await setDoc(doc(db, "user_roles", viewerUid), { active: true, roles: ["viewer"] });
    await setDoc(doc(db, "user_roles", mixedViewerUid), { active: true, roles: ["viewer", "subject_teacher", "class_teacher"], subjectAssignmentKeys: ["9::Mathematics"], classTeacherClassNames: ["9"] });
    await setDoc(doc(db, "user_roles", inactiveUid), {
      active: false, roles: ["subject_teacher"]
    });
    await setDoc(doc(db, "students", "student-1"), {
      name: "Test Student", class: "9", active: true
    });
    await setDoc(doc(db, "students", "student-10"), {
      name: "Other Class Student", class: "10", active: true
    });
    await setDoc(doc(db, "students", "student-optional"), {
      name: "Optional I Student", class: "9", active: true,
      optionalSubject1: "ऐच्छिक प्रथम: वातावरण विज्ञान",
      optionalSubjects: ["ऐच्छिक प्रथम: वातावरण विज्ञान"]
    });
    await setDoc(doc(db, "students", "student-other-optional"), {
      name: "Different Optional Student", class: "9", active: true,
      optionalSubject2: "ऐच्छिक द्वितीय: कम्प्युटर विज्ञान",
      optionalSubjects: ["ऐच्छिक द्वितीय: कम्प्युटर विज्ञान"]
    });
    await setDoc(doc(db, "staff", "staff-1"), { name: "Private Staff Record" });
    await setDoc(doc(db, "exams", "exam-1"), {
      className: "9", examName: "First Term"
    });
    await setDoc(doc(db, "marks", "mark-other-subject"), { studentId:"student-1", examId:"exam-1", subject:"Science", className:"9", section:"A", scores:[], totalFullMarks:0, totalObtained:0, assessmentType:"marks", academicYear:"2083", termKey:"first", termName:"First Term" });
    await setDoc(doc(db, "marks", "mark-other-section"), { studentId:"student-1", examId:"exam-1", subject:"Mathematics", className:"9", section:"B", scores:[], totalFullMarks:0, totalObtained:0, assessmentType:"marks", academicYear:"2083", termKey:"first", termName:"First Term" });
    await setDoc(doc(db, "school_public_branding", "main"), { schoolName: "Mahadevasthan Secondary School", logoDataUrl: "data:image/png;base64,test" });
    await setDoc(doc(db, "public_result_exams", "published-exam"), {
      examName: "Published Exam", active: true
    });
    await setDoc(doc(db, "public_results", "known-result-id"), {
      studentName: "Public Test Result"
    });
  });
}

function db(uid) {
  return testEnv.authenticatedContext(uid).firestore();
}

function validMark(overrides = {}) {
  return {
    studentId: "student-1",
    examId: "exam-1",
    subject: "Mathematics",
    className: "9",
    section: "A",
    scores: [{ name: "Written", fullMarks: 100, obtained: 80 }],
    totalFullMarks: 100,
    totalObtained: 80,
    assessmentType: "marks",
    academicYear: "2083",
    termKey: "first",
    termName: "First Term",
    createdBy: teacherUid,
    createdAt: serverTimestamp(),
    ...overrides
  };
}

function validAttendance(overrides = {}) {
  return {
    date: "2083-07-20",
    className: "9",
    attendanceType: "daily",
    subject: null,
    students: [{ studentId: "student-1", rollNo: "1", studentName: "Test Student", status: "present", remark: "" }],
    totalStudents: 1,
    presentCount: 1,
    absentCount: 0,
    leaveCount: 0,
    academicYear: "2083",
    createdBy: teacherUid,
    createdAt: serverTimestamp(),
    updatedBy: teacherUid,
    updatedAt: serverTimestamp(),
    ...overrides
  };
}

try {
  await seed();

  await assertSucceeds(getDoc(doc(testEnv.unauthenticatedContext().firestore(), "school_public_branding", "main")));
  await assertFails(getDocs(collection(testEnv.unauthenticatedContext().firestore(), "school_public_branding")));
  await assertFails(setDoc(doc(testEnv.unauthenticatedContext().firestore(), "school_public_branding", "main"), { schoolName: "Forged" }));
  await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), "school_public_branding", "other")));
  await assertSucceeds(setDoc(doc(db(ADMIN), "school_public_branding", "main"), { schoolName: "Mahadevasthan Secondary School" }));
  await assertFails(setDoc(doc(db(teacherUid), "school_public_branding", "main"), { schoolName: "Forged" }));

  await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), "students", "student-1")));
  await assertSucceeds(getDoc(doc(db(teacherUid), "students", "student-1")));
  await assertFails(getDoc(doc(db(teacherUid), "students", "student-10")));
  await assertSucceeds(getDocs(query(collection(db(teacherUid), "students"), where("class", "==", "9"))));
  await assertFails(getDoc(doc(db(teacherUid), "staff", "staff-1")));
  // Viewer may inspect school-wide records but must not modify any of them.
  await assertSucceeds(getDoc(doc(db(viewerUid), "students", "student-1")));
  await assertSucceeds(getDoc(doc(db(viewerUid), "students", "student-10")));
  await assertSucceeds(getDoc(doc(db(viewerUid), "staff", "staff-1")));
  await assertSucceeds(getDoc(doc(db(viewerUid), "exams", "exam-1")));
  await assertSucceeds(getDoc(doc(db(viewerUid), "marks", "mark-other-subject")));
  await assertFails(setDoc(doc(db(viewerUid), "students", "viewer-forged"), { name: "Forged", class: "9" }));
  await assertFails(updateDoc(doc(db(viewerUid), "students", "student-1"), { name: "Forged" }));
  await assertFails(deleteDoc(doc(db(viewerUid), "students", "student-1")));
  await assertFails(setDoc(doc(db(viewerUid), "staff", "viewer-forged"), { name: "Forged" }));
  await assertFails(setDoc(doc(db(viewerUid), "school_settings", "main"), { schoolName: "Forged" }));
  await assertFails(setDoc(doc(db(viewerUid), "marks", "viewer-forged"), validMark({createdBy:viewerUid})));
  await assertFails(updateDoc(doc(db(viewerUid), "marks", "mark-other-subject"), { totalObtained: 99 }));
  await assertFails(deleteDoc(doc(db(viewerUid), "marks", "mark-other-subject")));
  await assertFails(getDocs(collection(db(viewerUid), "user_activity")));
  await assertFails(getDocs(collection(db(viewerUid), "user_presence")));
  // Viewer must remain read-only even when an account also has teacher roles.
  await assertSucceeds(getDoc(doc(db(mixedViewerUid), "students", "student-10")));
  await assertFails(setDoc(doc(db(mixedViewerUid), "marks", "mixed-viewer-forged"), validMark({createdBy:mixedViewerUid})));
  await assertFails(setDoc(doc(db(mixedViewerUid), "attendance", "mixed-viewer-attendance"), validAttendance({createdBy:mixedViewerUid,updatedBy:mixedViewerUid})));
  await assertFails(setDoc(doc(db(mixedViewerUid), "students", "mixed-viewer-student"), {name:"Forged",class:"9"}));


  await assertSucceeds(getDoc(doc(db(teacherUid), "exams", "exam-1")));
  await assertFails(getDoc(doc(db(inactiveUid), "students", "student-1")));
  await assertFails(setDoc(doc(db(teacherUid), "students", "forged-student"), { name: "Forged", class: "9" }));
  await assertFails(setDoc(doc(db(teacherUid), "school_settings", "main"), { schoolName: "Forged" }));
  await assertFails(setDoc(doc(db(teacherUid), "certificates", "forged-certificate"), { issuedBy: teacherUid }));
  await assertSucceeds(setDoc(doc(db(ADMIN), "school_settings", "main"), { schoolName: "Mahadevasthan Secondary School" }));
  await assertFails(updateDoc(doc(db(teacherUid), "user_roles", teacherUid), { active: false }));

  await assertSucceeds(getDoc(doc(db(teacherUid), "user_roles", teacherUid)));
  await assertFails(getDoc(doc(db(teacherUid), "user_roles", otherUid)));
  await assertFails(getDocs(collection(db(teacherUid), "user_roles")));
  await assertSucceeds(getDocs(collection(db(ADMIN), "user_roles")));

  // Anonymous, inactive and unrelated accounts must never access private grades.
  await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), "marks", "mark-other-subject")));
  await assertFails(getDocs(collection(testEnv.unauthenticatedContext().firestore(), "marks")));
  await assertFails(setDoc(doc(testEnv.unauthenticatedContext().firestore(), "marks", "anonymous-forged"), validMark()));
  await assertFails(getDoc(doc(db(inactiveUid), "marks", "mark-other-subject")));
  await assertFails(setDoc(doc(db(inactiveUid), "marks", "inactive-forged"), validMark()));
  await assertFails(setDoc(doc(db(otherUid), "marks", "unassigned-forged"), validMark()));
  await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), "attendance", "attendance-valid")));
  await assertFails(getDocs(collection(testEnv.unauthenticatedContext().firestore(), "attendance")));
  await assertFails(setDoc(doc(testEnv.unauthenticatedContext().firestore(), "attendance", "anonymous-forged"), validAttendance()));
  await assertFails(setDoc(doc(db(inactiveUid), "attendance", "inactive-forged"), validAttendance()));
  await assertFails(setDoc(doc(db(otherUid), "attendance", "unassigned-forged"), validAttendance()));

  await assertSucceeds(setDoc(doc(db(teacherUid), "marks", "mark-valid"), validMark()));
  await assertSucceeds(setDoc(doc(db(teacherUid), "marks", "mark-optional-enrolled"), validMark({
    studentId: "student-optional", subject: "ऐच्छिक प्रथम: वातावरण विज्ञान"
  })));
  await assertFails(setDoc(doc(db(teacherUid), "marks", "mark-optional-not-enrolled"), validMark({
    studentId: "student-other-optional", subject: "ऐच्छिक प्रथम: वातावरण विज्ञान"
  })));
  await assertSucceeds(getDoc(doc(db(teacherUid), "marks", "mark-valid")));
  await assertFails(getDoc(doc(db(teacherUid), "marks", "mark-other-subject"), validMark({ subject: "Science" })));
  await assertFails(getDoc(doc(db(teacherUid), "marks", "mark-other-section")));
  await assertSucceeds(getDocs(query(collection(db(teacherUid), "marks"), where("className", "==", "9"), where("subject", "==", "Mathematics"), where("section", "==", "A"))));
  await assertFails(getDocs(query(collection(db(teacherUid), "marks"), where("className", "==", "9"), where("subject", "==", "Mathematics"))));
  await assertFails(setDoc(doc(db(teacherUid), "marks", "mark-forged-owner"), validMark({
    createdBy: otherUid
  })));
  await assertFails(setDoc(doc(db(teacherUid), "marks", "mark-other-student-class"), validMark({
    studentId: "student-10"
  })));
  await assertFails(setDoc(doc(db(teacherUid), "marks", "mark-wrong-class"), validMark({ className: "10" })));
  await assertFails(setDoc(doc(db(teacherUid), "marks", "mark-wrong-exam"), validMark({ examId: "missing-exam" })));
  await assertFails(setDoc(doc(db(teacherUid), "marks", "mark-score-over-limit"), validMark({
    scores: [{ name: "Written", fullMarks: 100, obtained: 101 }]
  })));
  await assertFails(setDoc(doc(db(teacherUid), "marks", "mark-score-extra-field"), validMark({
    scores: [{ name: "Written", fullMarks: 100, obtained: 80, forged: true }]
  })));
  await assertFails(setDoc(doc(db(teacherUid), "marks", "mark-score-empty-name"), validMark({
    scores: [{ name: "", fullMarks: 100, obtained: 80 }]
  })));
  await assertFails(setDoc(doc(db(teacherUid), "marks", "mark-score-long-name"), validMark({
    scores: [{ name: "x".repeat(81), fullMarks: 100, obtained: 80 }]
  })));
  await assertFails(setDoc(doc(db(teacherUid), "marks", "mark-too-many-components"), validMark({
    scores: Array.from({ length: 13 }, (_, i) => ({ name: "Part " + i, fullMarks: 10, obtained: 5 }))
  })));
  await assertFails(updateDoc(doc(db(teacherUid), "marks", "mark-valid"), {
    subject: "Science", updatedBy: teacherUid, updatedAt: serverTimestamp()
  }));
  await assertSucceeds(updateDoc(doc(db(teacherUid), "marks", "mark-valid"), {
    scores: [{ name: "Written", fullMarks: 100, obtained: 75 }],
    totalObtained: 75, updatedBy: teacherUid, updatedAt: serverTimestamp()
  }));
  await assertFails(deleteDoc(doc(db(teacherUid), "marks", "mark-valid")));
  await assertSucceeds(deleteDoc(doc(db(ADMIN), "marks", "mark-valid")));

  // A class teacher cannot submit attendance for a class outside their assignment.
  await assertFails(setDoc(doc(db(teacherUid), "attendance", "attendance-other-class"), validAttendance({
    className: "10"
  })));
  await assertFails(setDoc(doc(db(teacherUid), "attendance", "attendance-forged-owner"), validAttendance({
    createdBy: otherUid
  })));
  await assertSucceeds(setDoc(doc(db(teacherUid), "attendance", "attendance-valid"), validAttendance()));
  await assertSucceeds(getDoc(doc(db(teacherUid), "attendance", "attendance-valid")));
  await assertFails(setDoc(doc(db(teacherUid), "attendance", "attendance-bad-count"), validAttendance({ presentCount: 0 })));
  await assertFails(setDoc(doc(db(teacherUid), "attendance", "attendance-subject-type"), validAttendance({ attendanceType: "subject" })));
  await assertFails(setDoc(doc(db(teacherUid), "attendance", "attendance-long-class"), validAttendance({ className: "9".repeat(41) })));
  await assertFails(setDoc(doc(db(teacherUid), "attendance", "attendance-long-date"), validAttendance({ date: "2".repeat(21) })));
  await assertFails(updateDoc(doc(db(teacherUid), "attendance", "attendance-valid"), {
    date: "2083-07-21", updatedBy: teacherUid, updatedAt: serverTimestamp()
  }));
  await assertFails(deleteDoc(doc(db(teacherUid), "attendance", "attendance-valid")));
  await assertSucceeds(deleteDoc(doc(db(ADMIN), "attendance", "attendance-valid")));

  await assertSucceeds(getDoc(doc(testEnv.unauthenticatedContext().firestore(), "public_result_exams", "published-exam")));
  await assertSucceeds(getDoc(doc(testEnv.unauthenticatedContext().firestore(), "public_results", "known-result-id")));
  await assertFails(getDocs(collection(testEnv.unauthenticatedContext().firestore(), "public_results")));
  await assertFails(getDocs(collection(testEnv.unauthenticatedContext().firestore(), "public_result_lookup")));
  // Public results are individually readable, but only Admin may enumerate or publish them.
  await assertFails(getDocs(collection(db(teacherUid), "public_results")));
  await assertFails(getDocs(collection(db(teacherUid), "public_result_lookup")));
  await assertFails(setDoc(doc(testEnv.unauthenticatedContext().firestore(), "public_results", "forged-result"), { studentName: "Forged" }));
  await assertFails(setDoc(doc(db(teacherUid), "public_results", "forged-result"), { studentName: "Forged" }));
  await assertFails(deleteDoc(doc(db(teacherUid), "public_results", "known-result-id")));
  await assertSucceeds(getDocs(collection(db(ADMIN), "public_results")));
  await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), "online_result_rate_limits", "ip-1")));
  await assertFails(setDoc(doc(db(ADMIN), "online_result_rate_limits", "ip-1"), { count: 1 }));


  await assertFails(setDoc(doc(db(teacherUid), "audit_logs", "forged-log"), {
    actorUid: otherUid, actorName: "Other", module: "Marks",
    action: "Create", recordId: "x", detail: "forged",
    createdAt: serverTimestamp()
  }));
  await assertFails(setDoc(doc(db(teacherUid), "audit_logs", "empty-action"), {
    actorUid: teacherUid, actorName: "Teacher", module: "Marks",
    action: "", recordId: "x", detail: "empty action", createdAt: serverTimestamp()
  }));
  await assertSucceeds(setDoc(doc(db(teacherUid), "audit_logs", "valid-log"), {
    actorUid: teacherUid, actorName: "Teacher", module: "Marks",
    action: "Create", recordId: "x", detail: "created",
    createdAt: serverTimestamp()
  }));
  await assertFails(getDocs(collection(db(teacherUid), "audit_logs")));
  await assertSucceeds(getDocs(collection(db(ADMIN), "audit_logs")));
  await assertFails(updateDoc(doc(db(teacherUid), "audit_logs", "valid-log"), { detail: "tampered" }));
  await assertFails(deleteDoc(doc(db(teacherUid), "audit_logs", "valid-log")));
  // CDC curriculum is readable to active school users but Admin-managed.
  await assertSucceeds(setDoc(doc(db(ADMIN), "cdc_curriculum", "grade9-math-unit1"), {
    gradeNumber: 9, className: "9", subject: "Mathematics",
    unitCode: "Unit 1", unitTitle: "Number System",
    topics: ["Rational Numbers"], curriculumVersion: "CDC 2078",
    sourceTitle: "CDC Secondary Curriculum", sourceUrl: "https://moecdc.gov.np/",
    verifiedBy: ADMIN, status: "active"
  }));
  await assertSucceeds(getDoc(doc(db(teacherUid), "cdc_curriculum", "grade9-math-unit1")));
  await assertFails(setDoc(doc(db(teacherUid), "cdc_curriculum", "teacher-forged"), {
    gradeNumber: 9, subject: "Mathematics"
  }));
  await assertSucceeds(setDoc(doc(db(ADMIN), "cdc_blueprints", "g9-math"), {
    gradeNumber: 9, subject: "Mathematics", fullMarks: 50,
    durationMinutes: 120, pattern: [], cognitiveDistribution: {
      knowledge: 20, understanding: 30, application: 30, higher: 20
    }, sourceUrl: "https://moecdc.gov.np/"
  }));
  await assertSucceeds(getDoc(doc(db(teacherUid), "cdc_blueprints", "g9-math")));
  await assertFails(setDoc(doc(db(teacherUid), "cdc_blueprints", "forged"), { gradeNumber: 9 }));

  const validQuestion = (overrides = {}) => ({
    gradeNumber: 9, className: "9", subject: "Mathematics", section: "A",
    unitId: "unit-1", unitTitle: "Number System", topicId: "unit-1_0",
    topicName: "Rational Numbers", questionType: "short", marks: 5,
    cognitiveLevel: "understanding", questionText: "Explain rational numbers.",
    options: [], correctOption: "", answer: "A rational number is...",
    createdBy: teacherUid, createdByName: "Assigned Teacher",
    createdAt: serverTimestamp(), status: "active", ...overrides
  });
  await assertSucceeds(setDoc(doc(db(teacherUid), "question_bank", "question-1"), validQuestion()));
  await assertSucceeds(getDoc(doc(db(teacherUid), "question_bank", "question-1")));
  await assertSucceeds(getDocs(query(
    collection(db(teacherUid), "question_bank"),
    where("className", "==", "9"),
    where("subject", "==", "Mathematics"),
    where("section", "==", "A")
  )));
  await assertFails(setDoc(doc(db(teacherUid), "question_bank", "wrong-subject"), validQuestion({ subject: "Science" })));
  await assertFails(setDoc(doc(db(teacherUid), "question_bank", "wrong-section"), validQuestion({ section: "B" })));
  await assertFails(setDoc(doc(db(inactiveUid), "question_bank", "inactive-question"), validQuestion({ createdBy: inactiveUid })));
  await assertFails(getDoc(doc(db(otherUid), "question_bank", "question-1")));
  await assertFails(deleteDoc(doc(db(otherUid), "question_bank", "question-1")));
  await assertSucceeds(deleteDoc(doc(db(teacherUid), "question_bank", "question-1")));

  const validPaper = (overrides = {}) => ({
    schoolName: "Mahadevasthan Secondary School", schoolAddress: "Dhunibesi-05, Dhading",
    gradeNumber: 9, className: "9", subject: "Mathematics", section: "A",
    paperTitle: "First Term Mathematics", academicYear: "2083",
    durationMinutes: 120, fullMarks: 50, curriculumVersion: "CDC Grid",
    blueprintId: "g9-math", cognitiveDistribution: {
      knowledge: 20, understanding: 30, application: 30, higher: 20
    }, topicIds: ["unit-1_0"],
    questions: [{
      questionId: "question-1", questionText: "Explain rational numbers.",
      questionType: "short", marks: 5, options: [],
      cognitiveLevel: "understanding", topicName: "Rational Numbers",
      answer: "A rational number is...", correctOption: "", number: 1
    }],
    createdBy: teacherUid, createdAt: serverTimestamp(), status: "draft",
    ...overrides
  });
  await assertSucceeds(setDoc(doc(db(teacherUid), "question_papers", "paper-1"), validPaper()));
  await assertSucceeds(getDoc(doc(db(teacherUid), "question_papers", "paper-1")));
  await assertSucceeds(getDocs(query(
    collection(db(teacherUid), "question_papers"),
    where("className", "==", "9"),
    where("subject", "==", "Mathematics"),
    where("section", "==", "A"),
    where("createdBy", "==", teacherUid)
  )));
  await assertFails(getDoc(doc(db(otherUid), "question_papers", "paper-1")));
  await assertFails(setDoc(doc(db(teacherUid), "question_papers", "wrong-subject-paper"), validPaper({ subject: "Science" })));
  await assertFails(setDoc(doc(db(teacherUid), "question_papers", "wrong-section-paper"), validPaper({ section: "B" })));
  await assertFails(setDoc(doc(db(teacherUid), "question_papers", "too-many-questions"), validPaper({
    questions: Array.from({ length: 81 }, () => ({ questionText: "x" }))
  })));
  await assertFails(deleteDoc(doc(db(otherUid), "question_papers", "paper-1")));
  await assertSucceeds(deleteDoc(doc(db(teacherUid), "question_papers", "paper-1")));

  console.log("Firestore Security Rules emulator tests passed.");
} finally {
  await testEnv.cleanup();
}
