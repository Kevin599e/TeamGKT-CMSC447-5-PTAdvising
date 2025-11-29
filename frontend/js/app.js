const API = 'http://127.0.0.1:5000/api';
let currentPacket = null;

async function api(path, method='GET', data=null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' }, credentials: 'include' };
  if (data) opts.body = JSON.stringify(data);
  const r = await fetch(`${API}${path}`, opts);
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(json.error || 'Request failed');
  return json;
}

function renderTemplateBuilderView(data) {
  // clear previous optional selections area
  packetOptionalContainer.innerHTML = "";

  let html = "";
  html += `<div><strong>Template:</strong> ${data.template_name} (ID ${data.template_id})</div>`;
  html += `<div><strong>Program:</strong> ${data.program_name || "-"}</div>`;
  html += `<div style="margin-top:8px;"><strong>Sections:</strong></div>`;

  const sorted = [...data.sections].sort((a,b) => a.display_order - b.display_order);

  sorted.forEach(sec => {
    const optTag = sec.optional ? " (optional)" : "";
    const st = sec.section_type;

    let previewText = "";
    if (sec.source_content_preview) {
        previewText = sec.source_content_preview.body_preview || "";
    } else if (st === "advisor_notes") {
        previewText = "[Advisor will write personalized notes here]";
    } else if (st === "degree_audit") {
        previewText = "[Advisor will complete the degree audit table]";
    } else if (st === "intro") {
        previewText = "[Auto-filled with student details]";
    } else {
        previewText = "";
    }

    html += `
      <div class="optional-block">
        <label>
          <strong>#${sec.display_order} ${sec.title}${optTag}</strong>
          <span>type: ${st}</span>
          <code>${previewText}</code>
        </label>
      </div>
    `;

    // also populate checkboxes in the packet generation form
    if (sec.optional === true) {
      packetOptionalContainer.innerHTML += `
        <div class="optional-block">
          <label>
            <input type="checkbox"
                   name="include_section_ids"
                   value="${sec.template_section_id}"
                   checked>
            Include "${sec.title}" (${sec.section_type})
          </label>
        </div>
      `;
    }
  });

  builderOutput.innerHTML = html;
}

// ----- DOM references -----
const authStatus = document.getElementById('auth-status');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const reqForm = document.getElementById('request-form');
const genForm = document.getElementById('packet-form');
const finForm = document.getElementById('finalize-form');
const expForm = document.getElementById('export-form');
const listTemplatesBtn = document.getElementById('list-templates');
const templatesOut = document.getElementById('templates-output');
const listRequestsBtn = document.getElementById('list-requests');
const requestsOut = document.getElementById('requests-output');

const builderLoadForm = document.getElementById('builder-load-form');
const builderOutput = document.getElementById('builder-output');

const packetGenForm = document.getElementById('packet-generate-form');
const packetOptionalContainer = document.getElementById('packet-optional-container');
const packetGenOutput = document.getElementById('packet-generate-output');


const packetAddSectionForm = document.getElementById('packet-add-section-form');
const packetAddContentSelect = document.getElementById('packet-add-content-select');
const packetAddSectionOutput = document.getElementById('packet-add-section-output');

const scSearchInput = document.getElementById('sc-search');
const scListContainer = document.getElementById('sc-list');
let allSourceContent = [];    // cache for search/filter



// ----- Admin panel DOM references -----
const adminPanel = document.getElementById('admin-panel');
// programs
const adminProgramCreateForm = document.getElementById('admin-program-create-form');
const adminProgramUpdateForm = document.getElementById('admin-program-update-form');
const adminProgramListBtn = document.getElementById('admin-program-list-btn');
const adminProgramOutput = document.getElementById('admin-program-output');

const adminTemplateCreateForm = document.getElementById('admin-template-create-form');
const adminTemplateCreateOutput = document.getElementById('admin-template-create-output');

const adminTemplateUpdateForm = document.getElementById('admin-template-update-form');
const adminTemplateUpdateOutput = document.getElementById('admin-template-update-output');

const adminSectionCreateForm = document.getElementById('admin-section-create-form');
const adminSectionCreateOutput = document.getElementById('admin-section-create-output');

const adminSourceContentCreateForm = document.getElementById('admin-source-content-create-form');
const adminSourceContentListBtn = document.getElementById('admin-source-content-list-btn');
const adminSourceContentOutput = document.getElementById('admin-source-content-output');

