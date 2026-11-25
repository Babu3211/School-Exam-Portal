// Read-only migration preflight. No record conversion, write, or password export.
import {V46_COLLECTION_POLICY} from '../../src/v47/v46-collection-map.mjs';
export function summarizeCollectionCounts(source,target){
 const known=Object.keys(V46_COLLECTION_POLICY).sort();
 const check=counts=>{for(const [name,n] of Object.entries(counts))if(!name||!Number.isSafeInteger(n)||n<0)throw Error('Invalid count')};
 check(source);check(target);
 const rows=known.map(name=>({name,source:source[name]??0,target:target[name]??0,policy:V46_COLLECTION_POLICY[name]}));
 const unknown=Object.keys(source).filter(name=>!known.includes(name));
 return {rows,sourceTotal:Object.values(source).reduce((a,b)=>a+b,0),unknownCollections:unknown.length,unknownDocuments:unknown.reduce((n,k)=>n+source[k],0),targetExistingDocuments:Object.values(target).reduce((a,b)=>a+b,0)};
}
export function inspectSubjectNames(records){
 if(!Array.isArray(records))throw Error('Subject records required');
 let nepali=0,missing=0,needsClassReview=0,nonCanonicalId=0;
 for(const {id,data} of records){
  const name=data?.name??data?.subjectName??data?.subject;
  if(typeof name!=='string'||!name.trim())missing++;
  else if(/[\u0900-\u097f]/u.test(name))nepali++;
  if(!/^(?:ECD|LKG|UKG|[1-9]|1[012])$/.test(String(data?.class??'')))needsClassReview++;
  if(!/^[A-Za-z0-9_-]{1,128}$/.test(id))nonCanonicalId++;
 }
 return {count:records.length,nepali,missing,needsClassReview,nonCanonicalId};
}
export function compareAuthIdentities(source,target){
 const email=u=>typeof u.email==='string'?u.email.toLowerCase():'';
 const uidMap=new Map(target.map(u=>[u.uid,u])),emailMap=new Map(target.filter(u=>email(u)).map(u=>[email(u),u]));
 let exact=0,conflicts=0,newAccounts=0,passwordHashAvailable=0,passwordAccounts=0;
 for(const u of source){
  const uid=uidMap.get(u.uid),mail=email(u)?emailMap.get(email(u)):undefined;
  if(uid||mail){if(uid&&email(uid)===email(u)&&(!mail||mail.uid===u.uid))exact++;else conflicts++}
  else newAccounts++;
  if(u.providerData?.some(p=>p.providerId==='password')||u.passwordHash){
   passwordAccounts++;
   if(typeof u.passwordHash==='string'&&u.passwordHash.length>0)passwordHashAvailable++;
  }
 }
 return {sourceAccounts:source.length,targetAccounts:target.length,exactIdentityMatches:exact,identityConflicts:conflicts,newAccounts,passwordAccounts,passwordHashAvailable};
}
