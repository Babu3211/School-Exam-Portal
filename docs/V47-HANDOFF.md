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

## Assigned teacher mark entry (2026-11-18)
- Firestore rules now allow teacher **create-only** mark writes when their active membership, active class/subject assignment, student class, student subject roster, scoped schoolId, canonical mark ID and numeric mark fields match (`3a4386b`, `bfbd9a6`). Teacher updates and deletes remain forbidden.
- `mark-create-service.mjs` now checks active teacher assignment inside the existing transaction, retaining student/subject/roster validation and no-overwrite behavior (`b7fb6fd`).
- Emulator tests added for valid teacher mark creation and denial of forged IDs, cross-school records, wrong class/subject, update/delete; seeded required student roster (`88e753b`, `773d550`).
- **Unverified:** Firestore rules compile, emulator permissions, client integration with teacher login, and term-wide completeness validation. No production deploy. V46 remains unchanged.

## Security gate repair after teacher marks integration (2026-11-18)
- Found a serious regression: `v47/firestore.rules` contained a truncated `teacherMarkAllowed` expression and duplicated rules tails (three catch-all blocks). Reconstructed one complete teacher-mark validator, one marks block and one final deny rule (commit `0ce7d37`).
- Strengthened structural test to check for a single teacher mark validator and marks block and intact subject regex (commit `2e532c8`).
- **Still unverified:** full Firebase Rules compilation and emulator tests. Local runtime has Node but not Firebase CLI/dependencies. Do not deploy or enable teacher writes for real schools before the CI/emulator gate succeeds.

## Full-class marks pre-save validation (2026-11-18)
- Added pure `validateCompleteClassMarks` validator (`v47/class-mark-completeness.mjs`) requiring every student ID from the authoritative class roster to have exactly one valid mark for the same class, subject and term; rejects incomplete, duplicate, foreign and malformed entries (`06b5725`).
- Added positive/negative Node tests (`v47/test-class-mark-completeness.mjs`, `50224fc`) and included them in `npm run test:v47` (`ca3c8a8`).
- **Important:** validator is a prerequisite, not yet wired to the live V47 class mark Save button. Do not claim full-class save enforcement is complete until UI and backend integration, roster freshness, concurrent writes and emulator tests pass.

## Batch 15: roster validation and safe save services (2026-11-18)
1. Added atomic full-class marks save service for up to 10 students (84ad432); reads student, subject, subject assignment, existing mark and component marks before any writes.
2. Added transaction mock tests for successful two-student save (324169a).
3. Added incomplete-class and duplicate mark denial tests (324169a).
4. Added foreign/mixed-subject and invalid-mark denial tests (324169a).
5. Added viewer and cross-school admin denial tests (324169a).
6. Added over-10-student atomic save limit test (324169a).
7. Added missing/inactive subject denial tests (324169a).
8. Added missing/foreign student roster denial tests (324169a).
9. Added missing subject assignment and existing mark/component denial tests (324169a).
10. Added mark transaction tests to npm quality gate (ffb601f).
11. Tightened student, subject and student-subject assignment schoolId checks in individual mark creation (d645387).
12. Capped class mark preflight to 1,500 students and added boundary tests (3d26c89, 1c221d1).
13. Added full-class attendance roster preflight with 1,500-student cap (a028baf).
14. Added attendance validation tests and verified preflight wrapper before chunked save (c78dc26, bc1d5c9).
15. Added verified attendance save tests, CI scripts and security structure regression assertions (2371744, ae6bc96, 285b301, 536d24c).

**Not complete:** These services are not yet wired into the V47 browser marks entry screen. Attendance's existing UI still permits selected-student batch saves. No Firebase Emulator pass, browser E2E pass, or deployment is confirmed. Atomic marks service deliberately refuses classes larger than 10 until a safe class-wide strategy is verified; do not silently split into partial saves. V46 remains unchanged.

