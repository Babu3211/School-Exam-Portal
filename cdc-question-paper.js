import { getApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import {readBundledScienceBank,buildAutomaticQuestionPaper,isSupportedScienceSubject,isQuestionReadyForLanguage,cognitiveMarkDistribution} from "./cdc-question-autogen.mjs";
import {aggregateExactCdcGrid} from "./cdc-exact-grid.mjs";
import {getBundledComputerGrid,bundledComputerUnitTopics} from "./cdc-verified-computer-grids.mjs";
import {findCdcGridSources} from "./cdc-grid-source-index.mjs";
import {getCdcOptionalMathGuide,optionalMathAreaTopics} from "./cdc-optional-math-2082.mjs";
import {CDC_G10_OPTIONAL_MATH_2083_MODEL,compareCdc2083MathModelToBundledGrid} from "./cdc-optional-math-model-compare.mjs";
import {inspectCdcOptionalMathPaper} from "./cdc-optional-math-composite.mjs";
import {originalOptionalMathPracticeBank} from "./cdc-optional-math-original-practice.mjs";
import {renderCdcCompositePaper} from "./cdc-optional-math-render.mjs";
import {QUESTION_EXCEL_FIELDS,parseQuestionExcelSheet,CDC_GRID_EXCEL_FIELDS,parseCdcGridExcelSheet} from "./cdc-question-excel.mjs";
import {validateExactCdcUnitGrid,inspectExactCdcGridAvailability} from "./cdc-exact-grid.mjs";
import { getAuth } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import {
  getFirestore, collection, addDoc, getDocs, doc, getDoc, setDoc,
  updateDoc, deleteDoc, query, where, orderBy, limit, serverTimestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

const app = getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const ADMIN_UID = "K6uSLmqg0vWCtCuzwtxKzFpQMu62";
const $ = id => document.getElementById(id);
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[c]));
const gradeNumber = value => {
  const match = String(value || "").replace(/[०-९]/g, d => "०१२३४५६७८९".indexOf(d)).match(/[0-9]+/);
  return match ? Number(match[0]) : 0;
};
const normal = value => String(value || "").trim().toLocaleLowerCase().replace(/\s+/g, " ");
const isAdmin = () => !!auth.currentUser && auth.currentUser.uid === ADMIN_UID;
let role = null, classSubjects = [], curriculumRows = [], questionRows = [], blueprintRows = [], savedPapers = [], generatedPaper = null;
let selectedClass = "", selectedSubject = "", selectedSection = "", currentBlueprint = null;
let bundledPracticeUnits=[],bundledPracticeQuestions=[],bundledPracticeStatus="",questionDataLoadEpoch=0,verifiedQuestionSelection=null;
let lastAutoSignature=null,paperHistoryLoadEpoch=0;

