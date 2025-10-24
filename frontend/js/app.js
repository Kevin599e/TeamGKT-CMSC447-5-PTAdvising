const API = 'http://127.0.0.1:5000/api';
const tmplForm = document.getElementById('template-form');
const tmplCreateOutput = document.getElementById('template-create-output');

async function api(path, method='GET', data=null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' }, credentials: 'include' };
  if (data) opts.body = JSON.stringify(data);
  const r = await fetch(`${API}${path}`, opts);
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(json.error || 'Request failed');
  return json;
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

refreshMe();

tmplForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const data = Object.fromEntries(new FormData(tmplForm));
  const name = data.template_name?.trim();
  const rawSections = data.sections_json || "[]";

  let sections;
  try {
    sections = JSON.parse(rawSections);
    if (!Array.isArray(sections)) {
        throw new Error("Sections must be an array");
    }
  } catch (err) {
    tmplCreateOutput.textContent = "❌ Invalid JSON in Sections: " + err.message;
    return;
  }

  // attach display_order so backend preserves order
  const sectionsWithOrder = sections.map((s, idx) => ({
    title: s.title || `Section ${idx+1}`,
    content: s.content || "",
    display_order: idx
  }));

  try {
    const resp = await api('/templates', 'POST', {
      name,
      active: true,
      sections: sectionsWithOrder
    });
    tmplCreateOutput.textContent = "✅ Created template:\n" + JSON.stringify(resp, null, 2);
  } catch (err) {
    tmplCreateOutput.textContent = "❌ Error: " + err.message + "\nAre you logged in as admin@umbc.edu?";
  }
});