## Next batch: teacher assignment tests and mark safety (2026-11-18)
- Conservatively reduced small-class atomic marks transaction cap from 10 to 3 pending Firestore rules access-budget emulator verification, and updated its boundary test (`99781f7`, `1fd9df2`).
- Raw mark preflight now checks schoolId of student, subject and roster assignment (`3f21384`).
- Optimized atomic class mark transaction reads with concurrent reads (`23bc8cf`).
- Added teacher assignment service mock tests covering creation, activation, deactivation, duplicate/missing membership, inactive teacher, cross-school access and corrupted status; added tests to npm V47 gate (`d7560ca`, `65f1182`, `5168b06`, `6589384`).
- Added UI warnings that raw marks and partial attendance screens are NOT full-class validated saves (`8ed1ae1`, `8cb16b6`).
- Added six class marks transaction denial cases for inactive/cross-school subject and mismatched student-subject mapping, and a Computer 4/36/10 guard test (`d3fea98`, `d018e18`).
- Explicitly inactive student-subject assignments now block individual mark service, class mark service, raw preflight and teacher Firestore mark creation; added transaction and structural assertions (`b54a62e`, `368e4b4`, `6ead3bd`, `a855047`, `aac2dfb`, `21f74ab`).
- **Unverified:** Node tests and Firestore emulator CI, full-class Save UI wiring, marks for classes over 3, teacher attendance authorization, CDC/IEMIS parity. V46 production unchanged. No V47 deployment.

## Attendance roster isolation batch — 2026-11-18
- Individual attendance writes now fetch and verify student schoolId/class before saving (`5dbc717`).
- Attendance batches verify every student record before any batch commit (`5937dc7`).
- Verified-class attendance wrapper requires nonempty authoritative roster input (`5af3d33`).
- Updated existing attendance save mock for roster reads (`6574978`).
- Added attendance roster write tests for missing, wrong-school and wrong-class students, unauthorized actors, duplicates and mixed dates/classes (`10c3427`, `82ae66b`).
- Added these tests to `npm run test:v47` (`79b06b0`).
- Roster queries now reject foreign/wrong-class documents and prevent payload IDs from overriding document IDs (`1b788be`).
- Added roster query tests for tenant isolation, forged IDs, duplicate IDs, invalid IDs and page size (`94c7129`, `6d7c850`, `cd0fcd0`); wired to CI (`54c6fca`).
- Added partial attendance batch failure test (11 students, first 10 committed, second batch fails) (`08d7fdc`) and CI script (`0449237`).
- GitHub combined commit status endpoint returned no statuses, **not evidence of CI passing**.
- **Important limitations:** attendance save uses sequential batches, not an all-or-nothing transaction; no browser E2E or emulator run verified. Existing V47 UI still allows selected-only attendance saves. Teacher attendance writing is not yet enabled. V46 production untouched.

## Teacher attendance permissions and test-gate repair — 2026-11-18
- Repaired two failing/incorrect unit test assertions: atomic class mark limit fixture and duplicate roster regex (`7b65199`, `861b1f9`).
- Added dedicated create-only Teacher Attendance service using a reserved `teacher_assignments` subjectId of `attendance` for a specific class, requiring active teacher, exact school/class roster and no overwrite (`594e963`).
- Firestore rules now authorize only matching active teacher/class attendance assignments; Teacher update/delete remain denied (`2f2bf52`).
- Added teacher attendance service contract tests covering success, inactive/missing/foreign assignment, missing/foreign student, invalid inputs, unauthorized actors and overwrite (`21ae581`).
- Added Firestore emulator teacher attendance allow/deny scenarios and integrated unit tests into `npm run test:v47` (`974e87b`, `22b7f78`).
- Validated pagination lookahead row's tenant/class scope and added test (`772189c`, `ac2295e`).
- Discovered **syntactically corrupted structural test** `scripts/test-v47-school-isolation-gate.mjs` from prior text replacement; rewrote valid script with teacher mark and attendance guards (`39181d7`).
- Teacher mark Firestore rules now require active subject document with matching school and class; emulator fixtures seed subject and test inactive subject, invalid marks (`4802e1f`, `a730dea`, `4269655`).
- Added emulator denial checks for extra attendance fields and inactive assignment (`0cb1695`, `d0cd560`).
- **Not verified:** no passing GitHub Actions, Firebase Emulator or browser E2E results; do not deploy. Teacher attendance service is not yet wired to UI. Existing V47 UI is admin-only. V46 production unchanged.

