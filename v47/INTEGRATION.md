# V47 integration boundary

These V47 modules are **not wired into the existing V46 HTML application**. They are safe development-only building blocks.

1. Use the V47 Firebase project and authenticated SDK. Do not use V46 production credentials or write to V46 collections.
2. Bootstrap the first Super Admin through a trusted administrator process, not a public client form. The `v47_super_admins/{uid}` rules deny all client writes.
3. Deploy `v47/firestore.rules` only after emulator and manual security review. Never overwrite the V46 `firestore.rules` or default `firebase.json`.
4. Register a school through `registerSchool`; new schools are disabled by default and must be activated by a verified Super Admin.
5. Load school records with `createSchoolStore`; its school context is validated before any SDK calls.
6. The general school adapter is read-only. A separate, validated School Admin-only student-create service exists. Do not implement teacher mark writes without server-enforced class and subject permissions.
7. The current V47 rules allow school admins to modify scoped academic collections and members; review membership privilege escalation, sensitive fields and all record schemas before any production release.
8. Existing V46 UI and data are not migrated. Do not advertise V47 as deployed or fully integrated.

## Multi-school development navigation

`v47/index.html` is a mobile-friendly static navigation hub linking the existing V47-only school administration, student, attendance, subject, assignment, raw marks and diagnostic pages. It contains no Firebase credentials or automatic login and is not the V46 production dashboard. Individual screens still require their own V47 Firebase configuration and membership verification. The `scripts/test-v47-development-hub.mjs` check verifies link destinations and safety notices. This navigation is **not** proof of V46 feature parity, unified session management, verified CDC/IEMIS results or deployment.

## Development-only pages

- `v47/admin.html`: Super Admin school registry and activation.
- `v47/school-admin.html`: verified School Admin membership and teacher/viewer membership creation.
- `v47/students.html`: school-scoped students browser. School Admin can **add** a student with English name, ECD–12 class and optional roll number; Teacher and Viewer remain read-only. Existing students are not edited or deleted by this screen.
- These pages require a manually supplied **V47-only** Firebase web configuration and an existing authenticated user. They are not a V46 UI migration, do not provide marks entry and are not production deployed.
- The V47 Firestore rules must be deployed to a separate V47 project only after emulator tests pass. Existing V46 rules must not be overwritten.

- `v47/records.html`: school-scoped, read-only academic record preview (classes, subjects, exams, marks, attendance, mark settings and staff). This is raw data preview, **not** IEMIS/CDC calculation, Mark Ledger, Grade Ledger, Grade Sheet or marks entry.

## V47 attendance write foundation

`v47/attendance-service.mjs` provides School Admin-only, school-scoped single-student attendance writes. It accepts an explicit ISO date (`YYYY-MM-DD`), student ID, class ECD–12 and boolean presence; document IDs are deterministic (`date_studentId`). The V47 Firestore rules independently validate shape and ID. This is a development service only: it does not yet implement automatic Nepal-local date, bulk class attendance, V46 attendance UX or IEMIS sync. Teachers remain read-only until scoped assignment authorization is designed and tested.

## Nepal-local date utility

`v47/nepal-date.mjs` computes the Gregorian calendar date in `Asia/Kathmandu` (UTC+05:45), including near-midnight boundaries. It is **not** a Bikram Sambat date converter; do not treat its ISO output as a BS/IEMIS date. Attendance UI wiring and full production verification remain pending.

## Attendance browser preview

`v47/attendance.html` is a standalone development-only attendance screen using the V47 Firebase project. It verifies active school membership, loads only `schools/{schoolId}/attendance`, displays a Nepal-local Gregorian date by default, and allows School Admin to save one student's presence at a time. Teacher and Viewer are read-only. The table filters **loaded pages client-side**, so a matching record may not appear until later pages are loaded. This is not a full class-wise attendance register, automatic BS date conversion, or IEMIS sync. It is not deployed.

## Class roster on attendance preview

The attendance development page now lists school-scoped students for a selected class in pages of 50 and lets a School Admin select a student without manually typing its Firestore document ID. This is **not** bulk attendance saving; each save remains one student at a time. Student query uses a class equality filter and document-ID order, which may require index verification in the target Firebase project. Real emulator/browser verification remains outstanding.

## Indexed class/date attendance reading

The attendance page now requests only the selected class and Nepal-local Gregorian date from Firestore, instead of filtering an unrelated collection scan. The isolated `v47/firestore.indexes.json` declares composite indexes for attendance date/class and student class pagination, referenced by `v47/firebase.v47.json`. Index deployment and live reads have not been verified. No V46 production config or deployment changed.

## Class attendance batch preview

