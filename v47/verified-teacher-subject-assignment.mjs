// Tenant-scoped teacher assignment verification for future V46-parity marks entry.
// A teacher may inspect assigned class/subject only; this never authorizes writes.
export async function verifyTeacherSubjectAssignment({db,api,actor,schoolId,classId,subjectId,revalidate}){
 if(actor?.active!==true||actor?.role!=='teacher'||actor.schoolId!==schoolId||typeof actor.uid!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(actor.uid))throw new Error('Active school teacher required');
 if(typeof schoolId!=='string'||!/^\d{5,20}$/.test(schoolId)||!['ECD','LKG','UKG',...Array.from({length:12},(_,i)=>String(i+1))].includes(classId)||typeof subjectId!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(subjectId))throw new Error('Invalid school class or subject');
 if(!db||!api||typeof api.doc!=='function'||typeof api.getDoc!=='function'||typeof revalidate!=='function')throw new Error('Verified Firestore assignment lookup required');
 const identity={uid:actor.uid,role:actor.role,active:actor.active,schoolId:actor.schoolId};
 const check=()=>{if(Object.keys(identity).some(key=>actor[key]!==identity[key]))throw new Error('Teacher session changed')};
 await revalidate();check();
 const id=schoolId+':'+actor.uid+':'+classId+':'+subjectId;
 const snap=await api.getDoc(api.doc(db,'schools',schoolId,'teacher_assignments',id));
 await revalidate();check();
 if(!snap?.exists?.())throw new Error('Teacher has no verified assignment for this class and subject');
 const data=snap.data();
 if(!data||data.schoolId!==schoolId||data.uid!==actor.uid||data.classId!==classId||data.subjectId!==subjectId||data.active!==true)throw new Error('Teacher assignment inactive or mismatched');
 return Object.freeze({schoolId,classId,subjectId,uid:actor.uid,verified:true,writeAuthorized:false,publicationAllowed:false});
}
