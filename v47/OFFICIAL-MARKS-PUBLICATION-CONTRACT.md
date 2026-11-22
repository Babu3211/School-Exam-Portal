# V47 official class marks publication — implementation contract (NOT ENABLED)

Status: **BLOCKED**. This document specifies the missing production feature. It is not a release approval and does not change Firestore permissions.

## Current code and hard blockers
- `class-mark-save.mjs` is a client transaction limited to **3** students. `verified-small-class-mark-save.mjs` inherits that limit.
- `configured-class-publication-preview.mjs` and `class-marks-review-package.mjs` support **up to 1,500** students for **read-only** review, never publication.
- `firestore.rules` denies client writes to `marks` and `component_marks`. **Keep these denies in place** until a complete trusted-server workflow has been implemented and emulator-tested.
- A client-side series of 100-student batches is **not atomic** and must never be presented as an official complete-class save.

## Required trusted-server publication boundary
1. Authenticate a currently active `school_admin` for the exact numeric IEMIS school ID; recheck membership on the server. Never trust actor, role, schoolId or marks settings submitted by the browser.
2. Load the authoritative **active** class roster, subject assignments, examination/term configuration and active per-component Examination Settings from the same tenant. Reject missing or duplicate students, mixed class/subject/term, stale settings, missing assignments, out-of-range marks and unexpected fields. All subjects, including Computer, use configured maxima; no fixed 4/36/10.
3. Canonicalize the complete class snapshot, calculate a server-side digest of roster IDs, settings revision and normalized marks, and return a **read-only** review for explicit admin confirmation. A client-provided digest cannot authorize writes.
4. On confirmation, reauthenticate and reload the authoritative roster, assignments, settings and existing publication state. Reject any changed revision or digest. Use a server-owned publication ID and idempotency key scoped by school/class/subject/term.
5. Write to a **staging publication namespace** with durable progress and retry state; do not expose staging records as official marks. Firestore batch/transaction limits and Spark quotas must be respected. A partial staging failure remains invisible to official reports.
6. Perform a final server-side completeness check: exactly one valid mark (or explicit absence) per active roster student, no foreign students, every configured component accounted for, all staged entries tied to the same publication ID and snapshot revision.
7. Switch a **single authoritative publication pointer** in one Firestore transaction after final validation. Official ledgers, grade sheets and result APIs must resolve **only** this committed pointer; no client may write or switch it. Never expose partial staged data.
8. Make retries idempotent, retain an auditable admin identity/timestamp and previous publication pointer, and implement an explicit recovery/rollback process that does not erase student data.
9. Evaluate whether a trustworthy server-side executor can run within the **Firebase Spark free-plan constraint**. If not, keep publication disabled; do not silently require Blaze billing or deploy insecure client writes.

## Mandatory acceptance tests
- Firebase Emulator: cross-school admin, teacher, viewer, inactive user, changed membership, and forged tenant IDs cannot stage, commit or read another school's marks.
- Complete 1, 3, 4, 300, 500, 1,000 and 1,500 student classes; no truncation, stale roster, duplicate, missing, inactive or foreign student.
- Dynamic component limits and CDC/IEMIS 2083 term/grade calculations match the verified V46 reference for Classes 1, 6 and 9 before replication.
- Force interruption after each staging batch and before/after pointer commit: official results remain all-old or all-new, **never partial**.
- Retry the same confirmation and concurrent conflicting confirmations: no double publication, no lost updates, no cross-term mixing.
- Compare Mark Entry Ledger, Mark Ledger, Grade Ledger, Grade Sheet and page-wide watermark/print output with V46 and verified IEMIS examples.
- GitHub Actions must pass regression and emulator jobs independently of the deliberately failing release-readiness job. Production deployment requires explicit approval.

**Do not remove the release gate or enable Firestore marks writes to make CI green.**
