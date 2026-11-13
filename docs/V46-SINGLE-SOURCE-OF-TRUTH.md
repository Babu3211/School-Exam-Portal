# SMSS V46 — Single Source of Truth and Chat Handoff

Updated: 2026-11-12. This file is the persistent handoff for future chats and developers. Read before changing code.

## Goal and non-negotiable safety
Build one production-ready SMSS Exam Portal V46 containing **all verified V44 and V45 features**, without duplicate modules, regression, or loss of student records, marks, attendance, staff details, user roles, school settings or exam configuration.
- Integration branch: `smss-v46-integration` (created from `main`). Not yet production-ready.
- Do NOT overwrite `main`, `smss-v44-work`, or `smss-v45-work`; preserve them as rollback references until V46 is verified and approved. Do not delete them automatically.
- Do NOT deploy V46, change Firestore rules, delete/migrate production data, or edit live marks during integration. Hosting deployment requires successful tests and explicit release approval.
- Do not assume that a GitHub Actions green run proves authenticated browser workflows work.

## Verified branch divergence on 2026-11-12
GitHub compare `main...smss-v45-work`: diverged; V45 ahead 285 commits, behind 344; 22 changed files. Direct blind merge or replacing `index.html` risks losing functionality.
Both branches contain `window.roleHas=roleHas;` and `window.isAdmin=isAdmin;`; V45 fix commit `2e1f7adb4839992cc9e14fd28000d7a6947d51e2`.
The production workflow `.github/workflows/v45-production-release.yml` on `main` explicitly checks out `smss-v45-work`, irrespective of the triggering branch. Another V44 hosting workflow and V45 manual workflow also exist. Consolidate deploy paths only after validating V46.

## Feature acceptance inventory (do not mark complete without evidence)
- Login: Admin, Teacher, Viewer; role-based ID/user-role mapping; permissions and logout. Viewer can navigate and inspect every allowed page but never Add/Edit/Delete/Save. Teacher scoped to assigned classes and subjects. 1-hour inactivity auto-logout.
- Student Details, Staff Details, Attendance, Marks Entry, Exams, Results, Dashboard, Reports, Question Paper: class selection / Show Students loads immediately without manual Refresh; no stale page state; no unrelated regression.
- IEMIS 2083 parity: Marks Entry Ledger, Mark Ledger, Grade Ledger, Grade Sheet; class 1-5 use class 1 structure, 6-8 class 6, 9-10 class 9; computer 9-10 subject `4,36,10`; CDC NG/GPA; all three terms; print/PDF watermark repeated full-page.
- Language: exam menus/dropdowns English; login school name and address Nepali + English configurable in School Settings.
- PWA/iPhone/Android APK: stable install prompts, clear HD user-provided app icon, app name SMSS Exam Portal; verify offline cache updates and login.
- Teacher/staff import and Name→Email mapping; protect credentials and avoid displaying passwords.
- User activity dashboard (who logged in/out and active sessions); school data integrity.
- Import validations: match student identifiers, subject order, reject incomplete/ambiguous imports; no partial corrupt writes.

## V46 integration procedure
1. Inventory source differences per feature from both refs, with tests and commits; resolve changes selectively rather than replacing whole files.
2. Identify all workflow triggers to avoid concurrent/accidental production deploy.
3. Implement isolated changes on V46 only; retain stable auth/role logic and Firestore compatibility.
4. Run JS syntax, V44/V45 regression, IEMIS, PWA, question paper, Firestore emulator security and role-based browser tests.
5. Test Admin/Teacher/Viewer end-to-end and data loading without Refresh using safe test records; verify all results/print layouts.
6. Document release commit, test evidence, backup/rollback and owner approval; only then switch production to a single V46 deployment workflow.

## Continuation rule for new chat windows
User may encounter 'conversation too long' and open a new chat. Read this file, the latest GitHub commits, and the current V46 status before any modification. Never restart from login or re-deploy old V45 by assumption. State precisely what was actually tested and what remains. Update this handoff document after each verified milestone.

## Verified repository branch and Android APK audit (2026-11-12)
- GitHub branch search returned **46 branches** (including `main`, `smss-v44-work`, `smss-v45-work`, and `smss-v46-integration`). Do not delete any until all unique work is compared and recovery tags exist.
- `.github/workflows/android-apk.yml` exists on main and builds a downloadable Android debug APK with Capacitor and Gradle. Existing users have already installed an APK; preserve compatibility.
- `android-app/capacitor.config.json` on main declares appId `com.smss.examportal`, appName `SMSS Exam Portal`, server.url `https://exam-portal-smss-95016.web.app/`, and cleartext false. The installed wrapper points to Firebase Live; hosting changes may propagate to the app's web UI, but native updates require rebuilding and installing an updated APK. Do not change appId or live URL.
- The V45 branch does not contain `android-app/capacitor.config.json` at the checked path, so copying V45 wholesale onto main/V46 would risk removing Android packaging. Retain main's Android files.
- The goal is **one active V46 branch/codebase and one production deploy pipeline**, not literally one monolithic source file. Preserve backup refs until verification, then archive rather than blindly delete.

