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


## Verified preview and localization checkpoint — 2026-11-24

At exact commit `93e09541f4bc4486767e1d497278a63833b38da9`, 13 of 15 workflows succeeded. Isolated unit/security run 45421867780 logged 262/262 offline suites passed and successful Firestore emulator checks. Core Regression 45421867772 and real Chromium emulator E2E 45421867803 succeeded. Full Verification 45421868195: full-v47 passed, feature-parity and release-readiness remain blocked. Isolated preview deployment 45421868451 succeeded; channel URL https://smss-exam-portal-v47--v47-test-mkxgy83q.web.app expires 2026-12-01 15:10:20 UTC. This is not production hosting approval.

The separate module workflow 45421867690 failed on an outdated English Marks Entry warning assertion. This commit updates the assertion to the exact Nepali disabled-publication handler and requires the Nepali non-official warning, while preserving all role and data-write guards. Its CI result is not yet known. A consolidated UI contract step reports all affected static checks instead of stopping at the first obsolete string.

The user requires English menus/buttons/field labels and Nepali information, warnings and errors. Major school and Super Admin screens have localized guidance and safe error mappings; do not claim all text is independently verified. Do not delay unresolved functional parity and actual two-school acceptance for repeated cosmetic changes. Preview may be used for approved V47-only test accounts; no real school registration, migration or deletion without an authorized School Admin identity. Production remains blocked by trusted runtime provisioning, official CDC/IEMIS verification, latest V46 parity, backups and real-school acceptance. No billing activation or V46 change.


## 2026-11-25 — Owner-directed first-release scope freeze
The owner explicitly directs that the Class 1–10 examination system follow the existing V46 format and rules, with new examination features postponed until after V47 is live. Question Paper/Question Bank expansion is paused; the new Primary Assessment reference is also deferred. Their experimental code and evidence are preserved, but their three dashboard navigation links are hidden and cannot be activated by the normal dashboard handler. This is a UI scope decision, not an authorization boundary or a claim that direct preview URLs are removed. Existing authentication and read-only protections remain in effect.

Prioritize V46-compatible Marks Entry and existing learning-achievement components (Classes 1–5), Classes 6–8/9–10 component structures, IEMIS mark-entry/mark/grade ledgers and grade sheet; keep existing V46 GPA and absence semantics. Do not add new assessment denominators, curriculum formats, term requirements or question banks before release. Preserve current student/staff/attendance and school management workflows, tenant isolation and Spark-only configuration.

Last verified head before this scope change: `118a950ea9cdcd9d9033ad75d82364668f6ecfca` — 12/13 workflows successful, real Chromium emulator E2E 45532218110 successful; Full Verification 45532218071 failed. Not a production acceptance. Remaining actual gates include V46-compatible operational publication via trusted runtime, verified grading/report parity (including absence), live V47-only two-school acceptance, backup and Spark quota checks. Never change V46 main or enable raw per-document mark writes to force a green release gate.

## Verified checkpoint — 2026-11-27
Exact tested head `41e55d7c9431fccfcf38b362ac96872702f4dcf5`: 12 of 13 workflows SUCCESS, Full Verification remains FAILURE (45937417789). Chromium E2E run 45937417657 SUCCESS, including actual synthetic grade 1 Annex 2 (4 columns, 5 rows) and grade 4 Annex 4 (6 columns, 7 rows) PDFs, both single A4 landscape pages. Artifact: https://github.com/Babu3211/School-Exam-Portal/actions/runs/45937417657/artifacts/15170824270 . Physical-page automated checks are not pixel-level CDC approval. Other completed successful checks include Firestore isolation 45937417766, security 45937417873, structural 45937417728, unit/security 45937417660, Multi-School Validation 45937417770, preview build 45937417883. 

