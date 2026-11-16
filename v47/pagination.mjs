import {MAX_RECORDS_PER_PAGE} from './record-limits.mjs';
export function validatePageSize(size=100){if(!Number.isSafeInteger(size)||size<1||size>MAX_RECORDS_PER_PAGE)throw new RangeError('Invalid page size');return size;}
export function nextPageState(previous,page,hasMore){
 if(!Array.isArray(previous)||!Array.isArray(page)||typeof hasMore!=='boolean')throw new TypeError('Invalid page');
 const seen=new Set(previous.map(x=>x.id));
 const appended=page.filter(x=>{if(!x||typeof x.id!=='string')throw new TypeError('Missing record ID');if(seen.has(x.id))return false;seen.add(x.id);return true;});
 return {records:[...previous,...appended],hasMore};
}