## Latest V46 work — 2026-11-12 (continuation checkpoint)
Current branch: `smss-v46-integration`. Latest verified GitHub commit before this documentation update: `361ab22a1e58de6d16083f70914bb02d77d9d313`.
- ECD and Classes 1–12 options, normalized Nepali/English class names and ECD-first sorting were added in V46. **ECD/11–12 assessment structures are NOT validated**. Classes 11–12 are now blocked from silently using 9–10 grading formulas.
- Attendance Refresh previously cleared already-loaded student rows; this explicit clearing was removed. **The broader async first-load/Show Students issue is NOT yet verified fixed.**
- Marks Entry legacy student filter now uses `canonicalStudentClass` so Class 6 / कक्षा ६ can match; this is code-level only, not browser-verified.
- Viewer Marks Entry: configured subject options and IEMIS grid/student visibility improved without teacher assignments. Viewer IEMIS grid editing disabled; legacy inputs read-only and legacy Save button disabled. **Need real role E2E/security tests.**
- Structural regression assertions added in `scripts/test-v46-preservation.mjs`; **no successful test run or CI result verified yet**. Do not claim test passed merely because assertions were committed.
- No production deployment, Firestore mutation, branch deletion or main modification occurred during this sequence.

### Next exact actions (prioritized)
1. Run `npm run test:v46-preservation`, syntax checks and existing `npm test`/specific regression scripts; repair failing assertions or code. Obtain GitHub Actions run evidence.
2. Diagnose and fix **initial** class selection/Show Students in Attendance, Marks Entry, Students; await asynchronous Firestore data and avoid clearing rendered rows. Verify no manual Refresh needed.
3. Audit Viewer read-only across all screens and Firestore Rules, not just UI; check ECD and 11–12 class options and prevent unvalidated grade calculations.
4. Compare V45-only features against V46 and continue the previously started IEMIS 2083 Work Mode parity checks. Do not claim Work browser session resumed unless actually accessible.
5. Browser/role/IEMIS/PWA/Android end-to-end tests, backup/rollback, explicit production approval, then merge/deploy; never blindly merge V45 or alter main early.

### New chat handoff instruction
User prioritizes speed and short replies. **Read this document from GitHub branch `smss-v46-integration` first, inspect latest commits, then continue actual work**; do not start over or ask user to restate requirements. Keep updates brief, with commit link and clear test/deploy status.

## 2026-11-12 continuation — Marks Entry loading optimization
- Commit `0b24e0c78053e61a62b78de28fdc795eaa120128` on `smss-v46-integration`: load `classes` snapshot concurrently with students/exams/mark_settings/marks for Admin/Viewer Marks Entry, instead of awaiting classes after the other four queries. This removes one sequential Firestore round trip without changing saved data or permissions.
- GitHub update succeeded. **No CI/browser/Firestore emulator test success has been verified** for this commit. Local git clone was unavailable due to DNS resolution failure.
- Next: verify GitHub integration gate, first-load Show Students in Attendance/Marks Entry, Viewer role E2E and rules; keep production unchanged.

## 2026-11-12 continuation — Teacher class normalization regression
- Commits `6d8d32d3905e99c61c9cea98a69b2cdaafa7de34`, `643d1aad44986aedf5974c7b6c1c43605d372995`, `540f2ad72fd4a2e1ac6f424706a30d38f8e9f56a` added `scripts/test-v46-class-normalization.mjs`, registered its npm script and wired it into the V46 integration GitHub Actions gate.
- The test extracts and executes the actual `canonicalStudentClass` helper from `index.html`, checking Class 1–12 English/Nepali-digit labels and ECD; this guards the earlier Teacher Assignment/Student Class 6 mismatch fix (`09d04da`).
- **Test execution and CI pass remain unverified**; GitHub commits succeeded, but local GitHub clone was blocked by DNS. Do not claim real Teacher login/Firestore Save success.
- Next: check workflow results, actual Teacher Marks Entry Show Students and Save, Attendance initial load, Viewer role security and Firestore emulator. No production/data writes.

