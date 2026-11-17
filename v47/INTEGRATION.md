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