School Admin can mark loaded roster students Present/Absent and save up to **10 selected students** atomically per confirmation. The conservative limit accounts for Firestore security-rule document access budgets (each write verifies the student belongs to that school and class). The UI explicitly warns that saves overwrite those students' records for the selected date. Larger classes require multiple saves. Teacher/Viewer remain read-only. This is a development feature, not verified in the Firebase emulator or deployed to production.

## Attendance batch emulator regression cases

The V47 Firestore emulator suite now contains a 10-student atomic attendance batch, a valid-plus-invalid batch that must fail entirely, and a Viewer write-denial batch. A successful emulator run has **not yet been observed**. The browser clears successfully saved selections so a second click does not immediately re-save them. V46 is unchanged.

## Chunked full-class attendance (development)

`v47/attendance-class-save.mjs` validates the full selected roster before writing, then commits sequential Firestore batches of 10 records. The attendance page permits up to 1,500 selected loaded students; users must page through the class roster first. **This is not one atomic transaction**: if batch 2 fails, batch 1 remains saved. The progress callback removes only successfully saved student selections, leaving unsaved selections available for retry. Confirmation warns of overwriting records. This is still unverified against live Firebase and emulator, and does not implement BS dates or IEMIS synchronization.

## In-flight save protection

The browser now blocks login/logout, class/date changes, roster refresh, and selection changes while chunked attendance saves are running. A progress callback exception does not convert already-committed writes into a false failure report. The class/date attendance view is refreshed after a completed save. These are development code checks, not a verified browser or Firebase emulator run.

## School-scoped marks foundation (development only)

`v47/marks-service.mjs` provides a school-admin-only save operation under `schools/{schoolId}/marks/{term}:{studentId}:{subjectId}`. It validates ECD–12 classes, terms `1st`, `2nd`, `final`, student/subject IDs and numeric theory/practical values. V47 rules require the student to exist in the same school and class, and prohibit forged fields and teacher/viewer writes. **These 0–100 input bounds are generic safety checks, not CDC/IEMIS full-mark rules.** Subject full marks, internal/external component limits, grades, GPA, NG, Mark Ledger, Grade Ledger and Grade Sheet remain unimplemented/unverified in V47; do not use these fields to calculate or publish results. No V46 production changes or V47 deployment.

## Mark ledger read query and security repair

`v47/marks-query.mjs` now pages marks by school, class and term; its composite index is declared in `v47/firestore.indexes.json`. This is a raw record query, **not** a CDC/IEMIS grade or mark ledger calculation. A malformed Firestore rules edit was discovered and repaired in the V47 development branch, and additional static tests guard against duplicate rule fragments and wildcard mark-write bypass. Firebase Emulator execution and deployment are still unverified.

## Read-only marks preview UI

`v47/marks-preview.html` and `v47/marks-preview-console.mjs` provide an independent development-only authenticated school-scoped raw marks viewer with class ECD–12, 1st/2nd/final term filters and paginated loading. Teacher and Viewer may read records for their active school; no mark-writing controls exist on this page. It is **not** a CDC/IEMIS grade calculation, Mark Ledger, Grade Ledger or Grade Sheet. The V46 application remains separate. Browser testing, index deployment and emulator verification are still pending.

## Raw marks CSV export (development only)

The read-only marks preview can export only currently loaded rows for the selected school, class and term as a UTF-8 CSV. `v47/marks-preview-export.mjs` escapes CSV quotes and prefixes spreadsheet formula-like values to reduce CSV formula injection risk. This is **not** a Mark Ledger, Grade Ledger, Grade Sheet or official result, and cannot calculate CDC/IEMIS grades or GPA. The export is limited to 1,500 loaded records. It does not access or change V46 data.

## Raw marks audit and race protection

The V47 read-only marks preview now checks only the currently loaded records for duplicate student/subject combinations, missing IDs, wrong class/term and invalid numeric fields. The audit explicitly reports `complete: false`: it cannot prove that all students, subjects, pages or CDC/IEMIS marks are present. The preview rejects stale class/term query responses and disables CSV export during loading; CSV formula-like values preceded by whitespace/control characters are escaped. No grade or GPA is calculated. Emulator/browser/CI outcomes have not been verified.

## Result publication readiness (fail-closed)

`v47/result-readiness.mjs` checks class/term roster consistency, duplicate identities, student–subject mark coverage, raw mark anomalies and whether all pages were loaded. Its `ready` value is **always false** until a verified CDC/IEMIS grading engine, class-specific subject requirements, full-mark configuration and grade-sheet parity are implemented and independently tested. The current complete Cartesian student–subject matrix is a conservative diagnostic and **not** a rule that every student must take every optional subject. This module does not write marks, calculate GPA or authorize publication. Tests are added to the V47 CI workflow, but their execution has not been confirmed.

