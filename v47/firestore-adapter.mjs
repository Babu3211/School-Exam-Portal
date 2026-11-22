import {schoolCollectionPath,schoolDocumentPath} from './school-paths.mjs';
import {resolveSchoolContext} from './school-context.mjs';
import {validatePageSize} from './pagination.mjs';
import {checkedRecords} from './record-limits.mjs';
// Inject Firebase modular SDK methods: no credentials, network calls, or global Firebase state here.
export function createSchoolStore({db,api,member,schoolId,assertSession}){
 const ctx=resolveSchoolContext(member,schoolId);
 if(assertSession!==undefined&&typeof assertSession!=='function')throw new TypeError('Session verifier must be a function');
 const checkSession=()=>{if(assertSession)assertSession()};
 for(const method of ['collection','doc','getDocs','query','limit','orderBy','startAfter'])if(typeof api?.[method]!=='function')throw new TypeError('Missing Firebase SDK method: '+method);
 function collectionRef(name){return api.collection(db,schoolCollectionPath(ctx.schoolId,name));}
 function documentRef(name,id){return api.doc(db,schoolDocumentPath(ctx.schoolId,name,id));}
 async function listPage(name,{pageSize=100,cursor=null}={}){
  checkSession();
  const size=validatePageSize(pageSize);
  const previousId=cursor?.id??null;
  if(cursor!==null&&(typeof previousId!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(previousId)))
   throw new Error('Invalid pagination cursor');
  const constraints=[api.orderBy('__name__'),api.limit(size+1)];
  if(cursor)constraints.push(api.startAfter(previousId));
  const snapshot=await api.getDocs(api.query(collectionRef(name),...constraints));
  checkSession();
  const docs=snapshot?.docs;
  if(!Array.isArray(docs)||docs.length>size+1)throw new RangeError('Unexpected query result size');
  let lastId=previousId;
  const materialized=docs.map(d=>{
   if(!d||typeof d.id!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(d.id)
    ||lastId!==null&&d.id<=lastId||typeof d.data!=='function')
    throw new Error('Malformed or out-of-order school record');
   lastId=d.id;
   const data=d.data();
   if(!data||typeof data!=='object'||Array.isArray(data)||data.schoolId!==ctx.schoolId)
    throw new Error('Cross-school or malformed record');
   return {...data,id:d.id};
  });
  checkSession();
  const page=docs.slice(0,size);
  const records=checkedRecords(materialized.slice(0,size),size);
  return {records,hasMore:docs.length>size,cursor:page.at(-1)??null};
 }
 return Object.freeze({schoolId:ctx.schoolId,collectionRef,documentRef,listPage});
}
