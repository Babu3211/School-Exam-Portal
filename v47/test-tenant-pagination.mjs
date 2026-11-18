import assert from 'node:assert/strict';
import {safePageSize} from './tenant-pagination.mjs';
import {stablePage} from './school-pagination.mjs';
assert.equal(safePageSize(undefined),50);
assert.equal(safePageSize(150),100);
assert.equal(safePageSize(20),20);
for(const n of [0,-1,2.5,NaN,'20'])assert.throws(()=>safePageSize(n));
console.log('V47 bounded pagination tests passed');

// Simulate a large school's 1,500 records without full-collection page responses.
const records=Array.from({length:1500},(_,i)=>({id:'student_'+String(i+1).padStart(5,'0'),schoolId:'school_A'})).reverse();
const originalFirst=records[0].id;
const seen=new Set();
let cursor=null, pages=0;
do {
 const page=stablePage(records,{limit:50,afterId:cursor});
 assert.ok(page.items.length>0&&page.items.length<=50);
 for(const item of page.items){
  assert.equal(item.schoolId,'school_A');
  assert.ok(!seen.has(item.id),'Duplicate student across pages');
  seen.add(item.id);
 }
 pages++;
 cursor=page.nextCursor;
 assert.ok(pages<=30,'Cursor did not terminate');
}while(cursor!==null);
assert.equal(pages,30);
assert.equal(seen.size,1500,'Missing student across paginated roster');
assert.equal(records[0].id,originalFirst,'Pagination must not mutate source records');
assert.deepEqual(stablePage(records,{limit:50,afterId:'student_99999'}),{items:[],nextCursor:null});
console.log('V47 1,500-student bounded pagination simulation passed');