Primary assessment now has source-bound teacher drafts, local curriculum review, annual annex exports, class/subject coverage analytics, historical attendance review and report navigation. Do not rebuild these. Official assessment publication, historical observation reconciliation, local rubric approval and exact CDC/IEMIS acceptance remain open. The trusted marks staging/commit implementation and synthetic tests already exist; raw marks/component client write denials are intentional. The operative blocker is approved execution and actual acceptance, not a need to open raw write permissions. The Spark static host cannot run Node API routes; the standalone loopback runtime deliberately disables privileged final writes. A trusted school-owned computer or separately authorized secure runtime must be provisioned and tested before any final write route can be enabled. No billing change or live release without explicit approval. No actual project access or live acceptance established through GitHub alone.

Release diagnostics now explicitly distinguish built development modules from unapproved operational readiness, while still always exiting nonzero. No safety rule, grading formula, deployment configuration or publication permission changed.

## CI diagnostic repair — 2026-11-27
Head `f43979ab5ddd46d42deb9ead36208bcd1e29f463`: 12/14 workflows successful, including Chromium E2E (45939868930), Firestore isolation (45939868733), and core regression (45939868944). Full Verification (45939868828) deliberately failed. Mark Validation (45939868847, job 140311460063) failed at old exact-text grep assertions after diagnostic wording was updated, not a marks calculation failure. The Mark Validation workflow now requires exit code 1 and current explicit release-refusal messages; a unit test executes the actual gate and checks those reasons. No publication permission, calculation, live project, or production release gate is relaxed. New head CI must be checked independently.

## 2026-11-27 — Live settings audit preparation
Verified head `ff7530af8222bd02fe81692c179b739fc3d065de`: 13/14 workflows successful, Mark Validation 45941002369 PASS; Full Verification 45941002465 remains blocked (full-v47 job passed, feature-parity and release-readiness failed). Added an Admin-only, bounded class/term settings audit to Marks Entry: checks current registered subject IDs, canonical settings ID, missing/duplicate/inactive/foreign records, primary count × 4, and secondary V46 component maxima including Computer. Does not auto-map legacy subject names, write records, certify current IEMIS or activate any school. Actual migrated school must run this against its authorized V47 session after activation prerequisites; no current live results inferred. New commit CI pending.

## Settings audit Excel and emulator acceptance — 2026-11-27
Added fresh-read Excel export to the existing class/term settings audit. The workbook includes school/class/term, subject ID, saved versus expected schema and explicit non-IEMIS-certification notice. Synthetic Chromium test exercises a matching primary setting, missing first-term setting, clearing on term change, workbook contents and original settings unchanged. Malformed inactive components no longer abort the entire diagnostic. No auto repair or production writes. New commit CI pending; no live-school setting count inferred.

## All-term settings audit — 2026-11-27
Head `857c77e0428774ad1c5c796b11496fe55f3a5325` had 9/13 successful workflows including Browser E2E (45959569795), Firestore isolation (45959569858), and preview build (45959569769). Three regression workflows failed due to the static class-change assertion requiring the original option/roster invalidation prefix (test-class-mark-ui.mjs); the controller retains that order and clears the settings audit immediately afterward. Four-term XLSX export now uses one class catalogue and one bounded scoped settings query (maximum 800 settings) and separates missing/matching entries per term. No automatic repair, live IEMIS acceptance, or real data reads. New head CI pending; Full Verification remains deliberately blocked.

## 2026-11-27 — Operator-only staged-school acceptance audit
Verified b3cfab6: 12/13 CI workflows passed, Chromium 45987996990 and Firestore isolation 45987997058 successful; Full Verification remains blocked. Added a target-only read-only Cloud Shell diagnostic for an inactive staged school, using the operator's existing gcloud access and bounded masked Firestore GET requests. Run from the repository root using Node 22: `node v47/diagnostics/staged-school-settings-audit.mjs <IEMIS-school-ID>`. Output aggregates class/term schema status, legacy/noncanonical settings, school active flag, membership and assignment consistency. No document IDs, emails, credentials or raw records printed; no source reads, writes or activation. Caps 1000 subjects, 4000 settings, 300 members, 1000 assignments; separate reads are not a consistent snapshot, and quota/permissions still apply. Empty subject catalogs, legacy mapping and actual Auth sign-in need independent review. Run synthetic test `node v47/test-staged-school-settings-audit.mjs`. Real operator execution not performed by GitHub connector. CI pending.

