# V47 release readiness audit — 2026-11-18

## Verified CI evidence

Development branch: `smss-v47-multischool-work`.
Verified commit: `469b0720c310d9dda783768b96e10fb0ff0a157c`.

All four workflows concluded **success** on this exact commit:

- V47 isolated security tests — https://github.com/Babu3211/School-Exam-Portal/actions/runs/44321631948
- V47 Firestore isolation (non-deploy) — https://github.com/Babu3211/School-Exam-Portal/actions/runs/44321631295
- V47 isolated module checks (non-deploy) — https://github.com/Babu3211/School-Exam-Portal/actions/runs/44321631047
- V47 Multi-School Development Checks — https://github.com/Babu3211/School-Exam-Portal/actions/runs/44321631022

The Development Checks job reported 115 successful steps, zero failed steps. Its V46 production boundary guard passed after restoring two pre-existing V46 test scripts to the shared package manifest.

## NOT YET VERIFIED — do not deploy

1. Real browser sign-in with a trusted V47-only Super Admin against `smss-exam-portal-v47`.
2. Inactive-first registration, first School Admin membership, activation and authenticated school selection for two test schools in the actual V47 project.
3. Browser-backed two-school isolation: students, staff, marks, attendance, exams and reports; deny cross-school reads and writes for each role.
4. Full V46 feature parity: CDC grade/GPA, IEMIS 2083 ledgers and grade sheet, ECD/LKG/UKG–12, 9–10 Computer components 4/36/10, viewer read-only, PWA/APK, mobile.
5. Load/quota assessment for 300–1500 students per school under Spark/free limits.
6. Restore/backup and deletion safety review.

## Safety rules

- No production deployment, no main/V46 writes, no V46 Firestore rules changes, no real student data mutation.
- Use isolated test schools and synthetic test accounts/data; never embed credentials in commits.
- Re-run all four workflows on the final release commit, then obtain explicit approval before V47 hosting release.

This document is a point-in-time audit; previous planning documents may contain outdated unchecked boxes and should not be treated as evidence of current CI failures.
