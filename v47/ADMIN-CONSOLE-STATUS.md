# Super Admin Console status

Entry: `v47/admin-console.html`. Script: `v47/admin-console.mjs`.
The browser UI includes V47 project configuration, email/password sign-in, a Super Admin-scoped schools query, paginated school listing, activate/deactivate actions, and a transactional school+first-admin registration.

The initial Super Admin must be provisioned through a trusted operator path in the V47 project. Firestore rules deny client reads/writes of `v47_super_admins`; the UI verifies authorization indirectly by a permitted schools query. Never use V46 Firebase credentials/configuration in this console.

**Unverified:** end-to-end browser testing, actual V47 Firebase connection, GitHub Actions/emulator pass, and first school registration. This UI must not be described as deployed or production-ready.