## Student-specific subject coverage and mark references

Result readiness now accepts an explicit `requiredSubjectsByStudent` mapping (student document ID to an array of required subject document IDs). It **does not assume every student studies every subject**: optional subjects may differ per student. Missing or malformed assignments block readiness, as do absent expected student–subject marks and marks for unassigned combinations. This mapping is an in-memory validation input only; **the actual subject-assignment persistence and verification against V46/IEMIS are not implemented**. The readiness gate remains fail-closed even when all raw checks pass.

V47 Firestore rules now also require the mark's subject document to exist under the same school before accepting a mark write. A subject's existence does **not** verify the class, subject allocation, maximum marks, component weights, CDC grade or GPA; these checks still require validated school-specific configuration. The emulator suite has an added subject-reference test, but no successful emulator run has been confirmed. V46 production remains untouched.

## Subject-specific full-mark audit (no grade calculation)

`v47/full-marks-audit.mjs` checks raw theory/practical marks against **explicitly provided** `subjectLimits` (`subjectId: {theoryMax, practicalMax}`) for a selected class and term. The result readiness gate blocks missing subject limits or marks exceeding those limits. This is only a validation input; no V46 subject configurations have been imported or verified and no IEMIS/CDC grading formula, NG or GPA is computed. In particular, the known Class 9–10 Computer component pattern must not be guessed or reduced to two components without comparing the actual V46/IEMIS schema. Production result publishing remains disabled.

## Variable-component subject preparation

`v47/component-marks-audit.mjs` now accepts an explicit list of named components with maxima for each subject and checks a matching set of raw component scores. A **three-component example** with maxima 4, 36 and 10 is covered by tests, but this example is **not a verified mapping** of V46/IEMIS Computer theory/practical/internal assessment fields. No live marks schema, UI, Firestore write rule or CDC grading calculation has been changed to use three components. `assessResultReadiness` explicitly blocks publication if multi-component entries are supplied because storage and grading are not integrated. Verify original V46 and IEMIS subject metadata before choosing component names, grade formulas or migration.

## Latest multi-school marks safety hardening

Raw marks and variable-component audits now detect malformed identities and duplicate student–subject entries. Readiness checks detect references to unknown students or subjects and ambiguous overlap between legacy two-field marks and proposed component entries. The marks preview rejects stale asynchronous sign-in responses and disables CSV export until all queried pages have loaded; it also enforces the 1,500-row ceiling. Firestore emulator tests now check that a subject present only in a different school's collection cannot be used for a mark in this school. These are development safeguards only; none of them authorizes result publication, CDC grading, IEMIS synchronization, V47 deployment, or modifications to V46 production.

## Independent academic data integrity audits

The development branch includes three new read-only diagnostic modules: `subject-assignment-audit.mjs` checks student-specific optional/required subject selections against the supplied student and subject rosters; `subject-catalog-audit.mjs` checks subject IDs, names, optional class and active-flag metadata; and `mark-coverage-audit.mjs` checks that explicitly assigned student–subject combinations have corresponding marks for the selected class and term, with duplicate and unexpected mark detection. All three have Node regression tests and CI workflow steps. These inputs are supplied in memory and are **not** verified against live V46/IEMIS school configurations; the modules do not write Firestore data. Result readiness remains explicitly false until CDC/IEMIS parity, grading, storage and complete production integration are independently validated. GitHub Actions and Firebase emulator successful execution has not been confirmed.

## Exam readiness diagnostic reports (not results)

`v47/result-diagnostic-report.mjs` builds a frozen, non-publishable diagnostic summary of students, subjects, marks, expected/checked student–subject pairs and explicit blockers. `v47/diagnostic-report-export.mjs` exports only this non-publishable summary to CSV, never student grades, GPA, or a ledger. Both modules have development-branch CI checks. The subject assignment audit flags inactive assigned subjects, and the readiness gate detects overlap between two-field and component-based mark entries after building both identity sets. No real marks were edited; no deployment or IEMIS synchronization was performed.

## Result diagnostics (development only)

`result-diagnostic-report.mjs` produces a frozen summary of school class, term, raw mark counts, explicit expected student–subject pairs and validation blockers. Its `ready` and `publicationAllowed` fields are always false; grade ledgers and grade sheets are always unavailable. `diagnostic-report-export.mjs` exports only this validation summary as CSV, with spreadsheet formula injection protection, bounded blocker count and validated numeric counts. No student names, personal details, grades or GPA are exported. Both modules are covered by Node tests in the non-deploy V47 CI workflow. This does not replace official IEMIS-aligned reports and must not be presented as an exam result.