## Teacher Attendance browser integration — 2026-11-18 (16 commits)
- V47 Attendance browser now passes authenticated UID into actor and invokes `saveAssignedTeacherAttendance` for active teacher sessions; School Admin continues to use `saveSchoolAttendance` (`b9131d4`).
- Teacher bulk roster editing intentionally stays read-only; no teacher bulk-save permission has been enabled (`a75a9d2`).
- UI copy clarifies assigned Teacher create-only attendance, Viewer read-only and Admin correction rights (`867a22c`).
- Added browser integration contract test and CI test script (`a2aec6b`, `513b915`).
- Teacher must confirm a create-only attendance record before saving; contract test checks confirmation (`e2dc35c`, `0de4794`).
- Browser rechecks authenticated UID before single and bulk attendance saves (`6d60746`, `e133c0f`).
- Locks class/date/student/presence inputs while saving and tests the locks (`9765c85`, `b8e0308`).
- Added malformed teacher attendance assignment ID tests (`2731808`).
- Explicitly enables single-save control only for Admin and Teacher (`efcd3e0`).
- Added emulator test rejecting Teacher attendance after membership deactivation (`8aa63e3`).
- Extended structural rules checks for Teacher attendance payload and class assignment constraints (`9c25c2d`).
- GitHub commit workflow lookup for a prior V47 commit returned **no workflow runs**, so passing CI is NOT verified.
- **Still required:** Firebase emulator/real browser test, large-class atomic marks strategy, full-class marks Save UI, full V46 feature parity, IEMIS/CDC result checks. No V47 production deployment. V46 unchanged.

## Class-wide marks browser entry — 2026-11-18
- Added full paginated authoritative school/class roster loader with 1,500-student cap and duplicate detection (`575ef59`), unit tests (`0f33331`).
- Added wrapper to re-fetch full roster and validate every student's marks before a limited atomic transaction (`9dbceb6`).
- Added class-wide marks input table in V47 development page (`a0f3008`), wired roster loading and atomic save (`4fd4b86`), and invalidated drafts on subject reload (`98f1d1f`).
- Added wrapper and browser contract tests (`250918f`, `f293334`), wired to npm V47 suite (`ba0d4de`).
- Disabled legacy individual mark Save so browser users cannot submit an incomplete class through that route (`75316cb`, `96c0ce2`, `e418668`); regression tests added (`67f17f3`).
- Added explicit concurrency/official-result limitations (`1d3fb0`) and improved pagination stall detection (`8477104`).
- **Critical limitations:** atomic Save remains capped at **3 students**; larger classes do not save. Browser entry and rules are not emulator/E2E verified. A new enrollment between roster read and transaction is not currently checked atomically, so this is **not production-ready**. CDC/IEMIS grade and full V46 parity are not established. No V47 deployment; V46 production unchanged.

## Large-class draft validation and mark editor hardening — 2026-11-18
- Introduced **read-only** draft inspection for up to 1500 students, reporting missing/invalid/duplicate/foreign marks with no writes (`8879be4`).
- Added unit tests for complete, incomplete, invalid, duplicate and 1500-student drafts (`d934073`), plus edge cases (`c0f11a5`).
- Added Check All Students control and diagnostics in V47 Marks Entry (`28b3dd7`, `c1ab2e4`).
- Limited small-class Save now validates all draft rows before confirmation (`9653f21`).
- Locks subject, raw mark fields and every class mark row during Save (`2ba3631`, `13e118d`).
- Added UI contract assertions for draft inspector, mandatory prevalidation, row locks, scope and auth (`43b22a8`, `354e39e`).
- Added draft unit tests to V47 CI gate (`0143d66`).
- Strengthened full roster boundary, cross-school and class tests (`8a2d782`).
- Auth UID is checked before loading full-class marks roster (`9b37091`).
- Mark selector now trusts Firestore document ID over payload ID, rejects foreign school/class rows (`4c8627a`, `7ebf9f1`).
- **Critical:** This is a **draft checker only** for large classes, NOT a large-class save implementation. Atomic class save remains capped at 3. No verified passing Firebase Emulator or browser E2E results. A class enrollment change during entry is not atomically protected. V46 production unchanged and V47 not deployed.
