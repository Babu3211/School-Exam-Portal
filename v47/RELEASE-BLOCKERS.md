# V47 release blockers (as of development branch)

1. Confirm Firestore rules compile and the emulator isolation suite passes on GitHub Actions.
2. Verify browser console sign-in against V47-only Firebase; never point at V46.
3. Verify inactive-first school registration, first Admin membership, activation and pagination with a test school.
4. Implement teacher assignment-aware marks and attendance writes with explicit rules and emulator tests.
5. Verify V46 feature parity in V47: CDC GPA, IEMIS 2083 ledgers, grade sheet, attendance, PWA, viewer read-only.
6. Test multiple schools, realistic 300–1500 student rosters and Spark-plan quotas.

No V47 production deployment until blockers are resolved. V46 production is excluded from these tests.

## Final acceptance gate
Do not interpret new test cases or committed source as proof that tests passed. Verify the V47 GitHub Actions workflow conclusion is **success** on the exact release commit. Run the Super Admin console in a real browser against the separate V47 Firebase project and record a successful two-school isolation test. Confirm school-admin marks/attendance flows and full V46 feature parity before any V47 hosting release. No deployment to V46 or main from this development branch.

## Verified CI checkpoint — 2026-11-18

Commit `780dac79e4818d09b556da695eca62e947060f23` passed all four triggered workflows:
- V47 isolated module checks — run 44343625068: success
- V47 isolated security tests — run 44343625175: success
- V47 Firestore isolation — run 44343624907: success
- V47 Multi-School Development Checks — run 44343624977: success

This verifies the current automated checks for rule compilation, tenant isolation, and assignment-aware teacher mark/attendance correction. It does **not** establish live V47 Firebase sign-in, browser-based two-school testing, full V46 feature parity, or Spark-scale performance. Keep release blockers 2, 3, 5, and 6 open; blocker 4 has emulator coverage but still requires browser confirmation. Never deploy to V46 production/main from this branch.

## Expanded CI checkpoint — 2026-11-18

Commit `8124ec9372b22be3c7e789c74b7f8f0534aa450c` completed **six of six workflows successfully**:
- Tenant foundation — 44349440872
- Firestore isolation — 44349440500
- Isolated security — 44349440829
- Unit/security contract — 44349440864
- Module checks — 44349440748
- Multi-School Development — 44349440459

Offline pagination simulations now cover 1,500 records in one school and 30 schools with 500 records each (15,000 simulated records total). These are correctness simulations, **not** live Firestore performance, billing-quota, or cross-school production tests. Browser sign-in, real two-school isolation, V46 feature parity, and real-scale Spark quota measurements remain open release gates.


## Non-duplicative release audit — 2026-11-22

Earlier **historical** successful CI runs documented above (2026-11-18) must not be confused with a successful run for the current branch head. Current head CI has not been independently verified.

Source-verified current blockers:
- `index.html` is still explicitly a **Development Hub**, not a complete V46-equivalent dashboard.
- `marks-entry.html` still disables Save.
- `class-mark-save.mjs` still rejects classes over three students.
- `class-mark-staging-plan.mjs`, `verified-class-mark-staging.mjs`, and `class-mark-staging-integrity.mjs` are read-only preparations; they do **not** write or publish marks.
- `release-readiness-gate.mjs` intentionally exits nonzero. Preserve it.

**Next execution order (avoid repetitive micro-fixes):**
1. Retrieve actual current GitHub Actions run and job logs; fix real failures, not speculative test assertions.
2. Inventory V46 production routes/features against V47 pages, and prioritize direct reuse/adaptation of working V46 UI.
3. Wire real tenant-scoped login, school context, and roles into the reused screens; test two schools.
4. Design and emulator-test Spark-compatible complete-class staging + manifest commit + read visibility, including interrupted uploads and roster changes. Never enable raw mark writes as a shortcut.
5. Validate V46 IEMIS/CDC results, configurable subject components, attendance, Excel import/export, mobile/PWA, viewer read-only, and large rosters.
6. Require green CI at the release commit, browser tests, backups and explicit deployment approval.

