import assert from 'node:assert/strict';
import {superAdminViewModel} from './super-admin-ui.mjs';
const input={schools:[{id:'12345678',name:'Alpha',active:true}],memberships:[],form:{id:'87654321',name:'Beta School',iemisCode:'87654321'}};
assert.equal(superAdminViewModel({...input,isSuperAdmin:false}).authorized,false);
const vm=superAdminViewModel({...input,isSuperAdmin:true});
assert.equal(vm.authorized,true);assert.equal(vm.metrics.activeSchools,1);assert.equal(vm.registration.ok,true);
console.log('V47 super admin UI view-model tests passed');
