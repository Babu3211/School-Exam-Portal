# CDC assessment source register — V46

This is a reference register for continuing PR #81 without redoing previously mapped forms. It contains URLs and provenance, not PDF bytes. Academic year 2083 uses the 2076 guide for Classes 1–3 and the 2083 guide for Classes 4–5 in the current implementation.

## Classes 1–3 — Student Assessment Guide 2076
- CDC publication page: https://moecdc.gov.np/content/644/student-assessment-guide-for-basic-level-class/
- Previously used PDF mirror: https://ggess.edu.np/wp-content/uploads/2021/06/STUDENTS-EVALUATION-GRADE-1-3.pdf
- Supporting curriculum (not a replacement for the assessment guide): https://giwmscdnone.gov.np/media/pdf_upload/Basic%20Level%20%28Grade%201-%203%29%20Curriculum_vtgf727.pdf
- As of 2026-11-24 the assessment guide mirror could not be reopened. Prior mapping notes in index.html reference Grade 3 English PDF pages 114–123 and the first three Grade 1 Our Surroundings reference forms on PDF pages 128–130. Reinspect source before certifying wording, layout, or expanding the forms.

## Classes 4–5 — Student Assessment Guide 2083
- CDC publication page: https://moecdc.gov.np/content/646/guide-to-student-assessment-in-basic-level/
- Government CEHRD resource: https://learning.cehrd.gov.np/mod/resource/view.php?id=1032
- Alternate PDF: https://nilaram.com.np/site-assets/uploads/2026/07/Students-Evaluation-2083.pdf
- The government resource was opened 2026-11-24 and identified as the 149-page CDC guide. Cover and Annex 3(f) Health, Physical and Creative Arts opening forms for Class 4 (PDF page 123, printed 122) and Class 5 (PDF page 136, printed 135) were visually inspected. The printed page number is not the same as the PDF viewer page number.
- The user also supplied a file titled विद्यार्थी मूल्याङ्कन मार्गदर्शन २०८३_eorih3h.pdf in the project. Use the project source for comparison where accessible. No PDF binary has been committed yet.

## Release guard
Keep source documents distinct by grade band and year; do not relabel draft paraphrases as exact CDC transcription. The source register and reference links do not constitute verification of every digital assessment form. Preserve existing student data, role restrictions, and V46 production. Keep PR #81 in draft until source, print, persistence, and regression checks are complete.

## 2026-11-24 — alternative curriculum copy, Class 1 Our Surroundings
- Alternate CDC curriculum copy: https://www.collegenp.com/uploads/pdf/2020/03/syllabus-for-compulsory-subjects-from-grade-one-to-three-2076.pdf
- Annex 3(d) screenshots: PDF viewer page 145 (printed 138), school: 2 main outcomes, 12 indicators; page 148 (printed 141), creation: 2 main outcomes, 12 indicators; page 150 (printed 143), communication and market: 2 main outcomes, 8 indicators; page 151 (printed 144), immediate world: 3 main outcomes, 8 indicators.
- The final sample shows irregular indicator group sizes (8+4 and 4+1+3). Do not use the existing four-boolean record shape or fabricate missing indicators for these samples. These counts are reference-only pending comparison with the assessment guide. Class 1 subtotal across ten themes in current mixed-source catalogue: 26 main outcomes, raw maximum 104, 108 indicators; not an official certified total.
- Printed page 144 explicitly limits the curriculum sample forms to Class 1; use the separate assessment guide for Classes 2–3 and the applicable local curriculum for local subject assessment. Do not extrapolate counts.

## 2026-11-24 — NEW official revised curriculum (2082), Classes 2–3 Our Surroundings
- Government CEHRD resource: https://learning.cehrd.gov.np/mod/resource/view.php?id=1259 (259-page CDC curriculum, 2076 revised 2082). Cover, section 15, Annex 1 and all 20 Class 2–3 Our Surroundings forms were visually inspected. This is a newer curriculum, NOT the separate 2076 assessment guide. The latter's DOE archival URL https://www.doe.gov.np/assets/uploads/files/ff5cbec92ccb2b84a6c71bcbd8b71831.pdf also failed to open.
- The revised forms use individually rated outcomes, regular and additional-support date/score columns, remarks and percentage = sum / (4 × number of outcomes) × 100. They are materially different from the older four-binary-indicator grouped forms; never reuse old record IDs or silently reinterpret existing records. Confirm academic-year applicability before switching production. Printed pages 231–240 and 241–250; corresponding zero-based PDF indices 237–246 and 247–256.

| Theme | Class 2 outcomes | Raw max | Printed page | Class 3 outcomes | Raw max | Printed page |
|---|---:|---:|---:|---:|---:|---:|
| म र मेरो परिवार | 18 | 72 | 231 | 16 | 64 | 241 |
| मेरो दैनिक जीवन | 13 | 52 | 232 | 14 | 56 | 242 |
| हाम्रो समुदाय | 13 | 52 | 233 | 16 | 64 | 243 |
| मेरो विद्यालय | 13 | 52 | 234 | 11 | 44 | 244 |
| हाम्रा वरपरका सजीवहरू | 6 | 24 | 235 | 5 | 20 | 245 |
| हाम्रो वातावरण | 7 | 28 | 236 | 7 | 28 | 246 |
| मेरो सिर्जना | 8 | 32 | 237 | 7 | 28 | 247 |
| हाम्रो संस्कृति | 4 | 16 | 238 | 5 | 20 | 248 |
| सञ्चार प्रविधि र बजार | 5 | 20 | 239 | 4 | 16 | 249 |
| हाम्रो वरपरको संसार | 8 | 32 | 240 | 12 | 48 | 250 |
| Total (raw, not official subject grade) | 95 | 380 | | 97 | 388 | |

- These are the revised **theme-form** row counts, not the earlier 25 class-level curriculum outcomes. Do not combine revisions or add both totals. Class 1 revised forms and other subject forms still require separate comparison. The revised Annex 4 (printed 251, PDF index 257) also provides a progress report with learning achievement count and overall achievement level. This register is a source-verification checkpoint only; no new assessment entry, migration or production release is authorized by it.
