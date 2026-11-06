import { readFile } from "node:fs/promises";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails
} from "@firebase/rules-unit-testing";
import {
  doc, getDoc, getDocs, collection, setDoc, updateDoc, deleteDoc,
  serverTimestamp
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
      subjectAssignmentSectionKeys: ["9::Mathematics::A"],
      classTeacherClassNames: ["9"]
    });
    await setDoc(doc(db, "user_roles", inactiveUid), {
      active: false, roles: ["subject_teacher"]
    });
    await setDoc(doc(db, "students", "student-1"), {
      name: "Test Student", class: "9", active: true
    });
    await setDoc(doc(db, "exams", "exam-1"), {
      className: "9", examName: "First Term"
    });
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
    students: ["student-1"],
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

  await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), "students", "student-1")));
  await assertSucceeds(getDoc(doc(db(teacherUid), "students", "student-1")));
  await assertFails(getDoc(doc(db(inactiveUid), "students", "student-1")));

  await assertSucceeds(getDoc(doc(db(teacherUid), "user_roles", teacherUid)));
  await assertFails(getDoc(doc(db(teacherUid), "user_roles", otherUid)));
  await assertFails(getDocs(collection(db(teacherUid), "user_roles")));
  await assertSucceeds(getDocs(collection(db(ADMIN), "user_roles")));

  await assertSucceeds(setDoc(doc(db(teacherUid), "marks", "mark-valid"), validMark()));
  await assertFails(setDoc(doc(db(teacherUid), "marks", "mark-wrong-class"), validMark({ className: "10" })));
  await assertFails(setDoc(doc(db(teacherUid), "marks", "mark-wrong-exam"), validMark({ examId: "missing-exam" })));
  await assertFails(deleteDoc(doc(db(teacherUid), "marks", "mark-valid")));
  await assertSucceeds(deleteDoc(doc(db(ADMIN), "marks", "mark-valid")));

  await assertSucceeds(setDoc(doc(db(teacherUid), "attendance", "attendance-valid"), validAttendance()));
  await assertFails(setDoc(doc(db(teacherUid), "attendance", "attendance-bad-count"), validAttendance({ presentCount: 0 })));
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
  await assertSucceeds(setDoc(doc(db(teacherUid), "audit_logs", "valid-log"), {
    actorUid: teacherUid, actorName: "Teacher", module: "Marks",
    action: "Create", recordId: "x", detail: "created",
    createdAt: serverTimestamp()
  }));
  await assertFails(updateDoc(doc(db(teacherUid), "audit_logs", "valid-log"), { detail: "tampered" }));
  await assertFails(deleteDoc(doc(db(teacherUid), "audit_logs", "valid-log")));
  console.log("Firestore Security Rules emulator tests passed.");
} finally {
  await testEnv.cleanup();
}
