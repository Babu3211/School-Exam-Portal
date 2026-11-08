import { getApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
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
    .qp-wrap{display:grid;gap:14px}.qp-card{background:#fff;border:1px solid #dce5f1;border-radius:14px;padding:16px;box-shadow:0 4px 14px rgba(22,48,84,.04)}
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
    .qp-paper-preview .qp-q{margin:13px 0;line-height:1.6}.qp-muted{color:#718096}.qp-hidden{display:none!important}
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
      <p class="qp-hint">तलका कागजातहरू प्रश्नपत्रको ढाँचा, प्रश्नको प्रकार र मूल्याङ्कन मापदण्ड जाँच्नका लागि हुन्। कक्षा/विषयअनुसार लागू संस्करण फरक हुन सक्छ; प्रणालीले स्रोत पुष्टि नभएको ढाँचालाई CDC प्रमाणित भनेर प्रयोग गर्दैन।</p>
      <p class="qp-hint"><b>कक्षा ८ विज्ञान तथा प्रविधि:</b> CDC पाठ्यपुस्तकका ११ एकाइमा आधारित ५५ वटा मौलिक अभ्यास प्रश्न/उत्तर प्याक उपलब्ध छ। Admin ले कक्षा ८ को विज्ञान विषय छानेर “CDC अभ्यास प्याक लोड” गर्न सक्छ। यी CDC का प्रकाशित नमुना प्रश्न होइनन्; औपचारिक परीक्षामा प्रयोग गर्नुअघि विषय शिक्षकले समीक्षा गर्नुपर्छ।</p>
      <div class="qp-grid">
        <div><b>कक्षा ६–८</b><ul class="qp-hint">
          <li><a href="https://moecdc.gov.np/content/290/specialization-schedule--class-6-8--social-study-and/" target="_blank" rel="noopener">सामाजिक अध्ययन तथा मानव मूल्य शिक्षा — विशिष्टीकरण तालिका (२०८३)</a></li>
          <li><a href="https://moecdc.gov.np/content/289/specialization-schedule--class-6---8--health-/" target="_blank" rel="noopener">स्वास्थ्य, शारीरिक तथा सिर्जनात्मक कला — Grid (२०८२)</a></li>
          <li><a href="https://moecdc.gov.np/content/292/specialization-schedule--class-6-8--math---samput/" target="_blank" rel="noopener">गणित कक्षा ६–८ — विशिष्टीकरण/नमुना प्रश्न (२०८०)</a></li>
          <li><a href="https://moecdc.gov.np/content/286/specifications-grid--grade---8--nepali/" target="_blank" rel="noopener">नेपाली कक्षा ८ — Grid</a></li>
          <li><a href="https://moecdc.gov.np/content/285/specification-grid--grade---8--english/" target="_blank" rel="noopener">English कक्षा ८ — Grid</a></li>
          <li><a href="https://moecdc.gov.np/content/284/specification-grid--grade-8--science-and-technology/" target="_blank" rel="noopener">विज्ञान तथा प्रविधि कक्षा ८ — CDC विशिष्टीकरण तालिका (२०८२)</a></li>
          <li><a href="https://moecdc.gov.np/category/specialization-schedule--g-/?page=5" target="_blank" rel="noopener">विज्ञान तथा प्रविधि कक्षा ८ लगायतका Grid</a></li>
          <li><a href="https://lib.moecdc.gov.np/elibrary/pages/search.php?access=&archive=&display=list&foredit=&k=&modal=&noreload=true&offset=0&order_by=field8&per_page=240&recentdaylimit=&restypes=&search=%21collection18397&sort=DESC" target="_blank" rel="noopener">CDC Publications 2082 — कक्षा ६–८ शिक्षक निर्देशिका तथा सामग्री</a></li>
          <li><a href="https://moecdc.gov.np/storage/gallery/1672198334.pdf" target="_blank" rel="noopener">पुरानो संयुक्त नमुना प्रश्नपत्र/विशिष्टीकरण (२०७८) — पूरक सन्दर्भ</a></li>
        </ul></div>
        <div><b>कक्षा ९–१० अनिवार्य विषय</b><ul class="qp-hint">
          <li><a href="https://moecdc.gov.np/content/282/specification-grid--9---10--compulsory-nepali/" target="_blank" rel="noopener">अनिवार्य नेपाली — Grid (२०८२)</a></li>
          <li><a href="https://moecdc.gov.np/content/280/specification-grid--grade-9--10--compulsory-english/" target="_blank" rel="noopener">अनिवार्य English — Grid (२०८२)</a></li>
          <li><a href="https://moecdc.gov.np/content/281/" target="_blank" rel="noopener">अनिवार्य गणित — Grid (२०८२)</a></li>
          <li><a href="https://moecdc.gov.np/category/specialization-schedule--g-/?page=6" target="_blank" rel="noopener">कक्षा ९ विज्ञान तथा प्रविधि र सामाजिक अध्ययन — विषयगत Grid</a></li>
          <li><a href="https://lib.moecdc.gov.np/elibrary/pages/search.php?access=&archive=&display=list&foredit=&k=&modal=&noreload=true&offset=0&order_by=field8&per_page=240&recentdaylimit=&restypes=&search=%21collection18397&sort=DESC" target="_blank" rel="noopener">कक्षा १० विज्ञान तथा प्रविधि र सामाजिक अध्ययन — CDC model papers/Guides</a></li>
          <li><a href="https://moecdc.gov.np/content/488/health-and-physical-education-syllabus--2082-secondary/" target="_blank" rel="noopener">स्वास्थ्य तथा शारीरिक शिक्षा पाठ्यक्रम २०८२</a></li>
        </ul></div>
        <div><b>ऐच्छिक तथा थप विषय</b><ul class="qp-hint">
          <li><a href="https://moecdc.gov.np/content/10/specification-schedule-and-sample-questions--class-9/" target="_blank" rel="noopener">ऐच्छिक गणित कक्षा ९–१० — Grid तथा नमुना प्रश्न (२०८२)</a></li>
          <li><a href="https://moecdc.gov.np/content/658/class-10-computer-science-optional-subject-specification/" target="_blank" rel="noopener">ऐच्छिक कम्प्युटर विज्ञान कक्षा १०</a></li>
          <li><a href="https://moecdc.gov.np/category/specialization-schedule--g-/?page=1" target="_blank" rel="noopener">ऐच्छिक अर्थशास्त्र, कम्प्युटर विज्ञान, गणित तथा नयाँ Grid/उत्तरकुञ्जिका</a></li>
        </ul></div>
      </div>
      <p class="qp-hint">नोट: यी स्रोतहरू CDC का उपलब्ध प्रकाशनअनुसार अद्यावधिक गरिएका छन्। सबै कक्षा/विषयका अध्यायगत Topic र प्रश्न/उत्तर बैंकको पूर्ण आयात तथा जाँच अझै बाँकी छ; पुराना Grid लाई नयाँ संस्करणसँग नमिसाउनुहोस्।</p>
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
        <div class="qp-actions" style="grid-column:1/-1"><button class="qp-btn" type="submit">यो कक्षा/विषयको Blueprint सुरक्षित गर्नुहोस्</button><span class="qp-hint" id="qpBpStatus"></span></div>
      </form>
    </div>

    <div class="qp-card">
      <div class="qp-section-title"><h3>२. CDC Topic छान्नुहोस्</h3><span class="qp-badge" id="qpTopicCount">० Topic</span></div>
      <p class="qp-hint">शिक्षकले प्रश्न बैंकमा आफैँ थपेका Topic र उपलब्ध पाठ्यक्रम सूचीबाट आफूले चाहेका Topic छान्नुहोस्। कुनै पूर्वलोड गरिएको सूची आवश्यक छैन।</p>
      <div id="qpTopicList" class="qp-topic-list"><p class="qp-hint">कक्षा र विषय छान्नुहोस्।</p></div>
    </div>

    <div class="qp-card">
      <h3>३. प्रश्न बैंकमा प्रश्न थप्नुहोस्</h3>
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
      <p class="qp-hint">विषय शिक्षकले CDC सूची कुर्नु पर्दैन—आफूले पढाएको एकाइ/Topic सिधै लेखेर प्रश्न थप्न सक्नुहुन्छ। Auto Generate ले छानिएका Topic का प्रश्न बैंकबाट प्रश्नपत्र, क्रम र अङ्क स्वतः मिलाउँछ। बाह्य AI/API वा शुल्क प्रयोग हुँदैन।</p>
      <div class="qp-actions"><button class="qp-btn alt" id="qpQuestionTemplateBtn" type="button">प्रश्न बैंक JSON नमुना</button><label class="qp-btn alt" for="qpQuestionImportFile">Admin: प्रश्न बैंक JSON आयात</label><input id="qpQuestionImportFile" class="qp-hidden" type="file" accept=".json,application/json"><button class="qp-btn alt qp-hidden" id="qpGrade8SciencePackBtn" type="button">Admin: कक्षा ८ विज्ञान CDC अभ्यास प्याक लोड</button></div>
      <p class="qp-hint">प्रश्न बैंक JSON आयात गर्दा हाल छानिएको कक्षा, विषय र Section मा मात्र प्रश्न थपिन्छ। दोहोरिएका प्रश्नहरू छुट्याइन्छ।</p>
    </div>

    <div class="qp-card">
      <div class="qp-section-title"><h3>४. प्रश्न बैंक</h3><button class="qp-btn alt" id="qpRefreshBtn" type="button">Refresh</button></div>
      <div class="qp-table-wrap"><table class="qp-table"><thead><tr><th>Topic</th><th>प्रश्न</th><th>प्रकार</th><th>स्तर</th><th>अङ्क</th><th>थप्ने शिक्षक</th><th>कार्य</th></tr></thead><tbody id="qpQuestionRows"><tr><td colspan="7">पहिले कक्षा/विषय छान्नुहोस्।</td></tr></tbody></table></div>
    </div>

    <div class="qp-card">
      <div class="qp-section-title"><h3>५. स्वचालित प्रश्नपत्र तयार गर्नुहोस्</h3><span id="qpBlueprintBadge" class="qp-badge">Custom Pattern</span></div>
      <div class="qp-grid">
        <div class="qp-field"><label for="qpPaperTitle">परीक्षाको नाम</label><input id="qpPaperTitle" maxlength="120" value="त्रैमासिक परीक्षा"></div>
        <div class="qp-field"><label for="qpPaperYear">शैक्षिक वर्ष</label><input id="qpPaperYear" maxlength="20" value="2083"></div>
        <div class="qp-field"><label for="qpPaperDuration">समय (मिनेट)</label><input id="qpPaperDuration" type="number" min="15" max="360" value="120"></div>
        <div class="qp-field"><label for="qpPaperFullMarks">पूर्णाङ्क</label><input id="qpPaperFullMarks" type="number" min="1" max="500" value="50"></div>
        <div class="qp-field"><label for="qpPaperMcqCount">MCQ संख्या</label><input id="qpPaperMcqCount" type="number" min="0" max="100" value="10"></div>
        <div class="qp-field"><label for="qpPaperMcqMarks">MCQ प्रति अङ्क</label><input id="qpPaperMcqMarks" type="number" min="1" max="20" value="1"></div>
        <div class="qp-field"><label for="qpPaperShortCount">छोटो प्रश्न संख्या</label><input id="qpPaperShortCount" type="number" min="0" max="100" value="6"></div>
        <div class="qp-field"><label for="qpPaperShortMarks">छोटो प्रश्न प्रति अङ्क</label><input id="qpPaperShortMarks" type="number" min="1" max="30" value="5"></div>
        <div class="qp-field"><label for="qpPaperLongCount">लामो प्रश्न संख्या</label><input id="qpPaperLongCount" type="number" min="0" max="100" value="1"></div>
        <div class="qp-field"><label for="qpPaperLongMarks">लामो प्रश्न प्रति अङ्क</label><input id="qpPaperLongMarks" type="number" min="1" max="50" value="10"></div>
      </div>
      <p class="qp-hint" id="qpPatternHint">CDC Grid आयात गरिएको छैन भने शिक्षकले Custom Pattern राख्न सक्नुहुन्छ। कुल प्रश्नको अङ्क पूर्णाङ्कसँग मिल्नुपर्छ।</p>
      <div class="qp-actions"><button class="qp-btn" id="qpGenerateBtn" type="button">Topic अनुसार प्रश्नपत्र Auto Generate</button><button class="qp-btn alt" id="qpSavePaperBtn" type="button" disabled>प्रश्नपत्र Save</button><button class="qp-btn alt" id="qpPrintPaperBtn" type="button" disabled>प्रश्नपत्र Print / PDF</button><button class="qp-btn alt" id="qpAnswerKeyBtn" type="button" disabled>उत्तरकुञ्जिका Print / PDF</button></div>
      <div id="qpPaperPreview" style="margin-top:14px"><p class="qp-hint">Topic छानेर प्रश्नपत्र Auto Generate गर्नुहोस्।</p></div>
    </div>

    <div class="qp-card">
      <div class="qp-section-title"><h3>६. सुरक्षित प्रश्नपत्र अभिलेख</h3><button class="qp-btn alt" id="qpPaperReloadBtn" type="button">Refresh</button></div>
      <div class="qp-table-wrap"><table class="qp-table"><thead><tr><th>परीक्षा</th><th>कक्षा</th><th>विषय</th><th>पूर्णाङ्क</th><th>समय</th><th>मिति</th><th>कार्य</th></tr></thead><tbody id="qpPaperRows"><tr><td colspan="7">अभिलेख लोड हुँदैछ।</td></tr></tbody></table></div>
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
  const box = $("qpTopicList"), select = $("qpQuestionTopic");
  if (!box || !select) return;
  const topics = curriculumRows.flatMap(unit => (unit.topics || []).map((name,index) => ({id:unit.id+"_"+index,unitId:unit.id,unitTitle:unit.unitTitle,topicName:String(name)})));
  const known=new Set(topics.map(x=>x.id));
  questionRows.forEach(q=>{const key=String(q.topicId||("custom_"+normal((q.unitTitle||"")+"::"+q.topicName)));if(q.topicName&&!known.has(key)){known.add(key);topics.push({id:key,unitId:q.unitId||"",unitTitle:q.unitTitle||"शिक्षकले थपेको Topic",topicName:String(q.topicName)});}});
  $("qpTopicCount").textContent = topics.length+" Topic";
  if (!topics.length) {
    box.innerHTML = '<p class="qp-hint">अहिलेसम्म Topic छैन। तल प्रश्न थप्दा आफूले चाहेको Topic लेख्नुहोस्; सुरक्षित भएपछि यहीँ छान्न मिल्छ।</p>';
    select.innerHTML = ""; return;
  }
  box.innerHTML = topics.map(x=>`<label class="qp-topic"><input type="checkbox" data-qp-topic value="${esc(x.id)}"><span><b>${esc(x.topicName)}</b><small class="qp-hint"> · ${esc(x.unitTitle||"एकाइ नतोकिएको")}</small></span></label>`).join("");
  select.innerHTML = topics.map(x=>'<option value="'+esc(x.topicName)+'">').join("");
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
function renderPaperPreview(paper = generatedPaper) {
  const box = $("qpPaperPreview"); if (!box) return;
  if (!paper) { box.innerHTML='<p class="qp-hint">Topic छानेर प्रश्नपत्र Auto Generate गर्नुहोस्।</p>'; return; }
  const groups = ["mcq","short","long"];
  let number = 0;
  box.innerHTML = `<div id="qpPrintArea" class="qp-paper-preview">
    <div style="text-align:center;border-bottom:1px solid #222;padding-bottom:10px">
      <h2>${esc(paper.schoolName||"विद्यालयको नाम")}</h2><div>${esc(paper.schoolAddress||"")}</div>
      <h3>${esc(paper.paperTitle)}</h3><b>${esc(paper.className)} · ${esc(paper.subject)}</b>
      <div style="display:flex;justify-content:space-between;gap:8px;margin-top:12px"><span>शैक्षिक वर्ष: ${esc(paper.academicYear)}</span><span>समय: ${esc(paper.durationMinutes)} मिनेट</span><span>पूर्णाङ्क: ${esc(paper.fullMarks)}</span></div>
    </div>
    ${groups.map(type=>{const list=paper.questions.filter(q=>q.questionType===type);if(!list.length)return "";return `<h3 style="text-align:left;margin-top:16px">${esc(questionTypeLabel(type))}</h3>${list.map(q=>{number++;return `<div class="qp-q"><div style="display:flex;justify-content:space-between;gap:10px"><b>${number}. ${esc(q.questionText)}</b><b>[${esc(q.marks)}]</b></div>${type==="mcq"?'<div style="margin-left:18px">'+(q.options||[]).map((o,i)=>'<div>'+String.fromCharCode(65+i)+'. '+esc(o)+'</div>').join("")+'</div>':""}</div>`;}).join("")}`;}).join("")}
    <div style="text-align:center;margin-top:25px;font-weight:700">— प्रश्नपत्र समाप्त —</div>
  </div>`;
}
function printPaper(paper = generatedPaper, includeAnswers = false) {
  if (!paper) return;
  const area = $("qpPaperPreview")?.querySelector("#qpPrintArea");
  if (!area) return;
  const w = window.open("", "_blank", "width=900,height=900");
  if (!w) { message("Print खोल्न Popup अनुमति दिनुहोस्।", true); return; }
  const answerSheet = includeAnswers ? '<section style="page-break-before:always;font-family:Arial,sans-serif;padding:24px;color:#111"><h2>'+esc(paper.schoolName||"विद्यालय")+'</h2><h3>'+esc(paper.paperTitle||"प्रश्नपत्र")+' — उत्तरकुञ्जिका (शिक्षक प्रति)</h3><p>कक्षा: '+esc(paper.className)+' · विषय: '+esc(paper.subject)+'</p><ol>'+paper.questions.map(q=>'<li style="margin:10px 0;line-height:1.6"><b>'+esc(q.questionText)+'</b><br>उत्तर: '+esc(q.answer|| (q.correctOption ? "सही विकल्प "+q.correctOption : "उत्तर संकेत उपलब्ध छैन"))+'</li>').join("")+'</ol></section>' : "";
  w.document.write('<!doctype html><html lang="ne"><head><meta charset="utf-8"><title>'+esc(paper.paperTitle)+'</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h2,h3{text-align:center}.qp-q{margin:14px 0;line-height:1.7}@page{size:A4;margin:18mm}</style></head><body>'+area.outerHTML+answerSheet+'</body></html>');
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
async function loadCurrentData() {
  if (!selectedClass || !selectedSubject) return;
  const g=gradeNumber(selectedClass);
  const [curr, questions, blueprints] = await Promise.all([
    getDocs(query(collection(db,"cdc_curriculum"),where("gradeNumber","==",g),where("subject","==",selectedSubject))),
    getDocs(query(collection(db,"question_bank"),where("className","==",selectedClass),where("subject","==",selectedSubject),where("section","==",selectedSection))),
    getDocs(query(collection(db,"cdc_blueprints"),where("gradeNumber","==",g),where("subject","==",selectedSubject)))
  ]);
  curriculumRows=curr.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(a.unitCode||"").localeCompare(String(b.unitCode||""),undefined,{numeric:true}));
  questionRows=questions.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(b.createdAt?.seconds||0).localeCompare(String(a.createdAt?.seconds||0)));
  blueprintRows=blueprints.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.active!==false);
  currentBlueprint=blueprintRows.sort((a,b)=>String(b.updatedAt?.seconds||0).localeCompare(String(a.updatedAt?.seconds||0)))[0]||null;
  $("qpCurriculumVersion").value=curriculumRows[0]?.curriculumVersion||"CDC संस्करण Topic सूचीअनुसार";
  renderTopics();renderQuestionRows();
  const badge=$("qpBlueprintBadge");
  if(currentBlueprint){
    badge.textContent="CDC Grid · "+(currentBlueprint.curriculumVersion||"संस्करण");
    $("qpPatternHint").textContent="CDC Grid अनुसार प्रश्न प्रकार/संख्या स्वतः भरिएको छ। विषयगत Grid स्रोत Admin ले पुष्टि गरेको हुनुपर्छ।";
    setBuilderPattern(currentBlueprint.pattern,currentBlueprint.fullMarks,currentBlueprint.durationMinutes);
  }else{
    badge.textContent="Custom Pattern";
    $("qpPatternHint").textContent="यस विषयको CDC Grid आयात गरिएको छैन। अहिले Custom Pattern मात्र प्रयोग हुन्छ; यसलाई CDC आधिकारिक नमुना भनेर नमान्नुहोस्।";
  }
  await loadPaperHistory();
}
async function loadPaperHistory() {
  const body=$("qpPaperRows");if(!body)return;
  try{
    let snap;
    if(isAdmin()) snap=await getDocs(query(collection(db,"question_papers"),where("className","==",selectedClass),where("subject","==",selectedSubject),where("section","==",selectedSection),limit(30)));
    else snap=await getDocs(query(collection(db,"question_papers"),where("className","==",selectedClass),where("subject","==",selectedSubject),where("section","==",selectedSection),where("createdBy","==",auth.currentUser.uid),limit(30)));
    savedPapers=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(b.createdAt?.seconds||0).localeCompare(String(a.createdAt?.seconds||0)));
    body.innerHTML=savedPapers.length?savedPapers.map(p=>`<tr><td>${esc(p.paperTitle)}</td><td>${esc(p.className)}</td><td>${esc(p.subject)}</td><td>${esc(p.fullMarks)}</td><td>${esc(p.durationMinutes)} min</td><td>${esc(p.createdAt?.toDate?p.createdAt.toDate().toLocaleDateString("ne-NP"):"—")}</td><td><button class="qp-btn alt" type="button" data-qp-print-saved="${esc(p.id)}">प्रश्नपत्र</button> <button class="qp-btn alt" type="button" data-qp-answer-saved="${esc(p.id)}">उत्तरकुञ्जिका</button> ${isAdmin()||p.createdBy===auth.currentUser.uid?'<button class="qp-btn danger" type="button" data-qp-delete-paper="'+esc(p.id)+'">Delete</button>':""}</td></tr>`).join(""):'<tr><td colspan="7">अहिलेसम्म प्रश्नपत्र सुरक्षित गरिएको छैन।</td></tr>';
  }catch(err){console.error("Question paper history failed",err);body.innerHTML='<tr><td colspan="7">प्रश्नपत्र सूची लोड भएन: '+esc(err.code||err.message)+'</td></tr>';}
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
async function saveBlueprint(event) {
  event.preventDefault();
  if(!isAdmin())throw new Error("CDC Blueprint व्यवस्थापन Admin का लागि मात्र हो।");
  if(!selectedClass||!selectedSubject)throw new Error("पहिले कक्षा र विषय छान्नुहोस्।");
  const sourceUrl=$("qpBpSourceUrl").value.trim();
  if(!/^https:\/\/(www\.)?moecdc\.gov\.np\//i.test(sourceUrl)&&!/^https:\/\/lib\.moecdc\.gov\.np\//i.test(sourceUrl))throw new Error("CDC को आधिकारिक URL राख्नुहोस्।");
  const distribution={
    knowledge:Number($("qpBpKnowledge").value),understanding:Number($("qpBpUnderstanding").value),
    application:Number($("qpBpApplication").value),higher:Number($("qpBpHigher").value)
  };
  if(Object.values(distribution).reduce((a,b)=>a+b,0)!==100)throw new Error("संज्ञानात्मक स्तरको प्रतिशत जम्मा १०० हुनुपर्छ।");
  const pattern=getPattern("qpBp");
  const total=pattern.reduce((sum,x)=>sum+x.count*x.marks,0);
  const fullMarks=Number($("qpBpFullMarks").value);
  if(total!==fullMarks)throw new Error("प्रश्न ढाँचाको जम्मा अङ्क "+total+" छ; पूर्णाङ्क "+fullMarks+" हुनुपर्छ।");
  const subjectHash=Array.from(normal(selectedSubject)).reduce((hash,ch)=>(hash*31+ch.charCodeAt(0))>>>0,7).toString(36);
  const id="g"+gradeNumber(selectedClass)+"_s"+subjectHash;
  await setDoc(doc(db,"cdc_blueprints",id),{
    gradeNumber:gradeNumber(selectedClass),className:selectedClass,subject:selectedSubject,
    curriculumVersion:$("qpBpVersion").value.trim(),fullMarks,durationMinutes:Number($("qpBpDuration").value),
    pattern, cognitiveDistribution:distribution,sourceTitle:$("qpBpSourceTitle").value.trim(),sourceUrl,
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
  const unitId="teacher_custom";
  const topicId="custom_"+normal(unitTitle+"::"+topicName);
  const questionType=$("qpQuestionType").value;
  const options=questionType==="mcq"?["A","B","C","D"].map(k=>$("qpOption"+k).value.trim()):[];
  const correctOption=questionType==="mcq"?$("qpCorrectOption").value:"";
  if(questionType==="mcq"&&(options.some(x=>!x)||!correctOption))throw new Error("MCQ का चारवटै विकल्प र सही उत्तर राख्नुहोस्।");
  const data={
    gradeNumber:gradeNumber(selectedClass),className:selectedClass,subject:selectedSubject,section:selectedSection,
    unitId,unitTitle,topicId,topicName:String(topicName),
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
  generatedPaper={
    ...header,gradeNumber:gradeNumber(selectedClass),className:selectedClass,subject:selectedSubject,section:selectedSection,
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
  $("qpSavePaperBtn").disabled=false;$("qpPrintPaperBtn").disabled=false;$("qpAnswerKeyBtn").disabled=false;
  message("प्रश्नपत्र तयार भयो। कुल "+questions.length+" प्रश्न, "+fullMarks+" अङ्क। Save वा Print गर्न सक्नुहुन्छ।");
}
async function savePaper() {
  if(!generatedPaper)throw new Error("पहिले प्रश्नपत्र Auto Generate गर्नुहोस्।");
  const payload={...generatedPaper,createdBy:auth.currentUser.uid,createdAt:serverTimestamp(),status:"draft"};
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
async function importQuestionBank(file) {
  if(!isAdmin())throw new Error("प्रश्न बैंकको सामूहिक आयात Admin का लागि मात्र हो।");
  if(!selectedClass||!selectedSubject)throw new Error("पहिले कक्षा र विषय छान्नुहोस्।");
  const raw=JSON.parse(await file.text());
  const rows=Array.isArray(raw)?raw:raw?.questions;
  if(!Array.isArray(rows)||!rows.length||rows.length>500)throw new Error("JSON मा १–५०० प्रश्न हुनुपर्छ।");
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
    const curriculumUnit=curriculumRows.find(unit=>(unit.topics||[]).some(t=>normal(t)===normal(topicName)));
    const unitId=curriculumUnit?.id||"teacher_custom";
    const resolvedUnitTitle=curriculumUnit?.unitTitle||unitTitle;
    const topicId=curriculumUnit
      ? curriculumUnit.id+"_"+(curriculumUnit.topics||[]).findIndex(t=>normal(t)===normal(topicName))
      : "custom_"+normal(resolvedUnitTitle+"::"+topicName);
    const options=questionType==="mcq"?(Array.isArray(row.options)?row.options.map(x=>String(x).trim()):[]):[];
    const correctOption=questionType==="mcq"?String(row.correctOption||""):"";
    if(questionType==="mcq"&&(options.length!==4||options.some(x=>!x||x.length>500)||!["A","B","C","D"].includes(correctOption)))
      throw new Error("MCQ प्रश्न "+(index+1)+" मा चार विकल्प र सही विकल्प A/B/C/D आवश्यक छ।");
    const fingerprint=normal(topicId+"::"+questionType+"::"+marks+"::"+questionText);
    if(known.has(fingerprint)){duplicates++;continue;}
    known.add(fingerprint);
    payloads.push({
      gradeNumber:gradeNumber(selectedClass),className:selectedClass,subject:selectedSubject,section:selectedSection,
      unitId,unitTitle:resolvedUnitTitle,topicId,topicName,questionType,marks,cognitiveLevel,questionText,
      options,correctOption,answer:String(row.answer||"").trim().slice(0,3000),
      createdBy:auth.currentUser.uid,createdByName:String(role?.displayName||"Admin").slice(0,100),
      createdAt:serverTimestamp(),status:"active"
    });
  }
  if(!payloads.length){message("नयाँ प्रश्न भेटिएन; "+duplicates+" दोहोरिएका प्रश्न छोडिए।");return;}
  const batch=writeBatch(db);
  for(const payload of payloads)batch.set(doc(collection(db,"question_bank")),payload);
  await batch.commit();
  await logQuestionActivity("question_bank_import","bulk",selectedClass+" "+selectedSubject+" · "+payloads.length+" questions");
  await loadCurrentData();
  message(payloads.length+" प्रश्न आयात भए; "+duplicates+" दोहोरिएका प्रश्न छोडिए।");
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
  const unitBatch=writeBatch(db);
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
      unitBatch.set(doc(db,"cdc_curriculum",unitId),{
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
  const questionBatch=writeBatch(db);
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
    questionBatch.set(doc(collection(db,"question_bank")),{
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
  if(unitWrites)await unitBatch.commit();
  if(newQuestions)await questionBatch.commit();
  await logQuestionActivity("cdc_practice_pack_import","grade8-science",newQuestions+" questions");
  await loadCurrentData();
  message("कक्षा ८ विज्ञान अभ्यास प्याक: "+newUnits+" नयाँ एकाइ, "+newQuestions+" नयाँ प्रश्न थपिए; "+duplicates+" दोहोरिएका प्रश्न छोडिए। यी मूल अभ्यास प्रश्न हुन्—औपचारिक परीक्षाअघि विषय शिक्षकले समीक्षा गर्नुपर्छ।");
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

document.addEventListener("change",async event=>{
  const t=event.target;
  if(t.id==="qpClass"){
    selectedClass=t.value;selectedSubject="";selectedSection="";generatedPaper=null;
    $("qpSavePaperBtn").disabled=true;$("qpPrintPaperBtn").disabled=true;$("qpAnswerKeyBtn").disabled=true;
    const opts=classSubjects.filter(x=>x.className===selectedClass);
    const subjects=[...new Set(opts.map(x=>x.subject))];
    $("qpSubject").innerHTML='<option value="">विषय छान्नुहोस्</option>'+subjects.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join("");
    $("qpSection").innerHTML='<option value="">Section छान्नुहोस्</option>';
    curriculumRows=[];questionRows=[];renderTopics();renderQuestionRows();message("अब विषय छान्नुहोस्।");
  }
  if(t.id==="qpSubject"){
    selectedSubject=t.value;selectedSection="";generatedPaper=null;
    $("qpSavePaperBtn").disabled=true;$("qpPrintPaperBtn").disabled=true;$("qpAnswerKeyBtn").disabled=true;
    curriculumRows=[];questionRows=[];renderTopics();renderQuestionRows();
    const sections=[...new Set(classSubjects.filter(x=>x.className===selectedClass&&x.subject===selectedSubject).map(x=>String(x.section||"")))];
    $("qpSection").innerHTML='<option value="">Section छान्नुहोस्</option>'+sections.map(x=>'<option value="'+esc(x)+'">'+esc(x||"सबै Section / लागू")+'</option>').join("");
    if(sections.length===1){selectedSection=sections[0];$("qpSection").value=selectedSection;}
    if(selectedClass&&selectedSubject&&sections.length===1)try{await loadCurrentData();message("CDC Topic, प्रश्न बैंक र Blueprint लोड भए।");}catch(err){console.error(err);message("डेटा लोड भएन: "+(err.code||err.message),true);}else if(sections.length>1)message("कृपया Section छान्नुहोस्।");
  }
  if(t.id==="qpSection"){selectedSection=t.value;generatedPaper=null;if(selectedClass&&selectedSubject)try{await loadCurrentData();message("Section अनुसार Topic र प्रश्न बैंक लोड भए।");}catch(err){message("डेटा लोड भएन: "+(err.code||err.message),true);}}
  if(t.id==="qpQuestionType")toggleMcqFields();
  if(t.id==="qpImportFile"&&t.files?.[0]){
    try{await importTopics(t.files[0]);}catch(err){message("आयात भएन: "+(err.code||err.message),true);}finally{t.value="";}
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
    if(t.id==="qpQuestionTemplateBtn")downloadQuestionTemplate();
    if(t.id==="qpGrade8SciencePackBtn")await loadGrade8SciencePack();
    if(t.id==="qpGenerateBtn")await generatePaper();
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
