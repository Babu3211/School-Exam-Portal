# V47 integration roadmap — preserve V46

## School-scoped UI
- Super Admin: registry form, inactive-first school creation, explicit activation, school list, school member provisioning.
- School Admin: students, staff, attendance, exams, mark entry, teacher assignments, school settings.
- Teacher: only assigned class/subject operations once Firestore rules and emulator tests permit them.
- Viewer: all approved reports and screens, no writes.
- School selection: derive current membership from authenticated data; never trust client-selected school ID as authorization.

## Parity checklist
- ECD/Nursery alias, LKG, UKG, Classes 1–12; alphabetical student roster.
- 1st/2nd/final term and IEMIS 2083 Mark Entry, Mark Ledger, Grade Ledger, Grade Sheet.
- CDC grade/GPA and class 9–10 Computer 4/36/10 components.
- School map, user activity, English menus, 1-hour inactivity logout, PWA/APK, mobile layout.
- No bulk cross-school listeners; bounded pagination and query indexes.

Current code provides only data model, helper functions, UI validation and initial security baseline. **No production V47 school registration or dashboard is wired to Firebase yet.** V46 remains untouched.