## 2026-11-27 — Existing credential target-only operational check
Exact head 39cf664 passed 12/13 workflows (including 45989276695 unit/security and 45989276589 browser). The new target-only workflow is deliberately bounded to the previously identified staged school 300160003 and V47 project, uses only the existing V47 deployment credential to obtain a token, makes masked GET requests only, and reports aggregate counts. No source credential, no Auth enumeration, no writes, no deployment, no activation, no new IAM grants. Push trigger is restricted to the workflow file, so ordinary code changes do not repeatedly read the live project. If the credential lacks read access, stop; an authorized Cloud Shell operator may run the same script. Results are not a migration completeness or IEMIS approval. CI execution pending.

## 2026-11-27 — Actual staged school audit evidence
Run 45989812445 at b84081c completed successfully against the actual target V47 school, inactive registry. Observed 74 active class subjects, 79 saved mark_settings, zero recognized canonical term settings in that collection, 296 class/term subject combinations missing canonical active settings, 15 members (0 active Admin), 66 assignments (7 require review). Firebase writes zero. This is not evidence that 79 old settings are lost; previous 53-entry-setting checkpoint may refer to a different preparation stage or collection and is not confirmed as current canonical records. Added masked legacy fields and aggregate exact-name/class candidate classification, explicit term/class ambiguity and validated preview counts, and distinct assignment reason categories. Never infer terms, change maxima, activate members, or write settings. The revised target-only workflow is triggered once by its workflow-file change; results pending. Actual V46 source not accessed. No raw subject/teacher IDs or personal records printed.

## 2026-11-28 — Legacy audit diagnostic repair
Run 45990066375 at caa5499 passed synthetic tests and read the actual inactive registry, 74 subjects, 79 settings, 15 members and 66 assignments, but stopped after inventory reads with a generic diagnostic. Exact cause was not available in the prior log. Fixed registry comparison to use typed fields rather than unstable JSON property order; hardened legacy class/term classification against unusual Firestore values and inherited object keys; added aggregate field-type counts and explicit stage markers plus allowlisted failure reasons. The next bounded target-only read will identify whether registry or schema classification remains blocked. No raw values, teacher or student details, project changes, or writes. Development workflows 12/14 passed; actual audit and release verification failed. New head pending.

## 2026-11-28 — Verified actual legacy schema and V46 preservation refresh
Actual audit 46090365642 succeeded at 9f2db13: 74 active subjects, 79 legacy settings (all lack explicit term/classId/subjectId; 74 have className, five group-only), 45 exact-name/class candidates, 34 no exact registered subject, 15 members, 0 active admins, 59 structurally valid assignments and seven missing/wrong-class subjects. Prior 53/74 checkpoint was a plan, not persisted canonical settings. Added candidate-only reconciliation using existing IEMIS/primary subject aliases, component-shape checks independent of term assignment, counts by class, and separate missing versus wrong-class assignment diagnoses. No settings, grade or assignment mutation. Development checks failed because current main advanced to 541b417d5c6c85b70678ef0168872719a5447daf (V46 assessment Delete All fix) and six shared V46 files differed. Copied their exact current main blobs into V47 branch only; preservation assertion remains unchanged; V46 main, deployed system and V47-specific files/rules unaffected by this copy. Source snapshots remain pinned separately. New CI and actual audit pending.

## 2026-11-28 — Actual mapping evidence and V46 quarantine inventory refresh
Actual target audit 46090715402 succeeded at 0c29afa: 45 exact name/class candidates + 18 existing alias candidates = 63 unique candidates with valid component shapes, five group-only settings need expansion review and 11 have no existing alias candidate. All 79 lack term metadata. Seven of 66 teacher assignments refer to missing subject IDs, not subjects registered to another class. These are candidate records, not proof of distinct target coverage or approved conversion. No live changes. Main's V46 matrix/delete changes caused the old quarantined source transformation to refuse new dynamic calls (285/286 offline suites passed). Reviewed actual main compare 82b01c4...541b417: matrix uses only the two CDC collections, three collectionName calls; class deletion inventory adds one name call over the same two collections. Updated exact counts, selector checks and guarded path rewrite; unknown dynamic calls still fail, no runtime Firebase access, quarantine remains non-deployable. V46 main and all live data unchanged. CI pending.

