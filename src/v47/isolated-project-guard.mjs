/** V47 trusted API must never connect to another Firebase project. */
export const V47_FIREBASE_PROJECT_ID='smss-exam-portal-v47';
export function requireV47FirebaseProjectId(value){
 if(typeof value!=='string'||!value.trim())throw new Error('V47_FIREBASE_PROJECT_ID required');
 if(value==='exam-portal-smss-95016')throw new Error('V46 production Firebase project is forbidden for V47 staging runtime');
 if(value!==V47_FIREBASE_PROJECT_ID)throw new Error('Only the isolated V47 Firebase project is allowed');
 return V47_FIREBASE_PROJECT_ID;
}
