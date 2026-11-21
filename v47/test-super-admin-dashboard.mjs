import assert from 'node:assert/strict';
import {superAdminMetrics} from './super-admin-dashboard.mjs';
const schools=[{id:'12345678',name:'A School',active:true},{id:'87654321',name:'B School',active:false}];
assert.deepEqual(superAdminMetrics(schools,[{schoolId:'12345678',active:true},{schoolId:'87654321',active:true},{schoolId:'12345678',active:false}]),{totalSchools:2,activeSchools:1,inactiveSchools:1,totalActiveMembers:1});
assert.deepEqual(superAdminMetrics([]),{totalSchools:0,activeSchools:0,inactiveSchools:0,totalActiveMembers:0});
console.log('V47 dashboard summary tests passed');
