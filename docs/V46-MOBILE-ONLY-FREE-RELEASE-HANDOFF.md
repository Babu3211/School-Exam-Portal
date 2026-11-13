# V46 — Mobile-only free-plan release handoff

This checklist is for a school operator using an iPhone/Android with no laptop. **Do not enable Google Cloud billing.**

## Current verified state
- Firebase project: `exam-portal-smss-95016` on Spark/free plan.
- Google Cloud Disaster Recovery screen: no scheduled backup, no PITR, no listed snapshots.
- V46 PR #47 merged into `main` at commit `e8fec0920f2027ddfa4f22d58d6805f6a5c1cdee`. **Firebase Hosting live deployment is not yet verified.**
- GitHub CI on V46 integration commit `e7ce281a6e3994db5ef62b2a091d4b6445e069d9`: six workflows successful.

## Safe actions possible on a phone
1. Review merged GitHub PR #47 and its successful checks. **Do not run the V46 production release workflow** until backup, roles and rollback checks are verified.
2. Open Firebase Console and confirm that `(default)` Firestore still contains student, marks and attendance records. **Do not modify, import, restore or delete records**.
3. Check whether the school already has an independent, private backup or school exports (e.g., an offline file in a private administrator-controlled location). This is not a complete Firestore backup unless verified.
4. Record the existing Firebase Hosting release ID in a private school note for rollback. Never publish login credentials or student information.
5. When an audited read-only backup tool and credentials are available, execute it in an appropriately protected environment; keep backup files encrypted and private, not in GitHub Actions logs/artifacts or public commits. Verify counts and restore to a separate test project.

## Blocking acceptance checks
- [ ] Complete private Firestore backup and verify recoverability (not merely GitHub source backup).
- [ ] Real Admin, Teacher and Viewer login tests; Viewer cannot write.
- [ ] IEMIS 2083 comparison as required by the school.
- [ ] Known-good Hosting rollback release recorded.

Only after those checks should the authorized operator approve merging PR #47 and running the gated Hosting-only release workflow. Legacy V44/V45 working branches can be retired **after** successful V46 live acceptance with recovery references preserved.
