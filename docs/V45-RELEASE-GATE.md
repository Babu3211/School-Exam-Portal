# SMSS V45 Release Gate

V45 is a trial release. Passing GitHub Actions and a Firebase preview deployment does **not** authorize production rollout or use of real student records.

## Automated gate

- [ ] V45 JavaScript, Grade Ledger and requirement regression workflow succeeds at the exact release commit.
- [ ] CDC question-paper syntax and content checks succeed.
- [ ] Firestore Security Rules emulator tests succeed.
- [ ] Firebase Hosting `v45-trial` preview deployment succeeds at the same commit.
- [ ] Confirm the preview URL and deployment expiry from the GitHub Actions run.

## Manual end-to-end gate (test data only)

- [ ] Admin: sign in/out, school settings, users, class/section/subject assignments.
- [ ] Teacher: sign in, access only assigned classes and subjects, record daily attendance.
- [ ] Marks: create exam, enter and edit marks, enforce valid mark ranges, verify save/reload.
- [ ] Results: compute grades and totals, compare against independently calculated expected values, export/print.
- [ ] Question papers: create, preview, save, reopen, and print; verify access restrictions.
- [ ] Student: sign in and verify access to own permitted data only.
- [ ] Security: cross-school and cross-role reads/writes denied; audit logs immutable.
- [ ] Devices: Android, iPhone, and desktop; online/offline PWA behavior and update recovery.
- [ ] Accessibility: keyboard navigation, labels, visible focus, readable errors.
- [ ] Recovery: backup/export and rollback procedure rehearsed.

## Production approval

- [ ] Record the reviewed commit SHA, test evidence, preview URL, and responsible reviewer.
- [ ] Verify Firebase project, Hosting target, Firestore rules, and required secrets before deployment.
- [ ] Obtain explicit production approval from the school/system owner.
- [ ] Deploy only the reviewed commit; perform post-deploy smoke checks.
- [ ] Keep V44 rollback reference available.

**Never put real student records into trial testing.**

## Latest verified automated release candidate (2026-11-08)

- Candidate commit: `176d85ad9202fb47c5dd3407c8e33b7f884ec9b8`.
- V45 quality checks: [run 42493763406](https://github.com/Babu3211/School-Exam-Portal/actions/runs/42493763406) — success.
- V45 quality checks: [run 42493763391](https://github.com/Babu3211/School-Exam-Portal/actions/runs/42493763391) — success.
- Trial deployment and HTTPS smoke tests: [run 42493763429](https://github.com/Babu3211/School-Exam-Portal/actions/runs/42493763429) — success.
- These results cover automated gates only. The manual end-to-end gate and production approval are **NOT VERIFIED**.
- Trial preview URLs expire; retrieve the current URL from the successful deployment run rather than assuming a permanent address.
- The candidate SHA above is a tested snapshot, **not** a production authorization. Re-run the full gates if any release code or configuration changes.

## Manual sign-off record (complete before production)

| Area | Tester / date | Evidence / expected vs actual | Result |
| --- | --- | --- | --- |
| Admin account and configuration | Pending | Pending | NOT TESTED |
| Teacher permissions and attendance | Pending | Pending | NOT TESTED |
| Marks entry and grade calculations | Pending | Pending | NOT TESTED |
| Student access and result publication | Pending | Pending | NOT TESTED |
| Question papers and printing | Pending | Pending | NOT TESTED |
| Mobile, PWA and accessibility | Pending | Pending | NOT TESTED |
| Backup and rollback rehearsal | Pending | Pending | NOT TESTED |
| School/system owner approval | Pending | Pending | NOT APPROVED |

Never record passwords, student personal information or production credentials in this document.