## Development-only raw marks entry page

`v47/marks-entry.html` and `marks-entry-console.mjs` provide a standalone V47-only Firebase sign-in for an active **school_admin**. The page loads school-scoped students and subjects, selects class and term, and saves one raw theory/practical mark via `saveSchoolMark` to `schools/{schoolId}/marks/{term}:{studentId}:{subjectId}`. The form requires both class student roster and subject list to be loaded and disables saves during pending requests. The existing Firestore rules validate student class, subject existence, allowed mark fields, tenant scope and admin role. This form **does not** verify student optional-subject assignments, official subject-specific maxima, 3-component Computer marks or CDC grading; it can overwrite an existing raw mark. Do not use for official results or live school marks until all those checks are integrated and Firebase emulator/end-to-end tests pass. V46 production and main are untouched.

## Create-only raw mark safety improvement

The V47-only raw mark form now calls `preflightRawMarkSave` to verify the selected student's class, subject existence, subject class (if specified), active flag and whether a mark already exists. It uses `createSchoolMarkOnly` with a Firestore transaction that refuses to overwrite a record even if a concurrent save occurs after preflight. Both paths have Node regression tests in CI. This is not a substitute for Firebase security rules or CDC/IEMIS full-mark and optional-subject verification. The older `saveSchoolMark` API still supports upsert and must not be used in the development form. No live data migration or production deployment was performed.

## Transaction revalidation of marks creation

The create-only V47 raw marks transaction now reads the target student, subject and existing mark before writing. It checks the student's current class, the subject's active flag and optional class scope, and refuses any existing mark. This closes the gap between a browser preflight and a concurrent change to the student or subject documents. Browser roster load failures now clear stale selections. These are client and transaction safeguards, not a replacement for Firestore rule enforcement or an official grade policy. The current page still loads an entire school collection with a 1,500-record cap and must be redesigned with class-filtered pagination for larger schools.

## Marks immutability and referential safety

The V47 development-only Firestore rules now allow raw mark **create** only; updates and deletes are denied for all client roles, including Super Admin, pending a reviewed correction and audit process. The rule checks same-school student class, same-school subject existence, optional subject class and inactive subject flag. The create-only transaction also re-reads student and subject records to reduce stale-form races. The emulator test source asserts update/delete and invalid-subject denial; emulator execution remains unverified. This restriction does not affect V46 production rules or data.

## School-scoped subject configuration (development only)

`v47/subjects.html` allows an active school administrator to create a subject ID, English name, and ECD–12 class in the V47 project only. `subject-create-service.mjs` uses a transaction and refuses to overwrite an existing subject. The dedicated `/subjects/{docId}` Firestore rule validates subject keys, class, name and active flag; it denies client-side updates and deletes until an audited correction workflow is designed. This avoids the prior unrestricted generic subject collection write. It does not assign students to subjects, set IEMIS/CDC full marks, or populate official subject lists automatically. Subject definitions must be verified before real use; V46 production is untouched.

## Student–subject assignments (development)

`assignment-validation.mjs` and `assignment-create-service.mjs` implement an atomic create-only student–subject relationship in `schools/{schoolId}/subject_assignments/{studentId}:{subjectId}`. The service checks an active school-admin membership, student class, matching active subject and duplicate assignment. Dedicated Firestore rules enforce the same scope and deny client updates/deletes. The emulator test now includes cross-school, viewer, inactive subject and wrong-class rejection cases. **Raw marks creation does not yet require a matching assignment**; this remains a blocking integration task before real examination use. This does not modify V46 or automatically assign required/optional subjects.

## School-admin assignment browser workflow

`v47/assignments.html` + `assignments-console.mjs` now let an active School Admin sign into the isolated V47 Firebase project, choose ECD–12 class, load class-filtered student and active subject records, and create one subject assignment with the existing transaction service. Subjects, assignments and raw marks pages cross-link for the setup flow. This is a **development-only** UI: it does not infer mandatory or optional subjects, import IEMIS catalog data, support bulk assignment, or permit correction of existing assignments. Class query pagination currently caps the loaded class list at 5,000 records; this is not the final large-school UX. Static CI checks were added; Firebase Emulator and browser end-to-end success remain unverified. V46 is unchanged.

## Raw mark assignment enforcement follow-up

The raw mark browser now lists only active subjects explicitly matching the chosen class. The transaction and preflight reject marks without a same-school student-subject assignment; Firestore rules independently require that assignment. Regression tests now cover missing assignments. These controls do **not** yet verify subject-specific maximum marks, optional-subject rules, three-component Computer marks or CDC/IEMIS grade calculations. Browser/Firestore emulator execution remains unverified, and V46 production is unchanged.

