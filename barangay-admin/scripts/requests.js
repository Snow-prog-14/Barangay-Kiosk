import { okToast, applyRoleBasedUI } from './app.js';

document.addEventListener('DOMContentLoaded', applyRoleBasedUI);

// Clone requests data so we can modify without touching the source
let ROWS = [];

async function loadRequests() {
  try {
    const res = await fetch('requests_list.php');
    const data = await res.json();
    ROWS = data.rows || [];
    draw();
  } catch (err) {
    console.error(err);
  }
}


const rowsEl = document.getElementById('rows');
const qEl = document.getElementById('q');
const fStatusEl = document.getElementById('fStatus');
const countLbl = document.getElementById('countLbl');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');

let page = 1;
const perPage = 6;

// Label and style helpers
const label = (status) => {
  switch (status) {
    case 'on_queue': return 'On Queue';
    case 'processing': return 'Processing';
    case 'payment_pending': return 'Payment Pending';
    case 'ready_for_pick_up': return 'Ready for Pick Up';
    case 'released': return 'Released';
    default: return status;
  }
};

const pill = (status) => {
  switch (status) {
    case 'on_queue': return 'bg-secondary text-white';
    case 'processing': return 'bg-warning text-dark';
    case 'payment_pending': return 'bg-info text-dark';
    case 'ready_for_pick_up': return 'bg-primary text-white';
    case 'released': return 'bg-success text-white';
    default: return 'bg-light';
  }
};

const fmtDate = (d) => new Date(d).toLocaleString('en-PH', {
  dateStyle: 'medium',
  timeStyle: 'short'
});

function draw() {
  let data = ROWS;
  const q = qEl.value.trim().toLowerCase();
  const f = fStatusEl.value;

  if (q) {
    data = data.filter(r =>
      r.citizen.toLowerCase().includes(q) ||
      r.ref.toLowerCase().includes(q) ||
      r.type.toLowerCase().includes(q)
    );
  }
  if (f) data = data.filter(r => r.status === f);

  const total = data.length;
  const pages = Math.ceil(total / perPage);
  if (page > pages) page = pages || 1;

  const start = (page - 1) * perPage;
  const slice = data.slice(start, start + perPage);

  rowsEl.innerHTML = slice.map((r, i) => `
    <tr>
      <td>${start + i + 1}</td>
      <td>${r.ref}</td>
      <td>${r.citizen}</td>
      <td>${r.type}</td>
      <td>
        <span class="pill ${pill(r.status)}">${label(r.status)}</span>
      </td>
      <td>${fmtDate(r.requested_at)}</td>
      <td>${fmtDate(r.updated)}</td>
      <td>
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-secondary" data-view="${r.id}">
            <i class="bi bi-eye"></i> Details
          </button>
          <button class="btn btn-outline-primary" data-status="${r.id}" ${r.status === 'released' ? 'disabled' : ''}>
            <i class="bi bi-arrow-repeat"></i> Status
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  countLbl.textContent = `Showing ${slice.length} of ${total} requests`;
  prevBtn.disabled = page <= 1;
  nextBtn.disabled = page >= pages;
}

// Pagination
prevBtn.onclick = () => { page--; draw(); };
nextBtn.onclick = () => { page++; draw(); };

// Search and filter
qEl.oninput = () => { page = 1; draw(); };
fStatusEl.onchange = () => { page = 1; draw(); };
document.getElementById('btnClear').onclick = () => {
  qEl.value = '';
  fStatusEl.value = '';
  page = 1;
  draw();
};

// Table actions
rowsEl.addEventListener('click', (e) => {
  const v = e.target.closest('[data-view]');
  const s = e.target.closest('[data-status]');
  if (v) showDetails(+v.dataset.view);
  else if (s) showStatusFlow(+s.dataset.status);
});

// Details modal (no dropdown)
function showDetails(id) {
  const r = ROWS.find(x => x.id === id);
  if (!r) return;

  const mdl = document.getElementById('mdlDetails');
  const body = document.getElementById('mdlBody');
  const title = document.getElementById('mdlDetailsTitle');

  title.textContent = `Request Details: ${r.ref}`;
  body.innerHTML = `
    <div class="row g-3">
      <div class="col-md-6">
        <div class="border rounded p-3 bg-light">
          <div class="small text-muted">Reference</div>
          <div class="fw-semibold">${r.ref}</div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="border rounded p-3 bg-light">
          <div class="small text-muted">Status</div>
          <div><span class="pill ${pill(r.status)}">${label(r.status)}</span></div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="border rounded p-3"><div class="small text-muted">Citizen</div><div>${r.citizen}</div></div>
      </div>
      <div class="col-md-6">
        <div class="border rounded p-3"><div class="small text-muted">Type</div><div>${r.type}</div></div>
      </div>
      <div class="col-md-6">
        <div class="border rounded p-3"><div class="small text-muted">Requested</div><div>${fmtDate(r.requested_at)}</div></div>
      </div>
      <div class="col-md-6">
        <div class="border rounded p-3"><div class="small text-muted">Last Updated</div><div>${fmtDate(r.updated)}</div></div>
      </div>
    </div>
    ${r.form_url
      ? `<div class="btn-group mt-3">
           <a class="btn btn-outline-secondary" href="${r.form_url}" download>
             <i class="bi bi-download"></i> Download Form
           </a>
         </div>`
      : `<span class="text-muted small">No form uploaded</span>`
    }
  `;

  bootstrap.Modal.getOrCreateInstance(mdl).show();
}

// Status flow handler
function showStatusFlow(id) {
  const r = ROWS.find(x => x.id === id);
  if (!r) return;

  const flow = [
    'on_queue',
    'processing',
    'payment_pending',
    'processing',
    'ready_for_pick_up',
    'released'
  ];

  let idx = flow.indexOf(r.status);

  if (idx === -1 || r.status === 'released') {
    okToast('Already Released').show();
    return;
  }

  const next = flow[idx + 1] || 'released';
  if (!next) return;

  if (confirm(`Change status from "${label(r.status)}" to "${label(next)}"?`)) {
    r.status = next;
    r.updated = new Date().toISOString();
    draw();
    okToast(`Status updated to ${label(next)}`).show();
  }
}

// Initialize
loadRequests();

applyRoleBasedUI();
