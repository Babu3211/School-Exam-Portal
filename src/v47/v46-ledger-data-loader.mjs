/**
 * Read-only school ledger data loader. Exhaustively pages through tenant-scoped
 * collections, failing closed if the configured safety cap is reached.
 * Never writes to Firestore or claims a partial dataset is a complete ledger.
 */
export async function loadV47LedgerCollections({session,collections=["students","subjects","exams","marks"],pageSize=50,maxRecordsPerCollection=5000}){
 if(typeof session?.listPage!=="function")throw new TypeError("Verified school read session required");
 if(!Number.isInteger(pageSize)||pageSize<1||pageSize>50)throw new RangeError("Invalid page size");
 if(!Number.isInteger(maxRecordsPerCollection)||maxRecordsPerCollection<pageSize)throw new RangeError("Invalid safety cap");
 const allowed=new Set(["students","subjects","exams","marks"]);
 if(!Array.isArray(collections)||!collections.length||new Set(collections).size!==collections.length||collections.some(name=>!allowed.has(name)))
  throw new Error("Unreviewed ledger collection");
 const result=Object.create(null);
 for(const name of collections){
  const records=[];
  let cursor=null;
  const seenIds=new Set();
  const seenCursors=new Set();
  do{
   const remaining=maxRecordsPerCollection-records.length;
   // A full page may return a cursor even when the collection ends exactly
   // at the cap. Probe one more record rather than rejecting valid data.
   const requested=remaining>0?Math.min(pageSize,remaining):1;
   const page=await session.listPage(name,{pageSize:requested,cursor});
   if(!page||!Array.isArray(page.records))throw new Error("Invalid verified read page");
   if(page.records.length>requested){
    if(records.length+page.records.length>maxRecordsPerCollection)
     throw new Error("Ledger dataset exceeds safe read cap: "+name);
    throw new Error("Invalid verified read page");
   }
   if(remaining===0){
    if(page.records.length||page.nextCursor)throw new Error("Ledger dataset exceeds safe read cap: "+name);
    cursor=null;
    break;
   }
   if(!page.records.length&&page.nextCursor)throw new Error("Non-advancing ledger page: "+name);
   for(const record of page.records){
    if(!record||typeof record.id!=="string"||!record.id||seenIds.has(record.id))
     throw new Error("Duplicate or invalid ledger document identity: "+name);
    seenIds.add(record.id);
   }
   records.push(...page.records);
   if(records.length>maxRecordsPerCollection)throw new Error("Ledger dataset exceeds safe read cap: "+name);
   cursor=page.nextCursor;
   if(cursor){
    const token=JSON.stringify(cursor);
    if(typeof token!=="string"||seenCursors.has(token))
     throw new Error("Repeated ledger page cursor: "+name);
    seenCursors.add(token);
   }
  }while(cursor);
  result[name]=Object.freeze(records);
 }
 return Object.freeze(result);
}