## Assignment workflow verification fixes

The Firebase emulator fixture now seeds Mathematics as an active Class 1 subject, consistent with the new assignment and marks rules. The browser assignment roster uses 100-record query pages and invalidates class selections when the class changes; the static test checks these guards. The emulator source adds viewer read-only and wrong-class assignment checks. These are source-level fixes and assertions; a successful emulator run has not yet been confirmed.

## Raw mark legacy API hardening

The exported `saveSchoolMark` API previously called Firestore `setDoc`, which could overwrite existing marks and bypass client-side assignment checks. It now delegates to the same create-only transaction as the raw marks browser. The transaction, preflight and Firestore rule now require an explicitly active subject with an exact matching class; legacy subject documents without these fields must be reviewed and migrated through an audited workflow, not silently accepted. Regression tests cover duplicate prevention, teacher/viewer denial, tenant mismatch and the absence of `setDoc` calls. This is **not** full-mark validation or official grading, and test execution on GitHub Actions/Firebase Emulator has not yet been confirmed. V46 production remains untouched.

## Class 9–10 Computer 4/36/10 raw components (development only)

Added `computer-component-validation.mjs` and `computer-component-create-service.mjs` for explicit raw score fields `component_a` (max 4), `component_b` (max 36), and `component_c` (max 10) in Class 9 or 10. This follows the project's requested 4/36/10 specification but does **not** claim that the three labels, grading interpretation or full-marks policy are independently verified against IEMIS/CDC. The service uses a create-only Firestore transaction scoped to the selected school, checks a Class 9/10 student, active subject named exactly `Computer`, matching student-subject assignment, and rejects both duplicate component entries and conflicting two-field raw marks. Firestore rules independently enforce the same schema, school scope, score bounds and immutability. The existing two-field mark transaction and rule also reject conflicting component entries. No browser entry UI is enabled yet; these are service/rules and tests only. Grade/GPA/result publication stays **blocked** pending full CDC/IEMIS verification and integration of component records into the result pipeline. CI source tests and emulator assertions were added, but their execution status is unverified. V46 remains unchanged.

## Computer 4/36/10 browser entry (development)

`computer-marks.html` and `computer-marks-console.mjs` provide a V47-only, School Admin-only Class 9/10 Computer component entry page, using class-filtered student and subject lists, three explicitly bounded numeric fields, and the create-only `createComputerComponentMark` transaction. A static browser test is included in V47 CI. The ordinary two-field marks path now rejects a Class 9/10 subject named `Computer`, with a corresponding Firestore rule, preventing accidentally choosing the wrong format. This remains provisional raw marks storage; the CDC/IEMIS interpretation and result calculation are **not** verified. No live deployment or emulator success is claimed.

## Computer component coverage diagnostic (non-publishable)

`component-mark-coverage.mjs` now audits loaded Class 9/10 student, subject, assignment, two-field raw mark and Computer component records together. It flags missing component marks for assigned Computer subjects, duplicated two-field and three-field marks, missing/incorrect student-subject assignments, inactive or unknown Computer subjects, and invalid component scores. The caller **must supply complete school-scoped, class-and-term-filtered record lists**; this module does not fetch or paginate Firestore itself. The returned result always has `publishable:false`, `gradeCalculated:false`, and `iemisPolicyVerified:false`. It must never be used to issue a Grade Sheet or GPA. CI regression tests were added; actual Firebase Emulator/Actions completion remains unverified. V46 production remains untouched.

## Combined raw ledger diagnostic (not official)

`raw-ledger-preview.mjs` combines already-loaded two-field raw marks and Class 9/10 Computer component records into a sorted **read-only diagnostic dataset**, with explicit format labels. It never computes grades, GPA, NG, or an IEMIS Mark/Grade Ledger, and always returns `publishable:false` and `officialLedger:false`. `component-mark-coverage.mjs` additionally flags two-field raw marks without a valid student, subject or assignment and uses unambiguous student-subject keys. A CI unit test checks complete/incomplete/duplicate cases. Consumers must fetch **all** school-scoped pages before treating coverage as complete; no live UI or official printable report is claimed. CDC/IEMIS 2083 verification and actual emulator execution are still pending.

## Raw marks performance and readiness hardening

The V47 raw marks entry browser now queries only the selected class using Firestore `where('class','==',schoolClass)` and document-ID cursor pagination (100 documents per page), rather than scanning all students and subjects across the school. The previous whole-school 1,500-record cap could hide a small class at a large school. This browser still loads the whole selected class up to a conservative 5,000-record guard and is not a search UI. A static regression test now forbids the old whole-school adapter scan. Result readiness now recognizes an assigned Computer component pair as present for matrix diagnostics, while explicitly blocking result publication because component coverage and the CDC grade engine are not integrated. Tests were updated for immutable raw mark duplicates and wrong-format Class 9/10 Computer entries. GitHub Actions and Firebase Emulator success are not yet verified; V46 production is unchanged.

