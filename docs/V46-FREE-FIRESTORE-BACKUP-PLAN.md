# SMSS V46 — no-billing Firestore data safety plan

**School policy:** Remain on Firebase Spark/free plan. Do not enable billing or paid Google Cloud backup, PITR or managed export.

## Verified by school operator (13 November 2026)
The Google Cloud Console for `exam-portal-smss-95016` / Firestore `(default)` showed:
- Billing required for Disaster Recovery; scheduled backups disabled.
- Point-in-time recovery disabled.
- Backup snapshots list empty.

This does **not** prove that no older independent export exists. Check existing offline backups before relying on any recovery path.

## No-cost options and important limitations
1. **GitHub code:** Keep protected V44/V45 commits and V46 branch/PR until the new live release passes checks. Code history is **not** a database backup.
2. **Firestore data:** A school administrator may use an authenticated local computer and the Firebase Admin SDK to read and serialize the live database into an **offline, encrypted, access-controlled** backup. This requires careful pagination and traversal of nested subcollections, a complete record count, and a restore rehearsal in a **separate test project**. It is **not** the paid managed Firestore export feature. Large datasets and access permissions may limit feasibility. Do not run an unverified export tool against production.
3. **Manual school exports:** Where the portal already offers read-only student/marks/attendance export, these can supplement backups, but they may omit metadata, user roles, document IDs, and subcollections; **never** treat them as a verified full Firestore recovery point.
4. **Hosting rollback:** Keep the currently deployed Hosting release accessible. Rolling back Hosting does not restore Firestore records.

## Evidence required before production approval
- [ ] Confirm any existing offline export and its timestamp, or produce a complete offline backup using an audited read-only tool.
- [ ] Verify backup inventory includes `students`, `marks`, `attendance`, `classes`, `exams`, `mark_settings`, `subjects`, `staff`, `school_settings`, `user_roles`, plus any other top-level and nested collections; no hard-coded collection allowlist may silently omit data.
- [ ] Store encrypted backup **outside the public GitHub repository**, with access restricted to school administration. Never upload credentials or student records to chat.
- [ ] Check record counts and validate a sample of data **without writing to production**.
- [ ] Test restoration to an isolated project (never overwrite the school database for a test).
- [ ] Record the known-good Hosting release for rollback.

**Do not delete V44/V45 branches, merge PR #47, or mark `BACKUP-VERIFIED` until the evidence above exists.**

## Local encrypted snapshot candidate (development, not production-tested)

A synthetic-tested candidate tool is `scripts/v46-local-firestore-backup.py`. It uses the Firestore REST API at a single bounded read time, enumerates all collections and missing ancestors, preserves typed Firestore fields, and encrypts in memory using AES-256-GCM and scrypt. It cannot write Firestore documents, deploy rules, or enable billing. It refuses real operation in CI. Do not run until reviewed by an authorized school operator. The actual backup is not present in GitHub.

- On a trusted local computer, install Python dependencies `google-auth requests cryptography` in an isolated environment; authenticate locally with authorized read-only ADC for the school project. Do not share credentials or upload backup files.
- Run `python scripts/v46-local-firestore-backup.py --self-test` first. Inspect remaining Spark read quota; the tool's caps are not a guarantee of remaining free reads. Choose a low-activity time and suitable bounded limits. Exceeding a limit aborts rather than claiming completeness.
- After scope and authorization review, run `python scripts/v46-local-firestore-backup.py --output /private/offline/smss-snapshot.enc --confirm READ-ONLY-V46-BACKUP` using a real private path outside the Git repository. Keep the passphrase separately; never enter it on the command line.
- Verify locally with `python scripts/v46-local-firestore-backup.py --verify /private/offline/smss-snapshot.enc`. This checks authenticated encryption and inventory, NOT a restoration.
- Scope is Firestore documents only. Firebase Authentication accounts, Storage, Hosting, security rules, indexes and other services are separate. A missing-parent document is not itself created. Reference-valued fields require review during isolated-project restoration. Restore tooling and rehearsal, independent completeness review, and real school-role acceptance remain required. No `BACKUP-VERIFIED` attestation is justified yet.
