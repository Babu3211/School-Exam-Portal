# SMSS IEMIS Exam Importer

Created by Babukrishna Khanal

This Chrome/Edge Manifest V3 extension reads the open IEMIS Mark Entry table and imports `.xlsx` workbooks exported by SMSS. It fills the visible form after Preview. Use IEMIS's own Save button to persist the marks.

## Install

Extract the extension ZIP, open `chrome://extensions` (or `edge://extensions`), enable Developer mode, choose **Load unpacked**, and select the folder containing `manifest.json`. Reload the IEMIS tab. This extension requires a desktop Chromium browser with extension support.

## प्रयोग

१. IEMIS मा Manage Exam → Marks Entry खोल्नुहोस्। Year, Class, Section र Term छानेर Load गर्नुहोस्। चाहिने सबै विषयको checkbox छान्नुहोस्।

२. **Exam Importer → Read Form → Download Sample Excel** बाट यही form को `.xlsx` Sample निकाल्नुहोस्। Context र Marks sheet का heading नबदल्नुहोस्। विद्यार्थीका अंक मात्र भर्नुहोस्। SMSS को **Export IEMIS Excel** बाट आएको फाइल पनि यहीँ छान्न सकिन्छ।

३. खुलेको तालिकामा सीधै अंक लेख्न वा पहिलो अंकको कोठा छानेर Excel को आयताकार क्षेत्र पेस्ट गर्न सकिन्छ। **Copy Rows** ले विद्यार्थी विवरणसहित तालिकाका अंक कपी गर्छ। Excel छान्दा मिलेको विद्यार्थी र विषयमा अंक देखिन्छ। **Preview** मा पहेँलो कोठा जाँच्नुहोस्। **Import Excel → Preview** मा विद्यार्थी पहिचान, विषय, पूर्णाङ्क र परिवर्तन जाँच्नुहोस्। Excel बाट copy/paste गर्दा Marks sheet का heading बाहेक विद्यार्थीका चारवटै विवरण र अंकका column सँगै छान्नुहोस्।

४. पहिलेको अंक बदल्नु छ भने मात्र **Replace Existing Values** छान्नुहोस्। **Fill IEMIS Form** पछि IEMIS मा फेरि अंक जाँचेर त्यहाँकै **Save** थिच्नुहोस्। Save सफल भएपछि Reload गरेर पुष्टि गर्नुहोस्।

खाली cell ले शून्य लेख्दैन। शून्य अंकका लागि `0` लेख्नुहोस्। अनुपस्थित भए `IsAbsent` मा `TRUE` र प्राप्ताङ्क खाली राख्नुहोस्। Regd. No. मुख्य पहिचान हो। त्यो नभए मात्र unique Symbol No. प्रयोग हुन्छ। रोल वा नामको क्रमबाट अंक सारिँदैन।

बाकसको रातो–निलो माथिल्लो भाग समातेर सार्न र Minimize गर्न सकिन्छ। Native IEMIS page मा Year/Class/Term फेरिएपछि Load र Read Form दोहोर्‍याउनुहोस्।

## Scope

The manifest runs only on `https://emis.cehrd.gov.np/`. It requests no network, credential, storage, clipboard, or background permissions. Excel parsing uses bundled ExcelJS 4.4.0, under its included MIT license. The editor reads pasted text from the user's paste event. Copy Rows writes to the clipboard on request.

The table adapter verifies the observed S.N / Student Name / Regd. No. / Symbol No. identity columns and reads subject components and maxima from the current form. An unknown layout fails with a message. It does not infer missing marks or rescale different assessment maxima.
