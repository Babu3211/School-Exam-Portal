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

/**
 * Cursor-based member listing. Returns the last document snapshot as the next
 * cursor; callers must retain it only within the same authenticated school.
 * The extra fetched document is a look-ahead and is NOT included in records.
 */
export async function listSchoolMembersPage({db,api,actor,schoolId,pageSize=100,cursor=null}){
 validateSchoolId(schoolId);
 if(actor?.active!==true||!['super_admin','school_admin'].includes(actor.role)||(actor.role==='school_admin'&&actor.schoolId!==schoolId))throw new Error('Admin access required');
 const size=validatePageSize(pageSize);
 for(const method of ['collection','query','orderBy','limit','getDocs','documentId'])if(typeof api?.[method]!=='function')throw new TypeError('Missing Firebase pagination SDK');
 if(cursor!==null&&(typeof cursor!=='object'||typeof cursor.id!=='string'||typeof cursor.data!=='function'))throw new TypeError('Invalid pagination cursor');
 if(cursor!==null&&typeof api.startAfter!=='function')throw new TypeError('Missing Firestore cursor SDK');
 const constraints=[api.orderBy(api.documentId()),...(cursor===null?[]:[api.startAfter(cursor)]),api.limit(size+1)];
 const snapshot=await api.getDocs(api.query(api.collection(db,'schools',schoolId,'members'),...constraints));
 if(!Array.isArray(snapshot?.docs)||snapshot.docs.length>size+1)throw new RangeError('Unexpected member page size');
 const visible=snapshot.docs.slice(0,size);
 const records=visible.map(doc=>{
  const data=doc.data();
  if(!data||data.schoolId!==schoolId||data.uid!==doc.id)throw new Error('Cross-school or malformed member record');
  return Object.freeze({uid:doc.id,role:data.role,active:data.active});
 });
 return Object.freeze({records:Object.freeze(records),hasMore:snapshot.docs.length>size,nextCursor:snapshot.docs.length>size?visible.at(-1):null});
}
