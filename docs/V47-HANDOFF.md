# V47 multi-school continuation / handoff

## Safety boundaries
- Work only on `smss-v47-multischool-work`. Do not modify/deploy V46 production or `main` without explicit approval.
- V46 is in active use; do not delete or migrate real students, marks, or settings.
- V47 Firebase Spark/free plan only. Do not enable billing.

## Verified repository state (2026-11-18)
- V47 tenant rules: `v47/firestore.rules` (not the root V46 `firestore.rules`).
- Emulator config: `v47/firebase.test.json`.
- Tests: `scripts/test-v47-school-isolation-gate.mjs` and `scripts/test-v47-emulator-isolation.mjs`.
- CI: `.github/workflows/v47-security.yml`.
- Run both: `npm ci && npm run test:v47`.
- Tests cover two schools, admin/teacher/viewer/super-admin, cross-school access, inactive memberships/schools, invalid student records, role escalation, and scoped writes.
- These are committed test cases, NOT evidence that the emulator passed. No successful CI run was verified through the available connector.

## Next work, in order (do not redo completed steps)
1. Inspect GitHub Actions V47 security job; obtain real logs and fix failures.
2. Confirm Firebase rules compile and emulator test suite passes, including malformed student data.
3. Inspect V47 app entry points and ensure all reads/writes use school-scoped paths, not V46 root collections.
4. Verify Super Admin school onboarding, school admin provisioning, teacher/viewer access, and class/marks/attendance workflows.
5. Validate V46 feature parity (IEMIS/CDC grading, ledger/grade sheets, PWA/APK, English menus, classes ECD/LKG/UKG/1–12).
6. Run end-to-end regression and document pass/fail evidence before any V47 deployment.
7. Deploy V47 only with explicit user approval; never deploy to V46 by default.

## Known constraints
- V47 rules currently disallow deletes, while the user wants confirmed deletion for students/staff/subjects/exams. Design audited deletion and dependent-record handling before changing this.
- Student records currently allow only `name`, `class`, `rollNo`, `schoolId`; check compatibility with full V46 student schema before production use.
- V47 rules currently allow marks/attendance writes only for school admins/super admins; teacher entry permissions need explicit scoped assignments before production.
- Do not report security as passed merely because structural tests pass.

## Latest continuation (2026-11-18)
- Enforced explicit `schoolId` in student create validation and simplified immutable school scope checks (commit `90e42cc`).
- Added negative permission tests for missing/wrong `schoolId` in marks and staff, plus staff cross-tenant update (commit `9d2a126`).
- Latest tests are committed but still not verified as passing in the emulator.
- Before additional permission changes, inspect app schema and teacher assignments. Do not blindly allow teacher writes or loosen tenant scoping.

## Integration inspection (2026-11-18)
- `v47/index.html` is explicitly a **development hub**, not a production V46 dashboard integration.
- Existing V47 modules already include `v47/admin-console.mjs`, `v47/school-admin-console.mjs`, `v47/students-console.mjs`, `v47/school-scope.mjs` and `v47/test-school-scope.mjs`. **Reuse these** rather than rebuilding them.
- `v47/students-console.mjs` uses verified school session and scoped store; `v47/admin-console.mjs` uses super-admin scoped list and onboarding; `v47/school-admin-console.mjs` manages school members. Inspect their imported services before modifying access paths.
- `npm run test:v47` now also runs the existing school-scope helper tests (commit `8ab39cf`).
- Remaining core blocker is full V46 feature parity/integration, NOT just more structural tests. Do not describe V47 as complete until actual app and emulator verification.

## App-to-rules compatibility inspection (2026-11-18)
- Inspected actual `v47/students-console.mjs`, `student-service.mjs`, `student-validation.mjs`, `school-paths.mjs`, `attendance-console.mjs`, `attendance-service.mjs`, `permissions.mjs`, `verified-school-session.mjs`, `admin-console.mjs`, and `school-admin-console.mjs`.
- Found student document ID length mismatch: client path validator permits 128 characters but rules permitted only 80. Aligned rules to 128 (commit `c0935ef`) and added emulator boundary cases (commit `fa763f5`).
- V47 student class catalog currently supports ECD, LKG, UKG, and 1–12. The V47 student UI and rules agree on these classes.
- Teacher write operations remain intentionally disabled in `permissions.mjs` and Firestore rules. Implement assignment-scoped teacher writes only after inspecting assignment data model; do not bypass server rules.
- No successful emulator run is confirmed; production integration is not complete.

