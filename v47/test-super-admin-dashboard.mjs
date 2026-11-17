import assert from 'node:assert/strict';
import {superAdminMetrics} from './super-admin-dashboard.mjs';
const schools=[{id:'schoolA',name:'A School',active:true},{id:'schoolB',name:'B School',active:false}];
assert.deepEqual(superAdminMetrics(schools,[{schoolId:'schoolA',active:true},{schoolId:'schoolB',active:true},{schoolId:'schoolA',active:false}]),{totalSchools:2,activeSchools:1,inactiveSchools:1,totalActiveMembers:1});
assert.deepEqual(superAdminMetrics([]),{totalSchools:0,activeSchools:0,inactiveSchools:0,totalActiveMembers:0});
console.log('V47 dashboard summary tests passed');
