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
