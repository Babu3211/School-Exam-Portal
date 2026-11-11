import {iemisEntrySchema,iemisEntryValues,iemisEntryBatches} from "../iemis-entry.js";
import { readFile } from "node:fs/promises";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails
} from "@firebase/rules-unit-testing";
import {
  doc, getDoc, getDocs, collection, setDoc, updateDoc, deleteDoc,
  serverTimestamp, query, where, runTransaction
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

  await assertSucceeds(setDoc(doc(db(ADMIN), "marks", "legacy-six-components"), validMark({scores:Array.from({length:6},(_,i)=>({name:"Part "+i,fullMarks:10,obtained:5})),totalFullMarks:60,totalObtained:30})));

  // Generic legacy assessments must fit the expression budget for assigned teachers.
  for (const n of [1,2,3,4,5,6]) {
    const scores=Array.from({length:n},(_,i)=>({name:"Part "+i,fullMarks:10,obtained:5}));
    const payload=validMark({scores,totalFullMarks:n*10,totalObtained:n*5});
    const ref=doc(db(teacherUid),"marks","custom-teacher-"+n);
    await assertSucceeds(setDoc(ref,payload));
    const saved=await assertSucceeds(getDoc(ref));
    const updated=scores.map((x,i)=>({...x,obtained:i===0?0:x.obtained}));
    await assertSucceeds(updateDoc(ref,{scores:updated,totalObtained:(n-1)*5,updatedBy:teacherUid,updatedAt:serverTimestamp()}));
    await assertSucceeds(updateDoc(ref,{isAbsent:true,scores:scores.map(x=>({...x,obtained:null})),totalObtained:0,updatedBy:teacherUid,updatedAt:serverTimestamp()}));
    if(saved.data().scores.length!==n)throw new Error("Custom components failed to round-trip.");
  }
  const customSix=validMark({scores:Array.from({length:6},(_,i)=>({name:"Part "+i,fullMarks:10,obtained:5})),totalFullMarks:60,totalObtained:30});
  let customInvalid=0;
  const denyCustom=async value=>assertFails(setDoc(doc(db(teacherUid),"marks","custom-invalid-"+(++customInvalid)),value));
  for(const field of ["studentId","examId","subject","className","section","scores","totalFullMarks","totalObtained","assessmentType","academicYear","termKey","termName"]){const missing={...customSix};delete missing[field];await denyCustom(missing);}
  for(const field of ["name","fullMarks","obtained"]){
    for(const bad of [true,{},[],"not-a-number"]){
      if(field==="name"&&typeof bad==="string")continue;
      await denyCustom({...customSix,scores:customSix.scores.map((x,i)=>i===0?{...x,[field]:bad}:x)});
    }
  }
  for(const name of ["","x".repeat(81)])await denyCustom({...customSix,scores:customSix.scores.map((x,i)=>i===0?{...x,name}:x)});
  await denyCustom({...customSix,scores:customSix.scores.map((x,i)=>i===0?{...x,extra:true}:x)});
  await denyCustom({...customSix,scores:customSix.scores.map((x,i)=>i===0?{...x,obtained:11}:x),totalObtained:36});
  for(const key of ["name","fullMarks","obtained"]){const score={...customSix.scores[0]};delete score[key];await denyCustom({...customSix,scores:[score,...customSix.scores.slice(1)]});}
  for(const bad of [null,"10",true,{},[]])await denyCustom({...customSix,scores:customSix.scores.map((x,i)=>i===0?{...x,fullMarks:bad}:x)});
  await assertSucceeds(setDoc(doc(db(teacherUid),"marks","custom-unicode-boundary"),{...customSix,scores:customSix.scores.map((x,i)=>i===0?{...x,name:"क".repeat(80)}:x)}));
  await denyCustom({...customSix,scores:customSix.scores.map((x,i)=>i===0?{...x,name:"क".repeat(81)}:x)});
  await assertSucceeds(setDoc(doc(db(teacherUid),"marks","custom-fractional"),{...customSix,scores:customSix.scores.map((x,i)=>i===0?{...x,fullMarks:10.5,obtained:5.5}:x),totalFullMarks:60.5,totalObtained:30.5}));
  await denyCustom({...customSix,totalObtained:31});
  await denyCustom({...customSix,isAbsent:true});
  await assertSucceeds(setDoc(doc(db(teacherUid),"marks","custom-name-boundary"),{...customSix,scores:customSix.scores.map((x,i)=>i===0?{...x,name:"x".repeat(80)}:x)}));
  await assertSucceeds(setDoc(doc(db(teacherUid),"marks","custom-name-newline"),{...customSix,scores:customSix.scores.map((x,i)=>i===0?{...x,name:"Part\nOne"}:x)}));

  // Actual IEMIS entry payloads against Rules, without production data.
  const formatTeacher="format-teacher";
  await testEnv.withSecurityRulesDisabled(async context=>{
    const fdb=context.firestore();
    await setDoc(doc(fdb,"user_roles",formatTeacher),{active:true,roles:["subject_teacher"],subjectAssignmentKeys:["1::Nepali","6::Mathematics","9::Mathematics","9::Computer Science"],subjectAssignmentClassNames:["1","6","9"],subjectAssignmentSectionKeys:["1::Nepali::A","6::Mathematics::A","9::Mathematics::A","9::Computer Science::A"]});
    for(const cl of ["1","6","9"]){await setDoc(doc(fdb,"students","format-student-"+cl),{class:cl,active:true});await setDoc(doc(fdb,"exams","format-exam-"+cl),{className:cl});}
  });
  for(const cl of [1,6,9])for(const term of ["first","second","annual"]){
    console.log("Validating IEMIS format",cl,term);
    const subject=cl===1?"Nepali":"Mathematics",schema=iemisEntrySchema(cl,term,subject);
    const values=cl===1?{count:"5",obtained:"17"}:Object.fromEntries(schema.map(c=>[c.key,String(c.max-1)]));
    const base=iemisEntryValues(schema,{values,isAbsent:false});
    const payload={...base,studentId:"format-student-"+cl,examId:"format-exam-"+cl,subject,className:String(cl),section:"A",academicYear:"2083",termKey:term,termName:term,createdBy:formatTeacher,createdAt:serverTimestamp()};
    const id="format-"+cl+"-"+term;
    console.log("MARK_RULES_DIAGNOSTIC create", {className:cl,term,subject,scoreCount:base.scores.length});
    await assertSucceeds(setDoc(doc(db(formatTeacher),"marks",id),payload));
    const readBack=await assertSucceeds(getDoc(doc(db(formatTeacher),"marks",id)));
    const edited={...base,scores:base.scores.map((score,i)=>({...score,obtained:score.obtained===null?null:i===base.scores.length-1?score.obtained-1:score.obtained})),totalObtained:base.totalObtained-1,updatedBy:formatTeacher,updatedAt:serverTimestamp()};
    await assertSucceeds(updateDoc(doc(db(formatTeacher),"marks",id),edited));
    await assertFails(updateDoc(doc(db(formatTeacher),"marks",id),{studentId:"forged-student",updatedBy:formatTeacher,updatedAt:serverTimestamp()}));
    if(term==="annual"&&cl>1){
      const extra=structuredClone(base);extra.scores[0].forged=true;
      await assertFails(setDoc(doc(db(formatTeacher),"marks",id+"-extra-score-field"),{...payload,...extra}));
      await assertFails(setDoc(doc(db(formatTeacher),"marks",id+"-wrong-total"),{...payload,totalObtained:base.totalObtained-1}));
      const wrongType=structuredClone(base);wrongType.scores[0].obtained="2";
      await assertFails(setDoc(doc(db(formatTeacher),"marks",id+"-wrong-score-type"),{...payload,...wrongType}));
    }

    if(readBack.data().totalFullMarks!==base.totalFullMarks)throw new Error("Entry total did not round trip");
    const absent={...payload,...iemisEntryValues(schema,{values,isAbsent:true})};
    await assertSucceeds(setDoc(doc(db(formatTeacher),"marks",id+"-absent"),absent));
    await assertFails(setDoc(doc(db(formatTeacher),"marks",id+"-bad-absence"),{...payload,isAbsent:true}));
    await assertFails(setDoc(doc(db(formatTeacher),"marks",id+"-wrong-section"),{...payload,section:"B"}));
    await assertFails(setDoc(doc(db(formatTeacher),"marks",id+"-bad-flag"),{...payload,isAbsent:"yes"}));
    if(cl===1){
      await assertFails(setDoc(doc(db(formatTeacher),"marks",id+"-wrong-primary-full"),{...payload,totalFullMarks:0}));
      const forged=structuredClone(base);forged.scores[1].fullMarks=21;
      await assertFails(setDoc(doc(db(formatTeacher),"marks",id+"-wrong-count-times-four"),{...payload,...forged}));
    }
  }
  const computer=iemisEntryValues(iemisEntrySchema(9,"annual","Computer Science"),{values:{participation:"4",practical:"36",term:"10",theory:"50"},isAbsent:false});
  await assertSucceeds(setDoc(doc(db(formatTeacher),"marks","format-computer"),{...computer,studentId:"format-student-9",examId:"format-exam-9",subject:"Computer Science",className:"9",section:"A",academicYear:"2083",termKey:"annual",termName:"Final",createdBy:formatTeacher,createdAt:serverTimestamp()}));

  await assertSucceeds(getDoc(doc(db(formatTeacher),"marks","unused-grid-id")));
  await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(),"marks","unused-grid-id")));
  await assertFails(getDoc(doc(db(inactiveUid),"marks","unused-grid-id")));
  const gridStudents=Array.from({length:1},(_,i)=>({id:"grid-student-"+i,class:"1",section:"A",active:true}));
  await testEnv.withSecurityRulesDisabled(async context=>{for(const student of gridStudents)await setDoc(doc(context.firestore(),"students",student.id),student);});
  const application=await readFile("index.html","utf8"),controllerStart=application.indexOf("async function saveIemisEntryRecords("),controllerEnd=application.indexOf("function mountIemisEntryGrid()",controllerStart);
  const versionStart=application.indexOf("function markVersion(");
  const markVersion=new Function(application.slice(versionStart,controllerStart)+";return markVersion;")();
  const cache=[];
  const controllerDeps={iemisEntryContext:()=>"grid-context",auth:{currentUser:{uid:formatTeacher}},marksStudents:gridStudents,iemisEntryAllowed:()=>true,crypto:globalThis.crypto,TextEncoder,doc,db:db(formatTeacher),currentSchoolSettings:{academicYear:"2083"},smssExamTermKey:()=>"first",smssTermLabel:()=>"First Term",window:{confirm:()=>true},iemisEntryBatches,runTransaction,serverTimestamp,getDoc,existingMarks:cache,writeAuditLog:async()=>true,markVersion,safeNoticeError:e=>e.message};
  const actualSave=new Function(...Object.keys(controllerDeps),application.slice(controllerStart,controllerEnd)+";return saveIemisEntryRecords;")(...Object.values(controllerDeps));
  const gridPlans=gridStudents.map((student,i)=>({key:"grid-"+i,student,subject:"Nepali",old:null,data:iemisEntryValues(iemisEntrySchema(1,"first","Nepali"),{values:{count:"5",obtained:"17"},isAbsent:false})}));
  const gridResult=await actualSave(gridPlans,"grid-context",{id:"format-exam-1",academicYear:"2083"},"1",formatTeacher);
  if(gridResult.savedKeys.length!==gridStudents.length||cache.length!==gridStudents.length)throw new Error("Real transaction controller did not save and refresh all test rows");
  const edits=gridStudents.map((student,i)=>({key:"grid-"+i,student,subject:"Nepali",old:cache.find(r=>r.studentId===student.id),data:iemisEntryValues(iemisEntrySchema(1,"first","Nepali"),{values:{count:"5",obtained:"18"},isAbsent:false})}));
  await actualSave(edits,"grid-context",{id:"format-exam-1",academicYear:"2083"},"1",formatTeacher);
  if(cache.some(r=>r.totalObtained!==18))throw new Error("Real transaction update did not reload new marks");

  console.log("Firestore Security Rules emulator tests passed.");
} finally {
  await testEnv.cleanup();
}