## App contract batch (2026-11-18)
- Inspected existing teacher assignment schema (`teacher-assignment.mjs`), raw marks transaction (`mark-create-service.mjs`), attendance batch (`attendance-bulk.mjs`) and class save (`attendance-class-save.mjs`). These services are **school-admin-only** today.
- Found `v47/school-paths.mjs` omitted `school_settings` and `members` even though tenant rules and other V47 modules support them; added them (commit `eedcd94`).
- Added `v47/test-app-contract.mjs` for student, marks, attendance, teacher assignment, and scoped path contracts (commit `aab574b`), and wired into `npm run test:v47` (commit `059feae`).
- Teacher assignments use `{schoolId,uid,classId,subjectId,active:false}`, but the student subject assignment collection uses `{studentId,subjectId,class}`. These are distinct concepts: do not conflate them or allow broad teacher writes.
- All new tests are committed; actual test execution still needs verification.

## Critical security-rule repair (2026-11-18)
- Found that `v47/firestore.rules` had become syntactically invalid: student ID regex truncated and a duplicate tail after the service closing brace. Repaired and verified retrieved file content (commit `458cda2`; intermediate repair commit `3375b28` was superseded).
- Replaced malformed structural gate with clean deterministic checks to catch malformed student regex, duplicate catch-all, and duplicate tail (commit `678aa8c`; intermediate commit `c3d4fe9` superseded).
- Source-level verification is **not** Firestore Emulator compilation; rerun `npm run test:v47` and inspect CI before claiming a pass.

## Teacher assignment and membership onboarding batch (2026-11-18)
- Added `schools/{sid}/teacher_assignments/{id}` rules with explicit schema, school-admin-only creation as inactive, admin-only active toggles, and teacher-only own-record get (commit `3db3ad4`). Teacher marks/attendance writes remain disabled pending assignment enforcement.
- Added emulator cases for cross-school, viewer, teacher self-assignment, invalid active-at-create, admin activation and immutable identity (commit `5396606`).
- Added teacher_assignments to school path catalog and app contract test (commits `fc4ece6`, `0e1062e`).
- Found real onboarding bug: `member-management.mjs` created teacher/viewer membership `active:true` although Firestore rules require inactive creation. Fixed to inactive (commit `3e7565c`) and clarified UI message (`83bc0f9`).
- Added `member-status-service.mjs` for authorized membership activation/deactivation and School Admin UI action with confirmation (commits `fbebe46`, `2ea1c7e`, `ef44d66`).
- **Not tested against a running emulator or deployed Firebase**. Confirm all rules and UI behavior through tests before activation for real schools.

## Latest critical validation (2026-11-18)
- Reinspection discovered `v47/firestore.rules` had once again accumulated duplicate student/rules sections and a truncated teacher assignment UID regex. Reconstructed the first complete school rules section, one teacher assignment block and one catch-all (commit `81d12c0`).
- Extended structural tests to detect duplicate student blocks and malformed teacher UID/subject regex (commit `1c0d608`).
- The code is **not confirmed emulator-compiled or CI-passing**. Do not deploy until real tests pass.
- Reinspection also confirmed membership UI now creates inactive records and offers activation; review security rules and execute emulator tests before relying on this workflow.

## Teacher assignment integration (2026-11-18)
- Reopened current structural test and found it contained malformed, duplicated assertion text; replaced with a clean structural gate (commit `1db0680`). Retrieved rules checked at source level for one student rule, one teacher assignment rule, one catch-all and intact regex; **not an emulator pass**.
- Added `v47/teacher-assignment-management.mjs`: transactional create (requires active teacher membership, starts inactive) and admin-only activation/deactivation with identity checks (commit `ee727b0`).
- Added School Admin teacher UID/class/subject controls and wired confirmed actions (commits `1938694`, `19959da`). Added basic denied-role app contract tests (commit `5ac4cbc`).
- Teacher write permissions to marks/attendance are **still disabled** until assignment-bound Firestore rule tests pass. No deployment or live V46 changes.

## Composite IDs and teacher assignment authorization (2026-11-18)
- Fixed `schoolDocumentPath` to accept colon-separated composite IDs only for marks, component_marks, teacher_assignments, and subject_assignments, retaining stricter student/member IDs; added contract assertions (`9db82ba`, `b07c37f`).
- Teacher assignment Firestore rules now require canonical `schoolId:uid:classId:subjectId` document ID and active teacher membership at creation (`15d94cc`).
- Emulator cases updated to canonical assignment IDs, forged-ID denial, and membership deactivation/reactivation gate (`8b6b37e`, `daf37d5`).
- Assignment activation rules also require the target teacher membership to be active (`40e1ef2`).
- **All changes committed only to V47 development branch. No emulator run/pass confirmed, no V47 deployment, no V46 changes.**
