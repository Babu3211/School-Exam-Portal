# V47 security audit — development only

The existing `v47/firestore.rules` file is a **draft** and has not been deployed by this workstream.

## Blocking finding
A source inspection on 17 November 2026 found an apparent truncated string in the `teacher_class_assignments` validation near `request.resource.data.uid.matches('^[A-Za-z0-9_-]{1,128}`. The following text unexpectedly starts a `return request.resource.data.keys()` expression. This appears to be a broken/partial rules source and must be repaired before compilation and emulator authorization tests. **Do not deploy the existing draft.**

## Required tests
- Deny signed-out access and all public reads/writes.
- School A member cannot access school B; test forged school ID and direct paths.
- Viewer reads only own school; cannot write anywhere.
- Teacher may write only assigned classes/subjects; cannot self-assign or change role.
- School admin cannot elevate to Super Admin or access other schools.
- Super Admin registration and membership changes work without allowing client self-grants.
- Test nested collections, school deactivation, inactive membership, absent records, and rules query constraints.
- Verify class ECD/LKG/UKG/1–12 and Computer 4/36/10 validations.
- Verify emulator compilation and automated authorization matrix before deployment.
- Keep V46 live Firestore rules, data, Hosting and APK untouched.

Run `node v47/test-rules-integrity.mjs` to detect the known truncated fragment. This static test is expected to **fail** until the draft is repaired.