## 2026-11-17 audit consistency fixes

The Computer component coverage diagnostic previously encoded assignment/raw-mark keys as JSON tuples but encoded component-mark keys as colon-separated strings. That mismatch could falsely report valid Computer marks as missing and hide duplicate raw/component formats. All three sources now use the same JSON tuple encoding, with regression assertions. `assessResultReadiness` now counts component records when evaluating assigned student-subject coverage; it **still always returns `ready:false`** and retains explicit component integration and CDC/IEMIS grading blockers. Raw mark entry's Save handler now independently checks that the loaded roster class still matches the selected class, not just the disabled button state. These are source changes committed to V47 development; no live production change or successful Actions/Emulator run is asserted.

## Readiness and raw-entry UX follow-up

The result-readiness diagnostic now distinguishes **persisted** Computer component records from **unintegrated CDC/IEMIS grading**: its blockers use `component_marks_grading_not_integrated` and `component_mark_grading_not_integrated`, and `checkedPairs` counts unique raw-or-component student/subject pairs. `ready` remains hard-coded false and no grade or GPA is calculated. The two-field raw marks browser hides Class 9–10 Computer subjects from its dropdown; the dedicated Computer 4/36/10 page remains the correct development-only input. Regression assertions now cover wrong term, unknown student and conflicting raw/component records. Latest commit status lookup returned no statuses; this does **not** establish that GitHub Actions or Firebase Emulator passed. No production deployment was performed.

## Additional integrity hardening

The Computer component coverage diagnostic now rejects component records with a different class/term and flags two-field raw marks attached to inactive subjects. Both `validMark` and `validComputerComponent` Firestore rules now verify the referenced assignment document's `studentId` and `subjectId` fields as well as its class, rather than trusting the assignment document ID alone. A static rules test and coverage regression cases guard these checks. These commits are on the V47 development branch only; they are not evidence that GitHub Actions or the Firebase Emulator has passed, and the grade engine remains blocked.

## Computer marks UI and readiness regression repair

The Class 9/10 Computer marks form now independently records the class for which student and subject options were fetched and checks **both** classes before Save; an old `loadedClass` reference in the Save handler was removed. This prevents a JavaScript reference error and avoids mixing class-scoped dropdown contents. Result readiness now uses one canonical `component_marks_grading_not_integrated` blocker rather than two differently spelled variants; publication still remains blocked. The relevant static and readiness tests were updated. These changes are on the V47 development branch only and have not been verified against a running Firebase Emulator.

## Class-scoped raw marks dropdown correction

The raw Theory/Practical marks page now tracks the loaded student class and subject class independently (like the Computer component page), and its Save button **and** Save handler require both to match the currently selected class. The prior shared `loadedClass` flag could be set by loading just one dropdown, leaving the other dropdown stale after a failed or interrupted request. Both marks entry pages also ignore stale paginated roster responses after sign-out. Regression tests for the raw marks page were updated. Firebase Emulator and end-to-end browser test execution remain unverified; this change does not touch V46 or deploy V47.

## Marks form race-condition and coverage audit hardening

Both raw and Computer component entry screens now keep student and subject class-loading state independently. An outdated roster request cannot re-enable controls after sign-out; class/epoch guards discard stale page responses. Static regression checks enforce those conditions. Computer coverage diagnostics reject assignments to inactive subjects and require the corresponding active class subject. These changes are restricted to the V47 development branch, not V46 production. No Firebase Emulator or live end-to-end success is claimed.

## Mixed-subject raw ledger completeness

The read-only V47 raw ledger preview now requires a raw mark for every assigned **ordinary** subject as well as all three Computer components for assigned Class 9/10 Computer subjects. Previously, a class with a complete Computer mark but a missing Mathematics mark could incorrectly be labeled `complete:true`. The diagnostic reports `missing_raw_mark` and remains non-publishable even if the data is complete. Malformed roster/mark inputs now produce diagnostic issues rather than crashing the preview rendering. Tests cover mixed subjects and malformed inputs. Official CDC/IEMIS 2083 grades and print layouts remain unimplemented and require verified source specifications. No live V46 changes.

## Fail-closed malformed ledger inputs

Raw ledger preview sorting now tolerates null/non-string mark identities while the coverage audit reports invalid records and never treats empty student, subject, or mark IDs as valid. Regression tests include empty IDs and a null mark student ID. No official CDC/IEMIS grading or result publication is enabled. These changes are development-branch-only and have not been verified with the Firebase Emulator.

