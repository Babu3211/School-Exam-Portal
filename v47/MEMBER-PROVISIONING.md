# V47 membership provisioning — development only

The school admin may create **inactive** teacher/viewer membership documents under their own active school and subsequently activate those exact memberships. The rules forbid creating school_admin memberships, editing uid/schoolId/role, self-editing, cross-school edits, and deletion. Only Super Admin can create or modify school_admin membership.

**Important:** A Firestore membership is not a Firebase Authentication account. Account invitation, verified email ownership, initial credentials, identity verification, and user creation require a separate approved server-side Auth Admin SDK process. Never store plaintext passwords in Firestore or frontend code. UI helper plans do not execute writes or confer authorization.

Do not enable production until Firebase emulator tests pass, the invitation flow is implemented and reviewed, and deployment is approved.
