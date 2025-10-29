// Non-DB Requests page: reads from scripts/data.js (must export REQUESTS)
import { fmtDate, paginate } from './app.js';
import { REQUESTS } from './data.js';

const DATA = REQUESTS || [];

/* ---------- helpers ---------- */
const label = (s) => ({
  on_queue: 'on queue',
  processing: 'processing',
  payment_pending: 'payment pending',
  ready_for_pick_up: 'ready for pick up',
  released: 'released'
}[s] || s);

const pill = (s) => ({
  on_queue: 'pill-onqueue',
  processing: 'pill-processing',
  payment_pending: 'pill-paypend',
  ready_for_pick_up: 'pill-rfp',
  released: 'pill-released'
}[s] || 'pill-onqueue');

/** Allowed options per current status (post_pay supported). */
function optionsFor(r) {
  const postPay = !!r.post_pay;
  switch (r.status) {
    case 'on_queue': return ['on_queue', 'processing'];
    case 'processing': return postPay ? ['ready_for_pick_up'] : ['payment_pending'];
    case 'payment_pending': return ['processing']; // flips post_pay -> true
    case 'ready_for_pick_up': return ['released'];
    case 'released':
    default: return [];
  }
}

/* ---------- state ---------- */
const state = { page: 0, per: 6, q: '', status: '' };
let ROWS = DATA.map(x => ({ ...x })); // clone so we can mutate
const okToast = () => new bootstrap.Toast(document.getElementById('toastOk'));

/* ---------- filtering & render ---------- */
function filtered() {
  let rows = [...ROWS];
  if (state.status) rows = rows.filter(x => x.status === state.status);
  if (state.q) {
    const q = state.q.toLowerCase();
    rows = rows.filter(x => (x.citizen + ' ' + x.ref + ' ' + x.type).toLowerCase().includes(q));
  }
  rows.sort((a, b) => new Date(b.updated) - new Date(a.updated));
  return rows;
}

function draw() {
  const all = filtered();
  const { slice, start, total } = paginate(all, state.page, state.per);

  document.getElementById('countLbl').textContent =
    total ? `${start + 1}-${Math.min(start + state.per, total)} of ${total}` : '0 of 0';
  document.getElementById('prev').disabled = state.page === 0;
  document.getElementById('next').disabled = start + state.per >= total;

  document.getElementById('rows').innerHTML = slice.map(r => {
    const opts = optionsFor(r);

    return `
      <tr>
        <td>${r.id}</td>
        <td><span class="badge badge-ref">${r.ref}</span></td>
        <td>${r.citizen}</td>
        <td>${r.type}</td>
        <td><span class="pill ${pill(r.status)}">${label(r.status)}</span></td>
        <td>${fmtDate(r.requested_at)}</td>
        <td>${fmtDate(r.updated)}</td>
        <td class="text-end">
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-primary" data-view="${r.id}" data-bs-toggle="modal" data-bs-target="#mdlDetails">
              <i class="bi bi-eye"></i> Details
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/* ---------- events ---------- */
document.getElementById('q').addEventListener('input', e => {
  state.q = e.target.value.trim(); state.page = 0; draw();
});
document.getElementById('fStatus').addEventListener('change', e => {
  state.status = e.target.value; state.page = 0; draw();
});
document.getElementById('btnClear').addEventListener('click', () => {
  document.getElementById('q').value = ''; document.getElementById('fStatus').value = '';
  state.q = ''; state.status = ''; state.page = 0; draw();
});
document.getElementById('prev').addEventListener('click', () => { state.page--; draw(); });
document.getElementById('next').addEventListener('click', () => { state.page++; draw(); });

document.addEventListener('click', (e) => {
  const setter = e.target.closest('[data-set]');
  if (setter) {
    e.preventDefault();
    const id = +setter.dataset.set;
    const to = setter.dataset.status;
    const i = ROWS.findIndex(x => x.id === id);
    if (i < 0) return;

    // Apply local transition (no server)
    const curr = ROWS[i].status;
    if (curr === 'payment_pending' && to === 'processing') ROWS[i].post_pay = true;
    ROWS[i].status = to;
    ROWS[i].updated = new Date().toISOString();

    document.getElementById('toastMsg').textContent = `Status set to ${label(to)}`;
    okToast().show(); draw();
    return;
  }

  const v = e.target.closest('[data-view]');
  if (v) {
    const id = +v.dataset.view;
    const r = ROWS.find(x => x.id === id); if (!r) return;

    // Populating the details modal with the selected request's information
    document.getElementById('mdlDetailsTitle').textContent = `Request Details: ${r.ref}`;
    document.getElementById('mdlBody').innerHTML = `
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
        <div class="col-md-6"><div class="border rounded p-3"><div class="small text-muted">Citizen</div><div>${r.citizen}</div></div></div>
        <div class="col-md-6"><div class="border rounded p-3"><div class="small text-muted">Type</div><div>${r.type}</div></div></div>
        <div class="col-md-6"><div class="border rounded p-3"><div class="small text-muted">Requested</div><div>${fmtDate(r.requested_at)}</div></div></div>
        <div class="col-md-6"><div class="border rounded p-3"><div class="small text-muted">Last Updated</div><div>${fmtDate(r.updated)}</div></div></div>
      </div>
    `;

    // Add a download button inside the modal if there's a form_url
    const downloadBtn = r.form_url ? `
      <div class="btn-group mt-3">
        <a class="btn btn-outline-secondary" href="${r.form_url}" download>
          <i class="bi bi-download"></i> Download Form
        </a>
      </div>` : `<span class="text-muted small">No form uploaded</span>`;
    
    document.getElementById('mdlBody').innerHTML += downloadBtn;

    // Ensure modal opens correctly
    const modal = new bootstrap.Modal(document.getElementById('mdlDetails'));
    modal.show();
  }
});

/* ---------- boot ---------- */
draw();