## Raw marks numeric validation in read-only diagnostics

Raw ledger coverage now rejects missing, negative, nonnumeric, NaN, and infinite theory/practical scores using `invalid_raw_mark_scores`. This is intentionally only basic numeric validation: subject-specific full-mark ceilings, CDC grades, GPA, NG handling, and IEMIS 2083 print parity still require verified policies and cannot be inferred from the raw ledger. Regression tests cover invalid numeric scores and prevent a misleading `complete:true` status. V46 production and real school data remain untouched.

## Empty roster safeguards

The V47 read-only raw ledger audit now flags `no_students`, `no_subjects`, and `no_subject_assignments` rather than reporting an empty school class as complete. Blank assignment identities are invalid, and the preview presents unique diagnostic issue codes for easier review. Added regression cases for empty class/assignment lists and duplicate issue codes. This does not activate official result publication or CDC/IEMIS grading. No changes to V46 production.

## Per-student mark completeness matrix (diagnostic only)

`v47/student-mark-matrix.mjs` builds a read-only class/term student-by-assigned-subject view from the combined raw ledger preview. It shows `missing`, `recorded`, `duplicate`, or `wrong_format` per assigned subject, including the user-specified Class 9/10 Computer 4/36/10 format. A student with no valid subject assignments now blocks diagnostic completeness (`student_subject_assignments_missing`); coverage uses a set to avoid quadratic scanning for large rosters. `scripts/test-v47-student-mark-matrix.mjs` is included in the V47 non-deploy module workflow. This is not a CDC grade engine, an official Mark Ledger, or a publishable result; emulator and CI run status still require verification. V46 remains untouched.

## Read-only raw ledger coverage summary

`buildRawLedgerPreview` now returns a frozen `summary` with class roster, subject, assigned pair, recorded pair, missing pair, raw record, and Computer component record counts. The recorded-pair count excludes out-of-class, wrong-term, unknown, and unassigned records. It is a diagnostic **record presence** count, not a validation of official grade correctness; always inspect `issues` and the `complete` flag. The preview remains non-publishable, and CDC/IEMIS grading remains blocked pending verified policy and end-to-end tests. V46 production remains unchanged.

## Tenant class ledger summary integrity

Raw ledger diagnostic summary now counts only records belonging to the selected class, with active subjects and valid student-subject assignments. Invalid assignments, inactive subjects and wrong-class roster records remain audit errors and cannot inflate coverage counters. Regression cases exercise these conditions. This does not constitute a CDC/IEMIS grade calculation or official ledger and does not affect V46 production.

## Mark presence versus score-valid diagnostic counts

The read-only raw ledger summary now distinguishes `markedPairs` (a record exists), `validMarkedPairs` (basic nonnegative finite ordinary scores, or valid Class 9/10 Computer 4/36/10 component values in the correct format), `missingPairs` (no record), and `invalidOrMissingPairs` (no basic-valid record). These are **not** CDC grading or verified full-marks checks. Invalid or duplicated records continue to block `complete` via audit issues. No results can be published from this preview; V46 remains untouched.

## Student-wise ledger exception details

`buildRawLedgerPreview` returns frozen, name-sorted `missingDetails` and `invalidOrMissingDetails` arrays. Each row identifies the student and assigned subject and classifies the missing record or a present mark with invalid basic score/format. This supports read-only remediation review without guessing grades or changing marks. The data remains diagnostic-only and non-publishable; it is not an official CDC/IEMIS grade ledger. The V46 production branch is not modified.

## Diagnostic exceptions CSV (read-only)

`ledgerExceptionsCsv(buildRawLedgerPreview(...))` exports a student-wise list of missing and invalid basic mark records, with class, term, student and subject identity, and issue reason. CSV cells are quoted and spreadsheet formula-leading strings are prefixed with an apostrophe. The helper rejects previews that are not explicitly non-publishable. This is not an official grade/result ledger, and no marks are changed. Run `node scripts/test-v47-ledger-exceptions-export.mjs` in a checked-out development branch to verify; browser integration and live validation remain pending.

## Read-only missing marks browser review

`v47/ledger-exceptions.html` and `ledger-exceptions-console.mjs` provide a development-only signed-in page for school admins, teachers, and viewers. The page queries only `schools/{schoolId}` collections, filters all five collections by selected class and both mark collections by exam term, reads in 100-document pages, and aborts exports if a collection exceeds the 5000-record safety limit. The browser builds the raw ledger diagnostic preview and displays student-wise missing or basic-invalid marks, with a formula-safe CSV export. All HTML table cells use `textContent`. This is NOT a CDC/IEMIS grade sheet or official mark ledger; live Firebase index, rules, emulator and browser testing remain pending. V46 production has not been changed.

