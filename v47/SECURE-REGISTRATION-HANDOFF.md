# V47 secure school registration handoff

## Implemented on the V47 branch
- `v47/school-onboarding.mjs` uses a Firestore Web SDK transaction to atomically create an inactive school and its first active School Admin membership. It rejects duplicate school IDs.
- `v47/firebase-registry-adapter.mjs` uses `runTransaction` to reject duplicate registry documents.
- Firestore security rules, not the UI actor object, decide whether a client may create school and membership records.
- This approach uses Firestore client transactions and does not require paid Cloud Functions, so it can be tested on the Firebase Spark plan.

## Must verify before production
- Emulator security suite compiles and passes, including simultaneous school and member creation.
- The initial Super Admin document is provisioned using a trusted operator procedure, not public signup.
- Real V47-only Firebase sign-in, school onboarding, activation, pagination and school isolation work.
- Firebase free-tier usage and access controls are suitable for expected schools and students.

Never connect this code to the V46 Firebase project or deploy V47 rules to V46.