## 2026-11-12 security audit — Teacher class-name mismatch blocker
- Source-verified: `index.html` uses `canonicalStudentClass` to equate `Class 6`, `कक्षा ६`, and `कक्षा 6` for client-side Marks Entry filtering.
- **Firestore Rules are not equivalent:** `isAssignedStudentClass(className)` tests exact membership in `subjectAssignmentClassNames` / `classTeacherClassNames`; `teacherSubjectAccess` tests exact `className + '::' + subjectName` keys; `studentBelongsToClass` requires exact `student.class == mark.className`. Teacher queries in `loadMarksEntry` also use exact `where('class','==',cl)` and `where('className','==',cl)` filters.
- Consequence: existing Teacher assignment `Class 6` and student `कक्षा ६` may still be blocked by query/rules or marks save despite the UI-level normalization and regression test. **Do not claim the earlier `09d04da` fix is end-to-end complete.**
- Safe next step: design backward-compatible normalized assignment aliases/queries and validate with Firestore emulator using both label variants, role/section restrictions and existing historical marks; obtain explicit release authorization before any live rules change. No rules, assignments or real records were modified in this audit.

## 2026-11-12 English-only UI rollout — non-destructive first step
- Commit `43a40830bcce975cdf4e460ea6a179eee9b81673` changed three exam option label renderings to `englishDisplayText(x.examName)` while retaining `value` as the original exam ID. No saved exam name, marks or assignment records were rewritten.
- Regression test `scripts/test-v46-english-exam-display.mjs` added and wired to the V46 CI workflow (`79d045f28f0d92cfb7e177eaf26be6aec8c810a9`). It checks English rendering and preserved option IDs for Marks Entry and Ledger.
- This is **not a completed whole-portal English conversion**. Continue screen-by-screen; preserve stored Nepali legacy values and use stable IDs/compatibility matching. CI and authenticated browser tests not yet verified. No production deployment or Firestore mutation.

## 2026-11-12 English-only continuation — Attendance subject dropdown
- Commit `8105ff9e671f7406ec5513840293c8c161724647` changes Attendance subject option labels to `subjectEnglishLabel(x)` and placeholder to `Select Subject`, retaining the original stored `value=x` for attendance record matching.
- Regression test `scripts/test-v46-attendance-english.mjs` added and registered in V46 GitHub Actions gate at `2b6cdbe233daaf92d1259164ff75818db80d9567`. No Firestore records, permission rules or production were changed.
- CI test execution and authenticated browser behavior remain unverified; English-only rollout across all screens is not yet complete.

## 2026-11-12 Attendance English Class continuation
- Commit `4729f546301fe12f9fa1ed863258e1609f1608e3` updates both Teacher and Admin/Viewer `attendanceClass` dropdown paths to display `classEnglishLabel(x)` while retaining original Firestore class values in `<option value>`.
- Structural regression `scripts/test-v46-attendance-class-english.mjs` registered in CI (`1b811c09f396439c342cec91f164f9ddf456dece`), verifies both role paths and previous-class matching.
- **Still blocked:** Teacher exact-match Firestore class query/rules aliases not resolved. No real authenticated testing or CI success confirmed, and no live production/data/rules changes.

## 2026-11-12 English-only dropdown loading/empty states
- Commit `85948a377334b583df4241d20b8e5001077f6524` translates existing assignment loading, class/subject empty, and assessment-settings dropdown status strings into English across Marks Entry and Attendance; no data/permission logic changed.
- `scripts/test-v46-english-dropdown-status.mjs` added and wired into V46 CI (`c693cbc42b6d1b787ddedb6c5c996f30680771ef`). CI execution and browser verification not yet confirmed.
- Outstanding: full UI English audit, exact-match Teacher Firestore security/assignment mismatch, no-refresh loading and authenticated role E2E. Do not deploy production until validated.

## 2026-11-12 user instruction — IEMIS live comparison deferred
- User confirms the Work Mode usage limit has been reached. Actual authenticated IEMIS 2083 comparison is **paused until Work Mode becomes available again**. Do not repeatedly request IEMIS login or claim that IEMIS parity is verified during this pause.
- Continue independent V46 development now: English-only visible exam/class/subject/dropdown UI, no-refresh student/attendance/marks loading, Teacher/Viewer security and regression tests, without altering real records or production.
- Once Work Mode resumes, compare actual IEMIS 2083 Mark Entry Ledger, Mark Ledger, Grade Ledger, Grade Sheet for Classes 1, 6 and 9, then replicate agreed group structures, preserving 9–10 Computer 4/36/10 and CDC grading requirements.

## 2026-11-12 Attendance English status labels
- Commit `7efd19d06c4a5f998ab05712cff2aabe0652494d` changes Attendance student-row visible status labels to Present/Absent/Leave, Remarks placeholder, inactive/archived and no-students labels to English; original persisted status codes `present`, `absent`, `leave` and saved record matching remain unchanged.
- `scripts/test-v46-attendance-status-english.mjs` added and CI wired (`7fc5d0d5003df3db531ff8e90b1443adc181482f`). Automated test pass remains unverified because local GitHub clone is blocked by DNS and authenticated browser is not available here.
- IEMIS live comparison remains deferred per user due to Work Mode limit. No production, Firestore rules or student/attendance record writes.

