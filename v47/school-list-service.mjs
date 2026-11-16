import {canManageSchools} from './permissions.mjs';
import {validatePageSize} from './pagination.mjs';
export async function listSchools({db,api,actor,pageSize=30,cursor=null}){
 if(!canManageSchools(actor))throw new Error('Super Admin required');
 const size=validatePageSize(pageSize);
 for(const name of ['collection','query','orderBy','limit','getDocs','startAfter'])if(typeof api?.[name]!=='function')throw new TypeError('Missing Firebase SDK method '+name);
 const constraints=[api.orderBy('__name__'),api.limit(size+1)];
 if(cursor)constraints.push(api.startAfter(cursor));
 const snapshot=await api.getDocs(api.query(api.collection(db,'schools'),...constraints));
 if(!Array.isArray(snapshot.docs)||snapshot.docs.length>size+1)throw new RangeError('Unexpected result size');
 const page=snapshot.docs.slice(0,size);
 return {schools:page.map(doc=>({...doc.data(),id:doc.id})),hasMore:snapshot.docs.length>size,cursor:page.at(-1)??null};
}
