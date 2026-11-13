# SMSS V46 production release and rollback checklist

Status: **release candidate, not deployed**. This checklist is for a school-authorized operator. Do not mark a step complete without evidence.

## Verified in GitHub CI
- Commit `d7055f87433943b4dda0cf65702c86e627781e26`: all six V44/V45/V46 CI workflows passed.
- V46 production workflow is gated to `main`, production environment approval, and three exact confirmations.
- Deployment is Firebase **Hosting only**; it must not deploy Firestore rules or write student, attendance, or marks records.

## Before merge and live deployment (requires Work Mode or authorized school operator)
- [ ] Open existing live school portal and verify Admin can load school settings, students, attendance, marks, results and user activity without manual refresh.
- [ ] Verify Teacher can load assigned class and subjects, while unauthorized class writes remain blocked.
- [ ] Verify Viewer can navigate and inspect all authorized pages, but cannot add, edit, delete or save, including forged button events.
- [ ] Verify iPhone PWA and installed Android APK behavior; APK currently targets the Firebase live URL.
- [ ] Verify Firestore export/backup exists **outside Hosting** and can be accessed for recovery. Record the export location privately; do not commit student data or credentials.
- [ ] Record current production Hosting release/version ID and verify rollback permissions before any deployment.
- [ ] Resolve outstanding IEMIS 2083 real-system comparison when Work Mode is available. Do not claim an exact match until verified.
- [ ] Obtain school release acceptance, review PR #47, and merge only after all mandatory checks pass.

## Deploy
1. Verify PR #47 is merged into `main` and the required CI checks on merged code pass.
2. Open GitHub Actions → `Release SMSS V46 Hosting (approved, gated)` → Run workflow on `main`.
3. Enter `DEPLOY-V46`, `BACKUP-VERIFIED`, and `ROLES-VERIFIED` **only after those checks have actually been performed**. Complete GitHub production environment approval.
4. Wait for Hosting deployment and live-resource smoke test to succeed. Then re-test Admin, Teacher, Viewer and PWA/APK on the live URL.

## If production regression occurs
1. Stop further releases and preserve incident evidence. Do not delete Firestore records.
2. In Firebase Hosting, roll back to the previously recorded known-good Hosting release (or redeploy the verified previous source via the approved release process).
3. Confirm school login, student lists, marks and attendance are available again. Hosting rollback alone does **not** restore Firestore data; use a separately verified Firestore recovery process only if data was actually affected.
4. Document the regression and keep V46 deployment paused until fixed and re-tested.

Never put Firebase service account credentials, teacher passwords, student records or backup contents into GitHub documents or issues.