// ----- Auth / session -----
async function refreshMe() {
  try {
    const me = await api('/auth/me');
    if (me && me.id) {
      authStatus.textContent = `Signed in as ${me.role} (user #${me.id})`;
      logoutBtn.style.display = 'inline-block';

      // show/hide admin panel based on role
      if (me.role === 'admin') {
        if (adminPanel) adminPanel.style.display = 'block';
      } else {
        if (adminPanel) adminPanel.style.display = 'none';
      }
    } else {
      authStatus.textContent = 'Not signed in';
      logoutBtn.style.display = 'none';
      if (adminPanel) adminPanel.style.display = 'none';
    }
  } catch (e) {
    authStatus.textContent = 'Not signed in';
    logoutBtn.style.display = 'none';
    if (adminPanel) adminPanel.style.display = 'none';
  }
}

async function loadSourceContentLibrary() {
  if (!scListContainer) return;
  try {
    const resp = await api('/templates/source-content', 'GET');
    allSourceContent = resp.items || [];
    renderSourceContentList(allSourceContent, "");
  } catch (err) {
    scListContainer.textContent = "❌ " + err.message;
  }
}

// filter + render
function renderSourceContentList(items, filterText) {
  if (!scListContainer) return;
  const ft = (filterText || "").toLowerCase();

  const filtered = items.filter(item => {
    if (!ft) return true;
    const haystack = (item.title + " " + (item.body_preview || "")).toLowerCase();
    return haystack.includes(ft);
  });

  if (filtered.length === 0) {
    scListContainer.innerHTML = "<em>No matching content blocks.</em>";
    return;
  }

  let html = "";
  filtered.forEach(sc => {
    html += `
      <div class="optional-block">
        <label>
          <input type="checkbox"
                 name="extra_source_content_ids"
                 value="${sc.id}">
          <strong>${sc.title}</strong>
          <code>${sc.body_preview || ""}</code>
        </label>
      </div>
    `;
  });

  scListContainer.innerHTML = html;
}

// hook up search box
scSearchInput?.addEventListener('input', () => {
  renderSourceContentList(allSourceContent, scSearchInput.value);
});


loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(loginForm));
  try {
    await api('/auth/login', 'POST', data);
    await refreshMe();
    alert('Logged in');
  } catch (err) {
    alert(err.message);
  }
});

logoutBtn.addEventListener('click', async () => {
  try {
    await api('/auth/logout', 'POST', {});
    await refreshMe();
  } catch (e) {}
});

// ----- Advisor: student request + packets -----
reqForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(reqForm));
  try {
    const r = await api('/requests', 'POST', data);
    alert('Created request #' + r.id);
  } catch (err) {
    alert(err.message);
  }
});

finForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(finForm));
  try {
    const r = await api('/packets/finalize', 'POST', data);
    alert('Packet #' + r.id + ' finalized.');
  } catch (err) {
    alert(err.message);
  }
});

expForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(expForm));
  try {
    const r = await api('/packets/export', 'POST', data);
    alert('Exported to: ' + r.path);
  } catch (err) {
    alert(err.message);
  }
});

listTemplatesBtn.addEventListener('click', async () => {
  try {
    const r = await api('/templates');
    templatesOut.textContent = JSON.stringify(r.items, null, 2);
  } catch (e) {
    templatesOut.textContent = e.message;
  }
});

listRequestsBtn.addEventListener('click', async () => {
  try {
    const r = await api('/requests');
    requestsOut.textContent = JSON.stringify(r.items, null, 2);
  } catch (e) {
    requestsOut.textContent = e.message;
  }
});

// ----- Template builder (advisor) -----
builderLoadForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = Object.fromEntries(new FormData(builderLoadForm));
  const templateId = formData.template_id_builder;

  try {
    console.log("[builder] loading template", templateId);
    const data = await api(`/templates/${templateId}/builder`, 'GET');
    console.log("[builder] response", data);

    renderTemplateBuilderView(data);
  } catch (err) {
    console.error("[builder] error", err);
    builderOutput.textContent = "❌ " + err.message;
  }
});

// ----- Packet generate (advisor) -----
packetGenForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const baseData = Object.fromEntries(new FormData(packetGenForm));
  const requestId = baseData.request_id;
  const templateId = baseData.template_id;

  // template optional sections
  const chosenSectionIds = [];
  packetGenForm
    .querySelectorAll('input[name="include_section_ids"]:checked')
    .forEach(cb => {
      chosenSectionIds.push(parseInt(cb.value, 10));
    });

  // NEW: extra SourceContent blocks
  const extraContentIds = [];
  packetGenForm
    .querySelectorAll('input[name="extra_source_content_ids"]:checked')
    .forEach(cb => {
      extraContentIds.push(parseInt(cb.value, 10));
    });

  try {
    const resp = await api('/packets/generate', 'POST', {
      request_id: parseInt(requestId, 10),
      template_id: parseInt(templateId, 10),
      include_section_ids: chosenSectionIds,
      extra_source_content_ids: extraContentIds   // <-- new
    });
    packetGenOutput.textContent = "✅ Packet created:\n" + JSON.stringify(resp, null, 2);
  } catch (err) {
    packetGenOutput.textContent = "❌ " + err.message;
  }
});

