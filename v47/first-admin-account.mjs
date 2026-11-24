// Optional Spark Auth account provisioning. Never changes the primary Auth
// session, school membership, password of an existing account, or V46.
export async function createIsolatedAdminAccount({appSdk,authSdk,config,actor,email,password,assertCurrent,verifyPrivilege}){
 if(config?.projectId!=='smss-exam-portal-v47'||actor?.role!=='super_admin'||actor?.active!==true||typeof actor.uid!=='string'||!actor.uid)
  throw Error('Verified V47 Super Admin required');
 return createIsolatedAccount({appSdk,authSdk,config,actor,email,password,assertCurrent,verifyPrivilege});
}
// School Admin may provision Auth only, for the current school. Role is not
// granted by Auth creation. The existing inactive membership transaction and
// explicit activation are still required, with Firestore rules as authority.
export async function createIsolatedSchoolMemberAccount({appSdk,authSdk,config,actor,schoolId,role,email,password,assertCurrent,verifyPrivilege}){
 if(config?.projectId!=='smss-exam-portal-v47'||actor?.role!=='school_admin'||actor?.active!==true||typeof actor.uid!=='string'||!actor.uid||actor.schoolId!==schoolId||typeof schoolId!=='string'||!/^\d{5,20}$/.test(schoolId)||!['teacher','viewer'].includes(role))throw Error('Verified V47 School Admin and subordinate role required');
 return createIsolatedAccount({appSdk,authSdk,config,actor,email,password,assertCurrent,verifyPrivilege});
}
async function createIsolatedAccount({appSdk,authSdk,config,actor,email,password,assertCurrent,verifyPrivilege}){
 if(typeof email!=='string'||email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email)||typeof password!=='string'||password.length<12||password.length>128)
  throw Error('Valid email and 12–128 character password required');
 if(typeof assertCurrent!=='function'||typeof verifyPrivilege!=='function')throw Error('Session and server privilege checks required');
 assertCurrent();await verifyPrivilege();assertCurrent();
 let app,secondaryAuth;
 try{
  app=appSdk.initializeApp(config,'smss-v47-provision-'+crypto.randomUUID());
  secondaryAuth=authSdk.getAuth(app);
  await authSdk.setPersistence(secondaryAuth,authSdk.inMemoryPersistence);
  assertCurrent();
  const credential=await authSdk.createUserWithEmailAndPassword(secondaryAuth,email,password);
  const uid=credential?.user?.uid;
  if(typeof uid!=='string'||!/^[A-Za-z0-9_-]{6,128}$/.test(uid)||uid===actor.uid)throw Error('Unexpected new account UID');
  assertCurrent();await verifyPrivilege();assertCurrent();
  return Object.freeze({uid,accountCreated:true,membershipCreated:false});
 }finally{
  // An interrupted call may have created the account. Never delete an account
  // automatically, or silently retry with another password.
  if(secondaryAuth)try{await authSdk.signOut(secondaryAuth)}catch{}
  if(app)try{await appSdk.deleteApp(app)}catch{}
 }
}
