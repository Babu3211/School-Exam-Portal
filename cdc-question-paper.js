import { getApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import {
  getFirestore, collection, addDoc, getDocs, doc, getDoc, setDoc,
  updateDoc, deleteDoc, query, where, orderBy, limit, serverTimestamp
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
let selectedClass = "", selectedSubject = "", currentBlueprint = null;

function message(text, error = false) {
  const el = $("qpMessage");
  if (el) { el.textContent = text; el.style.color = error ? "#b42318" : "#52627a"; }
}
function roleCanTeach(className, subject) {
  if (isAdmin()) return true;
  const pair = (role?.subjectAssignments || []).some(x =>
    String(x.className || "").trim() === className && normal(x.subject) === normal(subject));
  const key = (role?.subjectAssignmentKeys || []).some(x => {
    const parts = String(x).split("::");
    return parts.length >= 2 && parts[0] === className && normal(parts.slice(1).join("::")) === normal(subject);
  });
  return role?.active === true && (role?.roles || []).includes("subject_teacher") && (pair || key);
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
        <div class="qp-field"><label>पाठ्यक्रमको आधार</label><input id="qpCurriculumVersion" value="CDC पाठ्यक्रम — विषयअनुसार लागू संस्करण" readonly></div>
      </div>
      <p class="qp-hint" id="qpMessage" role="status">पहिले कक्षा र विषय छान्नुहोस्। शिक्षकले आफूलाई तोकिएको कक्षा/विषयमा मात्र काम गर्न पाउनुहुनेछ।</p>
    </div>

    <div class="qp-card" id="qpCatalogAdmin">
      <div class="qp-section-title"><h3>१. CDC पाठ्यक्रम तथा Topic सूची व्यवस्थापन (Admin)</h3><span class="qp-badge">Admin मात्र</span></div>
      <p class="qp-hint">CDC को आधिकारिक पाठ्यक्रम/विशिष्टीकरण तालिकाबाट एकाइ र Topic प्रविष्ट वा JSON सूची आयात गर्नुहोस्। स्रोत र पाठ्यक्रम संस्करण राख्न अनिवार्य छ। अप्रमाणित Topic लाई CDC आधिकारिक भनेर चिनाइँदैन।</p>
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
        <div class="qp-field"><label for="qpBpLongCount">लामो उत्तर प्रश्न संख्या</label><input id="qpBpLongCount" type="number" min="0" max="100" value="2"></div>
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
      <p class="qp-hint">तल देखिएका Topic मात्र प्रश्न निर्माणमा प्रयोग हुन्छन्। Topic सूची CDC स्रोतबाट Admin ले पुष्टि गरी राखेको हुनुपर्छ।</p>
      <div id="qpTopicList" class="qp-topic-list"><p class="qp-hint">कक्षा र विषय छान्नुहोस्।</p></div>
    </div>

    <div class="qp-card">
      <h3>३. प्रश्न बैंकमा प्रश्न थप्नुहोस्</h3>
      <form id="qpQuestionForm" class="qp-grid">
        <div class="qp-field"><label for="qpQuestionTopic">Topic</label><select id="qpQuestionTopic" required><option value="">Topic छान्नुहोस्</option></select></div>
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
      <p class="qp-hint">प्रश्न शिक्षकले आफैँ तयार गरी प्रश्न बैंकमा सुरक्षित गर्नुहुन्छ। स्वचालित प्रश्नपत्रले यही स्वीकृत प्रश्न बैंकबाट मात्र प्रश्न छान्छ; कुनै बाह्य AI शुल्क वा API प्रयोग हुँदैन।</p>
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
        <div class="qp-field"><label for="qpPaperLongCount">लामो प्रश्न संख्या</label><input id="qpPaperLongCount" type="number" min="0" max="100" value="2"></div>
        <div class="qp-field"><label for="qpPaperLongMarks">लामो प्रश्न प्रति अङ्क</label><input id="qpPaperLongMarks" type="number" min="1" max="50" value="10"></div>
      </div>
      <p class="qp-hint" id="qpPatternHint">CDC Grid आयात गरिएको छैन भने शिक्षकले Custom Pattern राख्न सक्नुहुन्छ। कुल प्रश्नको अङ्क पूर्णाङ्कसँग मिल्नुपर्छ।</p>
      <div class="qp-actions"><button class="qp-btn" id="qpGenerateBtn" type="button">Topic अनुसार प्रश्नपत्र Auto Generate</button><button class="qp-btn alt" id="qpSavePaperBtn" type="button" disabled>प्रश्नपत्र Save</button><button class="qp-btn alt" id="qpPrintPaperBtn" type="button" disabled>Print / PDF</button></div>
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
  const topics = curriculumRows.flatMap(unit => (unit.topics || []).map((name,index) => ({
    id: unit.id+"_"+index, unitId:unit.id, unitTitle:unit.unitTitle, topicName:String(name)
  })));
  $("qpTopicCount").textContent = topics.length+" Topic";
  if (!topics.length) {
    box.innerHTML = '<p class="qp-hint">यस कक्षा/विषयको CDC Topic सूची अहिलेसम्म राखिएको छैन। Admin ले आधिकारिक पाठ्यक्रमबाट एकाइ/Topic आयात वा प्रविष्ट गर्नुपर्छ।</p>';
    select.innerHTML = '<option value="">Topic सूची उपलब्ध छैन</option>';
    return;
  }
  box.innerHTML = curriculumRows.map(unit => `
    <div style="grid-column:1/-1"><b>${esc(unit.unitCode||"")} · ${esc(unit.unitTitle)}</b> <small class="qp-hint">(${esc(unit.curriculumVersion||"CDC")})</small>
    <div class="qp-topic-list">${(unit.topics||[]).map((topic,index)=>`<label class="qp-topic"><input type="checkbox" data-qp-topic value="${esc(unit.id+"_"+index)}"><span>${esc(topic)}</span></label>`).join("")}</div></div>`).join("");
  select.innerHTML = '<option value="">Topic छान्नुहोस्</option>'+topics.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.unitTitle+' · '+x.topicName)+'</option>').join("");
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
function printPaper(paper = generatedPaper) {
  if (!paper) return;
  const area = $("qpPaperPreview")?.querySelector("#qpPrintArea");
  if (!area) return;
  const w = window.open("", "_blank", "width=900,height=900");
  if (!w) { message("Print खोल्न Popup अनुमति दिनुहोस्।", true); return; }
  w.document.write('<!doctype html><html lang="ne"><head><meta charset="utf-8"><title>'+esc(paper.paperTitle)+'</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h2,h3{text-align:center}.qp-q{margin:14px 0;line-height:1.7}@page{size:A4;margin:18mm}</style></head><body>'+area.outerHTML+'</body></html>');
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
      if (n>=6&&n<=10&&x.subject) pairs.push({className:String(x.className),subject:String(x.subject),gradeNumber:n});
    }
  } else {
    for (const x of (role?.subjectAssignments||[])) {
      const n=gradeNumber(x.className);
      if (n>=6&&n<=10&&x.subject&&roleCanTeach(String(x.className),String(x.subject))) pairs.push({className:String(x.className),subject:String(x.subject),gradeNumber:n});
    }
    for (const key of (role?.subjectAssignmentKeys||[])) {
      const parts=String(key).split("::"),n=gradeNumber(parts[0]),subject=parts.slice(1).join("::");
      if(n>=6&&n<=10&&subject&&roleCanTeach(parts[0],subject))pairs.push({className:parts[0],subject,gradeNumber:n});
    }
    for (const x of rows) {
      const n=gradeNumber(x.className);
      if(n>=6&&n<=10&&x.subject&&roleCanTeach(String(x.className),String(x.subject)))pairs.push({className:String(x.className),subject:String(x.subject),gradeNumber:n});
    }
  }
  const unique = new Map();
  pairs.forEach(x=>unique.set(x.className+"::"+normal(x.subject),x));
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
    getDocs(query(collection(db,"question_bank"),where("className","==",selectedClass),where("subject","==",selectedSubject))),
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
    if(isAdmin()) snap=await getDocs(query(collection(db,"question_papers"),where("className","==",selectedClass),where("subject","==",selectedSubject),limit(30)));
    else snap=await getDocs(query(collection(db,"question_papers"),where("className","==",selectedClass),where("subject","==",selectedSubject),where("createdBy","==",auth.currentUser.uid),limit(30)));
    savedPapers=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(b.createdAt?.seconds||0).localeCompare(String(a.createdAt?.seconds||0)));
    body.innerHTML=savedPapers.length?savedPapers.map(p=>`<tr><td>${esc(p.paperTitle)}</td><td>${esc(p.className)}</td><td>${esc(p.subject)}</td><td>${esc(p.fullMarks)}</td><td>${esc(p.durationMinutes)} min</td><td>${esc(p.createdAt?.toDate?p.createdAt.toDate().toLocaleDateString("ne-NP"):"—")}</td><td><button class="qp-btn alt" type="button" data-qp-print-saved="${esc(p.id)}">Print</button> ${isAdmin()||p.createdBy===auth.currentUser.uid?'<button class="qp-btn danger" type="button" data-qp-delete-paper="'+esc(p.id)+'">Delete</button>':""}</td></tr>`).join(""):'<tr><td colspan="7">अहिलेसम्म प्रश्नपत्र सुरक्षित गरिएको छैन।</td></tr>';
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
  const chosen=[];
  for(const item of pattern){
    if(!item.count)continue;
    const candidates=shuffle(questionRows.filter(q=>topics.includes(q.topicId)&&q.questionType===item.type&&Number(q.marks)===item.marks&&q.status!=="archived"));
    if(candidates.length<item.count)throw new Error(item.type+" प्रकारका "+item.marks+" अङ्कका प्रश्न "+item.count+" चाहिन्छ; प्रश्न बैंकमा "+candidates.length+" मात्र छन्।");
    chosen.push(...candidates.slice(0,item.count));
  }
  return shuffle(chosen).sort((a,b)=>["mcq","short","long"].indexOf(a.questionType)-["mcq","short","long"].indexOf(b.questionType));
}
function schoolHeader() {
  return {schoolName:String(window.currentSchoolSettings?.schoolName||"Mahadevasthan Secondary School"),schoolAddress:String(window.currentSchoolSettings?.address||"")};
}
async function saveUnit(event) {
  event.preventDefault();
  if(!isAdmin())throw new Error("CDC पाठ्यक्रम व्यवस्थापन Admin का लागि मात्र हो।");
  if(!selectedClass||!selectedSubject)throw new Error("पहिले कक्षा र विषय छान्नुहोस्।");
  const topics=$("qpTopicsInput").value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  if(!topics.length||topics.length>80)throw new Error("Topic १ देखि ८० सम्म राख्नुहोस्।");
  const sourceUrl=$("qpSourceUrl").value.trim();
  if(!/^https:\/\/(www\.)?moecdc\.gov\.np\//i.test(sourceUrl)&&!/^https:\/\/lib\.moecdc\.gov\.np\//i.test(sourceUrl))throw new Error("CDC को आधिकारिक moecdc.gov.np वा CDC Library URL राख्नुहोस्।");
  await addDoc(collection(db,"cdc_curriculum"),{
    gradeNumber:gradeNumber(selectedClass),className:selectedClass,subject:selectedSubject,
    unitCode:$("qpUnitCode").value.trim(),unitTitle:$("qpUnitTitle").value.trim(),
    topics,curriculumVersion:$("qpVersion").value.trim(),sourceTitle:$("qpSourceTitle").value.trim(),
    sourceUrl,verifiedBy:auth.currentUser.uid,verifiedAt:serverTimestamp(),
    createdBy:auth.currentUser.uid,createdAt:serverTimestamp(),status:"active"
  });
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
  const id="g"+gradeNumber(selectedClass)+"_"+normal(selectedSubject).replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"");
  await setDoc(doc(db,"cdc_blueprints",id),{
    gradeNumber:gradeNumber(selectedClass),className:selectedClass,subject:selectedSubject,
    curriculumVersion:$("qpBpVersion").value.trim(),fullMarks,durationMinutes:Number($("qpBpDuration").value),
    pattern, cognitiveDistribution:distribution,sourceTitle:$("qpBpSourceTitle").value.trim(),sourceUrl,
    active:true,verifiedBy:auth.currentUser.uid,verifiedAt:serverTimestamp(),
    updatedBy:auth.currentUser.uid,updatedAt:serverTimestamp()
  });
  await loadCurrentData();$("qpBpStatus").textContent="Blueprint सुरक्षित भयो।";message("CDC विशिष्टीकरण तालिका सुरक्षित भयो।");
}
async function saveQuestion(event) {
  event.preventDefault();
  if(!selectedClass||!selectedSubject)throw new Error("पहिले कक्षा र विषय छान्नुहोस्।");
  if(!roleCanTeach(selectedClass,selectedSubject))throw new Error("यो कक्षा/विषय तपाईंलाई तोकिएको छैन।");
  const topicId=$("qpQuestionTopic").value;
  const unitId=topicId.slice(0,topicId.lastIndexOf("_"));
  const unit=curriculumRows.find(x=>x.id===unitId);
  const index=Number(topicId.slice(topicId.lastIndexOf("_")+1));
  const topicName=unit?.topics?.[index];
  if(!unit||!topicName)throw new Error("मान्य CDC Topic छान्नुहोस्।");
  const questionType=$("qpQuestionType").value;
  const options=questionType==="mcq"?["A","B","C","D"].map(k=>$("qpOption"+k).value.trim()):[];
  const correctOption=questionType==="mcq"?$("qpCorrectOption").value:"";
  if(questionType==="mcq"&&(options.some(x=>!x)||!correctOption))throw new Error("MCQ का चारवटै विकल्प र सही उत्तर राख्नुहोस्।");
  const data={
    gradeNumber:gradeNumber(selectedClass),className:selectedClass,subject:selectedSubject,
    unitId,unitTitle:unit.unitTitle,topicId,topicName:String(topicName),
    questionType,marks:Number($("qpQuestionMarks").value),cognitiveLevel:$("qpQuestionLevel").value,
    questionText:$("qpQuestionText").value.trim(),options,correctOption,
    answer:$("qpAnswer").value.trim(),createdBy:auth.currentUser.uid,
    createdByName:String(role?.displayName||auth.currentUser.displayName||"शिक्षक"),
    createdAt:serverTimestamp(),status:"active"
  };
  if(!data.questionText||data.questionText.length>3000||data.marks<1||data.marks>100)throw new Error("प्रश्न वा अङ्क मिलेको छैन।");
  await addDoc(collection(db,"question_bank"),data);
  $("qpQuestionForm").reset();$("qpQuestionMarks").value="1";toggleMcqFields();
  await loadCurrentData();message("प्रश्न बैंकमा प्रश्न सुरक्षित भयो।");
}
function toggleMcqFields() {
  const show=$("qpQuestionType")?.value==="mcq";
  document.querySelectorAll(".qp-mcq-field").forEach(x=>x.classList.toggle("qp-hidden",!show));
}
async function generatePaper() {
  if(!roleCanTeach(selectedClass,selectedSubject))throw new Error("यो विषयमा प्रश्नपत्र बनाउने अनुमति छैन।");
  const questions=allocateQuestions();
  const fullMarks=Number($("qpPaperFullMarks").value);
  const header=schoolHeader();
  generatedPaper={
    ...header,className:selectedClass,subject:selectedSubject,
    paperTitle:$("qpPaperTitle").value.trim(),academicYear:$("qpPaperYear").value.trim(),
    durationMinutes:Number($("qpPaperDuration").value),fullMarks,
    curriculumVersion:currentBlueprint?.curriculumVersion||"Custom Pattern",
    blueprintId:currentBlueprint?.id||null,topicIds:selectedTopicIds(),
    questions:questions.map((q,index)=>({
      questionId:q.id,questionText:q.questionText,questionType:q.questionType,marks:Number(q.marks),
      options:q.options||[],cognitiveLevel:q.cognitiveLevel,topicName:q.topicName,answer:q.answer||"",
      correctOption:q.correctOption||"",number:index+1
    })),
    createdBy:auth.currentUser.uid
  };
  renderPaperPreview();
  $("qpSavePaperBtn").disabled=false;$("qpPrintPaperBtn").disabled=false;
  message("प्रश्नपत्र तयार भयो। कुल "+questions.length+" प्रश्न, "+fullMarks+" अङ्क। Save वा Print गर्न सक्नुहुन्छ।");
}
async function savePaper() {
  if(!generatedPaper)throw new Error("पहिले प्रश्नपत्र Auto Generate गर्नुहोस्।");
  const payload={...generatedPaper,createdBy:auth.currentUser.uid,createdAt:serverTimestamp(),status:"draft"};
  const ref=await addDoc(collection(db,"question_papers"),payload);
  generatedPaper.id=ref.id;await loadPaperHistory();message("प्रश्नपत्र Firebase मा सुरक्षित भयो।");
}
async function deleteQuestion(id) {
  const q=questionRows.find(x=>x.id===id);if(!q)return;
  if(!isAdmin()&&q.createdBy!==auth.currentUser.uid)throw new Error("आफूले थपेको प्रश्न मात्र हटाउन सक्नुहुन्छ।");
  if(!confirm("यो प्रश्न प्रश्न बैंकबाट हटाउने हो? सुरक्षित प्रश्नपत्रमा रहेको पुरानो प्रश्नको प्रति भने यथावत् रहनेछ।"))return;
  await deleteDoc(doc(db,"question_bank",id));await loadCurrentData();message("प्रश्न हटाइयो।");
}
async function deletePaper(id) {
  const p=savedPapers.find(x=>x.id===id);if(!p)return;
  if(!isAdmin()&&p.createdBy!==auth.currentUser.uid)throw new Error("आफूले बनाएको प्रश्नपत्र मात्र हटाउन सक्नुहुन्छ।");
  if(!confirm("यो सुरक्षित प्रश्नपत्र हटाउने हो?"))return;
  await deleteDoc(doc(db,"question_papers",id));await loadPaperHistory();message("प्रश्नपत्र हटाइयो।");
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
async function loadQuestionPaperModule() {
  const root=$("questionPaperRoot");if(!root)return;
  root.innerHTML=pageShell();
  $("qpCatalogAdmin").classList.toggle("qp-hidden",!isAdmin());
  if(!auth.currentUser){message("Login आवश्यक छ।",true);return;}
  try{
    if(!isAdmin()){
      const snap=await getDoc(doc(db,"user_roles",auth.currentUser.uid));
      role=snap.exists()?snap.data():null;
      if(!roleCanTeach("", "")){} // Permission is checked again for each selected class/subject.
    }else role={roles:["admin"],active:true,displayName:"Admin"};
    await loadClassSubjects();
  }catch(err){console.error("Question paper module init failed",err);message("Module लोड भएन: "+(err.code||err.message),true);}
}
window.loadQuestionPaperModule=loadQuestionPaperModule;

document.addEventListener("change",async event=>{
  const t=event.target;
  if(t.id==="qpClass"){
    selectedClass=t.value;selectedSubject="";generatedPaper=null;
    const opts=classSubjects.filter(x=>x.className===selectedClass);
    $("qpSubject").innerHTML='<option value="">विषय छान्नुहोस्</option>'+opts.map(x=>'<option value="'+esc(x.subject)+'">'+esc(x.subject)+'</option>').join("");
    curriculumRows=[];questionRows=[];renderTopics();renderQuestionRows();message("अब विषय छान्नुहोस्।");
  }
  if(t.id==="qpSubject"){
    selectedSubject=t.value;generatedPaper=null;
    $("qpSavePaperBtn").disabled=true;$("qpPrintPaperBtn").disabled=true;
    if(selectedClass&&selectedSubject)try{await loadCurrentData();message("CDC Topic, प्रश्न बैंक र Blueprint लोड भए।");}catch(err){console.error(err);message("डेटा लोड भएन: "+(err.code||err.message),true);}
  }
  if(t.id==="qpQuestionType")toggleMcqFields();
  if(t.id==="qpImportFile"&&t.files?.[0]){
    try{await importTopics(t.files[0]);}catch(err){message("आयात भएन: "+(err.code||err.message),true);}finally{t.value="";}
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
    if(t.id==="qpGenerateBtn")generatePaper();
    if(t.id==="qpSavePaperBtn")await savePaper();
    if(t.id==="qpPrintPaperBtn")printPaper();
    if(t.id==="qpRefreshBtn"&&selectedClass&&selectedSubject){await loadCurrentData();message("प्रश्न बैंक Refresh भयो।");}
    if(t.id==="qpPaperReloadBtn"&&selectedClass&&selectedSubject)await loadPaperHistory();
    if(t.dataset.qpDeleteQuestion)await deleteQuestion(t.dataset.qpDeleteQuestion);
    if(t.dataset.qpDeletePaper)await deletePaper(t.dataset.qpDeletePaper);
    if(t.dataset.qpPrintSaved){
      const paper=savedPapers.find(x=>x.id===t.dataset.qpPrintSaved);
      if(paper){generatedPaper=paper;renderPaperPreview(paper);printPaper(paper);}
    }
  }catch(err){console.error("Question paper action failed",err);message("कार्य पूरा भएन: "+(err.code||err.message),true);}
});