function message(text, error = false) {
  const el = $("qpMessage");
  if (el) { el.textContent = text; el.style.color = error ? "#b42318" : "#52627a"; }
}
async function logQuestionActivity(action,recordId,detail) {
  try {
    await addDoc(collection(db,"audit_logs"),{
      actorUid:auth.currentUser.uid,
      actorName:String(role?.displayName||auth.currentUser.displayName||"Teacher").slice(0,100),
      module:"question_papers",action:String(action).slice(0,40),
      recordId:String(recordId||"new").slice(0,150),detail:String(detail||"").slice(0,240),
      createdAt:serverTimestamp()
    });
  } catch(err) { console.warn("Question module audit log failed",err); }
}
function roleCanTeach(className, subject, section = "") {
  if (isAdmin()) return true;
  const pair = (role?.subjectAssignments || []).some(x =>
    String(x.className || "").trim() === className && normal(x.subject) === normal(subject) && (!String(x.section || "").trim() || String(x.section || "").trim() === section));
  const key = (role?.subjectAssignmentKeys || []).some(x => {
    const parts = String(x).split("::");
    return parts.length >= 2 && parts[0] === className && normal(parts.slice(1).join("::")) === normal(subject);
  });
  const sectionKeys = role?.subjectAssignmentSectionKeys;
  const sectionAllowed = !Array.isArray(sectionKeys) || !sectionKeys.length || sectionKeys.includes(className+"::"+subject+"::ALL") || sectionKeys.includes(className+"::"+subject+"::"+section);
  return role?.active === true && (role?.roles || []).includes("subject_teacher") && (pair || key) && sectionAllowed;
}
function pageShell() {
  return `
  <style>
    .qp-wrap{display:grid;gap:14px}
    /* Put the four teacher actions before optional admin/manual tooling. */
    #qpTopicCard{order:1}#qpPaperComposer{order:2}#qpBankList{order:3}
    #qpBankEditor{order:4}#qpCdcReferences{order:5}#qpCatalogAdmin{order:6}
    #qpSavedPapers{order:7}
    .qp-collapsible{margin-top:10px}.qp-collapsible summary{cursor:pointer;color:#2447a7;font-weight:750;padding:8px 0}
    .qp-card{background:#fff;border:1px solid #dce5f1;border-radius:14px;padding:16px;box-shadow:0 4px 14px rgba(22,48,84,.04)}
    .qp-card h3{margin:0 0 10px;color:#193b69}.qp-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}
    .qp-field{display:flex;flex-direction:column;gap:5px}.qp-field label{font-size:12px;font-weight:750;color:#42536b}
    .qp-field input,.qp-field select,.qp-field textarea{width:100%;border:1px solid #cbd6e4;border-radius:9px;padding:10px;font:inherit;background:#fff;min-width:0}
    .qp-field textarea{min-height:86px;resize:vertical}.qp-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
    .qp-btn{border:0;border-radius:9px;padding:10px 14px;background:#315bd6;color:#fff;font-weight:750;cursor:pointer}
    .qp-btn.alt{background:#edf2ff;color:#2447a7;border:1px solid #d5defa}.qp-btn.danger{background:#fff0f0;color:#a12828;border:1px solid #ffd0d0}
    .qp-hint{font-size:12px;color:#68778c;line-height:1.55}.qp-badge{display:inline-block;border-radius:20px;padding:4px 9px;background:#edf4ff;color:#244d9a;font-size:11px;font-weight:800}
    .qp-topic-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:7px;margin-top:10px}
    .qp-topic{display:flex;gap:8px;align-items:flex-start;border:1px solid #e1e8f1;border-radius:9px;padding:9px;font-size:13px}
    .qp-topic input{margin-top:3px}.qp-table{width:100%;border-collapse:collapse;font-size:12px}.qp-table th,.qp-table td{padding:9px;border-bottom:1px solid #e6ebf2;text-align:left;vertical-align:top}.qp-table th{background:#f5f8fc;color:#40536d}
    .qp-table-wrap{overflow-x:auto}.qp-section-title{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
    .qp-paper-preview{background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:22px;color:#111827}.qp-paper-preview h2,.qp-paper-preview h3{text-align:center;margin:5px}
    .qp-paper-preview .qp-q{margin:13px 0;line-height:1.6}.qp-paper-preview .qp-q b{white-space:pre-line}.qp-muted{color:#718096}.qp-hidden{display:none!important}
    @media(max-width:600px){.qp-card{padding:12px}.qp-paper-preview{padding:12px}.qp-table{min-width:650px}}
    @media print{body *{visibility:hidden!important}#qpPrintArea,#qpPrintArea *{visibility:visible!important}#qpPrintArea{position:absolute;left:0;top:0;width:100%;border:0!important;box-shadow:none!important}}
  </style>
  <div class="qp-wrap" id="qpApp">
    <div class="qp-card">
      <div class="qp-section-title"><div><h3>CDC पाठ्यक्रमअनुसार प्रश्नपत्र निर्माण</h3><div class="qp-hint">कक्षा ६–१० · विषय · एकाइ/पाठ · Topic · प्रश्न बैंक · स्वचालित प्रश्नपत्र</div></div><span class="qp-badge">नयाँ Module</span></div>
      <div class="qp-grid" style="margin-top:12px">
        <div class="qp-field"><label for="qpClass">कक्षा</label><select id="qpClass"><option value="">कक्षा छान्नुहोस्</option></select></div>
        <div class="qp-field"><label for="qpSubject">विषय</label><select id="qpSubject"><option value="">विषय छान्नुहोस्</option></select></div>
        <div class="qp-field"><label for="qpSection">Section</label><select id="qpSection"><option value="">Section छान्नुहोस्</option></select></div>
        <div class="qp-field"><label>पाठ्यक्रमको आधार</label><input id="qpCurriculumVersion" value="CDC पाठ्यक्रम — विषयअनुसार लागू संस्करण" readonly></div>
      </div>
      <p class="qp-hint" id="qpMessage" role="status">पहिले कक्षा र विषय छान्नुहोस्। शिक्षकले आफूलाई तोकिएको कक्षा/विषयमा मात्र काम गर्न पाउनुहुनेछ।</p>
    </div>

    <div class="qp-card" id="qpCdcReferences">
      <div class="qp-section-title"><h3>CDC आधिकारिक नमुना प्रश्नपत्र तथा विशिष्टीकरण स्रोत</h3><span class="qp-badge">CDC स्रोत</span></div>
      <details class="qp-collapsible" id="qpSourceDetails">
       <summary>कक्षा ६–१० का CDC स्रोत र पाठ्यपुस्तक खोल्नुहोस्</summary>
      <p class="qp-hint">तलका कागजातहरू प्रश्नपत्रको ढाँचा, प्रश्नको प्रकार र मूल्याङ्कन मापदण्ड जाँच्नका लागि हुन्। कक्षा/विषयअनुसार लागू संस्करण फरक हुन सक्छ; प्रणालीले स्रोत पुष्टि नभएको ढाँचालाई CDC प्रमाणित भनेर प्रयोग गर्दैन।</p>
      <p class="qp-hint"><b>कक्षा ८ विज्ञान तथा प्रविधि:</b> CDC पाठ्यपुस्तकका ११ एकाइमा आधारित ५५ वटा मौलिक अभ्यास प्रश्न/उत्तर प्याक उपलब्ध छ। Admin ले कक्षा ८ को विज्ञान विषय छानेर “CDC अभ्यास प्याक लोड” गर्न सक्छ। यी CDC का प्रकाशित नमुना प्रश्न होइनन्; औपचारिक परीक्षामा प्रयोग गर्नुअघि विषय शिक्षकले समीक्षा गर्नुपर्छ।</p>
      <p class="qp-hint"><b>कक्षा १० विज्ञान तथा प्रविधि:</b> CDC को २०८० पुस्तकका १९ एकाइमा आधारित ५७ वटा मौलिक अभ्यास प्रश्न (MCQ, छोटो र लामो उत्तर) को प्याक उपलब्ध छ। Admin ले कक्षा १० को विज्ञान विषय छानेर अभ्यास प्याक लोड गर्न सक्छ। CDC Library मा परिमार्जित २०८२ पुस्तकको अभिलेख पनि भएकाले हाल लागू पुस्तक र विशिष्टीकरण Grid सँग शिक्षकले मिलान गर्नुपर्छ। यी CDC का प्रकाशित नमुना प्रश्न होइनन्।</p>
      <div class="qp-grid">
        <div><b>कक्षा ६–८</b><ul class="qp-hint">
          <li><a href="https://moecdc.gov.np/content/290/specialization-schedule--class-6-8--social-study-and/" target="_blank" rel="noopener">सामाजिक अध्ययन तथा मानव मूल्य शिक्षा — विशिष्टीकरण तालिका (२०८३)</a></li>
          <li><a href="https://moecdc.gov.np/content/289/specialization-schedule--class-6---8--health-/" target="_blank" rel="noopener">स्वास्थ्य, शारीरिक तथा सिर्जनात्मक कला — Grid (२०८२)</a></li>
          <li><a href="https://moecdc.gov.np/content/292/specialization-schedule--class-6-8--math---samput/" target="_blank" rel="noopener">गणित कक्षा ६–८ — विशिष्टीकरण/नमुना प्रश्न (२०८०)</a></li>
          <li><a href="https://moecdc.gov.np/content/286/specifications-grid--grade---8--nepali/" target="_blank" rel="noopener">नेपाली कक्षा ८ — Grid</a></li>
          <li><a href="https://moecdc.gov.np/content/285/specification-grid--grade---8--english/" target="_blank" rel="noopener">English कक्षा ८ — Grid</a></li>
          <li><a href="https://moecdc.gov.np/content/284/specification-grid--grade-8--science-and-technology/" target="_blank" rel="noopener">विज्ञान तथा प्रविधि कक्षा ८ — CDC विशिष्टीकरण तालिका (२०८२)</a></li>
          <li><a href="https://moecdc.gov.np/content/111/science-/" target="_blank" rel="noopener">विज्ञान तथा प्रविधि कक्षा ६ — CDC पाठ्यपुस्तक (२०८२ पुनर्मुद्रण/२०८३ सूची)</a></li>
          <li><a href="https://moecdc.gov.np/content/577/" target="_blank" rel="noopener">विज्ञान तथा प्रविधि कक्षा ७ — CDC पाठ्यपुस्तक (२०८२)</a></li>
          <li><a href="https://moecdc.gov.np/category/specialization-schedule--g-/?page=5" target="_blank" rel="noopener">विज्ञान तथा प्रविधि कक्षा ८ लगायतका Grid</a></li>
          <li><a href="https://lib.moecdc.gov.np/elibrary/pages/search.php?access=&archive=&display=list&foredit=&k=&modal=&noreload=true&offset=0&order_by=field8&per_page=240&recentdaylimit=&restypes=&search=%21collection18397&sort=DESC" target="_blank" rel="noopener">CDC Publications 2082 — कक्षा ६–८ शिक्षक निर्देशिका तथा सामग्री</a></li>
          <li><a href="https://moecdc.gov.np/storage/gallery/1672198334.pdf" target="_blank" rel="noopener">पुरानो संयुक्त नमुना प्रश्नपत्र/विशिष्टीकरण (२०७८) — पूरक सन्दर्भ</a></li>
        </ul></div>
        <div><b>कक्षा ९–१० अनिवार्य विषय</b><ul class="qp-hint">
          <li><a href="https://moecdc.gov.np/content/282/specification-grid--9---10--compulsory-nepali/" target="_blank" rel="noopener">अनिवार्य नेपाली — Grid (२०८२)</a></li>
          <li><a href="https://moecdc.gov.np/content/280/specification-grid--grade-9--10--compulsory-english/" target="_blank" rel="noopener">अनिवार्य English — Grid (२०८२)</a></li>
          <li><a href="https://moecdc.gov.np/content/281/" target="_blank" rel="noopener">अनिवार्य गणित — Grid (२०८२)</a></li>
          <li><a href="https://moecdc.gov.np/content/278/specialization-schedule-class-class-9-science-and/" target="_blank" rel="noopener">विज्ञान तथा प्रविधि कक्षा ९ — CDC विशिष्टीकरण तालिका (२०८२)</a></li>
          <li><a href="https://moecdc.gov.np/content/61/science-and-technology-class-9/" target="_blank" rel="noopener">विज्ञान तथा प्रविधि कक्षा ९ — CDC पाठ्यपुस्तक (२०८२)</a></li>
          <li><a href="https://moecdc.gov.np/content/592/science-and-technology-class---x/" target="_blank" rel="noopener">विज्ञान तथा प्रविधि कक्षा १० — CDC पाठ्यपुस्तक (२०८२)</a></li>
          <li><a href="https://moecdc.gov.np/category/specialization-schedule--g-/?page=6" target="_blank" rel="noopener">कक्षा ९–१० विज्ञान तथा प्रविधि र सामाजिक अध्ययन — थप विषयगत Grid</a></li>
          <li><a href="https://lib.moecdc.gov.np/elibrary/pages/search.php?access=&archive=&display=list&foredit=&k=&modal=&noreload=true&offset=0&order_by=field8&per_page=240&recentdaylimit=&restypes=&search=%21collection18397&sort=DESC" target="_blank" rel="noopener">CDC Library — विज्ञान तथा प्रविधि र सामाजिक अध्ययनका शिक्षक निर्देशिका/Model सामग्री</a></li>
          <li><a href="https://moecdc.gov.np/content/488/health-and-physical-education-syllabus--2082-secondary/" target="_blank" rel="noopener">स्वास्थ्य तथा शारीरिक शिक्षा पाठ्यक्रम २०८२</a></li>
        </ul></div>
        <div><b>ऐच्छिक तथा थप विषय</b><ul class="qp-hint">
          <li><a href="https://moecdc.gov.np/content/10/specification-schedule-and-sample-questions--class-9/" target="_blank" rel="noopener">ऐच्छिक गणित कक्षा ९–१० — Grid तथा नमुना प्रश्न (२०८२)</a></li>
          <li><a href="https://moecdc.gov.np/content/658/class-10-computer-science-optional-subject-specification/" target="_blank" rel="noopener">ऐच्छिक कम्प्युटर विज्ञान कक्षा १०</a></li>
          <li><a href="https://moecdc.gov.np/category/specialization-schedule--g-/?page=1" target="_blank" rel="noopener">ऐच्छिक अर्थशास्त्र, कम्प्युटर विज्ञान, गणित तथा नयाँ Grid/उत्तरकुञ्जिका</a></li>
        </ul></div>
      </div>
      <p class="qp-hint">नोट: यी स्रोतहरू CDC का उपलब्ध प्रकाशनअनुसार अद्यावधिक गरिएका छन्। सबै कक्षा/विषयका अध्यायगत Topic र प्रश्न/उत्तर बैंकको पूर्ण आयात तथा जाँच अझै बाँकी छ; पुराना Grid लाई नयाँ संस्करणसँग नमिसाउनुहोस्।</p>
      </details>
    </div>

    <div class="qp-card" id="qpCatalogAdmin">
      <div class="qp-section-title"><h3>१. CDC पाठ्यक्रम तथा Topic सूची व्यवस्थापन (Admin)</h3><span class="qp-badge">Admin मात्र</span></div>
      <p class="qp-hint">CDC को आधिकारिक पाठ्यक्रम/विशिष्टीकरण तालिकाबाट एकाइ र Topic प्रविष्ट वा JSON सूची आयात गर्नुहोस्। स्रोत र पाठ्यक्रम संस्करण राख्न अनिवार्य छ। अप्रमाणित Topic लाई CDC आधिकारिक भनेर चिनाइँदैन।</p>
      <p class="qp-hint">आधिकारिक आधार: <a href="https://moecdc.gov.np/content/472/basic-teaching-courses--2079--class-6-8--mandatory/" target="_blank" rel="noopener">कक्षा ६–८ अनिवार्य पाठ्यक्रम २०७९</a> · <a href="https://moecdc.gov.np/content/201/secondary-education-curssions--2078--class-9-10--mandatory/" target="_blank" rel="noopener">कक्षा ९–१० अनिवार्य पाठ्यक्रम २०७८</a> · <a href="https://moecdc.gov.np/category/course--g-/?page=2" target="_blank" rel="noopener">सामाजिक अध्ययन पाठ्यक्रम २०८२</a> · <a href="https://moecdc.gov.np/content/488/health-and-physical-education-syllabus--2082-secondary/" target="_blank" rel="noopener">स्वास्थ्य तथा शारीरिक शिक्षा २०८२</a>.</p>
      <form id="qpUnitForm" class="qp-grid">
        <div class="qp-field"><label for="qpUnitCode">एकाइ नम्बर/कोड</label><input id="qpUnitCode" maxlength="30" required placeholder="जस्तै: Unit 1"></div>
        <div class="qp-field"><label for="qpUnitTitle">एकाइ/पाठको नाम</label><input id="qpUnitTitle" maxlength="180" required></div>
        <div class="qp-field"><label for="qpVersion">CDC पाठ्यक्रम संस्करण</label><input id="qpVersion" maxlength="100" required placeholder="जस्तै: आधारभूत शिक्षा पाठ्यक्रम २०७९"></div>
        <div class="qp-field"><label for="qpSourceTitle">CDC स्रोतको शीर्षक</label><input id="qpSourceTitle" maxlength="180" required placeholder="आधिकारिक पाठ्यक्रम/विशिष्टीकरण तालिका"></div>
        <div class="qp-field"><label for="qpSourceUrl">CDC स्रोत URL</label><input id="qpSourceUrl" type="url" maxlength="500" required placeholder="https://moecdc.gov.np/..."></div>
        <div class="qp-field" style="grid-column:1/-1"><label for="qpTopicsInput">यस एकाइका Topic (प्रत्येक लाइनमा एउटा)</label><textarea id="qpTopicsInput" required maxlength="12000" placeholder="पहिलो Topic&#10;दोस्रो Topic&#10;तेस्रो Topic"></textarea></div>
        <div class="qp-actions" style="grid-column:1/-1"><button class="qp-btn" type="submit">एकाइ र Topic सुरक्षित गर्नुहोस्</button><button class="qp-btn alt" id="qpTemplateBtn" type="button">JSON नमुना डाउनलोड</button><label class="qp-btn alt" for="qpImportFile">CDC Topic JSON आयात</label><input id="qpImportFile" class="qp-hidden" type="file" accept=".json,application/json"></div>
      </form>
      <hr style="border:0;border-top:1px solid #e5ebf3;margin:16px 0">
      <h3>CDC विशिष्टीकरण तालिका / Blueprint</h3>
      <p class="qp-hint">प्रत्येक कक्षा/विषयको आधिकारिक CDC Grid अनुसार पूर्णाङ्क, समय, प्रश्न प्रकार, अङ्क र संज्ञानात्मक स्तर Admin ले स्रोतसहित सेट गर्न सक्छ। आधिकारिक Grid उपलब्ध नभएसम्म प्रणालीले Custom Pattern मात्र देखाउँछ।</p>
      <form id="qpBlueprintForm" class="qp-grid">
        <div class="qp-field"><label for="qpBpFullMarks">पूर्णाङ्क</label><input id="qpBpFullMarks" type="number" min="1" max="500" required value="50"></div>
        <div class="qp-field"><label for="qpBpDuration">समय (मिनेट)</label><input id="qpBpDuration" type="number" min="15" max="360" required value="120"></div>
        <div class="qp-field"><label for="qpBpMcqCount">MCQ प्रश्न संख्या</label><input id="qpBpMcqCount" type="number" min="0" max="100" value="10"></div>
        <div class="qp-field"><label for="qpBpMcqMarks">प्रति MCQ अङ्क</label><input id="qpBpMcqMarks" type="number" min="1" max="20" value="1"></div>
        <div class="qp-field"><label for="qpBpShortCount">छोटो उत्तर प्रश्न संख्या</label><input id="qpBpShortCount" type="number" min="0" max="100" value="6"></div>
        <div class="qp-field"><label for="qpBpShortMarks">प्रति छोटो प्रश्न अङ्क</label><input id="qpBpShortMarks" type="number" min="1" max="30" value="5"></div>
        <div class="qp-field"><label for="qpBpLongCount">लामो उत्तर प्रश्न संख्या</label><input id="qpBpLongCount" type="number" min="0" max="100" value="1"></div>
        <div class="qp-field"><label for="qpBpLongMarks">प्रति लामो प्रश्न अङ्क</label><input id="qpBpLongMarks" type="number" min="1" max="50" value="10"></div>
        <div class="qp-field"><label for="qpBpKnowledge">ज्ञान (%)</label><input id="qpBpKnowledge" type="number" min="0" max="100" value="20"></div>
        <div class="qp-field"><label for="qpBpUnderstanding">बोध (%)</label><input id="qpBpUnderstanding" type="number" min="0" max="100" value="30"></div>
        <div class="qp-field"><label for="qpBpApplication">प्रयोग (%)</label><input id="qpBpApplication" type="number" min="0" max="100" value="30"></div>
        <div class="qp-field"><label for="qpBpHigher">उच्च क्षमता (%)</label><input id="qpBpHigher" type="number" min="0" max="100" value="20"></div>
        <div class="qp-field"><label for="qpBpVersion">Grid संस्करण</label><input id="qpBpVersion" maxlength="100" required placeholder="CDC Grid 2082"></div>
        <div class="qp-field"><label for="qpBpSourceTitle">Grid स्रोत शीर्षक</label><input id="qpBpSourceTitle" maxlength="180" required></div>
        <div class="qp-field" style="grid-column:1/-1"><label for="qpBpSourceUrl">आधिकारिक CDC स्रोत URL</label><input id="qpBpSourceUrl" type="url" maxlength="500" required></div>
        <div class="qp-field" style="grid-column:1/-1"><label for="qpBpUnitGrid">मूल CDC Grid अनुसार Unit–Level–Question Type–Marks (JSON, Admin मात्र)</label><textarea id="qpBpUnitGrid" rows="5" required maxlength="20000" placeholder='[{"unitCode":"1","type":"mcq","marks":1,"count":2,"cognitiveLevel":"knowledge"}]'></textarea>
          <p class="qp-hint">माथिको JSON केवल ढाँचाको उदाहरण हो, CDC को आधिकारिक वितरण होइन। सम्बन्धित कक्षा/विषयको CDC दस्तावेजबाट वास्तविक पङ्क्ति पुष्टि गरेर मात्र राख्नुहोस्। शिक्षकले प्रश्न टाइप गर्नुपर्दैन।</p>
          <div class="qp-actions"><button class="qp-btn alt" id="qpBpGridExcelTemplateBtn" type="button">CDC Grid Excel Sample (.xlsx)</button><label class="qp-btn alt" for="qpBpGridExcelFile">Admin: Import Reviewed Grid Excel</label><input class="qp-hidden" id="qpBpGridExcelFile" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"><label class="qp-btn alt" for="qpBpGridFile">CDC Grid JSON (पुरानो विकल्प)</label><input class="qp-hidden" id="qpBpGridFile" type="file" accept=".json,application/json">
          <button class="qp-btn alt" type="button" id="qpBpAnalyzeGrid">Grid का अंक/प्रकार स्वतः गणना</button></div>
          <p class="qp-hint" id="qpBpGridAnalysis" role="status">असली Grid पङ्क्ति ल्याएपछि Preview गर्नुहोस्; गलत जम्मा भए Save हुनेछैन।</p>
          <label class="qp-topic"><input id="qpBpSourceReviewed" type="checkbox" required>मूल CDC Grid का Unit, प्रश्न संख्या, प्रकार, अङ्क र संज्ञानात्मक स्तर मैले जाँचेर मिलाएको छु।</label>
        </div>
        <div class="qp-actions" style="grid-column:1/-1"><button class="qp-btn" type="submit">यो कक्षा/विषयको Blueprint सुरक्षित गर्नुहोस्</button><span class="qp-hint" id="qpBpStatus"></span></div>
      </form>
    </div>

    <div class="qp-card" id="qpTopicCard">
      <div class="qp-section-title"><h3>२. CDC Topic छान्नुहोस्</h3><span class="qp-badge" id="qpTopicCount">० Topic</span></div>
      <div class="qp-actions"><button class="qp-btn alt" type="button" id="qpSelectGridUnits">CDC Grid का Unit छान्नुहोस्</button><button class="qp-btn alt" type="button" id="qpTopicSelectAll">सबै Topic चयन</button><button class="qp-btn alt" type="button" id="qpTopicClearAll">Topic चयन हटाउनुहोस्</button></div>
      <p class="qp-hint">शिक्षकले प्रश्न बैंकमा आफैँ थपेका Topic र उपलब्ध पाठ्यक्रम सूचीबाट आफूले चाहेका Topic छान्नुहोस्। कुनै पूर्वलोड गरिएको सूची आवश्यक छैन।</p>
      <div id="qpTopicList" class="qp-topic-list"><p class="qp-hint">कक्षा र विषय छान्नुहोस्।</p></div>
    </div>

    <div class="qp-card" id="qpBankEditor">
      <details class="qp-collapsible" id="qpManualQuestions">
      <summary>३. थप प्रश्न बैंक व्यवस्थापन (ऐच्छिक — प्रश्न नटाइपी Generate गर्न सकिन्छ)</summary>
      <form id="qpQuestionForm" class="qp-grid">
        <div class="qp-field"><label for="qpQuestionUnit">एकाइ / पाठ (ऐच्छिक)</label><input id="qpQuestionUnit" maxlength="180" placeholder="आफूले चाहेको एकाइ"></div><div class="qp-field"><label for="qpQuestionTopic">आफूले चाहेको Topic</label><input id="qpQuestionTopic" list="qpTopicSuggestions" maxlength="180" required placeholder="Topic को नाम लेख्नुहोस्"><datalist id="qpTopicSuggestions"></datalist></div>
        <div class="qp-field"><label for="qpQuestionType">प्रश्नको प्रकार</label><select id="qpQuestionType"><option value="mcq">बहुविकल्पीय (MCQ)</option><option value="short">छोटो उत्तर</option><option value="long">लामो उत्तर</option></select></div>
        <div class="qp-field"><label for="qpQuestionMarks">पूर्णाङ्क</label><input id="qpQuestionMarks" type="number" min="1" max="100" required value="1"></div>
        <div class="qp-field"><label for="qpQuestionLevel">संज्ञानात्मक स्तर</label><select id="qpQuestionLevel"><option value="knowledge">ज्ञान (Knowledge)</option><option value="understanding">बोध (Understanding)</option><option value="application">प्रयोग (Application)</option><option value="higher">उच्च क्षमता (Higher Ability)</option></select></div>
        <div class="qp-field" style="grid-column:1/-1"><label for="qpQuestionText">प्रश्न (नेपाली वा English)</label><textarea id="qpQuestionText" required maxlength="3000"></textarea></div>
        <div class="qp-field qp-mcq-field"><label for="qpOptionA">विकल्प A</label><input id="qpOptionA" maxlength="500"></div>
        <div class="qp-field qp-mcq-field"><label for="qpOptionB">विकल्प B</label><input id="qpOptionB" maxlength="500"></div>
        <div class="qp-field qp-mcq-field"><label for="qpOptionC">विकल्प C</label><input id="qpOptionC" maxlength="500"></div>
        <div class="qp-field qp-mcq-field"><label for="qpOptionD">विकल्प D</label><input id="qpOptionD" maxlength="500"></div>
        <div class="qp-field qp-mcq-field"><label for="qpCorrectOption">सही विकल्प</label><select id="qpCorrectOption"><option value="">छान्नुहोस्</option><option>A</option><option>B</option><option>C</option><option>D</option></select></div>
        <div class="qp-field" style="grid-column:1/-1"><label for="qpAnswer">उत्तर/उत्तर संकेत (शिक्षकका लागि)</label><textarea id="qpAnswer" maxlength="3000"></textarea></div>
        <div class="qp-actions" style="grid-column:1/-1"><button class="qp-btn" type="submit">प्रश्न बैंकमा सुरक्षित गर्नुहोस्</button><button class="qp-btn alt" type="reset">खाली गर्नुहोस्</button></div>
      </form>
      <p class="qp-hint">Topic को नाम CDC सूचीमा जस्ताको तस्तै लेख्दा प्रश्न आधिकारिक एकाइसँग जोडिन्छ। नयाँ Topic भए शिक्षकले आफ्नै नाम लेख्न सक्नुहुन्छ। Auto Generate ले उपलब्ध प्रश्न बैंकबाट प्रश्नपत्र मिलाउँछ; प्रश्न आफैँबाट नयाँ सिर्जना गर्दैन। बाह्य AI/API वा शुल्क प्रयोग हुँदैन।</p>
      <div class="qp-actions"><button class="qp-btn alt" id="qpQuestionExcelTemplateBtn" type="button">Question Bank Excel Sample (.xlsx)</button><label class="qp-btn alt" for="qpQuestionExcelFile">Admin: Import Excel (.xlsx)</label><input id="qpQuestionExcelFile" class="qp-hidden" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"><button class="qp-btn alt" id="qpQuestionTemplateBtn" type="button">JSON नमुना (पुरानो विकल्प)</button><label class="qp-btn alt" for="qpQuestionImportFile">Admin: JSON आयात</label><input id="qpQuestionImportFile" class="qp-hidden" type="file" accept=".json,application/json"><button class="qp-btn alt qp-hidden" id="qpGrade8SciencePackBtn" type="button">Admin: कक्षा ८ विज्ञान CDC अभ्यास प्याक लोड</button><button class="qp-btn alt qp-hidden" id="qpGrade10SciencePackBtn" type="button">Admin: कक्षा १० विज्ञान अभ्यास प्याक (शिक्षक समीक्षा)</button></div>
      <p class="qp-hint">प्रश्न बैंक JSON आयात गर्दा हाल छानिएको कक्षा, विषय र Section मा मात्र प्रश्न थपिन्छ। दोहोरिएका प्रश्नहरू छुट्याइन्छ।</p>
      </details>
    </div>

    <div class="qp-card" id="qpBankList">
      <div class="qp-section-title"><h3>४. प्रश्न बैंक</h3><button class="qp-btn alt" id="qpRefreshBtn" type="button">Refresh</button></div>
      <div class="qp-table-wrap"><table class="qp-table"><thead><tr><th>Topic</th><th>प्रश्न</th><th>प्रकार</th><th>स्तर</th><th>अङ्क</th><th>थप्ने शिक्षक</th><th>कार्य</th></tr></thead><tbody id="qpQuestionRows"><tr><td colspan="7">पहिले कक्षा/विषय छान्नुहोस्।</td></tr></tbody></table></div>
    </div>

    <div class="qp-card" id="qpPaperComposer">
      <div class="qp-section-title"><h3>५. स्वचालित प्रश्नपत्र तयार गर्नुहोस्</h3><span id="qpBlueprintBadge" class="qp-badge">Custom Pattern</span></div>
      <div class="qp-grid">
        <div class="qp-field"><label for="qpPaperTitle">परीक्षाको नाम</label><input id="qpPaperTitle" maxlength="120" value="त्रैमासिक परीक्षा"></div>
        <div class="qp-field"><label for="qpPaperYear">शैक्षिक वर्ष</label><input id="qpPaperYear" maxlength="20" value="2083"></div>
        <div class="qp-field"><label for="qpPaperDuration">समय (मिनेट)</label><input id="qpPaperDuration" type="number" min="15" max="360" value="120"></div>
        <div class="qp-field"><label for="qpPaperFullMarks">पूर्णाङ्क</label><input id="qpPaperFullMarks" type="number" min="1" max="500" value="50"></div>
        <div class="qp-field"><label for="qpAutoLanguage">प्रश्नपत्रको भाषा</label><select id="qpAutoLanguage"><option value="ne">नेपाली मात्र</option><option value="en">English only</option><option value="both">नेपाली + English दुवै</option></select></div>
        <div class="qp-field"><label for="qpAutoMode">प्रश्नपत्रको ढाँचा</label><select id="qpAutoMode"><option value="cdc">CDC Unit-wise Grid EXACT</option><option value="practice">अभ्यास मात्र (CDC Grid होइन)</option></select></div>
        <div class="qp-field"><label for="qpPaperMcqCount">MCQ संख्या</label><input id="qpPaperMcqCount" type="number" min="0" max="100" value="10"></div>
        <div class="qp-field"><label for="qpPaperMcqMarks">MCQ प्रति अङ्क</label><input id="qpPaperMcqMarks" type="number" min="1" max="20" value="1"></div>
        <div class="qp-field"><label for="qpPaperShortCount">छोटो प्रश्न संख्या</label><input id="qpPaperShortCount" type="number" min="0" max="100" value="6"></div>
        <div class="qp-field"><label for="qpPaperShortMarks">छोटो प्रश्न प्रति अङ्क</label><input id="qpPaperShortMarks" type="number" min="1" max="30" value="5"></div>
        <div class="qp-field"><label for="qpPaperLongCount">लामो प्रश्न संख्या</label><input id="qpPaperLongCount" type="number" min="0" max="100" value="1"></div>
        <div class="qp-field"><label for="qpPaperLongMarks">लामो प्रश्न प्रति अङ्क</label><input id="qpPaperLongMarks" type="number" min="1" max="50" value="10"></div>
      </div>
      <p class="qp-hint" id="qpPatternHint">CDC Grid आयात गरिएको छैन भने शिक्षकले Custom Pattern राख्न सक्नुहुन्छ। कुल प्रश्नको अङ्क पूर्णाङ्कसँग मिल्नुपर्छ।</p>
      <p class="qp-hint" id="qpAutoSourceStatus" role="status">उपलब्ध प्रश्न बैंक जाँचिँदैछ।</p>
      <p class="qp-hint" id="qpOfficialGridSource"></p>
      <p class="qp-hint" id="qpAutoGridStatus" role="status">CDC Exact मोडमा सम्बन्धित कक्षा, विषय र पूर्णाङ्कको समीक्षित Unit-wise Grid चाहिन्छ।</p>
      <p class="qp-hint">एक क्लिकमा: कक्षा/विषय, Topic, पूर्णाङ्क र भाषा छान्नुहोस्। उपलब्ध मौलिक अभ्यास प्रश्नबाट ठीक पूर्णाङ्कको Draft तयार हुनेछ। पर्याप्त जाँचिएका प्रश्न नभए गलत प्रश्नपत्र बनाइँदैन। CDC Grid को लागू संस्करण शिक्षकले पुष्टि गर्नुपर्छ।</p>
      <label class="qp-topic" style="margin-top:9px;background:#fff8e9;align-items:center"><input id="qpAutoReviewed" type="checkbox"><span>मैले तयार भएको प्रश्नपत्र, पूर्णाङ्क, लागू CDC विशिष्टीकरण तालिका र उत्तरकुञ्जिका पढेर जाँच गरेको छु। <b>जाँच नगरी Save वा Print हुँदैन।</b></span></label>
      <div class="qp-actions"><button class="qp-btn" id="qpSmartGenerateBtn" type="button">एक क्लिकमा Auto Question Paper</button><button class="qp-btn alt" id="qpGenerateBtn" type="button">म्यानुअल Pattern Generate</button><button class="qp-btn alt" id="qpSavePaperBtn" type="button" disabled>प्रश्नपत्र Save</button><button class="qp-btn alt" id="qpPrintPaperBtn" type="button" disabled>प्रश्नपत्र Print / PDF</button><button class="qp-btn alt" id="qpAnswerKeyBtn" type="button" disabled>उत्तरकुञ्जिका Print / PDF</button></div>
      <div id="qpPaperPreview" style="margin-top:14px"><p class="qp-hint">Topic छानेर प्रश्नपत्र Auto Generate गर्नुहोस्।</p></div>
    </div>

    <div class="qp-card" id="qpSavedPapers">
      <div class="qp-section-title"><h3>६. सुरक्षित प्रश्नपत्र अभिलेख</h3><button class="qp-btn alt" id="qpPaperReloadBtn" type="button">Refresh</button></div>
      <div class="qp-table-wrap"><table class="qp-table"><thead><tr><th>परीक्षा</th><th>कक्षा</th><th>विषय</th><th>पूर्णाङ्क</th><th>समय</th><th>मिति</th><th>कार्य</th></tr></thead><tbody id="qpPaperRows"><tr><td colspan="7">पहिले कक्षा/विषय छान्नुहोस्।</td></tr></tbody></table></div>
    </div>
  </div>`;
}
function selectedTopicIds() {
  return [...document.querySelectorAll("[data-qp-topic]:checked")].map(x => x.value);
}
function shuffle(items) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function questionTypeLabel(type) {
  return ({mcq:"MCQ",short:"छोटो उत्तर",long:"लामो उत्तर"})[type] || type;
}
function levelLabel(level) {
  return ({knowledge:"ज्ञान",understanding:"बोध",application:"प्रयोग",higher:"उच्च क्षमता"})[level] || level || "—";
}
function getPattern(prefix) {
  return [
    {type:"mcq",count:Number($(prefix+"McqCount")?.value || 0),marks:Number($(prefix+"McqMarks")?.value || 1)},
    {type:"short",count:Number($(prefix+"ShortCount")?.value || 0),marks:Number($(prefix+"ShortMarks")?.value || 1)},
    {type:"long",count:Number($(prefix+"LongCount")?.value || 0),marks:Number($(prefix+"LongMarks")?.value || 1)}
  ];
}
function setBuilderPattern(pattern, fullMarks, duration) {
  const byType = Object.fromEntries((pattern || []).map(x => [x.type, x]));
  for (const [type, key] of [["mcq","Mcq"],["short","Short"],["long","Long"]]) {
    const p = byType[type] || {count:0,marks:1};
    if ($("qpPaper"+key+"Count")) $("qpPaper"+key+"Count").value = p.count ?? 0;
    if ($("qpPaper"+key+"Marks")) $("qpPaper"+key+"Marks").value = p.marksEach ?? p.marks ?? 1;
  }
  if (fullMarks) $("qpPaperFullMarks").value = fullMarks;
  if (duration) $("qpPaperDuration").value = duration;
}
function renderTopics() {
 const box=$("qpTopicList"),picker=$("qpQuestionTopic");
 if(!box||!picker)return;
 const keyFor=(code,title,topic)=>{
  const group=String(code||"").trim()?"unit:"+String(code).trim():"title:"+normal(title);
  return group+"::"+normal(topic);
 };
 const topics=curriculumRows.flatMap(unit=>(unit.topics||[]).map((topic,index)=>({
  id:unit.id+"_"+index,unitId:unit.id,unitCode:String(unit.unitCode||""),
  unitTitle:unit.unitTitle,topicName:String(topic)
 })));
 const known=new Set(topics.map(x=>x.id));
 const byUnitTopic=new Map(topics.map(x=>[keyFor(x.unitCode,x.unitTitle,x.topicName),x.id]));
 for(const unit of bundledPracticeUnits){
  for(const [index,name]of(unit.topics||[]).entries()){
   const key=keyFor(unit.unitCode,unit.unitTitle,name);
   if(byUnitTopic.has(key))continue;
   const id=unit.id+"_"+index;
   byUnitTopic.set(key,id);known.add(id);
   topics.push({id,unitId:unit.id,unitCode:String(unit.unitCode||""),
    unitTitle:unit.unitTitle,topicName:String(name)});
  }
 }
 // Preserve the unit identity: two units may contain the same topic name.
 bundledPracticeQuestions=bundledPracticeQuestions.map(q=>({
  ...q,topicId:byUnitTopic.get(keyFor(q.unitCode,q.unitTitle,q.topicName))||q.topicId
 }));
 // Imported Excel/JSON questions may retain legacy custom IDs. Match a
 // question to the SELECTED CDC unit/topic by unit code/title/name without
 // altering Firestore IDs; otherwise the exact allocator rejects valid rows.
 questionRows=questionRows.map(q=>({
  ...q,topicId:byUnitTopic.get(keyFor(q.unitCode,q.unitTitle,q.topicName))||q.topicId
 }));
 questionRows.forEach(q=>{
  if(!q.topicName)return;
  const key=keyFor(q.unitCode,q.unitTitle,q.topicName);
  if(byUnitTopic.has(key))return;
  const id=String(q.topicId||"custom_"+normal((q.unitTitle||"")+"::"+q.topicName));
  if(known.has(id))return;
  known.add(id);byUnitTopic.set(key,id);
  topics.push({id,unitId:q.unitId||"",unitCode:String(q.unitCode||""),
   unitTitle:q.unitTitle||"शिक्षकले थपेको Topic",topicName:String(q.topicName)});
 });
 $("qpTopicCount").textContent=topics.length+" Topic";
 if(!topics.length){
  box.innerHTML='<p class="qp-hint">यस कक्षा/विषयको Topic र समीक्षा गरिएको प्रश्न बैंक उपलब्ध छैन।</p>';
  picker.innerHTML="";return;
 }
 box.innerHTML=topics.map(x=>`<label class="qp-topic"><input type="checkbox" data-qp-topic data-unit-code="${esc(x.unitCode||"")}" value="${esc(x.id)}" checked><span><b>${esc(x.topicName)}</b><small class="qp-hint"> · ${esc(x.unitTitle||"एकाइ नतोकिएको")}</small></span></label>`).join("");
 picker.innerHTML=topics.map(x=>'<option value="'+esc(x.topicName)+'">').join("");
}
function renderQuestionRows() {
  const body = $("qpQuestionRows"); if (!body) return;
  if (!questionRows.length) { body.innerHTML='<tr><td colspan="7">यस विषयको प्रश्न बैंक खाली छ। पहिले प्रश्न थप्नुहोस्।</td></tr>'; return; }
  body.innerHTML = questionRows.slice(0,100).map(q => `<tr>
    <td>${esc(q.topicName)}</td><td>${esc(q.questionText)}</td><td>${esc(questionTypeLabel(q.questionType))}</td>
    <td>${esc(levelLabel(q.cognitiveLevel))}</td><td>${esc(q.marks)}</td><td>${esc(q.createdByName||"शिक्षक")}</td>
    <td>${q.createdBy===auth.currentUser?.uid||isAdmin()?'<button class="qp-btn danger" type="button" data-qp-delete-question="'+esc(q.id)+'">Delete</button>':'—'}</td>
  </tr>`).join("");
}
function updateAutoReviewActions(){
 const ready=!!generatedPaper&&(!generatedPaper.qualityReport?.teacherReviewRequired||
  $("qpAutoReviewed")?.checked===true);
 for(const id of ["qpSavePaperBtn","qpPrintPaperBtn","qpAnswerKeyBtn"])if($(id))$(id).disabled=!ready;
}
function invalidateGeneratedQuestionPaper(){
 generatedPaper=null;
 if($("qpAutoReviewed"))$("qpAutoReviewed").checked=false;
 updateAutoReviewActions();
 renderPaperPreview(null);
}
function renderPaperPreview(paper = generatedPaper) {
  const box = $("qpPaperPreview"); if (!box) return;
  if (!paper) { box.innerHTML='<p class="qp-hint">Topic छानेर प्रश्नपत्र Auto Generate गर्नुहोस्।</p>'; return; }
  if(paper.questionFormat==="cdc_optional_math_composite"){
    box.innerHTML='<p class="qp-hint"><b>CDC २०८२ अनुसार संरचना मिलेको विद्यालय प्रश्नपत्र:</b> WCA/CCA र उत्तरहरू शिक्षकले पुनः जाँचेर मात्र Save/Print गर्नुहोस्। CDC प्रकाशित Model Question होइन।</p>'+
     renderCdcCompositePaper(paper,{escapeHtml:esc});
    return;
  }
  const groups = ["mcq","short","long"];
  let number = 0;
  const report=paper.qualityReport||null;
  const reportHtml=report?'<div class="qp-hint" style="border:1px solid #dce5f1;border-radius:8px;padding:9px;margin-bottom:10px"><b>शिक्षक समीक्षा:</b> '+esc(report.questionCount)+' प्रश्न · '+esc(report.selectedTopicCount)+' Topic · '+esc(report.missingAnswerCount)+' प्रश्नमा उत्तर संकेत बाँकी। संज्ञानात्मक अङ्कभार: '+Object.entries(report.cognitiveActual||{}).map(([k,v])=>esc(levelLabel(k))+' '+esc(Math.round(Number(v)*100)/100)+'%').join(' · ')+'</div>':"";
  const audit=paper.questions.map((q,index)=>({index:index+1,...q.gridEvidence}))
    .filter(q=>q.unitCode&&q.questionId);
  const gridAuditHtml=audit.length?
   '<div id="qpGridAudit" class="qp-hint" style="border:1px solid #cbd5e1;border-radius:8px;padding:10px;margin-bottom:10px">'+
   '<b>CDC Grid मिलान — शिक्षकको आन्तरिक समीक्षा (विद्यार्थीको Print मा नजाने)</b>'+
   '<div class="qp-table-wrap"><table class="qp-table"><thead><tr><th>क्रम</th><th>Unit</th><th>प्रकार</th><th>अंक</th><th>संज्ञानात्मक स्तर</th></tr></thead><tbody>'+
   audit.map(q=>'<tr><td>'+esc(q.index)+'</td><td>'+esc(q.unitCode)+'</td><td>'+
     esc(questionTypeLabel(q.questionType))+'</td><td>'+esc(q.marks)+'</td><td>'+
     esc(levelLabel(q.cognitiveLevel))+'</td></tr>').join("")+
   '</tbody><tfoot><tr><th colspan="3">जम्मा पूर्णाङ्क</th><th>'+
   esc(audit.reduce((sum,q)=>sum+Number(q.marks),0))+
   '</th><th>Grid अनुसार पुनः जाँच आवश्यक</th></tr></tfoot></table></div></div>':"";
  box.innerHTML = reportHtml+gridAuditHtml+
   (paper.questions.some(q=>String(q.questionId||"").startsWith("builtIn_"))?
    '<p class="qp-hint" style="background:#fff3df;padding:8px"><b>SMSS अभ्यास प्रश्नपत्र (CDC को प्रकाशित नमुना होइन):</b> शिक्षकले लागू पाठ्यक्रम, Grid, प्रश्न र उत्तर जाँचेर मात्र प्रयोग गर्नुहोस्।</p>':"")+
    `<div id="qpPrintArea" class="qp-paper-preview">
    <div style="text-align:center;border-bottom:1px solid #222;padding-bottom:10px">
      <h2>${esc(paper.schoolName||"विद्यालयको नाम")}</h2><div>${esc(paper.schoolAddress||"")}</div>
      <h3>${esc(paper.paperTitle)}</h3><b>${esc(paper.className)} · ${esc(paper.subject)}</b>
      <div style="display:flex;justify-content:space-between;gap:8px;margin-top:12px"><span>शैक्षिक वर्ष: ${esc(paper.academicYear)}</span><span>समय: ${esc(paper.durationMinutes)} मिनेट</span><span>पूर्णाङ्क: ${esc(paper.fullMarks)}</span></div>
    </div>
    ${paper.questions.some(q=>String(q.questionId||"").startsWith("builtIn_"))?
      '<p style="font-size:12px;font-weight:bold;color:#7a3700;padding:8px;border:1px solid #c48740">अभ्यास प्रश्नपत्र — CDC प्रकाशित नमुना होइन। शिक्षकले Grid, तथ्य र उत्तर जाँचेर मात्र प्रयोग गर्नुहोस्।</p>':""}
    ${groups.map(type=>{const list=paper.questions.filter(q=>q.questionType===type);if(!list.length)return "";return `<h3 style="text-align:left;margin-top:16px">${esc(questionTypeLabel(type))}</h3>${list.map(q=>{number++;return `<div class="qp-q"><div style="display:flex;justify-content:space-between;gap:10px"><b>${number}. ${esc(q.questionText)}</b><b>[${esc(q.marks)}]</b></div>${type==="mcq"?'<div style="margin-left:18px">'+(q.options||[]).map((o,i)=>'<div>'+String.fromCharCode(65+i)+'. '+esc(o)+'</div>').join("")+'</div>':""}</div>`;}).join("")}`;}).join("")}
    <div style="text-align:center;margin-top:25px;font-weight:700">— प्रश्नपत्र समाप्त —</div>
  </div>`;
}
function printPaper(paper = generatedPaper, includeAnswers = false) {
  if (!paper) return;
  if(paper.qualityReport?.teacherReviewRequired&&$("qpAutoReviewed")?.checked!==true){
   message("प्रश्नपत्र र उत्तरकुञ्जिका समीक्षा पुष्टि गरेपछि मात्र Print गर्न मिल्छ।",true);
   return;
  }
  const area = $("qpPaperPreview")?.querySelector("#qpPrintArea");
  if (!area) return;
  const w = window.open("", "_blank", "width=900,height=900");
  if (!w) { message("Print खोल्न Popup अनुमति दिनुहोस्।", true); return; }
  const answerSheet = includeAnswers&&paper.questionFormat==="cdc_optional_math_composite"?
   '<div style="page-break-before:always">'+renderCdcCompositePaper(paper,{escapeHtml:esc,answerKey:true})+'</div>':
   includeAnswers ? '<section style="page-break-before:always;font-family:Arial,sans-serif;padding:24px;color:#111"><h2>'+esc(paper.schoolName||"विद्यालय")+'</h2><h3>'+esc(paper.paperTitle||"प्रश्नपत्र")+' — उत्तरकुञ्जिका (शिक्षक प्रति)</h3><p>कक्षा: '+esc(paper.className)+' · विषय: '+esc(paper.subject)+'</p><ol>'+paper.questions.map(q=>'<li style="margin:10px 0;line-height:1.6;white-space:pre-line"><b>'+esc(q.questionText)+'</b><br>उत्तर: '+esc(q.answer|| (q.correctOption ? "सही विकल्प "+q.correctOption : "उत्तर संकेत उपलब्ध छैन"))+'</li>').join("")+'</ol></section>' : "";
  w.document.write('<!doctype html><html lang="ne"><head><meta charset="utf-8"><title>'+esc(paper.paperTitle)+'</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h2,h3{text-align:center}.qp-q{margin:14px 0;line-height:1.7}.qp-q b{white-space:pre-line}@page{size:A4;margin:18mm}</style></head><body>'+area.outerHTML+answerSheet+'</body></html>');
  w.document.close();
  w.focus();
  w.print();
}
async function loadClassSubjects() {
  const snap = await getDocs(collection(db,"classes"));
  const rows = snap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.active!==false);
  const pairs = [];
  if (isAdmin()) {
    for (const x of rows) {
      const n=gradeNumber(x.className);
      if (n>=6&&n<=10&&x.subject) pairs.push({className:String(x.className),subject:String(x.subject),section:String(x.section||""),gradeNumber:n});
    }
  } else {
    for (const x of (role?.subjectAssignments||[])) {
      const n=gradeNumber(x.className);
      if (n>=6&&n<=10&&x.subject&&roleCanTeach(String(x.className),String(x.subject),String(x.section||""))) pairs.push({className:String(x.className),subject:String(x.subject),section:String(x.section||""),gradeNumber:n});
    }
    for (const key of (role?.subjectAssignmentKeys||[])) {
      const parts=String(key).split("::"),n=gradeNumber(parts[0]),subject=parts.slice(1).join("::");
      if(n>=6&&n<=10&&subject){const sectionKeys=role?.subjectAssignmentSectionKeys||[];const sections=sectionKeys.filter(k=>String(k).startsWith(parts[0]+"::"+subject+"::")).map(k=>String(k).split("::").slice(2).join("::")).filter(x=>x&&x!=="ALL");if(sections.length)sections.forEach(section=>{if(roleCanTeach(parts[0],subject,section))pairs.push({className:parts[0],subject,section,gradeNumber:n});});else if(roleCanTeach(parts[0],subject,""))pairs.push({className:parts[0],subject,section:"",gradeNumber:n});}
    }
    for (const x of rows) {
      const n=gradeNumber(x.className);
      if(n>=6&&n<=10&&x.subject&&roleCanTeach(String(x.className),String(x.subject),String(x.section||"")))pairs.push({className:String(x.className),subject:String(x.subject),section:String(x.section||""),gradeNumber:n});
    }
  }
  const unique = new Map();
  pairs.forEach(x=>unique.set(x.className+"::"+normal(x.subject)+"::"+String(x.section||""),x));
  classSubjects=[...unique.values()].sort((a,b)=>a.gradeNumber-b.gradeNumber||a.subject.localeCompare(b.subject));
  const classSel=$("qpClass");
  const names=[...new Set(classSubjects.map(x=>x.className))];
  classSel.innerHTML='<option value="">कक्षा छान्नुहोस्</option>'+names.map(x=>'<option value="'+esc(x)+'">'+esc("कक्षा "+gradeNumber(x))+'</option>').join("");
  if (!names.length) message("कक्षा ६–१० को Subject Assignment भेटिएन। Admin ले Classes & Subjects मा विषय तोक्नुहोस्।",true);
}
// Local original practice sources require no Admin import or Firestore write.
// Absence of a checked source never triggers invented questions or a fake grid.
async function loadBundledPracticeBank({grade,subject}){
 // Strictly return a snapshot. A previous request must never mutate the
 // active class, topic list or bank after the user switches selections.
 if(![8,10].includes(grade)||!isSupportedScienceSubject(subject))
  return {units:[],questions:[],status:"यस कक्षा/विषयको पूर्वलोड गरिएको प्रश्न बैंक अझै तयार छैन। विद्यालय प्रश्न बैंकबाट मात्र बनाइन्छ; काल्पनिक CDC प्रश्न सिर्जना हुँदैन।"};
 try{
  const [a,b]=await Promise.all([
   fetch("./data/cdc-grade"+grade+"-science-practice-pack-v1.json",{cache:"no-store"}),
   fetch("./data/cdc-science-bilingual-mcq-v1.json",{cache:"no-store"})
  ]);
  if(!a.ok||!b.ok)throw Error("अभ्यास सामग्री उपलब्ध भएन");
  const [pack,translations]=await Promise.all([a.json(),b.json()]);
  if(translations.schemaVersion!==1||translations.reviewRequired!==true)
   throw Error("अनुवादको प्रमाणित संरचना छैन");
  const safe=readBundledScienceBank(pack,{grade,subject,bilingual:translations.translations});
  return {units:safe.units,questions:safe.questions,
   status:"कक्षा "+grade+" विज्ञान: "+safe.units.length+" Unit, "+
    safe.questions.length+" मौलिक नेपाली प्रश्न। English/दुवै भाषाका "+
    safe.questions.filter(q=>q.questionTextEn).length+
    " MCQ मात्र उपलब्ध छन्। CDC प्रकाशित Model Question होइनन्; शिक्षक समीक्षा आवश्यक।"};
 }catch(e){
  return {units:[],questions:[],
   status:"अभ्यास स्रोत लोड हुन सकेन: "+e.message+
   "। प्रमाणित सामग्री नभई प्रश्न अनुमान गरेर बनाइँदैन।"};
 }
}

