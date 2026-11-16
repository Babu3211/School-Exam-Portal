import {validateSchoolId} from './school-paths.mjs';
import {validatePageSize} from './pagination.mjs';
export async function listSchoolMembers({db,api,actor,schoolId,pageSize=100}){
 validateSchoolId(schoolId);
 if(actor?.active!==true||!['super_admin','school_admin'].includes(actor.role)||actor.role==='school_admin'&&actor.schoolId!==schoolId)throw new Error('Admin access required');
 const size=validatePageSize(pageSize);
 for(const method of ['collection','query','limit','getDocs'])if(typeof api?.[method]!=='function')throw new TypeError('Missing Firebase SDK');
 const docs=(await api.getDocs(api.query(api.collection(db,'schools',schoolId,'members'),api.limit(size)))).docs;
 if(!Array.isArray(docs)||docs.length>size)throw new RangeError('Unexpected result size');
 return docs.map(doc=>({...doc.data(),uid:doc.id}));
}
