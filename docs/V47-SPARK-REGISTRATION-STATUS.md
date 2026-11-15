# V47 Spark-only registration status

## Implemented in V47 development (not deployed)
- Firebase Web SDK is restricted to the separate `smss-exam-portal-v47` project.
- Existing active platform admin can atomically register a pending free-plan school, reserve its IEMIS code, and become its initial school admin.
- Platform admin can activate pending schools; emulator tests cover authorization and isolation.
- An active school admin can enroll a limited single-role viewer, subject teacher, or class teacher using a target Auth UID; the Firestore rules prohibit delegated school-admin creation.
- School admin can assign an existing active teacher to a class and exam terms; subject-teacher assignments use `uid_class_subject` and class-teacher assignments use `uid_class`, matching marks and attendance authorization rules.
- School admin can toggle `active` for an existing limited-role teacher/viewer. Membership role, UID and school ID are immutable; no deletion or school-admin deactivation is permitted.
- The isolated browser prototype `prototypes/v47/spark-school-registration.html` contains login, registration, activation, member enrollment, assignment and access status forms. School management forms are gated on a verified active school-admin membership; changing school or auth session invalidates the browser verification.
- School admins can list members and teacher assignments within their school, prefill member/assignment actions from lists, and toggle assignment `active` without changing class, subject, teacher or terms. Emulator tests verify that revoked assignments lose marks access and cross-school access remains denied.
- Firestore emulator tests and Web SDK adapter tests run in `.github/workflows/v47-development-checks.yml`. CI passing does **not** establish production readiness.

## Remaining blockers
- V47 Firebase project's deployed Firestore rules are still deny-all. Draft `firestore.v47.prototype.rules` are **not deployed**.
- Prototype is not hosted, has no deployed Firebase Web config, and is not a complete production school UI.
- Existing Auth UID must be supplied for teacher/viewer enrollment. No safe invitation acceptance, account provisioning, or consent workflow exists yet. Current rules permit a school admin to enroll an arbitrary existing UID without its owner accepting; this is a release blocker.
- School-admin verification currently uses a prototype browser flow, not a deployed or independently browser-tested production UX. Firestore rules remain the authoritative access control.
- V46 feature parity, IEMIS 2083 end-to-end comparisons, school onboarding and browser/device testing remain incomplete.
- Validate IEMIS code normalization, index migration, member lifecycle and real-school security before deploying draft rules.
- Stay on Firebase Spark free plan. Do not enable billing or paid services.

## Release policy
Do not publish V47 rules or onboard real schools until security, migration, V46 parity and end-to-end tests pass. Do not modify or deploy V46 production without explicit permission.