// Static CDC source index: read-only and cached per page. No Firestore writes,
// Excel template or teacher re-entry required. If unavailable, do not block
// access to an already saved question bank or a verified bundled blueprint.
let cdcGridSourceRequest=null;
async function loadCdcGridSourceRegister(){
 if(!cdcGridSourceRequest)cdcGridSourceRequest=fetch(
  "./data/cdc-question-paper-sources-2083.json",{cache:"force-cache"})
  .then(response=>{
   if(!response.ok)throw Error("CDC स्रोत सूची उपलब्ध छैन");
   return response.json();
  })
  .then(index=>{
   if(index?.schemaVersion!==1||!Array.isArray(index.sources))
    throw Error("CDC स्रोत सूचीको संरचना मिलेन");
   return index;
  })
  .catch(error=>{
   console.warn("CDC source register unavailable",error);
   cdcGridSourceRequest=null;
   return null;
  });
 return cdcGridSourceRequest;
}
async function loadCurrentData() {
 if(!selectedClass||!selectedSubject)return;
 const request=++questionDataLoadEpoch,className=selectedClass,
  subject=selectedSubject,section=selectedSection;
 verifiedQuestionSelection=null;
 const stillCurrent=()=>request===questionDataLoadEpoch&&
  selectedClass===className&&selectedSubject===subject&&selectedSection===section;
 const grade=gradeNumber(className);
 const [curr,questions,blueprints,bundled,cdcSourceRegister]=await Promise.all([
  getDocs(query(collection(db,"cdc_curriculum"),
   where("gradeNumber","==",grade),where("subject","==",subject))),
  getDocs(query(collection(db,"question_bank"),
   where("className","==",className),where("subject","==",subject),where("section","==",section))),
  getDocs(query(collection(db,"cdc_blueprints"),
   where("gradeNumber","==",grade),where("subject","==",subject))),
  loadBundledPracticeBank({grade,subject}),
  loadCdcGridSourceRegister()
 ]);
 // Source-specific asynchronous requests cannot overwrite another class.
 if(!stillCurrent())return;
 curriculumRows=curr.docs.map(d=>({id:d.id,...d.data()}))
  .sort((a,b)=>String(a.unitCode||"").localeCompare(String(b.unitCode||""),undefined,{numeric:true}));
 const codeByUnit=new Map(curr.docs.map(d=>[d.id,String(d.data().unitCode||"").trim()]));
 questionRows=questions.docs.map(d=>({
   id:d.id,...d.data(),
   unitCode:String(d.data().unitCode||codeByUnit.get(d.data().unitId)||"").trim()
 }))
  .sort((a,b)=>Number(b.createdAt?.seconds||0)-Number(a.createdAt?.seconds||0));
 blueprintRows=blueprints.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.active!==false);
 const officialComputerGrid=getBundledComputerGrid({grade,subject,fullMarks:50});
 const officialOptionalMathGuide=getCdcOptionalMathGuide({grade,subject});
 const grade10ModelAudit=grade===10&&officialOptionalMathGuide?
  compareCdc2083MathModelToBundledGrid():null;
 // WCA/CCA questions with 2-4 subquestions cannot be represented by the
 // simple exact allocator. Do not let a flat admin blueprint falsely claim
 // official CDC mathematics compliance for the 75-mark paper.
 currentBlueprint=officialComputerGrid||(!officialOptionalMathGuide?
  blueprintRows.sort((a,b)=>Number(b.updatedAt?.seconds||0)-Number(a.updatedAt?.seconds||0))[0]||null:null);
 // Read-only CDC unit titles shipped with the portal. Teachers can select
 // units immediately; no spreadsheet import or school database write is needed.
 bundledPracticeUnits=[...bundled.units,...bundledComputerUnitTopics(grade,subject),
  ...optionalMathAreaTopics(grade,subject)];
 bundledPracticeQuestions=bundled.questions;
 bundledPracticeStatus=officialComputerGrid?
  "कक्षा "+grade+" Computer Science: CDC को ५० अङ्क/२५ प्रश्नको आधिकारिक Unit-wise Grid र "+
  officialComputerGrid.unitNames.length+" Unit स्वतः तयार छन्। प्रश्नपत्रका लागि पर्याप्त समीक्षा गरिएका प्रश्न अझै आवश्यक छन्।":
  officialOptionalMathGuide?
  "CDC २०८२ ऐच्छिक गणित: ६ विषयक्षेत्र, ७५ अङ्क, ११ Objective + १२ WCA + ४ CCA प्रश्न।"+
  (grade10ModelAudit?.matches?
    " कक्षा १० को २०८३ नमुना प्रश्नको उपलब्ध प्रतिसँग २०८२ Grid को वितरण मिल्छ।":"")+
  " SMSS मौलिक अभ्यास Draft CDC प्रकाशित प्रश्न होइनन्; Save/Print अघि शिक्षक समीक्षा अनिवार्य छ।":
  bundled.status;
 $("qpCurriculumVersion").value=curriculumRows[0]?.curriculumVersion||"CDC संस्करण Topic सूचीअनुसार";
 renderTopics();renderQuestionRows();
 $("qpAutoSourceStatus").textContent=bundledPracticeStatus;
 const pdfSource=$("qpOfficialGridSource");
 if(pdfSource){
  pdfSource.replaceChildren();
  const officialSource=officialComputerGrid?.originalGovernmentPdf?
   officialComputerGrid:officialOptionalMathGuide;
  const sources=findCdcGridSources(cdcSourceRegister,grade,subject).slice(0,4);
  const heading=document.createElement("span");
  if(officialSource?.sourceUrl){
   heading.textContent="CDC मूल तालिकाबाट विषयगत ढाँचा पहिल्यै सेट छ। ";
  }else if(sources.length){
   heading.textContent="CDC वेबसाइटमा यस विषयको Grid स्रोत भेटियो; पूरा Unit-wise अङ्कभार प्रणालीमा अझै प्रमाणित भएको छैन। ";
  }else{
   heading.textContent="यस विषयको मिल्ने CDC विशिष्टीकरण स्रोत सूचीमा छैन; अनुमानित Grid प्रयोग हुँदैन।";
  }
  pdfSource.appendChild(heading);
  // Prefer the already reviewed and preloaded government's original PDF
  // for Computer Science and the separate WCA/CCA Optional Mathematics guide.
  const urls=new Set();
  const addLink=(url,label)=>{
   if(typeof url!=="string"||!/^https:\/\/(?:giwmscdnone\.gov\.np|(?:www\.|lib\.)?moecdc\.gov\.np)\//i.test(url)||
      urls.has(url))return;
   urls.add(url);
   const link=document.createElement("a");
   link.href=url;link.target="_blank";link.rel="noopener noreferrer";
   link.textContent=label;
   link.style.marginRight="12px";
   pdfSource.appendChild(link);
  };
  if(officialSource?.sourceUrl)addLink(officialSource.sourceUrl,
   "मूल CDC "+(officialComputerGrid?"Computer Science":"Optional Mathematics")+" PDF");
  if(grade10ModelAudit)addLink(
   CDC_G10_OPTIONAL_MATH_2083_MODEL.governmentPublicationUrl,
   "कक्षा १० CDC २०८३ Model Question र उत्तरकुञ्जिका (आधिकारिक पृष्ठ)");
  sources.forEach((item,i)=>addLink(item.sourceUrl,
   "CDC स्रोत "+(i+1)+" ("+item.gridVersion+")"));
 }
 // Generation must wait for saved-paper history to finish loading.
 // Otherwise a rapid click can repeat a paper from the previous session.
 verifiedQuestionSelection=null;
 if(officialOptionalMathGuide){
  $("qpPaperFullMarks").value=String(officialOptionalMathGuide.fullMarks);
  $("qpPaperDuration").value=String(officialOptionalMathGuide.durationMinutes);
 }
 updateAutoGridStatus();
 const badge=$("qpBlueprintBadge");
 if(currentBlueprint){
  badge.textContent=currentBlueprint.gridOrigin==="bundled_official_cdc_pdf"?
   "Official CDC PDF Grid · "+grade:"Admin-entered Grid · "+(currentBlueprint.curriculumVersion||"संस्करण");
  $("qpPatternHint").textContent=currentBlueprint.gridOrigin==="bundled_official_cdc_pdf"?
   "आधिकारिक CDC PDF का सबै Unit, प्रश्न प्रकार, अङ्क र संज्ञानात्मक स्तर पहिले नै सेट छन्। Excel/JSON भर्नु पर्दैन। पर्याप्त समीक्षा गरिएका प्रश्न नभए गलत प्रश्नपत्र बन्द रहन्छ।":
   "Admin ले स्रोतका आधारमा राखेको Grid अनुसार प्रश्नको प्रकार, संख्या र अङ्क भरिएको छ। औपचारिक CDC मिलानका लागि शिक्षकले मूल Grid पुनः जाँच्नुहोस्।";
  setBuilderPattern(currentBlueprint.pattern,currentBlueprint.fullMarks,currentBlueprint.durationMinutes);
 }else if(officialOptionalMathGuide){
  badge.textContent=grade10ModelAudit?.matches?
   "CDC २०८२ Grid · २०८३ Model तुलना":"CDC २०८२ · Objective/WCA/CCA";
  $("qpPatternHint").textContent="CDC को ७५ अङ्कको ऐच्छिक गणित तालिका स्वतः सेट छ।"+
   (grade10ModelAudit?.matches?
    " कक्षा १० को २०८३ Model Question को उपलब्ध प्रतिमा ११ Objective, १२ WCA, ४ CCA र छवटै विषयक्षेत्रको अङ्कभार मिलेको छ। मूल २०८३ PDF attachment प्रत्यक्ष प्रमाणीकरण बाँकी छ।":"")+
   " SMSS मौलिक अभ्यास Draft Generate हुन्छ; CDC प्रकाशित प्रश्न होइन। शिक्षकले उत्तरकुञ्जिका जाँचेर मात्र Save/Print गर्नुहोस्।";
 }else{
  badge.textContent="Custom Pattern";
  $("qpPatternHint").textContent="यस विषयको जाँचिएको CDC Grid आयात गरिएको छैन। Custom Pattern लाई CDC आधिकारिक नमान्नुहोस्।";
 }
 const historyReady=await loadPaperHistory({required:true});
 if(!historyReady||!stillCurrent())return;
 verifiedQuestionSelection={className,subject,section,request};
}

