import {validateStudent} from './student-validation.mjs';
import {validateSchoolId} from './school-paths.mjs';
import {canAccessSchool} from './permissions.mjs';
export async function createSchoolStudent({db,api,actor,schoolId,input}){
 validateSchoolId(schoolId);
 if(!canAccessSchool(actor,schoolId,'write'))throw new Error('School Admin permission required');
 const student=validateStudent(input);
 if(typeof api?.collection!=='function'||typeof api?.addDoc!=='function')throw new TypeError('Missing Firebase SDK');
 const ref=await api.addDoc(api.collection(db,'schools',schoolId,'students'),student);
 if(!ref?.id)throw new Error('Student document not created');
 return {id:ref.id,...student};
}
