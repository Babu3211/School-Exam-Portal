# V47 secure school registration handoff

The school registry UI view-model is prepared, but the registration write adapter deliberately fails closed. Firebase Web SDK `setDoc` overwrites an existing document; using it here would violate the create-only guarantee and could replace an existing school's metadata.

Implement a V47-only trusted registration service (Admin SDK with a Firestore transaction/create precondition) and authorize the caller as Super Admin server-side. The service must validate school ID, school name and IEMIS code, create the school inactive, and reject duplicate IDs. Never trust the UI's `isSuperAdmin` boolean as security.

The V47 Firestore rules currently permit Super Admin clients to create an inactive school document; do not use this client route until the emulator security matrix passes. Provision the first Super Admin through a trusted authenticated operator procedure, never public signup.

This is a development handoff. Do not connect it to the V46 Firebase project or deploy either project's rules.
