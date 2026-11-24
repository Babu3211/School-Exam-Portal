// School/subject/exam settings must be loaded from the verified tenant, not supplied by a student draft.
// No fixed Computer 4/36/10 limits: every component uses the school's configured full marks.
export function validateConfiguredMarkComponents(settings,{schoolId,subjectId,examId,classId}={}){
 if(typeof schoolId!=='string'||!/^[0-9]{5,20}$/.test(schoolId)||![subjectId,examId,classId].every(id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(id))||!settings||settings.schoolId!==schoolId||settings.subjectId!==subjectId||settings.examId!==examId||String(settings.classId)!==classId)throw new Error('Verified subject examination settings required');
 if(settings.active!==true||!Array.isArray(settings.components)||settings.components.length===0||settings.components.length>6)throw new Error('Active component settings required');
 const seen=new Set(),components=[];
 for(const c of settings.components){
  const key=c?.key,name=c?.name,max=c?.fullMarks;
  if(typeof key!=='string'||!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(key)||seen.has(key)||typeof name!=='string'||!name.trim()||name.length>160||typeof max!=='number'||!Number.isFinite(max)||max<=0||max>100000)throw new Error('Invalid or duplicate examination component setting');
  seen.add(key);components.push(Object.freeze({key,name,fullMarks:max}));
 }
 const frozen=Object.freeze(components);
 primaryAchievementPair(frozen,classId);
 return frozen;
}
// Recognize the explicit primary IEMIS pair by its semantic labels, never by
// arbitrary field IDs. Generic/custom subjects retain their own configuration.
export function primaryAchievementPair(components,classId){
 if(!/^[1-5]$/.test(classId))return null;
 const counts=components.filter(c=>/^no\.?\s*of\s*learning achievement$/i.test(c.name.trim()));
 const scores=components.filter(c=>/^obtained learning achievement$/i.test(c.name.trim()));
 if(!counts.length&&!scores.length)return null;
 if(components.length!==2||counts.length!==1||scores.length!==1||
    !Number.isSafeInteger(counts[0].fullMarks)||counts[0].fullMarks>5000||
    scores[0].fullMarks!==counts[0].fullMarks*4)
  throw Error('Primary learning achievement requires a count and obtained score with maximum count × 4; full marks are derived');
 return {countKey:counts[0].key,scoreKey:scores[0].key};
}
export function validatePrimaryAchievementValues(pair,values){
 if(!pair)return;
 const count=values[pair.countKey],score=values[pair.scoreKey];
 if(!Number.isSafeInteger(count)||count<1||!Number.isSafeInteger(score)||score<0||score>count*4)
  throw Error('Primary learning achievement requires whole count and obtained marks within count × 4');
}
export function inspectConfiguredClassMarks({schoolId,subjectId,examId,classId,settings,expectedStudentIds,drafts}){
 const components=validateConfiguredMarkComponents(settings,{schoolId,subjectId,examId,classId});
 const primaryPair=primaryAchievementPair(components,classId);
 if(!Array.isArray(expectedStudentIds)||expectedStudentIds.length===0||expectedStudentIds.length>1500||!Array.isArray(drafts)||drafts.length>1500)throw new Error('Complete authoritative class roster required');
 const roster=new Set();
 for(const id of expectedStudentIds){if(typeof id!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(id)||roster.has(id))throw new Error('Invalid or duplicate student in roster');roster.add(id)}
 const seen=new Set(),missing=[],invalid=[],ready=[];
 for(const row of drafts){
  if(!row||typeof row!=='object'||Array.isArray(row)||typeof row.studentId!=='string'||!roster.has(row.studentId)||seen.has(row.studentId)||Object.keys(row).some(key=>!['studentId','isAbsent','values'].includes(key)))throw new Error('Duplicate or out-of-roster mark draft (including unexpected fields)');
  seen.add(row.studentId);
  if(row.isAbsent!==undefined&&typeof row.isAbsent!=='boolean'){invalid.push(Object.freeze({studentId:row.studentId,message:'Invalid absence flag'}));continue}
  if(row.isAbsent===true){if(row.values!==undefined&&(!row.values||typeof row.values!=='object'||Array.isArray(row.values)||Object.keys(row.values).some(key=>!components.some(c=>c.key===key)))){invalid.push(Object.freeze({studentId:row.studentId,message:'Invalid absent student component values'}));continue}if(row.values&&(components.some(component=>component.key in row.values&&!Object.prototype.hasOwnProperty.call(row.values,component.key))||Object.values(row.values).some(v=>v!==null&&v!==undefined&&String(v).trim()!==''))){invalid.push(Object.freeze({studentId:row.studentId,message:'Absent student cannot carry obtained marks'}));continue}ready.push(Object.freeze({studentId:row.studentId,isAbsent:true,totalObtained:0}));continue}
  const values=row.values;
  if(!values||typeof values!=='object'||Array.isArray(values)||Object.keys(values).some(key=>!components.some(c=>c.key===key))){
   invalid.push(Object.freeze({studentId:row.studentId,message:'Unexpected or missing component values'}));continue;
  }
  let total=0,error=null;const normalizedValues={};
  for(const c of components){
   if(!Object.prototype.hasOwnProperty.call(values,c.key)){error='Missing '+c.name;break}
   const v=values[c.key];
   if(v===null||v===undefined||String(v).trim()===''){error='Missing '+c.name;break}
   const n=Number(v);
   if((typeof v!=='string'&&typeof v!=='number')||(typeof v==='string'&&!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(v.trim()))||!Number.isFinite(n)||n<0||n>c.fullMarks){error='Out of range '+c.name;break}
   normalizedValues[c.key]=n;total+=n;
  }
  if(!error)try{validatePrimaryAchievementValues(primaryPair,normalizedValues)}catch(e){error=e.message}
  if(!Number.isFinite(total))error='Invalid total obtained marks';
  if(error)invalid.push(Object.freeze({studentId:row.studentId,message:error}));
  else ready.push(Object.freeze({studentId:row.studentId,isAbsent:false,values:Object.freeze(normalizedValues),totalObtained:total}));
 }
 for(const id of roster)if(!seen.has(id))missing.push(id);
 return Object.freeze({rosterCount:roster.size,components,ready:Object.freeze(ready),missing:Object.freeze(missing),invalid:Object.freeze(invalid),complete:ready.length===roster.size&&!missing.length&&!invalid.length,writeAuthorized:false,publicationAllowed:false});
}
