const API = 'http://127.0.0.1:5000/api';

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


async function refreshMe() {
  try {
    const me = await api('/auth/me');
    if (me && me.id) {
      authStatus.textContent = `Signed in as ${me.role} (user #${me.id})`;
      logoutBtn.style.display = 'inline-block';
    } else {
      authStatus.textContent = 'Not signed in';
      logoutBtn.style.display = 'none';
    }
  } catch (e) {
    authStatus.textContent = 'Not signed in';
  }
}

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

genForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(genForm));
  try {
    const r = await api('/packets/generate', 'POST', data);
    alert('Packet #' + r.id + ' created, status: ' + r.status);
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

builderLoadForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  // 1. read the template ID from the form
  const formData = Object.fromEntries(new FormData(builderLoadForm));
  const templateId = formData.template_id_builder;

  // 2. call backend
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

packetGenForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  // read the basic fields
  const baseData = Object.fromEntries(new FormData(packetGenForm));
  const requestId = baseData.request_id;
  const templateId = baseData.template_id;

  // gather which optional sections were checked
  const chosenIds = [];
  packetGenForm
    .querySelectorAll('input[name="include_section_ids"]:checked')
    .forEach(cb => {
      chosenIds.push(parseInt(cb.value, 10));
    });

  try {
    const resp = await api('/packets/generate', 'POST', {
      request_id: parseInt(requestId, 10),
      template_id: parseInt(templateId, 10),
      include_section_ids: chosenIds
    });
    packetGenOutput.textContent = "✅ Packet created:\n" + JSON.stringify(resp, null, 2);
  } catch (err) {
    packetGenOutput.textContent = "❌ " + err.message;
  }
});

refreshMe();
