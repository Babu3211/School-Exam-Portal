// Defensive display-only sanitization: never render credentials in generic records preview.
// Firestore access must still be controlled by security rules.
const SECRET_KEY=/(?:password|passwd|pwd|secret|private.?key|api.?key|access.?token|refresh.?token|auth.?token|credential|authorization|session.?token|recovery.?code|otp|pin.?code)/i;
export function redactRecordPreview(record){
 const seen=new WeakSet();
 return JSON.stringify(record,(key,value)=>{
  if(key&&SECRET_KEY.test(key))return '[REDACTED]';
  if(value&&typeof value.toDate==='function')return value.toDate().toISOString();
  if(value&&typeof value==='object'){
   if(seen.has(value))return '[CIRCULAR]';
   seen.add(value);
  }
  return value;
 });
}