async function loadPaperHistory({required=false}={}) {
 const body=$("qpPaperRows");if(!body)return false;
 const className=selectedClass,subject=selectedSubject,section=selectedSection;
 const userId=auth.currentUser?.uid,request=questionDataLoadEpoch;
 const token=++paperHistoryLoadEpoch,admin=isAdmin();
 const stillCurrent=()=>token===paperHistoryLoadEpoch&&
  request===questionDataLoadEpoch&&selectedClass===className&&
  selectedSubject===subject&&selectedSection===section&&
  auth.currentUser?.uid===userId;
 try{
  if(!userId)throw Error("Login आवश्यक छ।");
  const filters=[where("className","==",className),
   where("subject","==",subject),where("section","==",section)];
  if(!admin)filters.push(where("createdBy","==",userId));
  const snap=await getDocs(query(collection(db,"question_papers"),...filters,limit(30)));
  // An older class/section request must never replace the current history.
  if(!stillCurrent())return false;
  savedPapers=snap.docs.map(d=>({id:d.id,...d.data()}))
   .sort((a,b)=>Number(b.createdAt?.seconds||0)-Number(a.createdAt?.seconds||0));
  body.innerHTML=savedPapers.length?savedPapers.map(p=>`<tr><td>${esc(p.paperTitle)}</td><td>${esc(p.className)}</td><td>${esc(p.subject)}</td><td>${esc(p.fullMarks)}</td><td>${esc(p.durationMinutes)} min</td><td>${esc(p.createdAt?.toDate?p.createdAt.toDate().toLocaleDateString("ne-NP"):"—")}</td><td><button class="qp-btn alt" type="button" data-qp-print-saved="${esc(p.id)}">प्रश्नपत्र</button> <button class="qp-btn alt" type="button" data-qp-answer-saved="${esc(p.id)}">उत्तरकुञ्जिका</button> ${admin||p.createdBy===userId?'<button class="qp-btn danger" type="button" data-qp-delete-paper="'+esc(p.id)+'">Delete</button>':""}</td></tr>`).join(""):'<tr><td colspan="7">अहिलेसम्म प्रश्नपत्र सुरक्षित गरिएको छैन।</td></tr>';
  return true;
 }catch(err){
  if(!stillCurrent())return false;
  console.error("Question paper history failed",err);
  savedPapers=[];
  verifiedQuestionSelection=null;
  body.innerHTML='<tr><td colspan="7">प्रश्नपत्र अभिलेख लोड भएन: '+esc(err.code||err.message)+'</td></tr>';
  if(required)throw err;
  return false;
 }
}
function allocateQuestions() {
  const topics=selectedTopicIds();
  if(!topics.length)throw new Error("कम्तीमा एउटा Topic छान्नुहोस्।");
  const pattern=getPattern("qpPaper");
  const total=pattern.reduce((sum,x)=>sum+x.count*x.marks,0);
  const target=Number($("qpPaperFullMarks").value);
  if(!pattern.some(x=>x.count>0))throw new Error("प्रश्न संख्या राख्नुहोस्।");
  if(total!==target)throw new Error("प्रश्न प्रकारअनुसार जम्मा अङ्क "+total+" भयो; पूर्णाङ्क "+target+" सँग मिलेन।");

  const levels=["knowledge","understanding","application","higher"];
  const distribution=currentBlueprint?.cognitiveDistribution||{knowledge:25,understanding:25,application:25,higher:25};
  const questionCount=pattern.reduce((sum,x)=>sum+x.count,0);
  const targets={};
  let assigned=0;
  for(const level of levels){targets[level]=Math.floor(questionCount*Number(distribution[level]||0)/100);assigned+=targets[level];}
  const ranked=levels.map(level=>({level,remainder:questionCount*Number(distribution[level]||0)/100-targets[level]})).sort((a,b)=>b.remainder-a.remainder);
  for(let i=0;i<questionCount-assigned;i++)targets[ranked[i%ranked.length].level]++;

  const chosen=[],used=new Set();
  for(const item of pattern){
    if(!item.count)continue;
    const pool=shuffle(questionRows.filter(q=>topics.includes(q.topicId)&&q.questionType===item.type&&Number(q.marks)===item.marks&&q.status!=="archived"));
    if(pool.length<item.count)throw new Error(item.type+" प्रकारका "+item.marks+" अङ्कका प्रश्न "+item.count+" चाहिन्छ; प्रश्न बैंकमा "+pool.length+" मात्र छन्।");
    for(let i=0;i<item.count;i++){
      const available=pool.filter(q=>!used.has(q.id));
      const preferred=levels.filter(level=>targets[level]>0&&available.some(q=>q.cognitiveLevel===level)).sort((a,b)=>targets[b]-targets[a]);
      const selectedLevel=preferred[0];
      const q=selectedLevel?available.find(x=>x.cognitiveLevel===selectedLevel):available[0];
      if(!q)throw new Error("छानिएको Pattern का लागि पर्याप्त फरक प्रश्न उपलब्ध छैनन्।");
      used.add(q.id);chosen.push(q);
      if(targets[q.cognitiveLevel]>0)targets[q.cognitiveLevel]--;
    }
  }
  return chosen.sort((a,b)=>["mcq","short","long"].indexOf(a.questionType)-["mcq","short","long"].indexOf(b.questionType));
}
async function schoolHeader() {
  try {
    const snap=await getDoc(doc(db,"school_settings","main"));
    if(snap.exists()){const data=snap.data();return {schoolName:String(data.schoolName||"Mahadevasthan Secondary School"),schoolAddress:String(data.address||"")};}
  } catch(err) { console.warn("School heading could not be loaded",err); }
  return {schoolName:"Mahadevasthan Secondary School",schoolAddress:"Dhunibesi-05, Dhading"};
}
async function saveUnit(event) {
  event.preventDefault();
  if(!isAdmin())throw new Error("CDC पाठ्यक्रम व्यवस्थापन Admin का लागि मात्र हो।");
  if(!selectedClass||!selectedSubject)throw new Error("पहिले कक्षा र विषय छान्नुहोस्।");
  const topics=$("qpTopicsInput").value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  if(!topics.length||topics.length>80)throw new Error("Topic १ देखि ८० सम्म राख्नुहोस्।");
  const sourceUrl=$("qpSourceUrl").value.trim();
  if(!/^https:\/\/(www\.)?moecdc\.gov\.np\//i.test(sourceUrl)&&!/^https:\/\/lib\.moecdc\.gov\.np\//i.test(sourceUrl))throw new Error("CDC को आधिकारिक moecdc.gov.np वा CDC Library URL राख्नुहोस्।");
  const ref=await addDoc(collection(db,"cdc_curriculum"),{
    gradeNumber:gradeNumber(selectedClass),className:selectedClass,subject:selectedSubject,
    unitCode:$("qpUnitCode").value.trim(),unitTitle:$("qpUnitTitle").value.trim(),
    topics,curriculumVersion:$("qpVersion").value.trim(),sourceTitle:$("qpSourceTitle").value.trim(),
    sourceUrl,verifiedBy:auth.currentUser.uid,verifiedAt:serverTimestamp(),
    createdBy:auth.currentUser.uid,createdAt:serverTimestamp(),status:"active"
  });
  await logQuestionActivity("cdc_topic_import",ref.id,selectedClass+" "+selectedSubject+" · "+topics.length+" topics");
  $("qpUnitForm").reset();await loadCurrentData();message("CDC एकाइ र Topic सूची सुरक्षित भयो।");
}
// Read the reviewed CDC unit rows without changing school data.
function inspectAdminUnitGrid(){
 let entries;
 try{entries=JSON.parse($("qpBpUnitGrid").value.trim());}
 catch{throw Error("CDC Unit-wise Grid JSON फाइल वा Data ठीक छैन।");}
 const calculated=aggregateExactCdcGrid(entries);
 if(calculated.fullMarks!==Number($("qpBpFullMarks").value))
  throw Error("Grid को जम्मा "+calculated.fullMarks+" छ, छानिएको पूर्णाङ्क "+
    $("qpBpFullMarks").value+" छ। वास्तविक CDC Grid अनुसार मिलाउनुहोस्।");
 return {entries,calculated};
}
function reviewAdminUnitGrid(){
 const {calculated}=inspectAdminUnitGrid();
 const shortType=t=>({mcq:"MCQ",short:"छोटो",long:"लामो"})[t]||t;
 const lines=calculated.pattern.map(p=>shortType(p.type)+" "+
  p.count+"×"+p.marks+"="+p.count*p.marks);
 $("qpBpGridAnalysis").textContent="Grid बाट "+calculated.questionCount+
  " प्रश्न, "+calculated.fullMarks+" पूर्णाङ्क: "+lines.join(" · ")+
  "। संज्ञानात्मक अंक-वितरण: "+
  Object.entries(calculated.distribution).map(([k,v])=>levelLabel(k)+": "+v.toFixed(2)+"%").join(" · ")+
  "। मूल CDC दस्तावेजसँग जाँच गरेपछि मात्र Save गर्नुहोस्।";
 return calculated;
}

async function saveBlueprint(event) {
  event.preventDefault();
  if(!isAdmin())throw new Error("CDC Blueprint व्यवस्थापन Admin का लागि मात्र हो।");
  if(!selectedClass||!selectedSubject)throw new Error("पहिले कक्षा र विषय छान्नुहोस्।");
  const sourceUrl=$("qpBpSourceUrl").value.trim();
  if(!/^https:\/\/(www\.)?moecdc\.gov\.np\//i.test(sourceUrl)&&!/^https:\/\/lib\.moecdc\.gov\.np\//i.test(sourceUrl))throw new Error("CDC को आधिकारिक URL राख्नुहोस्।");
  if($("qpBpSourceReviewed").checked!==true)
   throw Error("मूल CDC Grid को Unit, प्रश्न संख्या, अङ्क र संज्ञानात्मक स्तर मिलाएको पुष्टि गर्नुहोस्।");
  // Derive the exact aggregate and cognitive distributions from unit rows.
  // Do not require redundant manual type counts that cannot represent a
  // legitimate Grid mixing 2/3/4-mark questions of one question type.
  const {entries:unitGrid,calculated}=inspectAdminUnitGrid();
  const fullMarks=calculated.fullMarks;
  const pattern=calculated.pattern,distribution=calculated.distribution;
  validateExactCdcUnitGrid({
    fullMarks,pattern,unitGrid,sourceUrl,
    curriculumVersion:$("qpBpVersion").value.trim(),
    verifiedBy:auth.currentUser.uid,gradeNumber:gradeNumber(selectedClass),
    subject:selectedSubject,cognitiveDistribution:distribution
  },fullMarks,{gradeNumber:gradeNumber(selectedClass),subject:selectedSubject});
  const subjectHash=Array.from(normal(selectedSubject)).reduce((hash,ch)=>(hash*31+ch.charCodeAt(0))>>>0,7).toString(36);
  // Keep separate CDC grids per full mark; never overwrite old V46 records.
  const id="g"+gradeNumber(selectedClass)+"_s"+subjectHash+"_m"+fullMarks;
  await setDoc(doc(db,"cdc_blueprints",id),{
    gradeNumber:gradeNumber(selectedClass),className:selectedClass,subject:selectedSubject,
    curriculumVersion:$("qpBpVersion").value.trim(),fullMarks,durationMinutes:Number($("qpBpDuration").value),
    pattern,unitGrid,cognitiveDistribution:distribution,sourceTitle:$("qpBpSourceTitle").value.trim(),sourceUrl,
    active:true,verifiedBy:auth.currentUser.uid,verifiedAt:serverTimestamp(),
    updatedBy:auth.currentUser.uid,updatedAt:serverTimestamp()
  });
  await logQuestionActivity("blueprint_save",id,selectedClass+" "+selectedSubject+" · "+fullMarks+" marks");
  await loadCurrentData();$("qpBpStatus").textContent="Blueprint सुरक्षित भयो।";message("CDC विशिष्टीकरण तालिका सुरक्षित भयो।");
}
async function saveQuestion(event) {
  event.preventDefault();
  if(!selectedClass||!selectedSubject)throw new Error("पहिले कक्षा र विषय छान्नुहोस्।");
  if(!roleCanTeach(selectedClass,selectedSubject,selectedSection))throw new Error("यो कक्षा/विषय/Section तपाईंलाई तोकिएको छैन।");
  const topicName=$("qpQuestionTopic").value.trim();
  const unitTitle=$("qpQuestionUnit").value.trim()||"शिक्षकले थपेको Topic";
  if(!topicName||topicName.length>180)throw new Error("Topic को नाम १–१८० अक्षरभित्र लेख्नुहोस्।");
  const matchedUnit=curriculumRows.find(unit=>(unit.topics||[]).some(topic=>normal(topic)===normal(topicName)));
  const matchedTopicIndex=matchedUnit?(matchedUnit.topics||[]).findIndex(topic=>normal(topic)===normal(topicName)):-1;
  const resolvedUnitTitle=matchedUnit?.unitTitle||unitTitle;
  const unitId=matchedUnit?.id||"teacher_custom";
  const topicId=matchedUnit?matchedUnit.id+"_"+matchedTopicIndex:"custom_"+normal(resolvedUnitTitle+"::"+topicName);
  const questionType=$("qpQuestionType").value;
  const options=questionType==="mcq"?["A","B","C","D"].map(k=>$("qpOption"+k).value.trim()):[];
  const correctOption=questionType==="mcq"?$("qpCorrectOption").value:"";
  if(questionType==="mcq"&&(options.some(x=>!x)||!correctOption))throw new Error("MCQ का चारवटै विकल्प र सही उत्तर राख्नुहोस्।");
  const data={
    gradeNumber:gradeNumber(selectedClass),className:selectedClass,subject:selectedSubject,section:selectedSection,
    unitId,unitTitle:resolvedUnitTitle,topicId,topicName:String(topicName),
    questionType,marks:Number($("qpQuestionMarks").value),cognitiveLevel:$("qpQuestionLevel").value,
    questionText:$("qpQuestionText").value.trim(),options,correctOption,
    answer:$("qpAnswer").value.trim(),createdBy:auth.currentUser.uid,
    createdByName:String(role?.displayName||auth.currentUser.displayName||"शिक्षक"),
    createdAt:serverTimestamp(),status:"active"
  };
  if(!data.questionText||data.questionText.length>3000||data.marks<1||data.marks>100)throw new Error("प्रश्न वा अङ्क मिलेको छैन।");
  const ref=await addDoc(collection(db,"question_bank"),data);
  await logQuestionActivity("question_create",ref.id,selectedClass+" "+selectedSubject+" · "+topicName);
  $("qpQuestionForm").reset();$("qpQuestionMarks").value="1";toggleMcqFields();
  await loadCurrentData();message("प्रश्न बैंकमा प्रश्न सुरक्षित भयो।");
}
function toggleMcqFields() {
  const show=$("qpQuestionType")?.value==="mcq";
  document.querySelectorAll(".qp-mcq-field").forEach(x=>x.classList.toggle("qp-hidden",!show));
}
async function generatePaper() {
  if(!roleCanTeach(selectedClass,selectedSubject,selectedSection))throw new Error("यो विषय/Section मा प्रश्नपत्र बनाउने अनुमति छैन।");
  const questions=allocateQuestions();
  const fullMarks=Number($("qpPaperFullMarks").value);
  const header=await schoolHeader();
  const topicCounts={};
  let missingAnswerCount=0;
  for(const q of questions){
    topicCounts[q.topicName]=(topicCounts[q.topicName]||0)+1;
    if(!String(q.answer||"").trim()&&!q.correctOption)missingAnswerCount++;
  }
  const totalQuestions=questions.length;
  const cognitiveActual=cognitiveMarkDistribution(questions,fullMarks);
  generatedPaper={
    ...header,gradeNumber:gradeNumber(selectedClass),className:selectedClass,subject:selectedSubject,section:selectedSection,
    qualityReport:{questionCount:totalQuestions,topicCounts,cognitiveActual,missingAnswerCount,selectedTopicCount:selectedTopicIds().length},
    paperTitle:$("qpPaperTitle").value.trim(),academicYear:$("qpPaperYear").value.trim(),
    durationMinutes:Number($("qpPaperDuration").value),fullMarks,
    curriculumVersion:currentBlueprint?.curriculumVersion||"Custom Pattern",
    blueprintId:currentBlueprint?.id||null,cognitiveDistribution:currentBlueprint?.cognitiveDistribution||null,topicIds:selectedTopicIds(),
    questions:questions.map((q,index)=>({
      questionId:q.id,questionText:q.questionText,questionType:q.questionType,marks:Number(q.marks),
      options:q.options||[],cognitiveLevel:q.cognitiveLevel,topicName:q.topicName,answer:q.answer||"",
      correctOption:q.correctOption||"",number:index+1
    })),
    createdBy:auth.currentUser.uid
  };
  renderPaperPreview();
  updateAutoReviewActions();
  const coverage=Object.entries(cognitiveActual).map(([key,value])=>levelLabel(key)+" "+value+"%").join(" · ");
  message("प्रश्नपत्र तयार भयो। "+questions.length+" प्रश्न, "+fullMarks+" अङ्क। संज्ञानात्मक वितरण: "+coverage+(missingAnswerCount?"। "+missingAnswerCount+" प्रश्नको उत्तर संकेत बाँकी छ":"। सबै प्रश्नको उत्तर संकेत उपलब्ध छ")+". Save वा Print गर्न सक्नुहुन्छ।");
}
function blueprintForFullMarks(fullMarks){
 // Verified official CDC computer grids take precedence ONLY for their
 // exact Grade 9/10 optional Computer Science 50-mark examination.
 // Every other subject/full marks retains its existing school settings.
 const grade=gradeNumber(selectedClass),subject=selectedSubject;
 const official=getBundledComputerGrid({grade,subject,fullMarks});
 if(official)return official;
 if(fullMarks===75&&getCdcOptionalMathGuide({grade,subject}))return null;
 return blueprintRows
  .filter(bp=>bp.active!==false&&Number(bp.fullMarks)===fullMarks)
  .sort((a,b)=>Number(b.updatedAt?.seconds||0)-Number(a.updatedAt?.seconds||0))[0]||null;
}
function updateAutoGridStatus(){
 const target=Number($("qpPaperFullMarks")?.value);
 const bp=blueprintForFullMarks(target),el=$("qpAutoGridStatus");
 if(!el)return;
 if(!bp?.unitGrid?.length){
  const grouped=getCdcOptionalMathGuide({grade:gradeNumber(selectedClass),subject:selectedSubject});
  if(grouped&&target===75){
   const originalDraftBank=originalOptionalMathPracticeBank({
    grade:gradeNumber(selectedClass),subject:selectedSubject
   });
   const unitNeeds=grouped.areas.map(area=>{
    const reviewed=questionRows.filter(q=>q.reviewStatus==="teacher_reviewed"&&
     q.reviewedBy&&q.status!=="archived"&&q.gradeNumber===gradeNumber(selectedClass)&&
     q.subject===selectedSubject&&Array.isArray(q.subquestions)&&
     q.subquestions.every(s=>String(s.unitCode)===area.unitCode));
    return {unit:area.unitCode,
     obj:reviewed.filter(q=>q.group==="objective").length,
     wca:reviewed.filter(q=>q.group==="WCA").length,
     objNeed:area.objectiveCount,wcaNeed:area.wcaQuestionCount};
   });
   const ccaCount=questionRows.filter(q=>q.group==="CCA"&&q.reviewStatus==="teacher_reviewed"&&
    q.reviewedBy&&q.gradeNumber===gradeNumber(selectedClass)&&q.subject===selectedSubject&&
    q.status!=="archived"&&Array.isArray(q.subquestions)&&
    new Set(q.subquestions.map(s=>String(s.unitCode))).size>=2).length;
   const short=unitNeeds.filter(q=>q.obj<q.objNeed||q.wca<q.wcaNeed);
   const countsReady=!short.length&&ccaCount>=4;
   if(originalDraftBank.questions.length===54){
    el.textContent="मूल CDC २०८२ Grid को ७५ अङ्क स्वतः सेट छ। "+
     "SMSS का ५४ मौलिक गणनात्मक अभ्यास प्रश्नबाट २७ प्रश्नको Draft स्वतः तयार हुन्छ।"+
     " यो CDC प्रकाशित प्रश्नपत्र होइन; Save/Print अघि शिक्षक समीक्षा अनिवार्य छ।";
    return;
   }
   el.textContent=countsReady?
    "मूल CDC २०८२ Grid सेट छ: ११ Objective, १२ WCA, ४ CCA = ७५ अङ्क। "+
    "प्रारम्भिक प्रश्न संख्या पुगेको छ; Generate गर्दा Unit अङ्क, उपप्रश्न, संज्ञानात्मक वितरण र दोहोरिने प्रश्न पूर्ण रूपमा जाँचिन्छ।":
    "मूल CDC २०८२ Grid स्वतः सेट छ। संयुक्त समीक्षित प्रश्न अझै कम छन्: CCA "+
    ccaCount+"/4"+(short.length?
     "; Unit "+short.slice(0,6).map(q=>q.unit+" Objective "+q.obj+"/"+q.objNeed+
      ", WCA "+q.wca+"/"+q.wcaNeed).join("; "):"")+
    "। अपूरो वा अनुमानित प्रश्नपत्र बनाइँदैन।";
  }else el.textContent=target+
   " अंकको मूल CDC Unit-wise Grid का सबै अङ्कभार पङ्क्ति प्रणालीमा अझै प्रमाणित छैनन्। गलत प्रश्नपत्र नबनोस् भनेर Exact मोड रोकिएको छ।";
  return;
 }
 try{
  const selected=selectedTopicIds(),language=$("qpAutoLanguage").value;
  const bank=[...questionRows,...bundledPracticeQuestions].filter(q=>
   isQuestionReadyForLanguage(q,language));
  const result=inspectExactCdcGridAvailability({
   blueprint:bp,fullMarks:target,eligible:bank,selectedTopicIds:selected
  });
  if(result.candidateReady){
   el.textContent="प्रारम्भिक CDC Grid उपलब्धता: "+result.gridQuestionCount+
    " प्रश्नका Unit/प्रकार/अङ्क मिल्ने पर्याप्त प्रश्न भेटिए। Generate गर्दा पूर्ण Grid र नयाँ Set फेरि जाँचिन्छ।";
  }else{
   const missing=result.rows.filter(row=>row.missing>0).slice(0,4).map(row=>
    "Unit "+row.unitCode+" / "+row.questionType+" / "+row.marks+
    " अंक / "+row.cognitiveLevel+": "+row.missing+" प्रश्न कम");
   el.textContent="CDC Grid अनुसार प्रश्न बैंक अपूरो: "+
    (missing.join("; ")||"छानिएका Topic सबै Grid सँग मिलेनन्")+
    (result.missingTopics.length?"। अन्य Topic आवश्यक: "+result.missingTopics.length:"")+
    "। अनुमोदन नगरिएको प्रश्न बनाएर अभाव पूरा गरिँदैन।";
  }
 }catch(e){
  el.textContent="CDC Grid जाँच: "+e.message;
 }
}

// The Grade 9/10 CDC 2082 Optional Math layout contains composite WCA
// and CCA questions with 2–4 subparts, unlike the old MCQ/Short/Long engine.
// All inputs below must be teacher-reviewed; a CDN grid alone is insufficient.
async function generateOptionalMathCompositePaper(guide){
 if(guide.gradeNumber===10&&!compareCdc2083MathModelToBundledGrid().matches)
  throw Error("CDC कक्षा १० नयाँ Model Question र पुरानो Grid को अङ्कभार नमिले। Generate रोकियो।");
 const selection=verifiedQuestionSelection,sessionUid=auth.currentUser?.uid,
  className=selectedClass,subject=selectedSubject,section=selectedSection;
 const topicIds=selectedTopicIds();
 const target=Number($("qpPaperFullMarks").value),durationMinutes=Number($("qpPaperDuration").value);
 const language=$("qpAutoLanguage").value,mode=$("qpAutoMode").value;
 const paperTitle=$("qpPaperTitle").value.trim(),academicYear=$("qpPaperYear").value.trim();
 if(!selection||selection.request!==questionDataLoadEpoch||
    selection.className!==className||selection.subject!==subject||
    selection.section!==section||!sessionUid||
    !roleCanTeach(className,subject,section)||!topicIds.length||
    target!==75||durationMinutes!==180||mode!=="cdc"||
    !paperTitle||!academicYear)
  throw Error("CDC ऐच्छिक गणितको कक्षा, विषय, चयन, ७५ अङ्क वा १८० मिनेट जाँच्नुहोस्।");
 const scope=JSON.stringify([className,subject,section,target,language,mode,
  guide.sourceVersion,topicIds.slice().sort()]);
 const previousSignature=lastAutoSignature?.scope===scope?lastAutoSignature.signature:"";
 const avoidSignatures=[...new Set(savedPapers.filter(p=>
  p.className===className&&p.subject===subject&&p.section===section&&
  p.questionFormat==="cdc_optional_math_composite"&&Number(p.fullMarks)===75)
  .map(p=>Array.isArray(p.questions)&&p.questions.every(q=>q?.questionId)?
   p.questions.map(q=>String(q.questionId)).sort().join("|"):"").filter(Boolean))].slice(0,30);
 // SMSS offline original formula-checked questions are practice drafts;
 // final human review is mandatory and no CDC model-question origin is claimed.
 const offlineDraft=originalOptionalMathPracticeBank({
  grade:gradeNumber(className),subject
 });
 const proposed=inspectCdcOptionalMathPaper({
  guide,questions:[...questionRows,...offlineDraft.questions],selectedTopicIds:topicIds,language,
  previousSignature,avoidSignatures,rng:Math.random,maxSearchVisits:120000,
  allowFormulaVerifiedDraft:true
 });
 if(!proposed.ready){
  const missing=proposed.areaRows.filter(row=>
   row.objectiveAvailable<row.objectiveRequired||row.wcaAvailable<row.wcaRequired);
  throw Error("CDC २०८२ ऐच्छिक गणित: समीक्षित संयुक्त प्रश्न बैंक अपूरो। "+
   "CCA "+proposed.crossAvailable+"/4;"+
   (missing.length?" Unit कमी: "+missing.map(x=>x.unitCode+
    " (Objective "+x.objectiveAvailable+"/"+x.objectiveRequired+
    ", WCA "+x.wcaAvailable+"/"+x.wcaRequired+")").join("; "):"")+
   "। अपूरो प्रश्नपत्र बनाइँदैन।");
 }
 const header=await schoolHeader();
 if(auth.currentUser?.uid!==sessionUid||verifiedQuestionSelection!==selection||
    selection.request!==questionDataLoadEpoch||
    selectedClass!==className||selectedSubject!==subject||selectedSection!==section||
    !roleCanTeach(className,subject,section)||
    $("qpAutoLanguage").value!==language||$("qpAutoMode").value!==mode||
    Number($("qpPaperFullMarks").value)!==75||
    Number($("qpPaperDuration").value)!==180||
    $("qpPaperTitle").value.trim()!==paperTitle||
    $("qpPaperYear").value.trim()!==academicYear||
    JSON.stringify(selectedTopicIds())!==JSON.stringify(topicIds))
  throw Error("प्रश्नपत्र बनाउँदा Login वा कक्षा/विषय/Topic परिवर्तन भयो। पुनः Generate गर्नुहोस्।");
 generatedPaper={
  ...header,gradeNumber:gradeNumber(className),className,subject,section,
  paperTitle,academicYear,durationMinutes,fullMarks:75,
  curriculumVersion:"CDC Optional Mathematics Specification Grid 2082",
  questionFormat:"cdc_optional_math_composite",language,sourceUrl:guide.sourceUrl,
  questionOrigin:"SMSS original formula-checked practice, not CDC published questions",
  topicIds,blueprintId:null,cognitiveDistribution:guide.cognitiveDistribution,
  qualityReport:{
   questionCount:27,selectedTopicCount:topicIds.length,missingAnswerCount:0,
   cognitiveActual:proposed.cognitiveMarks,exactGridMatched:true,
   sourceUrl:guide.sourceUrl,gridVersion:guide.sourceVersion,
   teacherReviewRequired:true
  },
  questions:proposed.questions.map((q,index)=>({
   questionId:String(q.id),number:index+1,group:q.group,
   contextNe:String(q.contextNe||""),contextEn:String(q.contextEn||""),
   subquestions:q.subquestions.map(s=>({
    unitCode:String(s.unitCode),marks:Number(s.marks),
    cognitiveLevel:String(s.cognitiveLevel),
    textNe:String(s.textNe||""),textEn:String(s.textEn||""),
    answerNe:String(s.answerNe||""),answerEn:String(s.answerEn||""),
    ...(s.correctOption?{correctOption:String(s.correctOption)}:{}),
    ...(Array.isArray(s.optionsNe)?{optionsNe:[...s.optionsNe]}:{}),
    ...(Array.isArray(s.optionsEn)?{optionsEn:[...s.optionsEn]}:{})
   }))
  })),
  createdBy:sessionUid
 };
 $("qpAutoReviewed").checked=false;
 renderPaperPreview();
 lastAutoSignature={scope,signature:proposed.signature};
 updateAutoReviewActions();
 message("SMSS मौलिक अभ्यास Draft: CDC २०८२ Grid अनुसार २७ संयुक्त प्रश्न, ७५ अङ्क र संज्ञानात्मक वितरण मिल्यो।"+
  " यी CDC प्रकाशित प्रश्न होइनन्। शिक्षकले गणितीय तथ्य, उत्तरकुञ्जिका र कक्षा उपयुक्तता जाँचेर मात्र Save/Print गर्नुहोस्।");
}
async function generateSmartPaper(){
 if(!verifiedQuestionSelection||verifiedQuestionSelection.request!==questionDataLoadEpoch||
  verifiedQuestionSelection.className!==selectedClass||
  verifiedQuestionSelection.subject!==selectedSubject||
  verifiedQuestionSelection.section!==selectedSection)
  throw Error("यो कक्षा/विषय/Section को प्रश्न बैंक लोड भएको छैन। फेरि लोड गर्नुहोस्।");
 if(!selectedClass||!selectedSubject||!roleCanTeach(selectedClass,selectedSubject,selectedSection))
  throw Error("कक्षा/विषय/Section मा प्रश्नपत्र बनाउन अनुमति छैन।");
 const topicIds=selectedTopicIds(),target=Number($("qpPaperFullMarks").value);
 const language=$("qpAutoLanguage").value,mode=$("qpAutoMode").value;
 const strict=mode==="cdc",selectedBlueprint=strict?blueprintForFullMarks(target):null;
 if(strict&&target===75){
  const grouped=getCdcOptionalMathGuide({
   grade:gradeNumber(selectedClass),subject:selectedSubject
  });
  if(grouped)return generateOptionalMathCompositePaper(grouped);
 }
 if(strict&&!selectedBlueprint)
  throw Error("यस कक्षा/विषय/पूर्णाङ्कको मूल CDC Grid का सबै पङ्क्ति अझै प्रणालीमा प्रमाणित छैनन्। सही Grid नभई Exact प्रश्नपत्र बनाइँदैन।");
 const autoScope=JSON.stringify([selectedClass,selectedSubject,selectedSection,
  target,language,mode,topicIds.slice().sort(),selectedBlueprint?.id||""]);
 const previousSignature=lastAutoSignature?.scope===autoScope?lastAutoSignature.signature:"";
 // Exclude matching papers already saved for this class, subject, section and
 // full marks (up to the 30 history rows loaded for the current teacher).
 // This survives page refresh; do not silently recycle a previous paper.
 const avoidSignatures=[...new Set(savedPapers.filter(p=>
  p.className===selectedClass&&p.subject===selectedSubject&&
  p.section===selectedSection&&Number(p.fullMarks)===target)
  .map(p=>{
   if(!Array.isArray(p.questions)||!p.questions.length||
      p.questions.some(q=>!String(q?.questionId||"").trim()))return "";
   return p.questions.map(q=>String(q.questionId)).sort().join("|");
  }).filter(Boolean))].slice(0,30);
 const selection=verifiedQuestionSelection,sessionUid=auth.currentUser?.uid,
  paperTitle=$("qpPaperTitle").value.trim(),academicYear=$("qpPaperYear").value.trim(),
  durationMinutes=Number($("qpPaperDuration").value);
 if(!sessionUid||!paperTitle||!academicYear||
    !Number.isSafeInteger(durationMinutes)||durationMinutes<15||durationMinutes>360)
  throw Error("प्रश्नपत्रको नाम, शैक्षिक वर्ष वा परीक्षा समय अमान्य छ।");
 const planned=buildAutomaticQuestionPaper({
  questions:[...questionRows,...bundledPracticeQuestions],
  topicIds,fullMarks:target,language,
  blueprint:selectedBlueprint,requireExactGrid:strict,previousSignature,
  gradeNumber:gradeNumber(selectedClass),subject:selectedSubject,
  avoidSignatures
 });
 const header=await schoolHeader();
 // A slow school-profile read must not allow an earlier class, subject, user,
 // topic or paper configuration to be reused after the UI has switched.
 if(auth.currentUser?.uid!==sessionUid||verifiedQuestionSelection!==selection||
   verifiedQuestionSelection?.request!==questionDataLoadEpoch||
   selectedClass!==selection.className||selectedSubject!==selection.subject||
   selectedSection!==selection.section||!roleCanTeach(selectedClass,selectedSubject,selectedSection)||
   Number($("qpPaperFullMarks").value)!==target||
   $("qpAutoLanguage").value!==language||
   $("qpAutoMode").value!==mode||
   $("qpPaperTitle").value.trim()!==paperTitle||
   $("qpPaperYear").value.trim()!==academicYear||
   Number($("qpPaperDuration").value)!==durationMinutes||
   JSON.stringify(selectedTopicIds())!==JSON.stringify(topicIds))
  throw Error("प्रश्नपत्र बनाउँदा Login, कक्षा वा छनोट परिवर्तन भयो। पुनः Generate गर्नुहोस्।");
 const topicCounts={};
 for(const q of planned.questions){
  topicCounts[q.topicName]=(topicCounts[q.topicName]||0)+1;
 }
 const cognitiveActual=cognitiveMarkDistribution(planned.questions,target);
 generatedPaper={
  ...header,gradeNumber:gradeNumber(selectedClass),className:selectedClass,
  subject:selectedSubject,section:selectedSection,
  paperTitle,academicYear,
  durationMinutes,fullMarks:target,
  curriculumVersion:planned.exactGridMatched?(selectedBlueprint?.curriculumVersion||"Reviewed CDC Unit Grid"):
   "SMSS मौलिक अभ्यास — शिक्षक समीक्षा आवश्यक",
  blueprintId:planned.exactGridMatched?selectedBlueprint?.id||null:null,
  cognitiveDistribution:planned.exactGridMatched?selectedBlueprint?.cognitiveDistribution||null:null,
  topicIds,
  qualityReport:{questionCount:planned.questionCount,topicCounts,cognitiveActual,
   missingAnswerCount:0,selectedTopicCount:topicIds.length,
   exactGridMatched:planned.exactGridMatched,sourceUrl:planned.gridAudit?.sourceUrl||"",
   gridVersion:planned.gridAudit?.gridVersion||"",teacherReviewRequired:true},
  questions:planned.questions.map((q,i)=>{
   const evidence=planned.gridAudit?.slotEvidence?.find(row=>row.questionId===String(q.id));
   if(planned.exactGridMatched&&(!evidence||
      evidence.questionType!==q.questionType||evidence.marks!==Number(q.marks)||
      evidence.cognitiveLevel!==q.cognitiveLevel))
    throw Error("CDC Grid प्रमाणसँग प्रश्न मिलेन; Generate रोकियो।");
   return {
    questionId:q.id,questionText:q.questionText,questionType:q.questionType,
    marks:Number(q.marks),options:q.options||[],cognitiveLevel:q.cognitiveLevel,
    topicName:q.topicName,answer:q.answer||"",correctOption:q.correctOption||"",
    ...(evidence?{gridEvidence:{questionId:String(q.id),unitCode:evidence.unitCode,
      questionType:evidence.questionType,marks:evidence.marks,
      cognitiveLevel:evidence.cognitiveLevel,topicId:evidence.topicId}}:{}),
    number:i+1
   };
  }),
  createdBy:auth.currentUser.uid
 };
 $("qpAutoReviewed").checked=false;
 renderPaperPreview();
 lastAutoSignature={scope:autoScope,signature:planned.signature};
 updateAutoReviewActions();
 const note=planned.exactGridMatched?
  "CDC बाट उतारिएको Unit-wise Grid अनुसार Unit, प्रश्न संख्या, प्रकार, अङ्क र संज्ञानात्मक स्तर मिलेको छ; शिक्षकले मूल स्रोत पुष्टि गर्नुपर्छ।":
  "यो Custom Practice Draft हो, आधिकारिक CDC Grid को प्रमाणित प्रश्नपत्र होइन।";
 message("Auto Paper तयार: "+planned.questionCount+" प्रश्न, "+target+
  " पूर्णाङ्क, "+topicIds.length+" Topic, भाषा "+language+". "+note);
}

async function savePaper() {
  if(!generatedPaper)throw new Error("पहिले प्रश्नपत्र Auto Generate गर्नुहोस्।");
  if(generatedPaper.qualityReport?.teacherReviewRequired&&$("qpAutoReviewed")?.checked!==true)
   throw Error("प्रश्नपत्र र उत्तरकुञ्जिका समीक्षा पुष्टि नगरी Save गर्न मिल्दैन।");
  // Persist only the paper schema; preview qualityReport and local id stay in memory.
  const paperFields=["schoolName","schoolAddress","gradeNumber","className","subject","section","paperTitle","academicYear","durationMinutes","fullMarks","curriculumVersion","blueprintId","cognitiveDistribution","topicIds","questions","questionFormat","language","sourceUrl","questionOrigin"];
  const payload=Object.fromEntries(paperFields.filter(key=>generatedPaper[key]!==undefined).map(key=>[key,generatedPaper[key]]));
  Object.assign(payload,{createdBy:auth.currentUser.uid,createdAt:serverTimestamp(),status:"draft"});
  const ref=await addDoc(collection(db,"question_papers"),payload);
  await logQuestionActivity("paper_create",ref.id,selectedClass+" "+selectedSubject+" · "+generatedPaper.paperTitle);
  generatedPaper.id=ref.id;await loadPaperHistory();message("प्रश्नपत्र Firebase मा सुरक्षित भयो।");
}
async function deleteQuestion(id) {
  const q=questionRows.find(x=>x.id===id);if(!q)return;
  if(!isAdmin()&&q.createdBy!==auth.currentUser.uid)throw new Error("आफूले थपेको प्रश्न मात्र हटाउन सक्नुहुन्छ।");
  if(!confirm("यो प्रश्न प्रश्न बैंकबाट हटाउने हो? सुरक्षित प्रश्नपत्रमा रहेको पुरानो प्रश्नको प्रति भने यथावत् रहनेछ।"))return;
  await deleteDoc(doc(db,"question_bank",id));await logQuestionActivity("question_delete",id,q.questionText);await loadCurrentData();message("प्रश्न हटाइयो।");
}
async function deletePaper(id) {
  const p=savedPapers.find(x=>x.id===id);if(!p)return;
  if(!isAdmin()&&p.createdBy!==auth.currentUser.uid)throw new Error("आफूले बनाएको प्रश्नपत्र मात्र हटाउन सक्नुहुन्छ।");
  if(!confirm("यो सुरक्षित प्रश्नपत्र हटाउने हो?"))return;
  await deleteDoc(doc(db,"question_papers",id));await logQuestionActivity("paper_delete",id,p.paperTitle);await loadPaperHistory();message("प्रश्नपत्र हटाइयो।");
}
function downloadJson(name,data) {
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json;charset=utf-8"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);
}
function downloadTemplate() {
  const template=[{
    gradeNumber:gradeNumber(selectedClass),subject:selectedSubject,unitCode:"Unit 1",unitTitle:"एकाइको नाम",
    curriculumVersion:"CDC को आधिकारिक पाठ्यक्रम संस्करण",sourceTitle:"CDC आधिकारिक पाठ्यक्रम/विशिष्टीकरण तालिका",
    sourceUrl:"https://moecdc.gov.np/",topics:["पहिलो Topic","दोस्रो Topic"]
  }];
  downloadJson("SMSS_CDC_Topic_Template.json",template);
}
async function importTopics(file) {
  if(!isAdmin())throw new Error("CDC Topic आयात Admin का लागि मात्र हो।");
  const raw=JSON.parse(await file.text());
  if(!Array.isArray(raw)||!raw.length||raw.length>200)throw new Error("JSON मा १–२०० एकाइको सूची हुनुपर्छ।");
  let saved=0;
  for(const row of raw){
    const g=Number(row.gradeNumber),topics=Array.isArray(row.topics)?row.topics.map(x=>String(x).trim()).filter(Boolean):[];
    if(g<6||g>10||!row.subject||!row.unitTitle||!row.curriculumVersion||!row.sourceTitle||!/^https:\/\/(www\.)?moecdc\.gov\.np\//i.test(String(row.sourceUrl||""))&&!/^https:\/\/lib\.moecdc\.gov\.np\//i.test(String(row.sourceUrl||""))||!topics.length||topics.length>80)throw new Error("JSON को कुनै एकाइमा कक्षा/विषय/संस्करण/CDC स्रोत वा Topic विवरण नमिलेको छ।");
    const existing=await getDocs(query(collection(db,"cdc_curriculum"),where("gradeNumber","==",g),where("subject","==",String(row.subject)),where("unitCode","==",String(row.unitCode||""))));
    const payload={gradeNumber:g,className:"कक्षा "+g,subject:String(row.subject),unitCode:String(row.unitCode||""),unitTitle:String(row.unitTitle),topics,curriculumVersion:String(row.curriculumVersion),sourceTitle:String(row.sourceTitle),sourceUrl:String(row.sourceUrl),verifiedBy:auth.currentUser.uid,verifiedAt:serverTimestamp(),status:"active",updatedAt:serverTimestamp()};
    if(existing.empty)await addDoc(collection(db,"cdc_curriculum"),{...payload,createdBy:auth.currentUser.uid,createdAt:serverTimestamp()});
    else await updateDoc(doc(db,"cdc_curriculum",existing.docs[0].id),payload);
    saved++;
  }
  await loadCurrentData();message(saved+" वटा CDC एकाइ आयात/अपडेट भए।");
}
// Capture the exact school class/subject/section before asynchronous file
// parsing. A late Excel or JSON read must never import into another class.
function captureQuestionBankImportScope(){
 if(!isAdmin()||!auth.currentUser?.uid)
  throw Error("प्रश्न बैंक आयात Admin का लागि मात्र हो।");
 if(!selectedClass||!selectedSubject)
  throw Error("पहिले कक्षा र विषय छान्नुहोस्।");
 const scope={className:selectedClass,subject:selectedSubject,section:selectedSection,
  epoch:questionDataLoadEpoch,uid:auth.currentUser.uid};
 assertQuestionBankImportScope(scope);
 return scope;
}
function assertQuestionBankImportScope(scope){
 if(!scope||!isAdmin()||!auth.currentUser||
  auth.currentUser.uid!==scope.uid||selectedClass!==scope.className||
  selectedSubject!==scope.subject||selectedSection!==scope.section||
  questionDataLoadEpoch!==scope.epoch||
  verifiedQuestionSelection?.request!==scope.epoch||
  verifiedQuestionSelection?.className!==scope.className||
  verifiedQuestionSelection?.subject!==scope.subject||
  verifiedQuestionSelection?.section!==scope.section)
  throw Error("Excel/JSON पढ्दा Login, कक्षा, विषय वा Section परिवर्तन भयो। आयात रोकियो; सही छनोटबाट फेरि आयात गर्नुहोस्।");
}
async function importQuestionBank(file) {
  const scope=captureQuestionBankImportScope();
  if(!/\.json$/i.test(file.name||""))throw Error("JSON फाइल मात्र यहाँ आयात हुन्छ।");
  if(file.size>1500000)throw Error("JSON प्रश्न बैंक फाइल धेरै ठूलो छ।");
  const raw=JSON.parse(await file.text());
  return importQuestionBankRows(Array.isArray(raw)?raw:raw?.questions,scope);
}
async function importQuestionBankRows(rows,scope) {
  assertQuestionBankImportScope(scope);
  if(!Array.isArray(rows)||!rows.length||rows.length>500)throw new Error("Excel/JSON मा १–५०० प्रश्न हुनुपर्छ।");
  const known=new Set(questionRows.map(q=>normal(q.topicId+"::"+q.questionType+"::"+q.marks+"::"+q.questionText)));
  const payloads=[];
  let duplicates=0;
  for(let index=0;index<rows.length;index++){
    const row=rows[index];
    const topicName=String(row.topicName||"").trim();
    const questionText=String(row.questionText||"").trim();
    const questionType=String(row.questionType||"");
    const marks=Number(row.marks);
    const cognitiveLevel=String(row.cognitiveLevel||"");
    if(!topicName||topicName.length>180||!questionText||questionText.length>3000||
      !["mcq","short","long"].includes(questionType)||!Number.isFinite(marks)||marks<1||marks>100||
      !["knowledge","understanding","application","higher"].includes(cognitiveLevel))
      throw new Error("प्रश्न "+(index+1)+" मा Topic/प्रश्न/प्रकार/अङ्क/संज्ञानात्मक स्तर अमान्य छ।");
    const unitTitle=String(row.unitTitle||"CDC विषयगत पाठ").trim().slice(0,180);
    const requestedCode=String(row.unitCode||"").trim();
    const matched=curriculumRows.filter(unit=>
      (!requestedCode||String(unit.unitCode||"").trim()===requestedCode)&&
      (unit.topics||[]).some(t=>normal(t)===normal(topicName)));
    if(matched.length>1)throw Error("प्रश्न "+(index+1)+": एउटै Topic धेरै Unit मा छ। Excel मा Unit Code अनिवार्य छ।");
    const curriculumUnit=matched[0]||null;
    if(requestedCode&&!curriculumUnit&&curriculumRows.some(u=>
      String(u.unitCode||"").trim()===requestedCode))
      throw Error("प्रश्न "+(index+1)+": छानिएको Unit Code मा यो Topic छैन।");
    const unitId=curriculumUnit?.id||"teacher_custom";
    const resolvedUnitTitle=curriculumUnit?.unitTitle||unitTitle;
    const unitCode=String(curriculumUnit?.unitCode||requestedCode).trim();
    const topicId=curriculumUnit
      ? curriculumUnit.id+"_"+(curriculumUnit.topics||[]).findIndex(t=>normal(t)===normal(topicName))
      : "custom_"+normal(unitCode+"::"+resolvedUnitTitle+"::"+topicName);
    const options=questionType==="mcq"?(Array.isArray(row.options)?row.options.map(x=>String(x).trim()):[]):[];
    const correctOption=questionType==="mcq"?String(row.correctOption||"").trim().toUpperCase():"";
    const questionTextEn=String(row.questionTextEn||"").trim();
    const answer=String(row.answer||"").trim(),answerEn=String(row.answerEn||"").trim();
    const optionsEn=questionType==="mcq"&&Array.isArray(row.optionsEn)?
      row.optionsEn.map(x=>String(x||"").trim()):[];
    const sourceUrl=String(row.sourceUrl||"").trim(),sourceTitle=String(row.sourceTitle||"").trim();
    if(questionType==="mcq"&&(options.length!==4||options.some(x=>!x||x.length>500)||!["A","B","C","D"].includes(correctOption)))
      throw new Error("MCQ प्रश्न "+(index+1)+" मा चार विकल्प र सही विकल्प A/B/C/D आवश्यक छ।");
    if(!Number.isSafeInteger(marks)||questionTextEn.length>3000||answer.length>3000||
       answerEn.length>3000||optionsEn.length!==0&&optionsEn.length!==4||
       optionsEn.some(x=>!x||x.length>500)||
       sourceTitle.length>200||sourceUrl.length>500||
       sourceUrl&&!/^https:\/\//i.test(sourceUrl))
      throw Error("प्रश्न "+(index+1)+": अङ्क, अनुवाद, विकल्प वा स्रोत विवरण अमान्य छ।");
    // Keep answers mandatory: without an answer key an imported bank item
    // can never become a reviewed automatic paper in any language.
    if(!answer)throw Error("प्रश्न "+(index+1)+": प्रश्नको उत्तरकुञ्जिका अनिवार्य छ।");
    // Do not accept copied Nepali text as an English translation.
    const containsNepali=value=>/[\u0900-\u097f]/.test(value);
    if((questionTextEn&&containsNepali(questionTextEn))||
       (answerEn&&containsNepali(answerEn))||
       optionsEn.some(containsNepali))
      throw Error("प्रश्न "+(index+1)+": English अनुवादमा नेपाली पाठ भेटियो। सही अनुवाद आवश्यक छ।");
    if(questionTextEn&&!answerEn)throw Error("प्रश्न "+(index+1)+": English प्रश्नसँग English उत्तर आवश्यक छ।");
    if(questionType==="mcq"&&questionTextEn&&optionsEn.length!==4)
      throw Error("प्रश्न "+(index+1)+": English MCQ का चारै विकल्प आवश्यक छन्।");
    const fingerprint=normal(topicId+"::"+questionType+"::"+marks+"::"+questionText);
    if(known.has(fingerprint)){duplicates++;continue;}
    known.add(fingerprint);
    payloads.push({
      gradeNumber:gradeNumber(scope.className),className:scope.className,subject:scope.subject,section:scope.section,
      unitId,unitCode,unitTitle:resolvedUnitTitle,topicId,topicName,questionType,marks,cognitiveLevel,
      questionText,questionTextEn,options,optionsEn,correctOption,answer,answerEn,
      sourceTitle,sourceUrl,sourceStatus:"imported_question_teacher_review_required",
      createdBy:scope.uid,createdByName:String(role?.displayName||"Admin").slice(0,100),
      createdAt:serverTimestamp(),status:"active"
    });
  }
  // Fail before any database write if a different selection was opened
  // while parsing or validating the rows.
  assertQuestionBankImportScope(scope);
  if(!payloads.length){message("नयाँ प्रश्न भेटिएन; "+duplicates+" दोहोरिएका प्रश्न छोडिए।");return;}
  const batch=writeBatch(db);
  for(const payload of payloads)batch.set(doc(collection(db,"question_bank")),payload);
  assertQuestionBankImportScope(scope);
  await batch.commit();
  await logQuestionActivity("question_bank_import","bulk",scope.className+" "+scope.subject+" · "+payloads.length+" questions");
  // Do not overwrite the newly selected class UI after an async commit.
  if(selectedClass===scope.className&&selectedSubject===scope.subject&&
     selectedSection===scope.section&&auth.currentUser?.uid===scope.uid)
    await loadCurrentData();
  message(payloads.length+" प्रश्न "+scope.className+" / "+scope.subject+
   " मा आयात भए; "+duplicates+" दोहोरिएका प्रश्न छोडिए।");
}
async function loadGrade8SciencePack() {
  if(!isAdmin())throw new Error("CDC अभ्यास प्याक Admin ले मात्र लोड गर्न सक्छ।");
  if(gradeNumber(selectedClass)!==8)throw new Error("यो प्याक कक्षा ८ का लागि मात्र हो।");
  if(!selectedSubject)throw new Error("पहिले कक्षा ८ को विज्ञान तथा प्रविधि विषय छान्नुहोस्।");
  const subjectLabel=normal(selectedSubject);
  if(!subjectLabel.includes("विज्ञान")&&!subjectLabel.includes("science"))throw new Error("यो अभ्यास प्याक विज्ञान तथा प्रविधि विषयका लागि मात्र हो; सही विषय छान्नुहोस्।");
  const response=await fetch("./data/cdc-grade8-science-practice-pack-v1.json",{cache:"no-store"});
  if(!response.ok)throw new Error("CDC अभ्यास प्याक फाइल लोड भएन ("+response.status+")।");
  const pack=await response.json();
  if(pack.gradeNumber!==8||!Array.isArray(pack.units)||!Array.isArray(pack.questions)||pack.units.length!==11||pack.questions.length!==55)
    throw new Error("CDC अभ्यास प्याकको संरचना/संख्या पुष्टि भएन।");
  if(!/^https:\/\/(www\.)?moecdc\.gov\.np\//i.test(String(pack.sourceUrl||"")))
    throw new Error("CDC को आधिकारिक पाठ्यपुस्तक स्रोत URL मान्य छैन।");
  const existingUnits=await getDocs(query(collection(db,"cdc_curriculum"),where("gradeNumber","==",8),where("subject","==",selectedSubject)));
  const unitMetaMap=new Map();
  const packBatch=writeBatch(db);
  let newUnits=0,unitWrites=0;
  for(const unit of pack.units){
    const old=existingUnits.docs.find(d=>String(d.data().unitCode||"")===String(unit.unitCode));
    const oldData=old?.data()||{};
    const unitId=old?.id||("g8_science_textbook2080_u"+String(unit.unitCode).replace(/[^0-9a-z]/gi,""));
    const mergedTopics=[...new Set([...(Array.isArray(oldData.topics)?oldData.topics:[]),...(unit.topics||[]).map(String)])];
    const unitTitle=String(oldData.unitTitle||unit.unitTitle);
    unitMetaMap.set(String(unit.unitCode),{id:unitId,topics:mergedTopics,unitTitle});
    if(!old)newUnits++;
    if(!old||JSON.stringify(oldData.topics||[])!==JSON.stringify(mergedTopics)){
      packBatch.set(doc(db,"cdc_curriculum",unitId),{
        ...oldData,gradeNumber:8,className:selectedClass,subject:selectedSubject,
        unitCode:String(unit.unitCode),unitTitle,topics:mergedTopics,
        curriculumVersion:oldData.curriculumVersion||pack.curriculumVersion,
        sourceTitle:oldData.sourceTitle||pack.sourceTitle,sourceUrl:oldData.sourceUrl||pack.sourceUrl,
        sourceNote:oldData.sourceNote||pack.sourceNote,
        sourceStatus:oldData.sourceStatus||"textbook_unit_reference_teacher_review_required",
        status:"active",createdBy:oldData.createdBy||auth.currentUser.uid,
        createdAt:oldData.createdAt||serverTimestamp()
      });
      unitWrites++;
    }
  }
  const existingKeys=new Set(questionRows.map(q=>normal(q.topicId+"::"+q.questionType+"::"+q.marks+"::"+q.questionText)));

  let newQuestions=0,duplicates=0;
  for(const q of pack.questions){
    const unitMeta=unitMetaMap.get(String(q.unitCode));
    if(!unitMeta||!unitMeta.topics.some(t=>normal(t)===normal(q.topicName)))
      throw new Error("प्रश्न प्याकमा एकाइ/Topic मिलेन: "+String(q.topicName));
    const topicIndex=unitMeta.topics.map(normal).indexOf(normal(q.topicName));
    const topicId=unitMeta.id+"_"+topicIndex;
    const fingerprint=normal(topicId+"::"+q.questionType+"::"+q.marks+"::"+q.questionText);
    if(existingKeys.has(fingerprint)){duplicates++;continue;}
    if(!["mcq","short","long"].includes(q.questionType)||!["knowledge","understanding","application","higher"].includes(q.cognitiveLevel)||!String(q.questionText||"").trim())
      throw new Error("प्रश्न प्याकमा अमान्य प्रश्न भेटियो।");
    if(q.questionType==="mcq"&&(!Array.isArray(q.options)||q.options.length!==4||!["A","B","C","D"].includes(q.correctOption)))
      throw new Error("MCQ विकल्प/उत्तरकुञ्जिका अपूर्ण छ।");
    packBatch.set(doc(collection(db,"question_bank")),{
      gradeNumber:8,className:selectedClass,subject:selectedSubject,section:selectedSection,
      unitId:unitMeta.id,unitTitle:unitMeta.unitTitle,topicId,topicName:q.topicName,
      questionType:q.questionType,marks:Number(q.marks),cognitiveLevel:q.cognitiveLevel,
      questionText:q.questionText,options:q.options||[],correctOption:q.correctOption||"",
      answer:q.answer||"",createdBy:auth.currentUser.uid,
      createdByName:"SMSS अभ्यास सामग्री · शिक्षक समीक्षा आवश्यक",
      createdAt:serverTimestamp(),status:"active"
    });
    existingKeys.add(fingerprint);newQuestions++;
  }
  if(unitWrites+newQuestions>500)throw new Error("Firestore batch सीमा नाघ्यो; अभ्यास प्याकलाई साना भागमा विभाजन गर्नुपर्छ।");
  if(unitWrites+newQuestions)await packBatch.commit();
  await logQuestionActivity("cdc_practice_pack_import","grade8-science",newQuestions+" questions");
  await loadCurrentData();
  message("कक्षा ८ विज्ञान अभ्यास प्याक: "+newUnits+" नयाँ एकाइ, "+newQuestions+" नयाँ प्रश्न थपिए; "+duplicates+" दोहोरिएका प्रश्न छोडिए। यी मूल अभ्यास प्रश्न हुन्—औपचारिक परीक्षाअघि विषय शिक्षकले समीक्षा गर्नुपर्छ।");
}
async function loadGrade10SciencePack() {
  if(!isAdmin())throw new Error("कक्षा १० विज्ञान अभ्यास प्याक Admin ले मात्र लोड गर्न सक्छ।");
  if(gradeNumber(selectedClass)!==10)throw new Error("यो प्याक कक्षा १० का लागि मात्र हो।");
  if(!selectedSubject)throw new Error("पहिले कक्षा १० को विज्ञान तथा प्रविधि विषय छान्नुहोस्।");
  const subjectLabel=normal(selectedSubject);
  if(!subjectLabel.includes("विज्ञान")&&!subjectLabel.includes("science"))throw new Error("सही विज्ञान तथा प्रविधि विषय छान्नुहोस्।");
  const approved=confirm("यो प्याक CDC कक्षा १० विज्ञान तथा प्रविधि पाठ्यपुस्तकको १९ एकाइको विषयसूचीमा आधारित मौलिक अभ्यास सामग्री हो। यी CDC का प्रकाशित नमुना प्रश्न होइनन्। CDC को विषयगत विशिष्टीकरण Grid अनुसार शिक्षकले प्रश्नको अङ्क/ढाँचा मिलाएर समीक्षा गरेपछि मात्र औपचारिक परीक्षामा प्रयोग गर्नुहोस्।\n\n१९ एकाइ र ५७ अभ्यास प्रश्न (१९ MCQ, १९ छोटो, १९ लामो) लोड गर्ने हो?");
  if(!approved)return;
  const response=await fetch("./data/cdc-grade10-science-practice-pack-v1.json",{cache:"no-store"});
  if(!response.ok)throw new Error("कक्षा १० विज्ञान अभ्यास प्याक फाइल लोड भएन ("+response.status+")।");
  const pack=await response.json();
  if(pack.gradeNumber!==10||!Array.isArray(pack.units)||!Array.isArray(pack.questions)||pack.units.length!==19||pack.questions.length!==57)
    throw new Error("कक्षा १० विज्ञान अभ्यास प्याकको संरचना/संख्या पुष्टि भएन।");
  if(String(pack.sourceUrl||"")!=="https://moecdc.gov.np/storage/gallery/1692097269.pdf"||!String(pack.sourceTitle||"").includes("Grade 10")||!String(pack.sourceNote||"").includes("Teacher review"))
    throw new Error("CDC कक्षा १० स्रोत तथा शिक्षक समीक्षा सावधानी पुष्टि भएन।");
  const existingUnits=await getDocs(query(collection(db,"cdc_curriculum"),where("gradeNumber","==",10),where("subject","==",selectedSubject)));
  const unitMetaMap=new Map();
  const batch=writeBatch(db);
  const existingKeys=new Set(questionRows.map(q=>normal(q.topicId+"::"+q.questionType+"::"+q.marks+"::"+q.questionText)));
  let newUnits=0,unitWrites=0,newQuestions=0,duplicates=0;
  for(const unit of pack.units){
    const old=existingUnits.docs.find(d=>String(d.data().unitCode||"")===String(unit.unitCode));
    const oldData=old?.data()||{};
    const unitId=old?.id||("g10_science_textbook2080_u"+String(unit.unitCode).replace(/[^0-9a-z]/gi,""));
    const mergedTopics=[...new Set([...(Array.isArray(oldData.topics)?oldData.topics:[]),...(unit.topics||[]).map(String)])];
    const unitTitle=String(oldData.unitTitle||unit.unitTitle);
    unitMetaMap.set(String(unit.unitCode),{id:unitId,topics:mergedTopics,unitTitle});
    if(!old)newUnits++;
    if(!old||JSON.stringify(oldData.topics||[])!==JSON.stringify(mergedTopics)){
      batch.set(doc(db,"cdc_curriculum",unitId),{
        ...oldData,gradeNumber:10,className:selectedClass,subject:selectedSubject,
        unitCode:String(unit.unitCode),unitTitle,topics:mergedTopics,
        curriculumVersion:oldData.curriculumVersion||pack.curriculumVersion,
        sourceTitle:oldData.sourceTitle||pack.sourceTitle,sourceUrl:oldData.sourceUrl||pack.sourceUrl,
        sourceNote:oldData.sourceNote||pack.sourceNote,
        sourceStatus:oldData.sourceStatus||pack.status,
        status:"active",createdBy:oldData.createdBy||auth.currentUser.uid,
        createdAt:oldData.createdAt||serverTimestamp()
      });
      unitWrites++;
    }
  }
  for(const q of pack.questions){
    const unitMeta=unitMetaMap.get(String(q.unitCode));
    if(!unitMeta||!unitMeta.topics.some(t=>normal(t)===normal(q.topicName)))
      throw new Error("अभ्यास प्याकमा एकाइ/Topic मिलेन: "+String(q.topicName));
    const topicIndex=unitMeta.topics.map(normal).indexOf(normal(q.topicName));
    const topicId=unitMeta.id+"_"+topicIndex;
    const fingerprint=normal(topicId+"::"+q.questionType+"::"+q.marks+"::"+q.questionText);
    if(existingKeys.has(fingerprint)){duplicates++;continue;}
    if(!["mcq","short","long"].includes(q.questionType)||!["knowledge","understanding","application","higher"].includes(q.cognitiveLevel)||!String(q.questionText||"").trim()||!String(q.answer||"").trim()||Number(q.marks)<1)
      throw new Error("अभ्यास प्याकमा प्रश्न/उत्तर/अङ्क/स्तर अमान्य छ।");
    if(q.questionType==="mcq"&&(!Array.isArray(q.options)||q.options.length!==4||q.options.some(x=>!String(x).trim())||!["A","B","C","D"].includes(q.correctOption)))
      throw new Error("MCQ विकल्प/उत्तरकुञ्जिका अपूर्ण छ।");
    batch.set(doc(collection(db,"question_bank")),{
      gradeNumber:10,className:selectedClass,subject:selectedSubject,section:selectedSection,
      unitId:unitMeta.id,unitTitle:unitMeta.unitTitle,topicId,topicName:q.topicName,
      questionType:q.questionType,marks:Number(q.marks),cognitiveLevel:q.cognitiveLevel,
      questionText:q.questionText,options:q.options||[],correctOption:q.correctOption||"",
      answer:q.answer||"",createdBy:auth.currentUser.uid,
      createdByName:"SMSS अभ्यास सामग्री · CDC Grade 10 विषयसूची आधार · शिक्षक समीक्षा आवश्यक",
      createdAt:serverTimestamp(),status:"active"
    });
    existingKeys.add(fingerprint);newQuestions++;
  }
  if(unitWrites+newQuestions>500)throw new Error("Firestore batch सीमा नाघ्यो; प्याकलाई साना भागमा विभाजन गर्नुपर्छ।");
  if(unitWrites+newQuestions)await batch.commit();
  await logQuestionActivity("cdc_practice_pack_import","grade10-science",newQuestions+" questions");
  await loadCurrentData();
  message("कक्षा १० विज्ञान अभ्यास प्याक: "+newUnits+" नयाँ एकाइ, "+newQuestions+" नयाँ प्रश्न थपिए; "+duplicates+" दोहोरिएका प्रश्न छोडिए। यी मौलिक अभ्यास प्रश्न हुन्—औपचारिक परीक्षाअघि विषय शिक्षकले समीक्षा गर्नुपर्छ।");
}
// Reuse the ExcelJS browser bundle already stored in the repository.
// Load only when Admin asks for an .xlsx file; no paid API or external CDN.
let questionExcelLoader=null;
async function questionExcelLibrary(){
 if(window.ExcelJS?.Workbook)return window.ExcelJS;
 if(!questionExcelLoader)questionExcelLoader=new Promise((resolve,reject)=>{
  const s=document.createElement("script");
  s.src="./iemis-importer/vendor/exceljs.min.js";s.async=true;
  s.onload=()=>window.ExcelJS?.Workbook?resolve(window.ExcelJS):
   reject(Error("ExcelJS उपलब्ध भएन।"));
  s.onerror=()=>reject(Error("Excel फाइल पढ्ने स्थानीय Library लोड भएन।"));
  document.head.appendChild(s);
 }).catch(error=>{questionExcelLoader=null;throw error;});
 return questionExcelLoader;
}
async function downloadCdcGridExcelTemplate(){
 if(!isAdmin())throw Error("CDC Grid Excel Template Admin का लागि मात्र हो।");
 const ExcelJS=await questionExcelLibrary(),workbook=new ExcelJS.Workbook();
 workbook.creator="SMSS Exam Portal";
 const sheet=workbook.addWorksheet("CDC Unit Grid");
 sheet.addRow(CDC_GRID_EXCEL_FIELDS.map(x=>x[1]));
 sheet.views=[{state:"frozen",ySplit:1}];
 sheet.getRow(1).font={bold:true,color:{argb:"FFFFFFFF"}};
 sheet.getRow(1).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF234F91"}};
 for(let i=0;i<CDC_GRID_EXCEL_FIELDS.length;i++)
  sheet.getColumn(i+1).width=[17,21,25,21,24][i];
 const guide=workbook.addWorksheet("Instructions");
 for(const sentence of [
  "SMSS CDC Unit Grid — Admin reviewed source only",
  "यी Header नबदल्नुहोस्। CDC को वास्तविक विशिष्टीकरण तालिकाबाट मात्र पङ्क्ति भर्नुहोस्।",
  "Unit Code: 1, 2 ... | Question Type: mcq / short / long",
  "Marks Per Question र Question Count पूर्ण सङ्ख्या हुन्।",
  "Cognitive Level: knowledge / understanding / application / higher",
  "Admin ले Portal मा सही Class, Subject छान्नुपर्छ।",
  "Grid Excel Import पछि पूर्णाङ्क र प्रतिशत गणना हुन्छ; त्यतिबेला कुनै Firebase Save हुँदैन।",
  "मूल CDC स्रोत URL र Version राखेर पङ्क्तिगत पुनः जाँच गरेपछि मात्र Review checkbox चयन गर्नुहोस्।",
  "यहाँ कुनै अनुमानित CDC प्रश्न सङ्ख्या वा अङ्क राखिएको छैन।"
 ])guide.addRow([sentence]);
 guide.getColumn(1).width=112;guide.getRow(1).font={bold:true,size:14};
 const output=await workbook.xlsx.writeBuffer();
 const url=URL.createObjectURL(new Blob([output],{
  type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
 }));
 const link=document.createElement("a");
 link.href=url;link.download="SMSS_CDC_Unit_Grid_Sample.xlsx";link.click();
 URL.revokeObjectURL(url);
}
async function importCdcGridExcel(file){
 const scope=captureQuestionBankImportScope();
 if(!/\.xlsx$/i.test(file.name||"")||file.size>1000000)
  throw Error("CDC Grid १ MB सम्मको .xlsx फाइल मात्र स्वीकार हुन्छ।");
 const ExcelJS=await questionExcelLibrary(),workbook=new ExcelJS.Workbook();
 await workbook.xlsx.load(await file.arrayBuffer());
 const sheet=workbook.getWorksheet("CDC Unit Grid");
 if(!sheet)throw Error("Excel मा CDC Unit Grid नामको Sheet छैन।");
 const rows=parseCdcGridExcelSheet(sheet);
 const calculated=aggregateExactCdcGrid(rows);
 const json=JSON.stringify(rows,null,2);
 if(json.length>20000)throw Error("CDC Grid डेटा 20KB सीमा नाघ्यो।");
 // During asynchronous loading a new class/subject/login invalidates this
 // spreadsheet. No source row is allowed to leak into another class.
 assertQuestionBankImportScope(scope);
 $("qpBpUnitGrid").value=json;
 $("qpBpFullMarks").value=String(calculated.fullMarks);
 $("qpBpSourceReviewed").checked=false;
 reviewAdminUnitGrid();
 $("qpBpGridAnalysis").textContent+=" Excel को डेटा मात्र पढिएको हो; मूल CDC दस्तावेज जाँचपछि मात्र Review/Save गर्नुहोस्।";
}
async function downloadQuestionExcelTemplate(){
 if(!isAdmin())throw Error("Question Bank Excel Sample Admin का लागि मात्र हो।");
 const ExcelJS=await questionExcelLibrary(),workbook=new ExcelJS.Workbook();
 workbook.creator="SMSS Exam Portal";
 const sheet=workbook.addWorksheet("Question Bank");
 sheet.addRow(QUESTION_EXCEL_FIELDS.map(x=>x[1]));
 sheet.views=[{state:"frozen",ySplit:1}];
 sheet.getRow(1).font={bold:true,color:{argb:"FFFFFFFF"}};
 sheet.getRow(1).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF234F91"}};
 for(const [i,[field]]of QUESTION_EXCEL_FIELDS.entries())
  sheet.getColumn(i+1).width=/questionText|answer|sourceUrl/i.test(field)?39:
   /option/i.test(field)?22:18;
 const guide=workbook.addWorksheet("Instructions");
 for(const text of [
  "SMSS V46 Question Bank Excel",
  "Question Bank sheet मा पहिलो Row को Header नबदल्नुहोस्।",
  "Class, Subject र Section Portal मा छानेपछि मात्र Admin ले Import गर्नुहोस्।",
  "Question Type: mcq, short, long | Cognitive Level: knowledge, understanding, application, higher",
  "Marks र Correct Option (MCQ: A/B/C/D) सही राख्नुहोस्।",
  "एउटै Topic विभिन्न Unit मा छ भने Unit Code अनिवार्य राख्नुहोस्।",
  "English प्रश्न राखे English उत्तर र MCQ का चार English विकल्प पनि राख्नुहोस्।",
  "CDC प्रकाशित प्रश्न नहोउन्जेल आधिकारिक Model Question दाबी नगर्नुहोस्।",
  "Source Title/URL राखे समीक्षा र उत्पत्ति जाँच गर्न सजिलो हुन्छ।"
 ])guide.addRow([text]);
 guide.getColumn(1).width=105;
 guide.getRow(1).font={bold:true,size:14};
 const bytes=await workbook.xlsx.writeBuffer(),blob=new Blob([bytes],{
  type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
 });
 const url=URL.createObjectURL(blob),link=document.createElement("a");
 link.href=url;link.download="SMSS_Question_Bank_Sample.xlsx";link.click();
 URL.revokeObjectURL(url);
}
async function importQuestionBankExcel(file){
 const scope=captureQuestionBankImportScope();
 if(!/\.xlsx$/i.test(file.name||"")||file.size>5000000)
  throw Error("५ MB सम्मको .xlsx फाइल मात्र आयात गर्नुहोस्।");
 const ExcelJS=await questionExcelLibrary(),book=new ExcelJS.Workbook();
 await book.xlsx.load(await file.arrayBuffer());
 const sheet=book.getWorksheet("Question Bank");
 if(!sheet)throw Error("Excel मा Question Bank नामको Sheet आवश्यक छ।");
 const rows=parseQuestionExcelSheet(sheet);
 return importQuestionBankRows(rows,scope);
}
function downloadQuestionTemplate() {
  downloadJson("SMSS_Question_Bank_Template.json",{
    questions:[{
      unitTitle:"एकाइको नाम",topicName:"Topic को नाम",questionType:"mcq",marks:1,
      cognitiveLevel:"knowledge",questionText:"यहाँ प्रश्न लेख्नुहोस्",
      options:["विकल्प A","विकल्प B","विकल्प C","विकल्प D"],correctOption:"A",
      answer:"सही उत्तर र व्याख्या"
    }]
  });
}
async function loadQuestionPaperModule() {
  const root=$("questionPaperRoot");if(!root)return;
  root.innerHTML=pageShell();
  $("qpCatalogAdmin").classList.toggle("qp-hidden",!isAdmin());
  $("qpGrade8SciencePackBtn").classList.toggle("qp-hidden",!isAdmin());
  $("qpGrade10SciencePackBtn").classList.toggle("qp-hidden",!isAdmin());
  if(!auth.currentUser){message("Login आवश्यक छ।",true);return;}
  try{
    if(!isAdmin()){
      const snap=await getDoc(doc(db,"user_roles",auth.currentUser.uid));
      role=snap.exists()?snap.data():null;
    }else role={roles:["admin"],active:true,displayName:"Admin"};
    await loadClassSubjects();
  }catch(err){console.error("Question paper module init failed",err);message("Module लोड भएन: "+(err.code||err.message),true);}
}
window.loadQuestionPaperModule=loadQuestionPaperModule;
// Module scripts may finish after the user opens the page; initialize the existing view then.
if(window.currentPage==="question-papers"&&document.getElementById("questionPaperRoot"))void loadQuestionPaperModule();

// CDC Grid approval is tied to the exact reviewed rows, source, version
// and full marks. Editing any of them revokes the earlier approval.
function invalidateCdcGridSourceReview(){
 const reviewed=$("qpBpSourceReviewed");
 if(reviewed)reviewed.checked=false;
 const status=$("qpBpStatus");
 if(status)status.textContent="Grid वा स्रोत बदलियो। मूल CDC तालिकासँग पुनः जाँच गरेर मात्र Save गर्नुहोस्।";
}
document.addEventListener("input",event=>{
 if(["qpBpUnitGrid","qpBpFullMarks","qpBpVersion","qpBpSourceTitle",
     "qpBpSourceUrl"].includes(event.target?.id))
  invalidateCdcGridSourceReview();
});
document.addEventListener("change",async event=>{
  const t=event.target;
  if(t.id==="qpClass"){
    questionDataLoadEpoch++;verifiedQuestionSelection=null;
    selectedClass=t.value;selectedSubject="";selectedSection="";generatedPaper=null;savedPapers=[];$("qpPaperRows").innerHTML='<tr><td colspan="7">पहिले कक्षा/विषय छान्नुहोस्।</td></tr>';
    $("qpSavePaperBtn").disabled=true;$("qpPrintPaperBtn").disabled=true;$("qpAnswerKeyBtn").disabled=true;
    const opts=classSubjects.filter(x=>x.className===selectedClass);
    const subjects=[...new Set(opts.map(x=>x.subject))];
    $("qpSubject").innerHTML='<option value="">विषय छान्नुहोस्</option>'+subjects.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join("");
    $("qpSection").innerHTML='<option value="">Section छान्नुहोस्</option>';
    curriculumRows=[];questionRows=[];bundledPracticeUnits=[];bundledPracticeQuestions=[];
    bundledPracticeStatus="";$("qpAutoSourceStatus").textContent="विषय छान्नुहोस्।";
    $("qpAutoGridStatus").textContent="कक्षा/विषय छान्नुहोस्।";
    renderTopics();renderQuestionRows();message("अब विषय छान्नुहोस्।");
  }
  if(t.id==="qpSubject"){
    questionDataLoadEpoch++;verifiedQuestionSelection=null;
    selectedSubject=t.value;selectedSection="";generatedPaper=null;savedPapers=[];$("qpPaperRows").innerHTML='<tr><td colspan="7">पहिले कक्षा/विषय छान्नुहोस्।</td></tr>';
    $("qpSavePaperBtn").disabled=true;$("qpPrintPaperBtn").disabled=true;$("qpAnswerKeyBtn").disabled=true;
    curriculumRows=[];questionRows=[];blueprintRows=[];currentBlueprint=null;
    bundledPracticeUnits=[];bundledPracticeQuestions=[];
    renderTopics();renderQuestionRows();$("qpAutoGridStatus").textContent="Section छान्नुहोस्।";
    const sections=[...new Set(classSubjects.filter(x=>x.className===selectedClass&&x.subject===selectedSubject).map(x=>String(x.section||"")))];
    $("qpSection").innerHTML='<option value="">Section छान्नुहोस्</option>'+sections.map(x=>'<option value="'+esc(x)+'">'+esc(x||"सबै Section / लागू")+'</option>').join("");
    if(sections.length===1){selectedSection=sections[0];$("qpSection").value=selectedSection;}
    if(selectedClass&&selectedSubject&&sections.length===1)try{await loadCurrentData();message("CDC Topic, प्रश्न बैंक र Blueprint लोड भए।");}catch(err){console.error(err);message("डेटा लोड भएन: "+(err.code||err.message),true);}else if(sections.length>1)message("कृपया Section छान्नुहोस्।");
  }
  if(t.id==="qpSection"){questionDataLoadEpoch++;verifiedQuestionSelection=null;selectedSection=t.value;generatedPaper=null;if(selectedClass&&selectedSubject)try{await loadCurrentData();message("Section अनुसार Topic र प्रश्न बैंक लोड भए।");}catch(err){message("डेटा लोड भएन: "+(err.code||err.message),true);}}
  if(t.matches?.("[data-qp-topic]")||
    ["qpAutoLanguage","qpAutoMode","qpPaperFullMarks","qpPaperDuration","qpPaperTitle",
     "qpPaperYear","qpPaperMcqCount","qpPaperMcqMarks","qpPaperShortCount",
     "qpPaperShortMarks","qpPaperLongCount","qpPaperLongMarks"].includes(t.id)){
    if(generatedPaper){
      invalidateGeneratedQuestionPaper();
      message("Topic, भाषा वा प्रश्नपत्र विवरण परिवर्तन भयो। नयाँ प्रश्नपत्र बनाउनुहोस्।");
    }
  }
  if(t.id==="qpPaperFullMarks"||t.id==="qpAutoMode"||t.id==="qpAutoLanguage"||
     t.matches?.("[data-qp-topic]"))updateAutoGridStatus();
  if(t.id==="qpAutoReviewed")updateAutoReviewActions();
  if(t.id==="qpBpGridExcelFile"&&t.files?.[0]){
    try{await importCdcGridExcel(t.files[0]);}
    catch(err){console.error("CDC Grid Excel import failed",err);
      $("qpBpGridAnalysis").textContent="CDC Grid Excel आयात भएन: "+err.message;}
    finally{t.value="";}
  }
  if(t.id==="qpBpGridFile"&&t.files?.[0]){
    try{
      if(t.files[0].size>20000)throw Error("Grid JSON फाइल 20KB भन्दा ठूलो छ।");
      const source=await t.files[0].text();
      const data=JSON.parse(source);
      const rows=Array.isArray(data)?data:data?.unitGrid;
      if(!Array.isArray(rows))throw Error("Grid फाइलमा unitGrid सूची आवश्यक छ।");
      $("qpBpUnitGrid").value=JSON.stringify(rows,null,2);
      $("qpBpSourceReviewed").checked=false;
      $("qpBpGridAnalysis").textContent="Grid JSON पढियो; CDC स्रोत मिलाएर Analyze गर्नुहोस्।";
      reviewAdminUnitGrid();
    }catch(error){$("qpBpGridAnalysis").textContent="Grid Import असफल: "+error.message;}
    finally{t.value="";}
  }
  if(t.id==="qpQuestionType")toggleMcqFields();
  if(t.id==="qpImportFile"&&t.files?.[0]){
    try{await importTopics(t.files[0]);}catch(err){message("आयात भएन: "+(err.code||err.message),true);}finally{t.value="";}
  }
  if(t.id==="qpQuestionExcelFile"&&t.files?.[0]){
    try{await importQuestionBankExcel(t.files[0]);}
    catch(err){console.error("Question bank Excel import failed",err);message("Excel आयात भएन: "+(err.code||err.message),true);}
    finally{t.value="";}
  }
  if(t.id==="qpQuestionImportFile"&&t.files?.[0]){
    try{await importQuestionBank(t.files[0]);}catch(err){console.error("Question bank import failed",err);message("प्रश्न आयात भएन: "+(err.code||err.message),true);}finally{t.value="";}
  }
});
document.addEventListener("submit",async event=>{
  const form=event.target;
  if(!["qpUnitForm","qpBlueprintForm","qpQuestionForm"].includes(form.id))return;
  event.preventDefault();
  const submit=form.querySelector('button[type="submit"]');if(submit)submit.disabled=true;
  try{
    if(form.id==="qpUnitForm")await saveUnit(event);
    if(form.id==="qpBlueprintForm")await saveBlueprint(event);
    if(form.id==="qpQuestionForm")await saveQuestion(event);
  }catch(err){console.error("Question paper save failed",err);message("Save भएन: "+(err.code||err.message),true);}
  finally{if(submit)submit.disabled=false;}
});
document.addEventListener("click",async event=>{
  const t=event.target.closest("button");if(!t)return;
  try{
    if(t.id==="qpTemplateBtn")downloadTemplate();
    if(t.id==="qpBpGridExcelTemplateBtn")await downloadCdcGridExcelTemplate();
    if(t.id==="qpQuestionExcelTemplateBtn")await downloadQuestionExcelTemplate();
    if(t.id==="qpQuestionTemplateBtn")downloadQuestionTemplate();
    if(t.id==="qpGrade8SciencePackBtn")await loadGrade8SciencePack();
    if(t.id==="qpGrade10SciencePackBtn")await loadGrade10SciencePack();
    if(t.id==="qpGenerateBtn")await generatePaper();
    if(t.id==="qpBpAnalyzeGrid"){
      if(!isAdmin())throw Error("CDC Grid Review Admin ले मात्र गर्न सक्छ।");
      reviewAdminUnitGrid();
    }
    if(t.id==="qpSmartGenerateBtn")await generateSmartPaper();
    if(t.id==="qpSelectGridUnits"){
      const target=Number($("qpPaperFullMarks").value);
      const compound=target===75?getCdcOptionalMathGuide({
       grade:gradeNumber(selectedClass),subject:selectedSubject
      }):null;
      if(compound){
       // CDC 2082/2083 Model requires all six content areas.
       // Select ONE available topic per required Unit, without the teacher
       // having to import or manually retype a CDC Grid.
       const required=new Set(compound.areas.map(a=>String(a.unitCode)));
       const chosen=new Set();
       document.querySelectorAll("[data-qp-topic]").forEach(input=>{
        const code=String(input.dataset.unitCode||"");
        input.checked=required.has(code)&&!chosen.has(code);
        if(input.checked)chosen.add(code);
       });
       if([...required].some(code=>!chosen.has(code))){
        document.querySelectorAll("[data-qp-topic]").forEach(input=>input.checked=false);
        throw Error("CDC ऐच्छिक गणितका सबै छवटा Unit भेटिएनन्। गलत प्रश्नपत्र रोकियो।");
       }
       if(generatedPaper)invalidateGeneratedQuestionPaper();
       updateAutoGridStatus();
       message("CDC को ६ वटा ऐच्छिक गणित Unit स्वतः चयन भए। भाषा छानेर Auto Generate गर्नुहोस्।");
      }else{
       const bp=blueprintForFullMarks(target);
       if(!bp?.unitGrid?.length)
        throw Error("यस कक्षा/विषय/पूर्णाङ्कको CDC Unit-wise Grid अझै प्रमाणित भएको छैन।");
       const required=new Map();
       for(const line of bp.unitGrid)required.set(String(line.unitCode),
        (required.get(String(line.unitCode))||0)+Number(line.count));
       const selectedUnits=new Set();
       document.querySelectorAll("[data-qp-topic]").forEach(input=>{
        const code=String(input.dataset.unitCode||"");
        input.checked=required.has(code)&&!selectedUnits.has(code);
        if(input.checked)selectedUnits.add(code);
       });
       if([...required.keys()].some(code=>!selectedUnits.has(code))){
        document.querySelectorAll("[data-qp-topic]").forEach(input=>input.checked=false);
        throw Error("CDC Grid का सबै अनिवार्य Unit Topic सूचीमा भेटिएनन्। प्रश्नपत्र बनाइएको छैन।");
       }
       if(generatedPaper)invalidateGeneratedQuestionPaper();
       updateAutoGridStatus();
       message("CDC Grid का "+selectedUnits.size+" Unit चयन गरिए। चाहिएका Topic जाँचेर Generate गर्नुहोस्।");
      }
    }
    if(t.id==="qpTopicSelectAll"||t.id==="qpTopicClearAll"){
      document.querySelectorAll("[data-qp-topic]").forEach(input=>input.checked=t.id==="qpTopicSelectAll");
      if(generatedPaper)invalidateGeneratedQuestionPaper();
      updateAutoGridStatus();
  }
    if(t.id==="qpSavePaperBtn")await savePaper();
    if(t.id==="qpPrintPaperBtn")printPaper(generatedPaper,false);
    if(t.id==="qpAnswerKeyBtn")printPaper(generatedPaper,true);
    if(t.id==="qpRefreshBtn"&&selectedClass&&selectedSubject){await loadCurrentData();message("प्रश्न बैंक Refresh भयो।");}
    if(t.id==="qpPaperReloadBtn"&&selectedClass&&selectedSubject)await loadPaperHistory();
    if(t.dataset.qpDeleteQuestion)await deleteQuestion(t.dataset.qpDeleteQuestion);
    if(t.dataset.qpDeletePaper)await deletePaper(t.dataset.qpDeletePaper);
    if(t.dataset.qpPrintSaved){
      const paper=savedPapers.find(x=>x.id===t.dataset.qpPrintSaved);
      if(paper){generatedPaper=paper;renderPaperPreview(paper);printPaper(paper,false);}
    }
    if(t.dataset.qpAnswerSaved){
      const paper=savedPapers.find(x=>x.id===t.dataset.qpAnswerSaved);
      if(paper){generatedPaper=paper;renderPaperPreview(paper);printPaper(paper,true);}
    }
  }catch(err){console.error("Question paper action failed",err);message("कार्य पूरा भएन: "+(err.code||err.message),true);}
});
