import {schoolCollectionPath,schoolDocumentPath} from './school-paths.mjs';
import {resolveSchoolContext} from './school-context.mjs';
import {validatePageSize} from './pagination.mjs';
import {checkedRecords} from './record-limits.mjs';
// Inject Firebase modular SDK methods: no credentials, network calls, or global Firebase state here.
export function createSchoolStore({db,api,member,schoolId}){
 const ctx=resolveSchoolContext(member,schoolId);
 for(const method of ['collection','doc','getDocs','query','limit','orderBy','startAfter'])if(typeof api?.[method]!=='function')throw new TypeError('Missing Firebase SDK method: '+method);
 function collectionRef(name){return api.collection(db,schoolCollectionPath(ctx.schoolId,name));}
 function documentRef(name,id){return api.doc(db,schoolDocumentPath(ctx.schoolId,name,id));}
 async function listPage(name,{pageSize=100,cursor=null}={}){
  const size=validatePageSize(pageSize);
  const constraints=[api.orderBy('__name__'),api.limit(size+1)];
  if(cursor)constraints.push(api.startAfter(cursor));
  const snapshot=await api.getDocs(api.query(collectionRef(name),...constraints));
  const docs=snapshot.docs;
  if(!Array.isArray(docs)||docs.length>size+1)throw new RangeError('Unexpected query result size');
  const page=docs.slice(0,size);
  const records=checkedRecords(page.map(d=>({...d.data(),id:d.id})),size);
  return {records,hasMore:docs.length>size,cursor:page.at(-1)??null};
 }
 return Object.freeze({schoolId:ctx.schoolId,collectionRef,documentRef,listPage});
}
