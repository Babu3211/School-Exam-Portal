# V47 Spark-only registration status

## Completed in development branch
- Isolated Firebase project ID is pinned to `smss-exam-portal-v47` in the browser bootstrap module.
- Pre-enrolled platform admin may read only their own `platform_admins/{uid}` status.
- Only that authenticated platform admin may atomically create a pending, free-plan school and an initial `school_admin` membership for **their own UID**.
- No client can create or edit platform admin roles, activate schools, modify subscriptions, or update memberships after creation.
- Browser registration prototype: `prototypes/v47/spark-school-registration.html`.
- Firestore rules emulator tests: `scripts/test-v47-spark-platform-rules.mjs`.

## Not yet operational
- Firebase project currently retains deny-all client Firestore rules; development rules have **not** been deployed.
- Browser prototype is not hosted and does not yet have injected Firebase web configuration.
- Atomic IEMIS uniqueness reservation is now implemented in the draft rules and emulator-tested; it remains **undeployed**. Check legacy index collisions and normalization policy before real registrations.
- Creating other school admins/teachers, accepting invitations, school activation and end-to-end V46 UI integration are not yet implemented in the Spark browser flow.
- A pending school cannot yet be activated by browser clients.
- Firebase Spark quotas are limited; no billing is to be enabled.

## Release policy
Do not publish these rules or register real schools until IEMIS uniqueness, membership isolation, role authorization, browser configuration, emulator tests, and V46 feature parity have been independently verified. Do not deploy to V46 production.
