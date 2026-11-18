# V47 multi-school security release gates

**Status: development only. No production deployment authorized.**

1. Keep V46 Firebase Hosting and Firestore untouched; use only the separate `smss-exam-portal-v47` project.
2. A Super Admin record under `v47_super_admins/{uid}` is **not client-writable**. Initial provisioning requires an independently approved, privileged administrative procedure; never expose service-account credentials in the browser.
3. School registration creates an **inactive** school. The Super Admin must explicitly activate it after verification. The school registry payload must contain only `id`, `name`, `iemisCode`, and `active` until the rules schema is extended.
4. School membership is school-scoped, with `school_admin`, `teacher`, or `viewer`. A newly prepared school admin membership is inactive until approved and activated.
5. UI path checks do not replace Firestore rules. Run the 40-case Firestore emulator test suite for forged school IDs, wrong membership, inactive school, disabled membership, Viewer writes, Teacher cross-class/subject writes, and cross-school reads/writes/queries.
6. Current `v47/firestore.rules` intentionally does **not** allow Teacher marks/attendance writes or deletes. Do not deploy as feature-complete until authorization is implemented and emulator-tested.
7. No real student data import or V46 migration without verified backup, explicit approval, and a tested rollback.
8. Test all V46 parity features including Classes ECD–12, exams, CDC grading, IEMIS ledgers, role permissions, PWA/APK, and mobile.
9. Verify Spark/free-tier quotas with realistic load tests for 20–30 schools and 300–1,500+ students per school; no fixed school cap.
10. Release requires green tests, independent role checks, backup verification, and an explicit separate V47 deployment approval.

Role-capability helpers reflect **currently deployed V47 rules in this branch**, not intended future teacher permissions. Teacher marks and attendance writes remain disabled until emulator-verified server authorization is implemented. Client-selected school sessions are unverified and cannot be trusted as proof of access.\n\nThe deletion helper only captures two user confirmations; current Firestore rules still deny all deletions. Never treat a client confirmation as server authorization.\n\nLocal unit checks (no Firebase access): `node v47/test-school-scope.mjs`, `node v47/test-tenant-paths.mjs`, `node v47/test-v47-foundations.mjs`, `node v47/test-security-contract.mjs`, `node v47/test-tenant-features.mjs`.
