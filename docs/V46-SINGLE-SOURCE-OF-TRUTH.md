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