## Firestore indexes and CI gate for missing marks review

`v47/firestore.indexes.json` now includes collection-scoped class/ID indexes for `subjects` and `subject_assignments`, and class/term/ID for `component_marks`, alongside existing student and raw mark indexes. The V47 non-deploy module workflow invokes the new missing-mark browser static test, exception CSV safety test and index coverage test on branch pushes. These index definitions must be deployed to the separate V47 Firebase project before the browser's real queries are considered verified. The workflow does not deploy V47 or modify V46 production.

## High-enrollment review and logout cancellation

The read-only missing marks review now allows up to 20,000 records **per collection**, so a 1,500-student school with multiple subject assignments does not hit the previous 5,000-record cap. This is a safety cap, not a recommended free-tier query size: loading all class records may incur substantial Firestore reads, and production optimization/pagination UX is still required. Users can sign out while a review is loading; the request epoch invalidates stale responses, preventing a pending read from repopulating the UI after sign-out. Tests were added to the V47 non-deploy workflow, but live Firebase and CI pass results have not been verified.

## Ledger review performance and cancellation

The read-only missing-marks browser review now supports cancelling an in-flight pagination scan and shows per-collection progress. Each new review uses an epoch token so cancelled, signed-out, or superseded reads cannot publish stale results. To limit Firestore Spark-plan reads and avoid silently incomplete CSV exports, per-class caps are students 2,000, subjects 300, subject assignments 20,000, raw marks 20,000, and component marks 20,000; exceeding any cap fails closed and disables export. These are safety limits for this diagnostic page, **not** a cap on the number of schools or enrolled students supported by V47. They do not guarantee Firestore quota sufficiency, and the browser and emulator checks are still required.

## Missing-marks diagnostic export integrity gate

The CSV helper rejects `pagination_incomplete` and mismatches between reported and detailed exception counts. The browser also blocks the diagnostic export when roster, assignment, unexpected mark, or duplicate raw/component records indicate unreliable coverage. Invalid individual mark scores can still appear as diagnostic exceptions when the roster itself is consistent. This remains a non-publishable review tool; no official grade calculations or result publication are enabled. The changes are committed to the V47 development branch; CI/emulator/browser results must be verified before use with live school data.

## Ledger exception review with blocked export

The browser now displays read-only missing/invalid mark rows and audit issues even when a school roster integrity check blocks CSV export. The export button stays disabled for such reviews. The shared gate additionally rejects duplicate exception pairs, invalid student/subject IDs, unsupported exception reasons, and contradictory mark coverage totals. This is an audit aid, not a CDC/IEMIS result or atomic Firestore snapshot; data can change between paginated queries. Validate the V47 emulator, indexes, and browser before real school use.

## Active membership revalidation for diagnostic exports

The V47 read-only missing-marks browser review now rechecks that the selected school and the signed-in user's membership remain active after paginated data loading, and again immediately before exporting a CSV. A review/session epoch guard prevents an old sign-in, cancelled review, or changed preview from downloading stale diagnostic data. This is defense in depth alongside Firestore Security Rules; it does not make multi-query reads an atomic snapshot. No changes to V46 production or deployment are part of this work.

## Non-destructive school records

V47 Firestore rules now deny direct deletion of student and attendance documents, including for school admins and super admins. Student corrections and attendance corrections remain possible through validated updates. This prevents orphaned student-related marks and accidental loss of attendance history. If retention or archival policies are introduced, design a separate audited, explicitly authorized workflow rather than enabling unrestricted document deletion. Emulator regression assertions have been added but must run successfully before deploying these rules.

## Referential integrity on student and attendance edits

Student records are not deletable, and their `class` value is now immutable after creation: changing it in place would invalidate existing attendance, subject assignments and marks. Name and optional roll number can still be corrected. Attendance history is also not deletable; updates may correct `present`, but cannot change the record's date, student ID or class. Moving a student between classes will require a separate audited promotion/transfer workflow rather than mutating historical student records. The Firebase emulator regression suite covers allowed corrections and denied identity changes. No V46 rules were modified; V47 emulator verification remains pending.

## Student IDs and teacher role regression tests

New student document IDs must match the same restricted identifier format expected by school-scoped marks and attendance references (`[A-Za-z0-9_-]`, 1–128 characters). The V47 emulator suite now includes invalid-ID rejection, teacher read-only access, cross-school denial and disabled-member denial. These are test definitions only until the Firestore emulator workflow runs successfully. Student promotion remains a separate unimplemented audited workflow; do not mutate the immutable historical class in place.