## 2026-11-28 — Private operator review workbooks
At 8ea7202 the previously failing quarantine/development/security checks passed; browser was running when reviewed and Full Verification remained blocked. To turn the actual 79 legacy settings and seven orphan assignment observations into actionable review, the existing staged audit now supports `node v47/diagnostics/staged-school-settings-audit.mjs 300160003 --local-review` using authorized Cloud Shell Node 22 and gcloud auth. The optional flag is rejected in GitHub Actions. Creates exclusive 0600 XLSX files under a new private home directory: settings review lists original class/subject/maximums and all candidate IDs, unresolved/group/duplicate-target cases, and an EMPTY operator term review column; assignment review lists orphan IDs, stored subject labels if present, and unique candidate only when supported by exact existing aliases and same class. No student data, marks, passwords, emails or tokens, no upload, no changes to either project. Aggregate CI output gains distinct validated target counts and duplicate-target counts, but no raw IDs. This is a human review worksheet, not an import format, approved mapping or write plan. No new live read triggered by this commit. Run synthetic tests and use operator workbooks privately; real output not created here. New CI pending.

## 2026-11-28 — Term compatibility without invented settings
Head 2402081 passed 12/13 workflows (Browser 46092707915, isolation 46092707841); Full Verification 46092707895 failed. The previously reported 53 matched entry settings was an offline preparation checkpoint, not confirmed committed canonical data. Legacy settings are term-independent; the selected exam supplies the term. The staged-school diagnostic now checks each unique single-source subject against the preserved V46 IEMIS schema for each of four terms, using the existing create-settings pure validator and entry settings audit, without changing maxima or assigning terms. A primary derived full-marks field is represented by the existing count/obtained pair only in memory. Duplicate targets excluded; custom maxima and incompatible annual/terminal shapes are flagged, never automatically converted. Local XLSX gains four compatibility columns. Existing target-only workflow is triggered once; no marks, source project or credentials exposed, no writes or activation. This compares schemas, not actual selected exams or live IEMIS. New CI/operational audit pending. Real source index exceeded the connector's file-text access; reference modules and previously verified term-independent design were used instead.

## Owner clarification — configurable assessment maxima for every class
School-defined Assessment Settings, not fixed IEMIS reference maxima, are authoritative for configured entry. Corrected settings audit to count validated custom components/maxima as ready, retaining exact reference match as a distinct informational status. Expanded settings audit to ECD/LKG/UKG/1–12 (no IEMIS reference for outside 1–10); existing explicit primary achievement pair still enforces count ×4, but generic primary assessment components are accepted without forcing that mode. Legacy custom primary previews use ordinary component validation; term schema diagnostic no longer rejects valid custom settings. Tests cover 137.5 + 62.5 maxima for every supported class and invalid negative values, plus custom primary migration. Existing numeric safety bounds, identity, authorization and no-write gates remain; no change to official IEMIS export certification or live data. New CI pending. No term assigned, no settings overwritten. Actual production publication remains blocked. This change corrects the prior fixed-schema audit assumption, not a completed end-to-end live validation.

## Configurable maxima — positive real browser test
Head 1bd5eae had 11 successful workflows, browser running and Full Verification failed when reviewed. Updated the existing Browser E2E wait assertion to the new valid-settings wording (no coverage removed). Added a synthetic school Admin scenario for Class 1 Mathematics, 1st term: create 137.5 + 62.5 custom assessment components, verify actual saved settings, classify valid without IEMIS match, export audit and sample, check header/input limits, reject 138 against 137.5, check and export accepted marks, save/reload a non-official class draft of 200, preserve existing Final settings and other school's data. All new fixture writes are emulator-only, cleaned up; no live settings or marks changed, no publication of custom grades. New CI pending; no real school end-to-end approval yet.