## 2026-11-12 Attendance English validation/selection messages
- Commit `2041fa878ffa82fe7816c50101c8a9d50572449d` translates Attendance student-selection, invalid date/subject, existing record, loading error and permission messages to English; historical record lookup still matches canonical class and saved attendance status.
- Added `scripts/test-v46-attendance-messages.mjs` and CI step (`7a6a333fc72a1ca3be2395cac829af248ec12263`). CI and authenticated browser pass not yet confirmed. No production deployment or Firestore record writes.
- IEMIS 2083 live comparison remains paused until Work Mode access returns.

## 2026-11-12 Teacher Marks Entry performance
- Commit `bd0dede8a8c245a2993110a58f5ae6ccbd095eca` starts Teacher-assigned marks queries and `mark_settings` read concurrently using `Promise.all`, instead of waiting for all marks before requesting settings. Assignment-scoped mark/student/exam query filters and Firestore rules unchanged.
- Added structural regression `scripts/test-v46-teacher-marks-concurrency.mjs`, registered in CI (`f8fbeac0c3ca6649255b69bbd516429c6c31c530`). No measured latency improvement or test pass claimed without CI/browser verification.
- Exact-match Teacher class-name/rules mismatch still unresolved; IEMIS Work Mode comparison deferred. No production or data writes.

## 2026-11-12 Teacher Marks Entry full parallel read improvement
- Commit `4a79d65c65a579d12290bf7b91ab8173c090a811` launches Teacher student, exam, marks, and mark_settings requests concurrently and awaits all together, instead of sequential student→exam→marks/settings fetches. All existing exact assignment-scoped Firestore queries retained; no security rules, stored data or production changes.
- Existing regression `scripts/test-v46-teacher-marks-concurrency.mjs` updated in commit `839bc7c932ceaecfc52758782cc87087ed195f9d` to verify all four request paths. CI pass and actual browser speed remain unverified.
- Teacher legacy Nepali/English Firestore exact-match class assignment mismatch remains a separate unresolved blocker. IEMIS live comparison paused until Work Mode available.

## 2026-11-12 Teacher Attendance parallel reads
- Commit `fd11782b21c37c1caf38a7b54751f4855a68e200` changes Teacher Attendance load to launch assigned-class student and daily attendance reads concurrently. Existing `where(class == cl)` and `where(className == cl, attendanceType == daily)` Firestore scopes, display, and saved data remain unchanged.
- Regression `scripts/test-v46-teacher-attendance-concurrency.mjs` added and registered in CI (`4fbdd3b503ac8049551cdf99e33c12619d68c40c`). CI/browser run not yet verified. Legacy class alias query/security mismatch still unresolved.
- IEMIS live verification deferred until Work Mode available. No production deploy or database writes.

## 2026-11-12 Teacher Attendance selection retention
- Commit `09f6de40c0712c46012a60040dc4fc7ff4b2db4b` captures selected class before Teacher assignment-loading resets the dropdown, and restores the same canonical class after loading, if still assigned. Admin/Viewer restoration remains unchanged; no persisted class values or Firestore rules modified.
- Added `scripts/test-v46-attendance-class-preserve.mjs` and CI step (`e26cd8e77ec28870dfa892c85adf70f8802fd05a`). CI/browser pass remains unverified.
- Work Mode IEMIS comparison deferred; exact-match Teacher Firestore alias issue remains unresolved; production untouched.

## 2026-11-13 Attendance empty-class stale selection
- Commit `95ab09df3b67516648eec305e15bfcafab899135` clears Admin/Viewer Attendance class dropdown and shows English `No classes available` when there are no saved class or student names, rather than retaining stale options. Teacher class selection retention unchanged.
- Added `scripts/test-v46-attendance-empty-classes.mjs` and CI step (`4e380f9574e003c14a01eb99e4a49b0bfe6b7320`). CI and browser run still unverified; no production or database writes.
- IEMIS live comparison paused due to Work Mode limit; Teacher class alias Firestore rules/query issue remains unresolved.

## 2026-11-13 Teacher Marks Entry selected class preservation
- Commit `cc6070ca73315ebaf867cc909694fc6c78816ab6` captures the selected Marks Entry class before Teacher assignment dropdown reset, then restores by canonical Nepali/English class match if the class remains available. No Firestore query/rules or stored data changes.
- Added `scripts/test-v46-marks-class-preserve.mjs`, wired into V46 CI (`d7a8245de07c5b5b44f91d56a23d87ae77f01858`). CI/browser pass not confirmed.
- Outstanding: Teacher exact-match Firestore class aliases, authenticated E2E and no-refresh behavior, IEMIS 2083 comparison after Work Mode limit resets. No production deployment.
