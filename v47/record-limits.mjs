export const MAX_RECORDS_PER_PAGE=500;
export function checkedRecords(records,limit=MAX_RECORDS_PER_PAGE){
 if(!Number.isSafeInteger(limit)||limit<1||limit>MAX_RECORDS_PER_PAGE)throw new RangeError('Invalid page limit');
 if(!Array.isArray(records))throw new TypeError('Expected records array');
 if(records.length>limit)throw new RangeError('Too many records; use pagination');
 return records;
}
export function resetOnLoadFailure(state){return {...state,records:[],ready:false,error:'Unable to load records'};}
