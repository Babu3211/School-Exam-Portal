import {validateSchoolId} from './school-paths.mjs';
const EVENTS=new Set(['school_created','school_updated','member_added','member_disabled','role_changed']);
export function buildAuditEvent({schoolId,actorUid,type,targetId,at}){
 validateSchoolId(schoolId);
 if(!EVENTS.has(type))throw new Error('Unsupported audit event');
 for(const value of [actorUid,targetId])if(typeof value!=='string'||!/^[A-Za-z0-9_-]{3,128}$/.test(value))throw new Error('Invalid audit identifier');
 if(!Number.isSafeInteger(at)||at<=0)throw new Error('Invalid audit timestamp');
 return Object.freeze({schoolId,actorUid,type,targetId,at});
}
