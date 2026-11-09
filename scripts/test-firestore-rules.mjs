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

async function seed() {
  await testEnv.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, "user_roles", teacherUid), {
      active: true,
      roles: ["subject_teacher", "class_teacher"],
      subjectAssignmentKeys: ["9::Mathematics"],
      subjectAssignmentClassNames: ["9"],
      subjectAssignmentSectionKeys: ["9::Mathematics::A"],
      classTeacherClassNames: ["9"]
    });
    await setDoc(doc(db, "user_roles", inactiveUid), {
      active: false, roles: ["subject_teacher"]
    });
    await setDoc(doc(db, "students", "student-1"), {
      name: "Test Student", class: "9", active: true
    });
    await setDoc(doc(db, "students", "student-10"), {
      name: "Other Class Student", class: "10", active: true
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

  await assertSucceeds(setDoc(doc(db(teacherUid), "marks", "mark-valid"), validMark()));
  await assertSucceeds(getDoc(doc(db(teacherUid), "marks", "mark-valid")));
  await assertFails(getDoc(doc(db(teacherUid), "marks", "mark-other-subject"), validMark({ subject: "Science" })));
  await assertFails(getDoc(doc(db(teacherUid), "marks", "mark-other-section")));
  await assertSucceeds(getDocs(query(collection(db(teacherUid), "marks"), where("className", "==", "9"), where("subject", "==", "Mathematics"), where("section", "==", "A"))));
  await assertFails(getDocs(query(collection(db(teacherUid), "marks"), where("className", "==", "9"), where("subject", "==", "Mathematics"))));
  await assertFails(setDoc(doc(db(teacherUid), "marks", "mark-wrong-class"), validMark({ className: "10" })));
  await assertFails(setDoc(doc(db(teacherUid), "marks", "mark-wrong-exam"), validMark({ examId: "missing-exam" })));
  await assertFails(setDoc(doc(db(teacherUid), "marks", "mark-score-over-limit"), validMark({
    scores: [{ name: "Written", fullMarks: 100, obtained: 101 }]
  })));
  await assertFails(setDoc(doc(db(teacherUid), "marks", "mark-total-full-mismatch"), validMark({
    totalFullMarks: 99
  })));
  await assertFails(setDoc(doc(db(teacherUid), "marks", "mark-total-obtained-mismatch"), validMark({
    totalObtained: 79
  })));
  await assertFails(setDoc(doc(db(teacherUid), "marks", "mark-total-over-full"), validMark({
    totalObtained: 101
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
    scores: Array.from({ length: 7 }, (_, i) => ({ name: "Part " + i, fullMarks: 10, obtained: 5 }))
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

  const photoPrefix = "data:image/jpeg;base64,";
  const maxPhoto = photoPrefix + "A".repeat(245760 - photoPrefix.length);
  const oversizedPhoto = photoPrefix + "A".repeat(245761 - photoPrefix.length);
  await assertSucceeds(setDoc(doc(db(ADMIN), "school_gallery", "part_01"), {
    photos: [maxPhoto], updatedAt: serverTimestamp(), updatedBy: ADMIN
  }));
  await assertSucceeds(getDoc(doc(testEnv.unauthenticatedContext().firestore(), "school_gallery", "part_01")));
  await assertSucceeds(getDocs(collection(testEnv.unauthenticatedContext().firestore(), "school_gallery")));
  await assertFails(setDoc(doc(db(ADMIN), "school_gallery", "part_02"), {
    photos: [oversizedPhoto], updatedAt: serverTimestamp(), updatedBy: ADMIN
  }));
  await assertFails(setDoc(doc(db(teacherUid), "school_gallery", "part_02"), {
    photos: [photoPrefix + "A"], updatedAt: serverTimestamp(), updatedBy: teacherUid
  }));
  await assertSucceeds(deleteDoc(doc(db(ADMIN), "school_gallery", "part_01")));

  const question={gradeNumber:9,className:"9",subject:"Mathematics",section:"A",
    unitId:"unit-1",unitTitle:"Test Unit",topicId:"topic-1",topicName:"Test Topic",
    questionType:"short",marks:1,cognitiveLevel:"knowledge",questionText:"Test question",
    options:[],correctOption:"",answer:"Test answer",createdBy:teacherUid,
    createdByName:"Test Teacher",createdAt:serverTimestamp(),status:"active"};
  await assertSucceeds(setDoc(doc(db(teacherUid),"question_bank","question-valid"),question));
  await assertSucceeds(getDoc(doc(db(teacherUid),"question_bank","question-valid")));
  await assertSucceeds(getDocs(query(collection(db(teacherUid),"question_bank"),where("className","==","9"),where("subject","==","Mathematics"),where("section","==","A"))));
  await assertFails(setDoc(doc(db(teacherUid),"question_bank","question-over-limit"),{...question,marks:101}));
  await assertFails(setDoc(doc(db(teacherUid),"question_bank","question-wrong-section"),{...question,section:"B"}));
  await assertFails(getDoc(doc(db(inactiveUid),"question_bank","question-valid")));
  await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(),"question_bank","question-valid")));

  // Exercise the actual V45 save function, including generated-only preview metadata.
  const moduleSource=await readFile("cdc-question-paper.js","utf8");
  const saveStart=moduleSource.indexOf("async function savePaper() {");
  const saveEnd=moduleSource.indexOf("async function deleteQuestion(",saveStart);
  const generated={
    schoolName:"Test School",schoolAddress:"Test Address",gradeNumber:9,
    className:"9",subject:"Mathematics",section:"A",paperTitle:"Test Paper",
    academicYear:"2083",durationMinutes:60,fullMarks:1,curriculumVersion:"Custom Pattern",
    blueprintId:null,cognitiveDistribution:null,topicIds:["topic-1"],
    questions:[{questionId:"q-1",questionText:"Test question",questionType:"short",marks:1,number:1}],
    createdBy:teacherUid,qualityReport:{questionCount:1,selectedTopicCount:1}
  };
  let paperNumber=0;
  const savePaper=new Function("generatedPaper","auth","serverTimestamp","addDoc","collection","db","logQuestionActivity","loadPaperHistory","message","selectedClass","selectedSubject",
    moduleSource.slice(saveStart,saveEnd)+";return savePaper;")(
    generated,{currentUser:{uid:teacherUid}},serverTimestamp,
    async (_collection,payload)=>{const id="paper-generated-"+(++paperNumber);await assertSucceeds(setDoc(doc(db(teacherUid),"question_papers",id),payload));return {id};},
    ()=>null,null,async()=>{},async()=>{},()=>{},"9","Mathematics"
  );
  await savePaper();
  const savedPaper=await assertSucceeds(getDoc(doc(db(teacherUid),"question_papers","paper-generated-1")));
  if(savedPaper.data().paperTitle!==generated.paperTitle)throw new Error("Question paper did not round-trip.");
  await savePaper(); // A second save must not send the local document id back to Firestore.
  await assertFails(getDoc(doc(db(inactiveUid),"question_papers","paper-generated-1")));
  await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(),"question_papers","paper-generated-1")));
  await assertFails(setDoc(doc(db(teacherUid),"question_papers","paper-wrong-section"),{...savedPaper.data(),section:"B"}));
  await assertFails(setDoc(doc(db(teacherUid),"cdc_blueprints","forged"),{gradeNumber:9}));

  console.log("Firestore Security Rules emulator tests passed.");
} finally {
  await testEnv.cleanup();
}