**Stop rule:** No further isolated staging-validation commits without a reproducible failing test. No V47 deployment while any release blocker remains. Never change V46 `main` without explicit permission.


## V46-to-V47 UI source comparison — 2026-11-22

Directly inspected **V46 `main/index.html`** (493,155 characters), **V46 `main/manifest.webmanifest`** (557 characters), and V47 development branch `index.html` (4,048 characters) and `students.html` (3,104 characters).

- V46 is an integrated single-page portal with sidebar, menus and existing school workflows; V47's current index is a link-based development workspace. The latter is not a migrated production dashboard.
- V46 ships an installable PWA manifest (`SMSS Exam Portal`, standalone, 192/512 icons). Equivalent V47 installed-app parity has **not** been established.
- V47 Students currently exposes a **manual Firebase config JSON textarea** and an IEMIS-invalid example `school_001` for school ID. Replace this prototype onboarding with V47-project-only configuration and authenticated school selection before calling the UI integrated.
- Do not copy V46's hard-coded single-school Firebase settings into V47. Adapt its UI and features behind tenant-scoped V47 services.

**Next implementation target:** V47 project-only Firebase bootstrap, shared authenticated school context, then V46 feature screens. Do not spend another iteration on read-only marks staging assertions.


## Current verified handoff — 2026-11-24

**This section supersedes older source-status descriptions, not the release safety gate.** Exact tested head `9c65d46df4560d8e69bfcd8fce5b967bbb2ea611`: 12/13 workflows completed successfully. Full Verification run 45397318847 has full-v47 SUCCESS (job 138456434964), feature-parity FAILURE (job 138456434354), release-readiness FAILURE (job 138456434925). Publication Unit Tests 45397318902, Firestore Isolation 45397318917, Core Regression 45397318859, Hosting Build 45397318663 and Multi-School Validation 45397318791 are SUCCESS. All are non-production evidence.

Already implemented: school-scoped login/dashboard/sidebar, school management, Excel import/export, complete-class Admin/assigned-Teacher drafts, configured assessment components, trusted server review/staging/atomic publication, immutable pointer/header/audit/current read view, Spark read-only published report views, four IEMIS preview reports, watermark, PWA install surface, assignment-aware attendance, and opt-in trusted atomic attendance. Do not reimplement these solely because historic blockers above describe earlier prototypes. Real HTTP publication and 101/500-row atomic attendance were tested on a local Admin emulator; 1500-row publication unit coverage is not production load evidence. Raw marks and component_marks client writes must remain DENIED: this is intentional and not a permission to remove the boundary to turn the gate green.

**Actual remaining work:**
- Select and provision the trusted runtime under the owner's Spark-only constraint. Firebase static hosting cannot execute privileged Node publication or atomic attendance. The current local runtime is loopback-only and final-write routes are disabled by default. A school-owned computer used for authenticated, operator-driven publication is a possible no-Firebase-compute-cost approach; it requires independently approved configuration and real operation. A publicly available server requires separately secured HTTPS and operations. Do not activate billing or deploy a privileged runtime by assumption.
- Verify the latest V46 dashboard and feature parity, including official CDC/IEMIS 2083 grading, absent/NG handling and printed grade sheets; primary assessment and current V46 question-generator work in other branches must not be assumed integrated. Drafts and watermarked previews are NOT official results.
- Perform real two-school V47 Firebase browser sign-in, onboarding, school-admin and assigned teacher workflows, viewer read-only, mobile PWA and cross-school denial. Confirm backups, actual Spark quotas, and release sign-off at the exact deployment head. Do not use real V46 data or credentials in these checks.

No production or preview hosting deployment performed in this checkpoint. No verified access to the real V47 Firebase account, deployment secret metadata or browser session was established by the available repository connector. A successful CI build does not demonstrate a live site. Do not keep making speculative staging-validation changes while these operational prerequisites remain unresolved.
