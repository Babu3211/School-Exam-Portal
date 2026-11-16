import assert from 'node:assert/strict';
import {buildAuditEvent} from '../v47/audit-events.mjs';
const good={schoolId:'school_001',actorUid:'admin_123',type:'member_added',targetId:'user_123',at:1700000000};
assert.equal(buildAuditEvent(good).type,'member_added');
assert.throws(()=>buildAuditEvent({...good,type:'delete_all'}));
assert.throws(()=>buildAuditEvent({...good,schoolId:'../other'}));
assert.throws(()=>buildAuditEvent({...good,at:0}));
console.log('Audit event tests passed');
