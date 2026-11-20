import {validateSchoolId} from './school-paths.mjs';
import {canAccessSchool} from './permissions.mjs';
import {assignmentRecord,assignmentKey} from './teacher-assignment.mjs';

export async function createTeacherAssignment({db,api,actor,schoolId,uid,classId,subjectId}){
 validateSchoolId(schoolId);
 if(actor?.role!=='school_admin'||!canAccessSchool(actor,schoolId,'write'))throw new Error('School Admin required');
 const identity={uid:actor.uid,role:actor.role,active:actor.active,schoolId:actor.schoolId};
 const record=assignmentRecord({schoolId,uid,classId,subjectId});
 const id=assignmentKey(record);
 if(typeof api?.doc!=='function'||typeof api?.runTransaction!=='function')throw new TypeError('Missing Firebase SDK');
 const assignmentRef=api.doc(db,'schools',schoolId,'teacher_assignments',id);
 const memberRef=api.doc(db,'schools',schoolId,'members',uid);
 await api.runTransaction(db,async tx=>{
  const [assignment,member]=await Promise.all([tx.get(assignmentRef),tx.get(memberRef)]);
  if(assignment.exists())throw new Error('Assignment already exists');
  if(!member.exists()||member.data().uid!==uid||member.data().schoolId!==schoolId||member.data().role!=='teacher'||member.data().active!==true)throw new Error('Active teacher membership required');
  if(actor.uid!==identity.uid||actor.role!==identity.role||actor.active!==identity.active||actor.schoolId!==identity.schoolId||!canAccessSchool(actor,schoolId,'write'))throw new Error('School Admin identity changed during assignment transaction');
  tx.set(assignmentRef,record);
 });
 return {id,...record};
}

export async function setTeacherAssignmentActive({db,api,actor,schoolId,uid,classId,subjectId,active}){
 validateSchoolId(schoolId);
 if(actor?.role!=='school_admin'||!canAccessSchool(actor,schoolId,'write'))throw new Error('School Admin required');
 const identity={uid:actor.uid,role:actor.role,active:actor.active,schoolId:actor.schoolId};
 if(typeof active!=='boolean')throw new TypeError('Active must be boolean');
 const id=assignmentKey({schoolId,uid,classId,subjectId});
 if(typeof api?.doc!=='function'||typeof api?.runTransaction!=='function')throw new TypeError('Missing Firebase SDK');
 const ref=api.doc(db,'schools',schoolId,'teacher_assignments',id);
 await api.runTransaction(db,async tx=>{
  const assignment=await tx.get(ref);
  if(!assignment.exists())throw new Error('Assignment missing');
  const data=assignment.data();
  if(data.schoolId!==schoolId||data.uid!==uid||data.classId!==classId||data.subjectId!==subjectId)throw new Error('Assignment identity mismatch');
  if(typeof data.active!=='boolean')throw new Error('Assignment status invalid');
  if(active){
   const member=await tx.get(api.doc(db,'schools',schoolId,'members',uid));
   if(!member.exists()||member.data().uid!==uid||member.data().role!=='teacher'||member.data().active!==true||member.data().schoolId!==schoolId)throw new Error('Active teacher membership required');
  }
  if(actor.uid!==identity.uid||actor.role!==identity.role||actor.active!==identity.active||actor.schoolId!==identity.schoolId||!canAccessSchool(actor,schoolId,'write'))throw new Error('School Admin identity changed during assignment transaction');
  tx.update(ref,{active});
 });
 return {id,active};
}