// ==================== ADMIN UI HANDLERS ====================

// Create template
adminTemplateCreateForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(adminTemplateCreateForm));
  const payload = {
    name: data.name,
    program_id: parseInt(data.program_id, 10),
    active: data.active === 'on'
  };
  try {
    const resp = await api('/templates', 'POST', payload);
    adminTemplateCreateOutput.textContent = "✅ Template created:\n" + JSON.stringify(resp, null, 2);
  } catch (err) {
    adminTemplateCreateOutput.textContent = "❌ " + err.message;
  }
});

// Update template
adminTemplateUpdateForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(adminTemplateUpdateForm));
  const templateId = data.template_id;

  const payload = {};
  if (data.name && data.name.trim() !== '') payload.name = data.name;
  if (data.program_id && data.program_id.trim() !== '') {
    payload.program_id = parseInt(data.program_id, 10);
  }
  if (data.active === 'true') payload.active = true;
  if (data.active === 'false') payload.active = false;

  try {
    const resp = await api(`/templates/${templateId}`, 'PATCH', payload);
    adminTemplateUpdateOutput.textContent = "✅ Template updated:\n" + JSON.stringify(resp, null, 2);
  } catch (err) {
    adminTemplateUpdateOutput.textContent = "❌ " + err.message;
  }
});

// Add section to template
adminSectionCreateForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(adminSectionCreateForm));

  const templateId = data.template_id;
  const payload = {
    title: data.title,
    section_type: data.section_type,
    optional: data.optional === 'on'
  };

  if (data.display_order && data.display_order.trim() !== '') {
    payload.display_order = parseInt(data.display_order, 10);
  }
  if (data.source_content_id && data.source_content_id.trim() !== '') {
    payload.source_content_id = parseInt(data.source_content_id, 10);
  }

  try {
    const resp = await api(`/templates/${templateId}/sections`, 'POST', payload);
    adminSectionCreateOutput.textContent = "✅ Section created:\n" + JSON.stringify(resp, null, 2);
  } catch (err) {
    adminSectionCreateOutput.textContent = "❌ " + err.message;
  }
});

// Create source content
adminSourceContentCreateForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(adminSourceContentCreateForm));

  const payload = {
    title: data.title,
    content_type: data.content_type || 'text',
    body: data.body,
    active: data.active === 'on'
  };

  try {
    const resp = await api('/templates/source-content', 'POST', payload);
    adminSourceContentOutput.textContent = "✅ SourceContent created:\n" + JSON.stringify(resp, null, 2);
  } catch (err) {
    adminSourceContentOutput.textContent = "❌ " + err.message;
  }
});

// List source content
adminSourceContentListBtn?.addEventListener('click', async () => {
  try {
    const resp = await api('/templates/source-content', 'GET');
    adminSourceContentOutput.textContent = JSON.stringify(resp.items, null, 2);
  } catch (err) {
    adminSourceContentOutput.textContent = "❌ " + err.message;
  }
});

// ==================== ADMIN: SOURCE PROGRAMS ====================

// Create program
adminProgramCreateForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(adminProgramCreateForm));

  const payload = {
    name: data.name,
    active: data.active === 'on'
  };

  try {
    const resp = await api('/templates/programs', 'POST', payload);
    adminProgramOutput.textContent = "✅ Program created:\n" + JSON.stringify(resp, null, 2);
  } catch (err) {
    adminProgramOutput.textContent = "❌ " + err.message;
  }
});

// Update program
adminProgramUpdateForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(adminProgramUpdateForm));

  const programId = data.program_id;
  const payload = {};

  if (data.name && data.name.trim() !== '') {
    payload.name = data.name;
  }
  if (data.active === 'true') payload.active = true;
  if (data.active === 'false') payload.active = false;

  try {
    const resp = await api(`/templates/programs/${programId}`, 'PATCH', payload);
    adminProgramOutput.textContent = "✅ Program updated:\n" + JSON.stringify(resp, null, 2);
  } catch (err) {
    adminProgramOutput.textContent = "❌ " + err.message;
  }
});

// List programs
adminProgramListBtn?.addEventListener('click', async () => {
  try {
    const resp = await api('/templates/programs', 'GET');
    adminProgramOutput.textContent = JSON.stringify(resp.items, null, 2);
  } catch (err) {
    adminProgramOutput.textContent = "❌ " + err.message;
  }
});


// ----- initial -----
refreshMe();
loadSourceContentLibrary();