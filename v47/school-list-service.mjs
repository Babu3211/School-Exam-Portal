import {canManageSchools} from './permissions.mjs';
import {validatePageSize} from './pagination.mjs';
export async function listSchools({db,api,actor,pageSize=30,cursor=null}){
 if(!canManageSchools(actor))throw new Error('Super Admin required');
 const size=validatePageSize(pageSize);
 if(cursor!==null&&(typeof cursor?.id!=='string'||!/^\d{5,20}$/.test(cursor.id)||typeof cursor?.data!=='function'))throw new TypeError('Invalid school pagination cursor');
 for(const name of ['collection','query','orderBy','limit','getDocs','startAfter'])if(typeof api?.[name]!=='function')throw new TypeError('Missing Firebase SDK method '+name);
 const constraints=[api.orderBy('__name__'),api.limit(size+1)];
 if(cursor)constraints.push(api.startAfter(cursor));
 const snapshot=await api.getDocs(api.query(api.collection(db,'schools'),...constraints));
 if(!Array.isArray(snapshot?.docs)||snapshot.docs.length>size+1)throw new RangeError('Unexpected result size');
 const page=snapshot.docs.slice(0,size);
 const seen=new Set();
 let previousId=cursor?.id??null;
 for(const doc of snapshot.docs){if(typeof doc?.id!=='string'||!/^\d{5,20}$/.test(doc.id))throw new Error('Invalid school document ID');if(seen.has(doc.id))throw new Error('Duplicate school document ID');if(previousId!==null&&doc.id<=previousId)throw new Error('School pagination order mismatch');seen.add(doc.id);previousId=doc.id;}
 const schools=page.map(doc=>{if(typeof doc?.data!=='function')throw new Error('Invalid school snapshot');if(typeof doc?.id!=='string'||!/^\d{5,20}$/.test(doc.id))throw new Error('Invalid school document ID');const data=doc.data();if(!data||typeof data!=='object'||Array.isArray(data)||data.id!==doc.id||data.iemisCode!==doc.id||typeof data.name!=='string'||data.name.trim().length<3||data.name.length>160||typeof data.active!=='boolean')throw new Error('School registry identity mismatch');return {id:doc.id,iemisCode:data.iemisCode,name:data.name,active:data.active};});
 return {schools,hasMore:snapshot.docs.length>size,cursor:page.at(-1)??null};
}
