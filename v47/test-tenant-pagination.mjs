import assert from 'node:assert/strict';
import {safePageSize} from './tenant-pagination.mjs';
assert.equal(safePageSize(undefined),50);
assert.equal(safePageSize(150),100);
assert.equal(safePageSize(20),20);
for(const n of [0,-1,2.5,NaN,'20'])assert.throws(()=>safePageSize(n));
console.log('V47 bounded pagination tests passed');
