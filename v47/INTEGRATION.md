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
