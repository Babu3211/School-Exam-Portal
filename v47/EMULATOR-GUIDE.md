# V47 Firestore emulator tests (no production access)

This test uses a separate local emulator on port 8187 and the `smss-v47-isolation-test` dummy project ID. It never contacts production Firebase or modifies V46 records.

From repository root, with Node 22 and Java installed:

```sh
npm install --no-package-lock --no-audit --no-fund
npx firebase emulators:exec --project smss-v47-isolation-test --only firestore --config v47/firebase.emulator.json "node v47/test-firestore-isolation.mjs"
```

The test initializes fake schools and users with admin-only emulator setup, then asserts cross-school denial, Viewer read-only, school Admin scoping, teacher write denial until assignments are implemented, Super Admin creation constraints, and inability to delete schools.

**Do not deploy** `v47/firestore.rules` to either production project until this suite compiles, passes and V46 feature parity has been verified.
