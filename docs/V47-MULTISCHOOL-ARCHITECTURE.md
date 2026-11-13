# SMSS V47 Multi-School Architecture (development only)

## Non-negotiable preservation
- V46 main and Firebase production hosting remain unchanged until explicit release approval.
- Do not write to or migrate live V46 Firestore records during development.
- Before migration: verified export, rollback rehearsal, and a school-approved maintenance window.
- Do not copy production student records into test tenants.

## Tenant model
- `schools/{schoolId}`: school profile, IEMIS code, status, subscription metadata. IDs are immutable opaque identifiers; IEMIS codes are not authorization keys.
- `schools/{schoolId}/students/{studentId}`, `staff`, `exams`, `marks`, `attendance`, `settings`, `results`: tenant-owned data.
- `school_memberships/{uid_schoolId}` or equivalent: server-authoritative UID, schoolId, roles, active; never accept schoolId or super-admin privilege merely from browser input.
- `platform_admins/{uid}`: super-admin membership provisioned only by trusted privileged backend; never client-created.
- `schools/{schoolId}/subscriptions/{recordId}`: fee NPR, start/end, grace period, paid/unpaid status, audit trail. School's own fee is zero; other fees are individually configurable.
- `audit_logs`: append-only server-created actions for registration, role changes, billing and data migration.

## Access rules
1. Super Admin creates and approves schools; ordinary school users cannot create schools.
2. School Admin manages only their school. Teacher writes only assigned records. Viewer reads permitted school data but never writes.
3. Every tenant read/query/write must be scoped to its immutable schoolId in Firestore rules AND client queries.
4. Deny cross-school access even when the user guesses another school ID; test this with Firestore emulator using two unrelated schools.
5. Super Admin is not automatically entitled to read confidential student records of every school; use explicit audited support access if needed.
6. No client-controlled role escalation, school membership reassignment, or subscription tampering.
7. Subscription expiry must never delete school records; define notice, grace and read-only policy before enforcement.

## Migration / rollout gates
- Inventory all V46 root collections and current role rules, including references, exports and print paths.
- Build isolated tenant-aware repository/service layer before changing existing pages.
- Implement server-authorized school onboarding and audit logging.
- Write emulator tests: cross-tenant reads, writes, queries; viewer read-only; teacher assignments; super-admin boundaries.
- Create two synthetic schools and validate ECD–12, marks, attendance, grade sheets, PWA and reports.
- Verify a production Firestore backup and restore procedure. Design an idempotent migration with a dry-run and reconciliation report.
- Release only with explicit approval and monitored rollback plan.

## Cost and operational controls
- No automatic Firebase billing-plan upgrades.
- Monitor reads/writes/storage and authentication limits; set alerts and usage budgets where available.
- School subscription fees are not payment processor integrations; initially record manually confirmed payments only.
- Never expose school passwords or payment details in public logs.

## Current status
Architecture plan only; no tenant migration, Firestore rules deployment or live code change performed.
