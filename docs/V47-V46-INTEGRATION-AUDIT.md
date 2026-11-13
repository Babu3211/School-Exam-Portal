# V47 integration audit: reuse V46, do not rebuild

Inspected the existing V46 `index.html` on the V47 branch. It is a large monolithic page (~478 KB) with direct Firebase Firestore calls. Approximate literal occurrences: `collection(db,` 90, `doc(db,` 60, `getDocs(` 72, `setDoc(` 3, `updateDoc(` 20.

## Critical finding

The experimental `src/v47/v46-feature-bridge.mjs` is **only a contract**, not an integration with the real V46 code. V46 does not export the seven standalone feature functions that this bridge expects. Claiming it is integrated would be incorrect.

## Required minimal-change approach

1. Keep the V46 UI, mark/GPA calculations, print layouts, language, APK and login behavior as-is until a verified tenant adapter exists.
2. Inventory every root collection used by V46, including `students`, `staff`, `marks`, `attendance`, `school_settings`, `user_roles`, `audit_logs`, `certificates`, `school_gallery` and `school_public_branding`. Do not assume the seven V47 prototype collections cover all existing features.
3. Define an explicit mapping for each collection: tenant-scoped, platform-only, or public. Migrate reads and writes together. Do not blanket-prefix all paths; auth role provisioning, audit, public branding, and Firebase queries need separate review.
4. Validate actual V46 document shapes before applying V47 prototype rules. Prototype marks schema (`score`) is **not proven** compatible with V46 production marks.
5. Implement and test a safe, read-only dry-run migration against synthetic data, then compare feature outputs and permission behavior. Production data migration requires separate approval and backup.
6. Do not deploy `firestore.v47.prototype.rules` or V47 hosting to the live V46 project.

## Release gate

No production deployment until the tenant path inventory, schema compatibility, two-school isolation, V46 regression tests, role security and data backup/rollback checks pass. All changes remain on `smss-v47-multischool-work`.
