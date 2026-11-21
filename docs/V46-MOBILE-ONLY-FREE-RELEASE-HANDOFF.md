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

PR #47 is already merged into `main`; do not merge it again. Only after the remaining checks have **independent evidence** should the authorized operator run the gated Hosting-only release workflow. An unverified backup or role test must never be marked `BACKUP-VERIFIED` or `ROLES-VERIFIED`.

## 17 November 2026 release evidence update
- On PR #61 commit `5c23c887ae1e130feb715faf9f28b3764a68cb6b`, five of six GitHub Actions workflows completed successfully.
- `Validate V45 Final Integration (no deployment)` failed at its protected-file allowlist because it rejected `scripts/test-v46-class-normalization.mjs` on the new release-validation branch; later steps were skipped. This is **not** proof of a data failure or successful full validation.
- The separate `V46 integration preservation gate` and `V46 non-IEMIS release readiness` completed successfully for that commit.
- GitHub Actions tests do not establish that a recoverable production Firestore backup exists, that real school accounts were tested, or that Hosting rollback has been verified.
- Keep PR #60 (divergent integration) and PR #61 (main-based test updates) unmerged until reviewed. Preserve `main` and existing live Hosting.
- Before release: obtain a private backup inventory and isolated restore proof; test Admin/Teacher/Viewer with authorized accounts; record current Hosting release ID; verify approved `main` SHA; obtain production environment approval. **Do not paste student data, passwords or credentials into GitHub.** Legacy V44/V45 working branches can be retired **after** successful V46 live acceptance with recovery references preserved.
