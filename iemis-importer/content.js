(function () {
  'use strict';
  if (document.getElementById('smss-exam-importer')) return;
  const transfer = globalThis.SmssIemisTransfer;
  const host = document.createElement('div');
  host.id = 'smss-exam-importer';
  document.documentElement.append(host);
  const shadow = host.attachShadow({mode: 'closed'});
  shadow.innerHTML = `
    <style>
      :host{all:initial;font:14px/1.5 Arial,sans-serif;color:#17304e;position:fixed;right:20px;top:86px;z-index:2147483640}
      *{box-sizing:border-box}button,input,textarea{font:inherit}button{cursor:pointer;border:0;border-radius:8px;padding:9px 12px;background:#1859b8;color:white;font-weight:600}button:focus-visible,input:focus-visible,textarea:focus-visible{outline:3px solid #77b5ff;outline-offset:2px}button:disabled{opacity:.45;cursor:default}
      .launch{box-shadow:0 8px 26px #112d5b30;background:linear-gradient(110deg,#bd2445,#205cb5);padding:12px 20px}
      .panel{width:min(1200px,calc(100vw - 40px));max-height:calc(100vh - 36px);display:flex;flex-direction:column;background:#fff;border:1px solid #d4dfef;border-radius:16px;box-shadow:0 18px 60px #153c6940;overflow:hidden}
      [hidden]{display:none!important}.head{background:linear-gradient(112deg,#b52243,#215bb2);color:#fff;padding:16px 18px;cursor:move;touch-action:none;display:flex;align-items:center;justify-content:space-between;gap:12px}.head strong{font-size:18px}.creator{display:inline-block;margin-top:4px;padding:2px 8px;border-radius:5px;background:#eff6ff;color:#174d96;font-size:13px;font-weight:700}.head button{padding:3px 11px;background:#ffffff25;font-size:21px}
      .body{padding:18px;overflow:auto}.context{background:#edf4ff;border-left:3px solid #2466bc;padding:10px 12px;margin:12px 0;white-space:pre-line}.tools{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.red{background:#bc2947}.light{background:#eaf0f8;color:#174d96}.instructions{margin:0;color:#435972}input[type=file]{width:100%;padding:12px;border:1px dashed #789ac8;border-radius:8px}textarea{display:block;width:100%;min-height:94px;resize:vertical;border:1px solid #bccce1;border-radius:8px;padding:10px;margin:8px 0}.label{font-weight:600;display:block;margin:14px 0 6px}.replace{display:flex;align-items:center;gap:7px}input[type=checkbox]{accent-color:#bd2949}.status{padding:10px;background:#f0f5fc;border-radius:8px;white-space:pre-wrap;overflow-wrap:anywhere}.error{background:#fff0f2;color:#9f1c38}.preview{max-height:200px;overflow:auto}table{width:100%;border-collapse:collapse;font-size:12px}th,td{padding:7px;text-align:left;border-bottom:1px solid #d9e2ef}th{background:#eff4fd;position:sticky;top:0}small{color:#597089}summary{cursor:pointer}
      #editor{overflow:auto;max-height:49vh;margin:12px 0}.subjects{display:flex;flex-wrap:wrap;gap:6px 14px;padding:8px 0}.subjects label{white-space:nowrap}#editor table{width:max-content;min-width:100%}#editor th,#editor td{position:static;border:1px solid #c8d5e5;text-align:center}#editor input:not([type=checkbox]){width:7em;padding:4px}#editor .changed{background:#fff2bf}
    </style>
    <button class="launch" type="button">Exam Importer</button>
    <section class="panel" aria-label="SMSS IEMIS Exam Importer" hidden>
      <header class="head"><div><strong>SMSS · Exam Importer</strong><div class="creator">Created by Babukrishna Khanal</div></div><button type="button" id="minimize" aria-label="Minimize">−</button></header>
      <div class="body">
        <p class="instructions">IEMIS मा कक्षा र Term छानेर Load गर्नुहोस् र चाहिने विषयको checkbox छान्नुहोस्। त्यसपछि Read Form थिच्नुहोस्। शीर्ष भाग समातेर यो बाकस सार्न सकिन्छ।</p>
        <div class="context" id="context">Mark Entry form पढ्न बाँकी छ।</div>
        <div class="tools"><button id="read" type="button">Read Form</button><button id="sample" class="light" type="button" disabled>Download Sample Excel</button></div>
        <label class="label" for="file">Import Excel (.xlsx)</label><input id="file" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet">
        <details><summary>Copy / Paste from Excel</summary><p class="instructions">Marks sheet बाट heading बाहेक विद्यार्थीका चारवटै विवरण र अंकका column सँगै copy गरेर यहाँ paste गर्नुहोस्। खुलेको form कै column क्रम चाहिन्छ।</p><textarea id="paste" aria-label="Paste Excel rows" placeholder="Paste Excel rows here"></textarea><button id="use-paste" class="light" type="button">Use Pasted Rows</button></details>
        <div id="editor" aria-label="Mark Entry"></div><button class="light" id="copy" type="button" disabled>Copy Rows</button><label class="replace label"><input id="replace" type="checkbox">Replace Existing Values</label>
        <p class="instructions">खाली cell ले पहिलेको अंक बदल्दैन। पहिल्यै अंक भएको ठाउँ बदल्न माथिको विकल्प छानेर Preview जाँच्नुहोस्। Import ले form मा अंक भर्छ। स्थायी रूपमा सुरक्षित गर्न IEMIS कै Save बटन थिच्नुहोस्।</p>
        <div class="tools"><button id="preview" type="button" disabled>Preview</button><button id="apply" class="red" type="button" disabled>Fill IEMIS Form</button><button id="clear" class="light" type="button">Clear Import</button></div>
        <div id="status" class="status" role="status">Read Form बाट सुरु गर्नुहोस्।</div>
      </div>
    </section>`;
  const $ = id => shadow.getElementById(id);
  let grid = null, file = null, plan = null, sourceVersion = '', readingContext = '', loading = false, applying = false;
  function message(text, bad = false) { $('status').textContent = text; $('status').classList.toggle('error', bad); }
  function resetPlan() { plan = null; $('apply').disabled = true; }
  function currentContext() {
    const selected = id => document.getElementById(id)?.selectedOptions?.[0]?.text.trim() || '';
    const school = [...document.querySelectorAll('input[disabled]')].map(e => e.value).find(v => /^\d+\s*\|/.test(v));
    const context = {schoolCode: school?.match(/^\d+/)?.[0] || '', year: selected('ddlYear'), className: selected('ddlClass'), term: selected('ddlTerm'), section: selected('ddlSections') || 'All'};
    if (!context.schoolCode || Object.values(context).some(v => !v || /^Select /i.test(v))) throw new Error('School, Year, Class र Term सहित IEMIS Mark Entry खोल्नुहोस्।');
    return context;
  }
  function subjectLists(table, columns) {
    const names = new Set(columns.map(c => transfer.subjectKey(c.subject)));
    const name = input => input.labels?.[0]?.textContent.trim() || '';
    const candidates = [...(table.closest('form') || document).querySelectorAll('input[type=checkbox]')]
      .filter(input => !input.closest('table') && name(input));
    const groups = new Set();
    for (const input of candidates) {
      if (!names.has(transfer.subjectKey(name(input)))) continue;
      let group = input.labels[0].parentElement;
      while (group && !group.contains(table) && group !== document.body) {
        const boxes = [...group.querySelectorAll('input[type=checkbox]')];
        if (boxes.length > 1 && boxes.every(box => candidates.includes(box))) break;
        group = group.parentElement;
      }
      groups.add(group && group !== document.body && !group.contains(table) ? group : input.labels[0]);
    }
    return candidates.filter(input => [...groups].some(group => group.contains(input) || group.contains(input.labels[0])))
      .map(input => ({name:name(input), checked:input.checked, before:!!(input.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING)}));
  }
  function subjectList(items) {
    const list = document.createElement('div');
    list.className = 'subjects';
    for (const item of items) {
      const label = document.createElement('label'), box = document.createElement('input');
      box.type = 'checkbox'; box.checked = item.checked; box.disabled = true;
      label.append(box,document.createTextNode(' '+item.name)); list.append(label);
    }
    return list;
  }
  function readForm() {
    const nativeLoad = [...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Load');
    if (loading || nativeLoad?.disabled) throw new Error('IEMIS को Load पूरा भएपछि Read Form थिच्नुहोस्।');
    const context = currentContext();
    if (readingContext && readingContext !== JSON.stringify(context)) throw new Error('कक्षा वा Term फेरिएको छ। IEMIS मा Load गरेर फेरि Read Form थिच्नुहोस्।');
    const table = [...document.querySelectorAll('table')].find(t => /Student Name/.test(t.tHead?.innerText || '') && /Regd\. No\./.test(t.tHead.innerText));
    if (!table || table.tHead.rows.length < 2) throw new Error('Mark Entry विद्यार्थी तालिका लोड भएको छैन।');
    const heads = [...table.tHead.rows[0].cells], subs = [...table.tHead.rows[1].cells];
    if (heads.slice(1, 5).map(c => c.innerText.trim()).join('|') !== transfer.identity.join('|')) throw new Error('IEMIS का विद्यार्थी column परिवर्तन भएका छन्। यो form को संरचना जाँच चाहिन्छ।');
    let subIndex = 0;
    const columns = [];
    for (const subject of heads.slice(5)) {
      for (let i = 0; i < subject.colSpan; i++) {
        const header = subs[subIndex++];
        if (!header) throw new Error('IEMIS grouped heading मिलेन।');
        columns.push({subject: subject.innerText.trim(), label: header.innerText.trim()});
      }
    }
    if (!columns.length || subIndex !== subs.length) throw new Error('IEMIS मा विषयको checkbox छान्नुहोस् र फेरि Read Form थिच्नुहोस्।');
    const classNo = Number(transfer.classKey(context.className));
    const primary = columns.some(column => transfer.componentKey(column.label) === 'count');
    const final = columns.some(column => transfer.componentKey(column.label) === 'theory');
    if ((classNo >= 1 && classNo <= 5) !== primary || (!primary && (transfer.termKey(context.term) === 'final') !== final)) throw new Error('खुलेको table र कक्षा/Term मिलेनन्। Load पूरा भएपछि Read Form थिच्नुहोस्।');
    const rows = [], cells = [];
    for (const row of table.tBodies[0]?.rows || []) {
      const expanded = [];
      for (const cell of row.cells) for (let i = 0; i < cell.colSpan; i++) expanded.push(cell);
      if (expanded.length !== columns.length + 5) throw new Error('विद्यार्थीको column र heading संख्या मिलेन।');
      const selected = expanded[0].querySelector('input[type=checkbox]');
      const values = [], controls = [];
      for (const cell of expanded.slice(1)) {
        const input = cell.querySelector('input');
        const text = cell.innerText.trim();
        const value = input ? input.type === 'checkbox' ? input.checked : input.value : text;
        values.push(value);
        controls.push({input, value, readonly: !input || input.readOnly, disabled: !!input?.disabled, unavailable: /^N\/?A$/i.test(text) || cell.colSpan > 1, max: input?.max ? Number(input.max) : null});
      }
      if (!values[1] || (!values[2] && !values[3])) throw new Error('विद्यार्थीको Regd. No. वा Symbol No. खाली छ। Admit Card मा पहिचान पूरा गर्नुहोस्।');
      rows.push(values); cells.push(controls);
      controls.selection = selected;
    }
    if (!rows.length) throw new Error('Import गर्न विद्यार्थी भेटिएनन्।');
    const layout = table.cloneNode(true);
    // Retain the observed orientation of headings even across the shadow boundary.
    [...table.tHead.rows].forEach((row,r) => [...row.cells].forEach((cell,c) => {
      const style = getComputedStyle(cell);
      const heading = layout.tHead.rows[r].cells[c];
      for (const prop of ['writingMode','textOrientation','textAlign','verticalAlign','whiteSpace','direction']) heading.style[prop] = style[prop];
    }));
    return {context, columns, rows, cells, table: layout, subjects:subjectLists(table,columns)};
  }
  function fingerprint(value) { return JSON.stringify({context: value.context, columns: value.columns, rows: value.rows}); }
  async function downloadSample() {
    const current = readForm();
    const data = await transfer.makeWorkbook(globalThis.ExcelJS, current, true);
    const url = URL.createObjectURL(new Blob([data], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
    const link = document.createElement('a'); link.href = url; link.download = `IEMIS_${current.context.year}_Class${transfer.classKey(current.context.className)}_${transfer.termKey(current.context.term)}_Sample.xlsx`;
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 1500);
    message('खुलेको कक्षा र Term को Excel Sample डाउनलोड भयो। Context र heading जस्ताको तस्तै राख्नुहोस्।');
  }
  const safe = action => async () => {
    try { await action(); } catch (error) {resetPlan(); message(error.message || 'काम पूरा भएन। फेरि जाँच गर्नुहोस्।', true);}
  };
  let revision = 0;
  function startDraft() {
    revision++;
    resetPlan();
    file = {context: grid.context, columns: grid.columns.map((c,i) => ({...c, index:i+4})),
      rows: grid.rows.map(row => row.map((v,i) => i < 4 ? v : ''))};
    $('preview').disabled = true;
  }
  function setDraft(row, col, value) {
    file.rows[row][col] = String(value) === String(grid.rows[row][col]) ? '' : value;
    revision++;
    resetPlan();
    $('preview').disabled = false;
  }
  function renderEditor() {
    const table = document.createElement('table');
    for (const [section, target] of [[grid.table.tHead,table.createTHead()], [grid.table.tBodies[0],table.createTBody()]]) {
      for (const [r, original] of Array.from(section.rows).entries()) {
        const row = target.insertRow();
        let col = -1;
        for (const cell of original.cells) {
          const td = document.createElement(cell.localName);
          if (section === grid.table.tHead) td.style.cssText = cell.style.cssText;
          td.rowSpan = cell.rowSpan;
          td.colSpan = cell.colSpan;
          row.append(td);
          const c = col;
          col += cell.colSpan;
          const native = cell.querySelector('input');
          if (!native || section === grid.table.tHead && native.type !== 'checkbox') {
            td.textContent = cell.textContent.trim();
            continue;
          }
          const input = document.createElement('input');
          const editable = section !== grid.table.tHead && c >= 4 && !grid.cells[r][c].readonly && !grid.cells[r][c].disabled && !grid.cells[r][c].unavailable;
          input.type = native.type === 'checkbox' ? 'checkbox' : 'text';
          const staged = editable && file.rows[r][c] !== '';
          const value = staged ? file.rows[r][c] : native.type === 'checkbox' ? native.checked : native.value;
          if (input.type === 'checkbox') input.checked = value === true || value === 'true';
          else input.value = value;
          td.classList.toggle('changed', staged);
          input.disabled = !editable;
          if (editable) {
            input.dataset.row = r;
            input.dataset.col = c;
            input.setAttribute('aria-label',[grid.rows[r][1],grid.columns[c-4].subject,grid.columns[c-4].label].join(' · '));
            input.oninput = () => {
              setDraft(r,c,input.type === 'checkbox' ? input.checked : input.value);
              td.classList.toggle('changed',file.rows[r][c] !== '');
            };
          }
          td.append(input);
        }
      }
    }
    const before = grid.subjects.filter(item => item.before), after = grid.subjects.filter(item => !item.before);
    $('editor').replaceChildren(...(before.length ? [subjectList(before)] : []), table, ...(after.length ? [subjectList(after)] : []));
  }
  $('editor').addEventListener('paste', event => {
    const anchor = event.target;
    if (!anchor.hasAttribute('data-row')) return;
    event.preventDefault();
    try {
      const matrix = event.clipboardData.getData('text/plain').replace(/\r\n?/g,'\n').replace(/\n+$/,'').split('\n');
      const updates = [];
      matrix.forEach((line,dy) => line.split('\t').forEach((value,dx) => {
        if (!value.trim()) return;
        const r = Number(anchor.dataset.row)+dy, c = Number(anchor.dataset.col)+dx;
        const cell = grid.cells[r]?.[c];
        if (!cell || cell.readonly || cell.disabled || cell.unavailable) throw new Error('Paste को क्षेत्र सम्पादन गर्न मिल्ने कोठाभन्दा बाहिर छ।');
        if (cell.input.type === 'checkbox') {
          if (!/^(true|false|yes|no|1|0)$/i.test(value.trim())) throw new Error('IsAbsent मा TRUE वा FALSE राख्नुहोस्।');
          value = /^(true|yes|1)$/i.test(value.trim());
        }
        updates.push([r,c,value]);
      }));
      for (const update of updates) setDraft(...update);
      renderEditor();
      message('अंक टाँसियो। तालिकामा जाँचेर Preview थिच्नुहोस्।');
    } catch (error) {resetPlan(); message(error.message,true);}
  });
  $('copy').onclick = safe(async () => {
    const rows = grid.rows.map((row,r) => row.map((v,c) => c >= 4 && file.rows[r][c] !== '' ? file.rows[r][c] : v).join('\t'));
    await navigator.clipboard.writeText(rows.join('\n'));
    message('विद्यार्थी विवरण र अंक कपी भयो।');
  });
  $('read').onclick = safe(() => {
    grid = readForm(); sourceVersion = fingerprint(grid); startDraft(); renderEditor();
    $('sample').disabled = false; $('copy').disabled = false; $('file').value = ''; $('paste').value = '';
    $('context').textContent = `School ${grid.context.schoolCode} · ${grid.context.year} · Class ${grid.context.className} · ${grid.context.term} · Section ${grid.context.section}`;
    message('Form पढियो। तालिकामा अंक टाइप वा पेस्ट गर्नुहोस्, वा Excel छान्नुहोस्।');
  });
  $('sample').onclick = safe(downloadSample);
  function stage(source) {
    const matched = transfer.makePlan(source,grid,true);
    for (const change of matched.changes) {
      if (grid.cells[change.row][change.column].disabled) throw new Error('IEMIS मा यो कोठा बन्द छ।');
    }
    startDraft();
    for (const change of matched.changes) file.rows[change.row][change.column] = change.value;
    renderEditor(); $('preview').disabled = false;
    message('आयात गरिएका अंक तालिकामा देखाइएको छ। जाँचेर Preview थिच्नुहोस्।');
  }
  $('file').onchange = safe(async () => {
    if (!grid) throw new Error('पहिले Read Form थिच्नुहोस्।');
    revision++; resetPlan();
    const input = $('file').files[0], version = revision;
    if (!input || !/\.xlsx$/i.test(input.name)) throw new Error('Excel .xlsx फाइल छान्नुहोस्।');
    if (input.size > 8 * 1024 * 1024) throw new Error('Excel फाइल ८ MB भन्दा ठूलो छ।');
    const source = await transfer.workbookData(globalThis.ExcelJS, await input.arrayBuffer());
    if (version === revision && grid) stage(source);
  });
  $('use-paste').onclick = safe(() => {
    if (!grid) throw new Error('पहिले Read Form थिच्नुहोस्।');
    stage(transfer.parsePaste($('paste').value, grid));
  });
  $('replace').onchange = resetPlan;
  $('paste').oninput = resetPlan;
  $('preview').onclick = safe(() => {
    resetPlan(); const current = readForm();
    if (fingerprint(current) !== sourceVersion) throw new Error('IEMIS form परिवर्तन भएको छ। फेरि Read Form गर्नुहोस्।');
    plan = transfer.makePlan(file,current,$('replace').checked);
    renderEditor(); $('apply').disabled = false;
    message(`${plan.students} विद्यार्थीका ${plan.changes.length} परिवर्तन तालिकामा पहेँलो देखिन्छन्। जाँचेर Fill IEMIS Form थिच्नुहोस्।`);
  });
  function setValue(input, value) {
    const property = input.type === 'checkbox' ? 'checked' : 'value';
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, property).set.call(input, value);
    input.dispatchEvent(new Event('input', {bubbles: true}));
    input.dispatchEvent(new Event('change', {bubbles: true}));
  }
  $('apply').onclick = safe(async () => {
    if (!plan) throw new Error('पहिले Preview जाँच्नुहोस्।');
    const current = readForm(), reviewed = plan;
    if (fingerprint(current) !== sourceVersion) throw new Error('Preview पछि form बदलिएको छ। फेरि Read Form गर्नुहोस्।');
    const selected = [];
    const written = [];
    const priority = {absent: 0, count: 1};
    const changes = [...reviewed.changes].sort((a, b) => (priority[a.kind] ?? 2) - (priority[b.kind] ?? 2));
    if (applying) return;
    applying = true;
    revision++;
    shadow.querySelector('.body').inert = true;
    try {
      for (const change of changes) {
        const control = current.cells[change.row][change.column];
        if (!control.input?.isConnected || control.input.readOnly || control.input.disabled) throw new Error('IEMIS input परिवर्तन भयो वा बन्द छ। Load गरेर फेरि जाँच गर्नुहोस्।');
        written.push({input: control.input, value: control.value});
        setValue(control.input, change.value);
        await new Promise(resolve => requestAnimationFrame(resolve));
        const actual = control.input.type === 'checkbox' ? control.input.checked : control.input.value;
        if (String(actual) !== String(change.value)) throw new Error('IEMIS ले अंक स्वीकार गरेन।');
      }
      for (const row of new Set(changes.map(c => c.row))) {
        const input = current.cells[row].selection;
        if (input && !input.checked) {selected.push(input); setValue(input, true);}
      }

    } catch (error) {
      for (const item of written.reverse()) if (item.input.isConnected) setValue(item.input, item.value);
      for (const input of selected) if (input.isConnected) setValue(input, false);
      throw error;
    } finally {applying = false; shadow.querySelector('.body').inert = false; resetPlan();}
    forgetForm();
    await $('read').onclick();
    message(`${reviewed.changes.length} field form मा भरियो। IEMIS मा अंक जाँचेर त्यहाँकै Save बटन थिच्नुहोस्।`);
  });
  function forgetForm() {
    revision++; grid = null; file = null; resetPlan(); $('editor').replaceChildren();
    for (const id of ['sample','preview','copy']) $(id).disabled = true;
    $('context').textContent = 'Mark Entry form पढ्न बाँकी छ।';
  }
  $('clear').onclick = () => {
    $('file').value = ''; $('paste').value = '';
    if (grid) {startDraft(); renderEditor();}
    message('Import खाली भयो।');
  };
  const panel = shadow.querySelector('.panel'), launcher = shadow.querySelector('.launch');
  launcher.onclick = () => {panel.hidden = false; launcher.hidden = true; if (!grid) $('read').click();};
  $('minimize').onclick = () => {panel.hidden = true; launcher.hidden = false;};
  const head = shadow.querySelector('.head');
  head.addEventListener('pointerdown', event => {
    if (event.target.closest('button')) return;
    const bounds = host.getBoundingClientRect(), dx = event.clientX - bounds.left, dy = event.clientY - bounds.top;
    head.setPointerCapture(event.pointerId);
    const move = event => {
      host.style.right = 'auto';
      host.style.left = Math.max(0, Math.min(innerWidth - host.offsetWidth, event.clientX - dx)) + 'px';
      host.style.top = Math.max(0, Math.min(innerHeight - 48, event.clientY - dy)) + 'px';
    };
    head.addEventListener('pointermove', move);
    head.addEventListener('pointerup', () => head.removeEventListener('pointermove', move), {once: true});
    head.addEventListener('pointercancel', () => head.removeEventListener('pointermove', move), {once: true});
  });
  document.addEventListener('change', event => {
    if (applying) return;
    if (event.target.matches('#ddlYear,#ddlClass,#ddlTerm,#ddlSections')) {
      readingContext = 'changed'; forgetForm(); $('sample').disabled = true; message('छनोट फेरियो। IEMIS मा Load गरेर फेरि Read Form गर्नुहोस्।');
    }
  }, true);
  document.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (button?.textContent.trim() === 'Load' && document.getElementById('ddlClass')) {
      loading = true; forgetForm();
      try { readingContext = JSON.stringify(currentContext()); } catch {readingContext = 'invalid';}
      const timer = setInterval(() => {if (!button.isConnected || !button.disabled) {loading = false; clearInterval(timer);}}, 300);
      setTimeout(() => {clearInterval(timer); loading = false;}, 30000);
    }
  }, true);
  let scheduled = false;
  const updateVisibility = () => {
    scheduled = false;
    const inExam = location.pathname.startsWith('/result-processing/');
    const examLink = document.querySelector('a[href="/result-processing/result-entry"]');
    host.hidden = !inExam && !examLink?.getBoundingClientRect().height;
    if (grid && !location.pathname.includes('result-entry')) forgetForm();
  };
  new MutationObserver(() => {if (!scheduled) {scheduled = true; requestAnimationFrame(updateVisibility);}}).observe(document.body, {childList: true, subtree: true});
  updateVisibility();
})();
