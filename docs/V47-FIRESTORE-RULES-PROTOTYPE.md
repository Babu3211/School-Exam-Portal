# V47 Firestore Security Rules — isolated prototype

The file `firestore.v47.prototype.rules` is **not** the production `firestore.rules` file and is not referenced in `firebase.json`. It is intentionally restrictive, **not deployable as-is**.

- No browser can create schools, platform admins, membership documents or subscriptions.
- Tenant memberships are scoped under `schools/{schoolId}/members/{uid}`; server must validate identity and roles.
- A member can read only the same school's student/staff data; school admins may write those records; viewers cannot write.
- Teachers cannot write student/staff data; marks/attendance are denied pending assignment-aware rules.
- Super admins may read school metadata, not student records by default.
- Root-level V46 collections are not accessible through this draft. This is NOT a migration mechanism.

## Required next gates
1. Build trusted server onboarding with verified platform admin authentication, immutable schoolId, unique IEMIS enforcement and audit logging.
2. Emulator-test two unrelated schools for reads/writes/list queries and attempts to escalate roles or impersonate another school.
3. Add per-class/per-subject teacher authorization and strict validation for marks/attendance.
4. Preserve and regression-test the complete V46 rules separately.
5. Only after a verified backup, rollback rehearsal, user approval and planned migration consider a V47 deployment.

No production rules or data have been modified.
