import {canManageSchools} from './permissions.mjs';
import {validatePageSize} from './pagination.mjs';
const numericId=id=>typeof id==='string'&&/^\d{5,20}$/.test(id);
const documentId=id=>typeof id==='string'&&id.length>0&&!id.includes('/')&&new TextEncoder().encode(id).length<=1500;
export function schoolRegistryIssues(id,data){
 const issues=[];
 if(!numericId(id))issues.push('Document ID is not a valid IEMIS number');
 if(!data||typeof data!=='object'||Array.isArray(data))return [...issues,'Invalid registry record'];
 if(data.id!==id)issues.push('School ID does not match document ID');
 if(data.iemisCode!==id)issues.push('IEMIS code does not match document ID');
 if(typeof data.name!=='string'||data.name.trim().length<3||data.name.length>160)issues.push('Missing or invalid school name');
 if(typeof data.active!=='boolean')issues.push('Invalid active status');
 return issues;
}
export async function listSchools({db,api,actor,pageSize=30,cursor=null,reviewInvalid=false}){
 if(!canManageSchools(actor))throw new Error('Super Admin required');
 if(typeof reviewInvalid!=='boolean')throw new TypeError('Invalid review mode');
 const initialUid=actor.uid;
 const verify=()=>{if(!canManageSchools(actor)||actor.uid!==initialUid)throw new Error('Super Admin identity changed during school listing')};
 const size=validatePageSize(pageSize),validId=reviewInvalid?documentId:numericId;
 if(cursor!==null&&(!validId(cursor?.id)||typeof cursor?.data!=='function'))throw new TypeError('Invalid school pagination cursor');
 for(const name of ['collection','query','orderBy','limit','getDocs','startAfter'])if(typeof api?.[name]!=='function')throw new TypeError('Missing Firebase SDK method '+name);
 const constraints=[api.orderBy('__name__'),api.limit(size+1)];
 if(cursor)constraints.push(api.startAfter(cursor));
 const snapshot=await api.getDocs(api.query(api.collection(db,'schools'),...constraints));
 verify();
 if(!Array.isArray(snapshot?.docs)||snapshot.docs.length>size+1)throw new RangeError('Unexpected result size');
 const page=snapshot.docs.slice(0,size),seen=new Set();
 let previousId=cursor?.id??null;
 for(const doc of snapshot.docs){
  if(!validId(doc?.id))throw new Error('Invalid school document ID');
  if(seen.has(doc.id))throw new Error('Duplicate school document ID');
  if(previousId!==null&&doc.id<=previousId)throw new Error('School pagination order mismatch');
  seen.add(doc.id);previousId=doc.id;
 }
 const validated=snapshot.docs.map(doc=>{
  if(typeof doc?.data!=='function')throw new Error('Invalid school snapshot');
  const data=doc.data(),issues=schoolRegistryIssues(doc.id,data);
  if(issues.length){
   if(!reviewInvalid)throw new Error('School registry identity mismatch');
   return {invalid:true,id:doc.id,name:typeof data?.name==='string'?data.name.slice(0,160):'Unnamed school',issues};
  }
  return {id:doc.id,iemisCode:data.iemisCode,name:data.name,active:data.active};
 });
 verify();
 const rows=validated.slice(0,size);
 return {schools:rows.filter(row=>!row.invalid),hasMore:snapshot.docs.length>size,cursor:page.at(-1)??null,...(reviewInvalid?{reviewRows:rows.filter(row=>row.invalid)}:{})};
}
