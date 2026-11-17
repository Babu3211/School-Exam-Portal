# SMSS V47 — multi-school isolation workstream

This directory is **V47-only**, not part of the approved V46 production deployment. No live Firestore schema or rules are changed by these files.

## Target architecture
- Firebase project: `smss-exam-portal-v47` (Spark/free; no billing).
- School registry: `schools/{schoolId}` with school metadata. Every school has its own nested collections, e.g. `schools/{schoolId}/students/{studentId}`, `marks`, `attendance`, `staff`, `exams`, `subjects`, `school_settings`, and `members`.
- A Super Admin may register schools and grant a school Admin role. Each school's Admin, Teacher and Viewer must have an explicit **active membership** for that school. A user's role in school A must never imply access to school B.
- A Viewer must be read-only. Teachers may edit only their assigned class/subject and never another school's records.
- Server-enforced Firestore rules, not a selected-school UI field, are the security boundary. Test cross-school reads, writes, queries, nested paths and forged client requests using the emulator before enabling any V47 write.
- Keep V46's students, marks, attendance, PWA/APK, IEMIS layouts, CDC grades and role behavior intact. Do not copy or migrate live V46 school data without a separately approved migration and backup.
- No fixed school count cap. Pagination and bounded listeners are required for schools with 300–1,500+ students and for 20–30+ schools.
- No automatic migration, Firebase deployment, or production credentials in this directory.

## Current implementation
`school-scope.mjs` validates identifiers and builds school-specific paths. Run `node v47/test-school-scope.mjs` locally. This is a preliminary guard, **not** authorization: it does not replace Firestore rules.

## Next required gates
1. Design and emulator-test V47 tenant membership rules including Super Admin and teacher assignment boundaries.
2. Implement school registry, school selection, and tenant-scoped queries; eliminate any legacy top-level collection accesses in V47.
3. Add emulator tests for all role combinations and malicious cross-tenant requests.
4. Test ECD, LKG, UKG and Classes 1–12; terms, marks, ledgers, grades, attendance, exports, Viewer and mobile PWA.
5. Only after passing all gates, deploy to the separate V47 Firebase project; never target the V46 live Hosting or Firestore rules.
