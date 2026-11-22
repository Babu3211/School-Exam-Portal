import {validateStudent} from './student-validation.mjs';
import {validateSchoolId} from './school-paths.mjs';
import {canAccessSchool} from './permissions.mjs';
export async function createSchoolStudent({db,api,actor,schoolId,input}){
 validateSchoolId(schoolId);
 if(typeof actor?.uid!=='string'||!actor.uid.trim()||!canAccessSchool(actor,schoolId,'write'))throw new Error('School Admin permission required');
 const student=validateStudent(input);
 if(typeof api?.collection!=='function'||typeof api?.addDoc!=='function')throw new TypeError('Missing Firebase SDK');
 const identity={uid:actor.uid,role:actor.role,schoolId:actor.schoolId,active:actor.active};
 const collection=api.collection(db,'schools',schoolId,'students');
 if(Object.keys(identity).some(key=>actor?.[key]!==identity[key])||!canAccessSchool(actor,schoolId,'write'))throw new Error('School membership changed before student creation');
 const ref=await api.addDoc(collection,{...student,schoolId,active:true});
 if(!ref?.id)throw new Error('Student document not created');
 return {id:ref.id,...student,schoolId,active:true};
}
