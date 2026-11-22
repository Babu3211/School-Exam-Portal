import {validateSchoolId} from './school-paths.mjs';
import {validatePageSize} from './pagination.mjs';
// Preserve the authority that began each asynchronous page read. A change in
// school, role, account or active state must invalidate the result before it
// reaches the UI, including mutations during document materialization.
function validAdminUid(actor){return typeof actor?.uid==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(actor.uid)}
function adminSnapshot(actor){
 return {uid:actor?.uid,role:actor?.role,active:actor?.active,schoolId:actor?.schoolId};
}
function assertAdminSnapshot(actor,schoolId,initial){
 if(!validAdminUid(actor)||actor?.active!==true||!['super_admin','school_admin'].includes(actor.role)||
   (actor.role==='school_admin'&&actor.schoolId!==schoolId)||
   actor.uid!==initial.uid||actor.role!==initial.role||
   actor.active!==initial.active||actor.schoolId!==initial.schoolId)
  throw new Error('Admin session changed during member listing');
}
function checkedMember(doc,schoolId){
 if(!doc||typeof doc.id!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(doc.id)||typeof doc.data!=='function')
  throw new Error('Malformed school member document');
 const data=doc.data();
 if(!data||typeof data!=='object'||Array.isArray(data)||
   data.schoolId!==schoolId||data.uid!==doc.id||
   !['school_admin','teacher','viewer'].includes(data.role)||typeof data.active!=='boolean')
  throw new Error('Cross-school or malformed member record');
 return Object.freeze({uid:doc.id,role:data.role,active:data.active});
}
export async function listSchoolMembers({db,api,actor,schoolId,pageSize=100}){
 validateSchoolId(schoolId);
 if(!validAdminUid(actor)||actor?.active!==true||!['super_admin','school_admin'].includes(actor.role)||actor.role==='school_admin'&&actor.schoolId!==schoolId)throw new Error('Admin access required');
 const identity=adminSnapshot(actor);
 const size=validatePageSize(pageSize);
 for(const method of ['collection','query','limit','getDocs'])if(typeof api?.[method]!=='function')throw new TypeError('Missing Firebase SDK');
 const snapshot=await api.getDocs(api.query(api.collection(db,'schools',schoolId,'members'),api.limit(size)));
 assertAdminSnapshot(actor,schoolId,identity);
 const docs=snapshot?.docs;
 if(!Array.isArray(docs)||docs.length>size)throw new RangeError('Unexpected result size');
 const result=docs.map(doc=>checkedMember(doc,schoolId));
 assertAdminSnapshot(actor,schoolId,identity);
 return result;
}

/**
 * Cursor-based member listing. Returns the last document snapshot as the next
 * cursor; callers must retain it only within the same authenticated school.
 * The extra fetched document is a look-ahead and is NOT included in records.
 */
export async function listSchoolMembersPage({db,api,actor,schoolId,pageSize=100,cursor=null}){
 validateSchoolId(schoolId);
 if(!validAdminUid(actor)||actor?.active!==true||!['super_admin','school_admin'].includes(actor.role)||(actor.role==='school_admin'&&actor.schoolId!==schoolId))throw new Error('Admin access required');
 const identity=adminSnapshot(actor);
 const size=validatePageSize(pageSize);
 for(const method of ['collection','query','orderBy','limit','getDocs','documentId'])if(typeof api?.[method]!=='function')throw new TypeError('Missing Firebase pagination SDK');
 if(cursor!==null&&(typeof cursor!=='object'||typeof cursor.id!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(cursor.id)||typeof cursor.data!=='function'||cursor.ref?.path!==undefined&&cursor.ref.path!=='schools/'+schoolId+'/members/'+cursor.id))throw new TypeError('Invalid pagination cursor');
 if(cursor!==null){checkedMember(cursor,schoolId);assertAdminSnapshot(actor,schoolId,identity)}
 if(cursor!==null&&typeof api.startAfter!=='function')throw new TypeError('Missing Firestore cursor SDK');
 const constraints=[api.orderBy(api.documentId()),...(cursor===null?[]:[api.startAfter(cursor)]),api.limit(size+1)];
 const snapshot=await api.getDocs(api.query(api.collection(db,'schools',schoolId,'members'),...constraints));
 assertAdminSnapshot(actor,schoolId,identity);
 if(!Array.isArray(snapshot?.docs)||snapshot.docs.length>size+1)throw new RangeError('Unexpected member page size');
 let lastId=cursor?.id??null;
 const materialized=snapshot.docs.map(doc=>{
  if(doc?.ref?.path!==undefined&&doc.ref.path!=='schools/'+schoolId+'/members/'+doc.id)
   throw new Error('Cross-school or malformed member path');
  if(!doc||typeof doc.id!=='string'||lastId!==null&&doc.id<=lastId)
   throw new Error('Malformed or out-of-order member page');
  lastId=doc.id;
  return checkedMember(doc,schoolId);
 });
 assertAdminSnapshot(actor,schoolId,identity);
 const records=materialized.slice(0,size);
 const hasMore=snapshot.docs.length>size;
 return Object.freeze({records:Object.freeze(records),hasMore,nextCursor:hasMore?snapshot.docs[size-1]:null});
}
