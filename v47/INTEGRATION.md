# V47 integration boundary

These V47 modules are **not wired into the existing V46 HTML application**. They are safe development-only building blocks.

1. Use the V47 Firebase project and authenticated SDK. Do not use V46 production credentials or write to V46 collections.
2. Bootstrap the first Super Admin through a trusted administrator process, not a public client form. The `v47_super_admins/{uid}` rules deny all client writes.
3. Deploy `v47/firestore.rules` only after emulator and manual security review. Never overwrite the V46 `firestore.rules` or default `firebase.json`.
4. Register a school through `registerSchool`; new schools are disabled by default and must be activated by a verified Super Admin.
5. Load school records with `createSchoolStore`; its school context is validated before any SDK calls.
6. The adapter is read-only. Do not implement teacher mark writes without server-enforced class and subject permissions.
7. The current V47 rules allow school admins to modify scoped academic collections and members; review membership privilege escalation, sensitive fields and all record schemas before any production release.
8. Existing V46 UI and data are not migrated. Do not advertise V47 as deployed or fully integrated.

## Development-only pages

- `v47/admin.html`: Super Admin school registry and activation.
- `v47/school-admin.html`: verified School Admin membership and teacher/viewer membership creation.
- `v47/students.html`: school-scoped **read-only** students browser, accessible to verified School Admin, Teacher and Viewer.
- These pages require a manually supplied **V47-only** Firebase web configuration and an existing authenticated user. They are not a V46 UI migration, do not provide marks entry and are not production deployed.
- The V47 Firestore rules must be deployed to a separate V47 project only after emulator tests pass. Existing V46 rules must not be overwritten.
